import { describe, it, expect } from 'vitest';
import {
  transformGraphToTasks,
  recalculateTaskStates,
  recalculateChecklistStates,
  computeOverallReadinessScore,
  validateUploadedDocument,
  simulateDocumentUpload,
  createChecklistFromGraph,
  getChecklistMetrics,
  type ComplianceTask,
  type GraphNodeInput,
  type GraphEdgeInput,
} from '../lib/complianceChecklist';

describe('Smart Compliance Checklist - Unit & Integration Tests', () => {
  const sampleNodes: GraphNodeInput[] = [
    {
      id: 'consent-to-establish',
      label: 'Consent to Establish (Pollution Control Board)',
      kind: 'approval',
      metadata: {
        category: 'consent',
        authority: 'Maharashtra Pollution Control Board (MPCB)',
        actsOrRulesRef: 'Water Act 1974 §25 & Air Act 1981 §21',
      },
    },
    {
      id: 'factory-license',
      label: 'Factory License & Plan Approval',
      kind: 'approval',
      metadata: {
        category: 'license',
        authority: 'Directorate of Industrial Safety and Health (DISH)',
        actsOrRulesRef: 'Factories Act 1948, Section 6',
      },
    },
    {
      id: 'fire-noc',
      label: 'Fire Department No-Objection Certificate',
      kind: 'approval',
      metadata: {
        category: 'consent',
        authority: 'Maharashtra Fire Services',
        actsOrRulesRef: 'Maharashtra Fire Prevention Act 2006',
      },
    },
    {
      id: 'consent-to-operate',
      label: 'Consent to Operate (Pollution Control Board)',
      kind: 'approval',
      metadata: {
        category: 'consent',
        authority: 'Maharashtra Pollution Control Board (MPCB)',
        actsOrRulesRef: 'Water Act 1974 §25 & Air Act 1981 §21',
      },
    },
  ];

  // Dependencies:
  // factory-license requires consent-to-establish
  // factory-license requires fire-noc
  // consent-to-operate requires consent-to-establish
  const sampleEdges: GraphEdgeInput[] = [
    { source: 'factory-license', target: 'consent-to-establish', relation: 'requires' },
    { source: 'factory-license', target: 'fire-noc', relation: 'requires' },
    { source: 'consent-to-operate', target: 'consent-to-establish', relation: 'requires' },
  ];

  describe('1. Graph-to-Task Transformation', () => {
    it('correctly flattens regulatory graph nodes and dependency edges into ComplianceTask[]', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);

      expect(tasks).toHaveLength(4);

      // Check consent-to-establish
      const cte = tasks.find((t) => t.approvalId === 'consent-to-establish');
      expect(cte).toBeDefined();
      expect(cte?.title).toBe('Consent to Establish (Pollution Control Board)');
      expect(cte?.authority).toBe('Maharashtra Pollution Control Board (MPCB)');
      expect(cte?.actsOrRulesRef).toBe('Water Act 1974 §25 & Air Act 1981 §21');
      expect(cte?.prerequisiteApprovalIds).toEqual([]);
      // Since it has no prerequisites and no documents uploaded, status is NOT_STARTED
      expect(cte?.status).toBe('NOT_STARTED');
      expect(cte?.requiredDocuments.length).toBeGreaterThanOrEqual(3);

      // Check factory-license prerequisites
      const fac = tasks.find((t) => t.approvalId === 'factory-license');
      expect(fac).toBeDefined();
      expect(fac?.prerequisiteApprovalIds).toContain('consent-to-establish');
      expect(fac?.prerequisiteApprovalIds).toContain('fire-noc');
      // Prerequisites are NOT READY_TO_APPLY, so factory-license must be BLOCKED
      expect(fac?.status).toBe('BLOCKED');

      // Check consent-to-operate prerequisites
      const cto = tasks.find((t) => t.approvalId === 'consent-to-operate');
      expect(cto).toBeDefined();
      expect(cto?.prerequisiteApprovalIds).toEqual(['consent-to-establish']);
      expect(cto?.status).toBe('BLOCKED');

      // Check fire-noc
      const fire = tasks.find((t) => t.approvalId === 'fire-noc');
      expect(fire).toBeDefined();
      expect(fire?.prerequisiteApprovalIds).toEqual([]);
      expect(fire?.status).toBe('NOT_STARTED');
    });

    it('gracefully handles arbitrary/custom approval nodes and generates fallback metadata', () => {
      const customNodes: GraphNodeInput[] = [
        { id: 'custom-warehouse-permit', label: 'Commercial Warehouse Clearance' },
      ];
      const tasks = transformGraphToTasks(customNodes, []);

      expect(tasks).toHaveLength(1);
      const customTask = tasks[0];
      expect(customTask.approvalId).toBe('custom-warehouse-permit');
      expect(customTask.title).toBe('Commercial Warehouse Clearance');
      expect(customTask.requiredDocuments.length).toBeGreaterThan(0);
      expect(customTask.status).toBe('NOT_STARTED');
    });
  });

  describe('2. Dynamic Task State & Prerequisite Enforcement', () => {
    it('marks a task BLOCKED if any prerequisite approval task is not READY_TO_APPLY', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);
      const factoryTask = tasks.find((t) => t.approvalId === 'factory-license')!;

      expect(factoryTask.status).toBe('BLOCKED');
      expect(factoryTask.prerequisiteApprovalIds).toEqual(['consent-to-establish', 'fire-noc']);
    });

    it('keeps a task BLOCKED if only some (not all) prerequisites are READY_TO_APPLY', () => {
      let tasks = transformGraphToTasks(sampleNodes, sampleEdges);

      // Mark consent-to-establish documents valid
      const cteIndex = tasks.findIndex((t) => t.approvalId === 'consent-to-establish');
      tasks[cteIndex].requiredDocuments.forEach((doc) => {
        if (doc.isRequired) doc.validationStatus = 'VALID';
      });

      tasks = recalculateTaskStates(tasks);

      // CTE should now be READY_TO_APPLY
      expect(tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe('READY_TO_APPLY');

      // But fire-noc is still NOT_STARTED (not ready)
      expect(tasks.find((t) => t.approvalId === 'fire-noc')?.status).toBe('NOT_STARTED');

      // Therefore factory-license remains BLOCKED because fire-noc is pending
      expect(tasks.find((t) => t.approvalId === 'factory-license')?.status).toBe('BLOCKED');

      // Meanwhile consent-to-operate only depended on CTE, so it should now be unblocked (NOT_STARTED)
      expect(tasks.find((t) => t.approvalId === 'consent-to-operate')?.status).toBe('NOT_STARTED');
    });

    it('unblocks downstream task to NOT_STARTED when all prerequisites become READY_TO_APPLY', () => {
      let tasks = transformGraphToTasks(sampleNodes, sampleEdges);

      // Mark all mandatory docs of consent-to-establish as VALID
      const cte = tasks.find((t) => t.approvalId === 'consent-to-establish')!;
      cte.requiredDocuments.forEach((doc) => {
        if (doc.isRequired) doc.validationStatus = 'VALID';
      });

      // Mark all mandatory docs of fire-noc as VALID
      const fire = tasks.find((t) => t.approvalId === 'fire-noc')!;
      fire.requiredDocuments.forEach((doc) => {
        if (doc.isRequired) doc.validationStatus = 'VALID';
      });

      tasks = recalculateTaskStates(tasks);

      // Both prerequisites are now READY_TO_APPLY
      expect(tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe('READY_TO_APPLY');
      expect(tasks.find((t) => t.approvalId === 'fire-noc')?.status).toBe('READY_TO_APPLY');

      // factory-license has all prerequisites satisfied; no docs uploaded yet -> NOT_STARTED
      expect(tasks.find((t) => t.approvalId === 'factory-license')?.status).toBe('NOT_STARTED');
    });

    it('automatically promotes task to READY_TO_APPLY only when all mandatory documents pass validation (VALID)', () => {
      let tasks = transformGraphToTasks(sampleNodes, sampleEdges);

      // 1. Initially NOT_STARTED
      expect(tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe('NOT_STARTED');

      // 2. Upload only 1 document as VALID (while others remain MISSING)
      let cte = tasks.find((t) => t.approvalId === 'consent-to-establish')!;
      cte.requiredDocuments[0].validationStatus = 'VALID';
      tasks = recalculateTaskStates(tasks);
      expect(tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe('IN_PROGRESS');

      // 3. Mark all required as VALID
      cte = tasks.find((t) => t.approvalId === 'consent-to-establish')!;
      cte.requiredDocuments.forEach((doc) => {
        if (doc.isRequired) doc.validationStatus = 'VALID';
        else doc.validationStatus = 'MISSING';
      });
      tasks = recalculateTaskStates(tasks);

      // Now promoted to READY_TO_APPLY
      expect(tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe('READY_TO_APPLY');
    });
  });

  describe('3. Document Intelligence Extraction & Validation Hook (Feature #3 Integration)', () => {
    it('extracts metadata and passes valid documents with VALID status', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);
      const docSlot = tasks[0].requiredDocuments[0];

      const validated = validateUploadedDocument(
        docSlot,
        {
          name: 'mpcb_fee_receipt_2026.pdf',
          size: 154000,
        },
        {
          businessProfileName: 'Apex Agro Industries Ltd',
        }
      );

      expect(validated.validationStatus).toBe('VALID');
      expect(validated.uploadedFileId).toBeDefined();
      expect(validated.validationIssues).toEqual([]);
      expect(validated.extractedFields).toBeDefined();
      expect(validated.extractedFields?.entity_name).toBe('Apex Agro Industries Ltd');
      expect(validated.extractedFields?.amount).toBeDefined();
      expect(validated.extractedFields?.content_hash_sha256).toBeDefined();
    });

    it('detects expired documents and marks INVALID with explicit issue details', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);
      const docSlot = tasks[0].requiredDocuments[0];

      const validated = validateUploadedDocument(
        docSlot,
        {
          name: 'fee_receipt.pdf',
          size: 120000,
        },
        {
          businessProfileName: 'Apex Agro Industries Ltd',
          forceScenario: 'expired',
        }
      );

      expect(validated.validationStatus).toBe('INVALID');
      expect(validated.validationIssues?.length).toBeGreaterThan(0);
      expect(validated.validationIssues?.[0]).toContain('Document Expired');
    });

    it('detects mismatched business entity name and marks INVALID', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);
      const docSlot = tasks[0].requiredDocuments[0];

      const validated = validateUploadedDocument(
        docSlot,
        {
          name: 'challan_mismatch.pdf',
          size: 98000,
        },
        {
          businessProfileName: 'Apex Agro Industries Ltd',
          forceScenario: 'name_mismatch',
        }
      );

      expect(validated.validationStatus).toBe('INVALID');
      expect(validated.validationIssues?.some((i) => i.includes('Entity Name Mismatch'))).toBe(true);
    });

    it('detects missing authorized signature or seal and marks INVALID', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);
      const docSlot = tasks[0].requiredDocuments[0];

      const validated = validateUploadedDocument(
        docSlot,
        {
          name: 'unsigned_draft_form.pdf',
          size: 85000,
        },
        {
          businessProfileName: 'Apex Agro Industries Ltd',
          forceScenario: 'missing_signature',
        }
      );

      expect(validated.validationStatus).toBe('INVALID');
      expect(validated.validationIssues?.some((i) => i.includes('Missing Signature'))).toBe(true);
      expect(validated.extractedFields?.signature_verified).toBe(false);
    });

    it('detects expiring-soon document and sets WARNING status', () => {
      const tasks = transformGraphToTasks(sampleNodes, sampleEdges);
      const docSlot = tasks[0].requiredDocuments[0];

      const validated = validateUploadedDocument(
        docSlot,
        {
          name: 'certificate_warning.pdf',
          size: 92000,
        },
        {
          businessProfileName: 'Apex Agro Industries Ltd',
          forceScenario: 'warning_expiring_soon',
        }
      );

      expect(validated.validationStatus).toBe('WARNING');
      expect(validated.validationIssues?.some((i) => i.includes('expires within'))).toBe(true);
    });
  });

  describe('4. Readiness Analytics & Progress Scoring', () => {
    it('calculates overall completion percentage: (Ready Approvals / Total Approvals) * 100', () => {
      const dummyTasks: ComplianceTask[] = [
        {
          approvalId: 'app-1',
          title: 'Approval 1',
          authority: 'Auth 1',
          actsOrRulesRef: 'Ref 1',
          prerequisiteApprovalIds: [],
          status: 'READY_TO_APPLY',
          requiredDocuments: [],
        },
        {
          approvalId: 'app-2',
          title: 'Approval 2',
          authority: 'Auth 2',
          actsOrRulesRef: 'Ref 2',
          prerequisiteApprovalIds: [],
          status: 'IN_PROGRESS',
          requiredDocuments: [],
        },
        {
          approvalId: 'app-3',
          title: 'Approval 3',
          authority: 'Auth 3',
          actsOrRulesRef: 'Ref 3',
          prerequisiteApprovalIds: [],
          status: 'BLOCKED',
          requiredDocuments: [],
        },
        {
          approvalId: 'app-4',
          title: 'Approval 4',
          authority: 'Auth 4',
          actsOrRulesRef: 'Ref 4',
          prerequisiteApprovalIds: [],
          status: 'READY_TO_APPLY',
          requiredDocuments: [],
        },
      ];

      // 2 ready out of 4 total -> 50%
      expect(computeOverallReadinessScore(dummyTasks)).toBe(50);

      const metrics = getChecklistMetrics(dummyTasks);
      expect(metrics.total).toBe(4);
      expect(metrics.ready).toBe(2);
      expect(metrics.inProgress).toBe(1);
      expect(metrics.blocked).toBe(1);
      expect(metrics.percentage).toBe(50);
    });
  });

  describe('5. End-to-End Integration Test: Full Compliance Lifecycle', () => {
    it('Uploading a document triggers extraction, validates against rule criteria, updates document status to VALID, and marks the task READY_TO_APPLY', () => {
      // Step 1: Initialize checklist from regulatory graph
      const checklist = createChecklistFromGraph(
        'biz-profile-001',
        sampleNodes,
        sampleEdges,
        { businessProfileName: 'Maharashtra Solar Equipment Ltd' }
      );

      expect(checklist.overallReadinessScore).toBe(0);
      expect(checklist.tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe('NOT_STARTED');
      expect(checklist.tasks.find((t) => t.approvalId === 'consent-to-operate')?.status).toBe('BLOCKED');

      // Step 2: Upload document #1 for Consent to Establish
      const cteTask = checklist.tasks.find((t) => t.approvalId === 'consent-to-establish')!;
      const doc1 = cteTask.requiredDocuments[0];

      // Simulate document upload triggering extraction and validation
      const validatedDoc1 = simulateDocumentUpload(
        doc1,
        'valid',
        'Maharashtra Solar Equipment Ltd'
      );

      expect(validatedDoc1.validationStatus).toBe('VALID');
      expect(validatedDoc1.uploadedFileId).toBeDefined();
      cteTask.requiredDocuments[0] = validatedDoc1;

      // Recalculate states
      let updatedChecklist = recalculateChecklistStates(checklist);
      expect(updatedChecklist.tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe(
        'IN_PROGRESS'
      );
      // Downstream is still blocked
      expect(updatedChecklist.tasks.find((t) => t.approvalId === 'consent-to-operate')?.status).toBe(
        'BLOCKED'
      );

      // Step 3: Attempt uploading an invalid document (expired) for document #2
      const doc2 = cteTask.requiredDocuments[1];
      const invalidDoc2 = simulateDocumentUpload(
        doc2,
        'expired',
        'Maharashtra Solar Equipment Ltd'
      );
      expect(invalidDoc2.validationStatus).toBe('INVALID');
      cteTask.requiredDocuments[1] = invalidDoc2;

      updatedChecklist = recalculateChecklistStates(updatedChecklist);
      // Task remains IN_PROGRESS because doc2 is invalid
      expect(updatedChecklist.tasks.find((t) => t.approvalId === 'consent-to-establish')?.status).toBe(
        'IN_PROGRESS'
      );

      // Step 4: Correct doc2 with a VALID document
      const validDoc2 = simulateDocumentUpload(
        doc2,
        'valid',
        'Maharashtra Solar Equipment Ltd'
      );
      cteTask.requiredDocuments[1] = validDoc2;

      // Validate remaining mandatory documents for Consent to Establish
      for (let i = 2; i < cteTask.requiredDocuments.length; i++) {
        if (cteTask.requiredDocuments[i].isRequired) {
          cteTask.requiredDocuments[i] = simulateDocumentUpload(
            cteTask.requiredDocuments[i],
            'valid',
            'Maharashtra Solar Equipment Ltd'
          );
        }
      }

      // Step 5: Recalculate - all mandatory documents are now VALID!
      updatedChecklist = recalculateChecklistStates(updatedChecklist);

      const resolvedCte = updatedChecklist.tasks.find((t) => t.approvalId === 'consent-to-establish')!;
      // Task is now READY_TO_APPLY!
      expect(resolvedCte.status).toBe('READY_TO_APPLY');

      // Downstream task (Consent to Operate) whose only prerequisite was CTE should now be unblocked!
      const resolvedCto = updatedChecklist.tasks.find((t) => t.approvalId === 'consent-to-operate')!;
      expect(resolvedCto.status).toBe('NOT_STARTED');

      // Overall readiness score updated: 1 of 4 is ready -> 25%
      expect(updatedChecklist.overallReadinessScore).toBe(25);

      // Step 6: Validate fire-noc and factory-license
      const fireTask = updatedChecklist.tasks.find((t) => t.approvalId === 'fire-noc')!;
      fireTask.requiredDocuments.forEach((d) => {
        if (d.isRequired) {
          Object.assign(d, simulateDocumentUpload(d, 'valid', 'Maharashtra Solar Equipment Ltd'));
        }
      });

      updatedChecklist = recalculateChecklistStates(updatedChecklist);
      expect(updatedChecklist.tasks.find((t) => t.approvalId === 'fire-noc')?.status).toBe('READY_TO_APPLY');

      // Now both CTE and Fire-NOC are READY_TO_APPLY, so factory-license (which depended on both) is unblocked!
      const factoryTask = updatedChecklist.tasks.find((t) => t.approvalId === 'factory-license')!;
      expect(factoryTask.status).toBe('NOT_STARTED');

      // Step 7: Complete remaining tasks to achieve 100% readiness
      factoryTask.requiredDocuments.forEach((d) => {
        if (d.isRequired) {
          Object.assign(d, simulateDocumentUpload(d, 'valid', 'Maharashtra Solar Equipment Ltd'));
        }
      });
      resolvedCto.requiredDocuments.forEach((d) => {
        if (d.isRequired) {
          Object.assign(d, simulateDocumentUpload(d, 'valid', 'Maharashtra Solar Equipment Ltd'));
        }
      });

      const finalChecklist = recalculateChecklistStates(updatedChecklist);
      expect(finalChecklist.overallReadinessScore).toBe(100);
      expect(finalChecklist.tasks.every((t) => t.status === 'READY_TO_APPLY')).toBe(true);
    });
  });
});
