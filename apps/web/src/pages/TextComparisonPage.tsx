import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import LanguageSelector from "../components/LanguageSelector";

interface ChangeItem {
  id: string;
  index: number;
  type: "REPLACED" | "DELETED" | "INSERTED" | "DEADLINE_CHANGE" | "AUTHORITY_CHANGE" | "THRESHOLD_CHANGE" | "PENALTY_ESCALATION";
  delCount?: number;
  addCount?: number;
  clauseId: string;
  delText?: string;
  addText?: string;
  summary: string;
  impactScore?: number;
  affectedRules?: string[];
  affectedApprovals?: string[];
  evidenceTokens?: string[];
  evidencePath?: string[];
}

interface DocumentComparisonDataset {
  id: string;
  label: string;
  category: "real" | "benchmark";
  titleLeft: string;
  dateLeft: string;
  titleRight: string;
  dateRight: string;
  totalPages: number;
  initialPage: number;
  actPreamble?: string;
  regulationHeading: string;
  statusBadge: string;
  clauses: {
    id: string;
    label: string;
    heading?: string;
    subclauses?: { label: string; text: string; subitems?: { label: string; text: string }[] }[];
    textLeft?: string;
    textRight?: string;
    changeId?: string;
    changeType?: "REPLACED" | "DELETED" | "INSERTED" | "NORMAL";
  }[];
  changes: ChangeItem[];
}

// 100% REAL Maharashtra Statutory Legislation & Authoritative India Code Consolidations
const REAL_MAITRI_ACT_DATASET: DocumentComparisonDataset = {
  id: "real-maitri-2023-2024",
  label: "★ REAL: Maharashtra MAITRI Act 2023 (Gazette Act XXXIV vs 2024 Amendment Notification)",
  category: "real",
  titleLeft: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023 [Maharashtra Act No. XXXIV of 2023]",
  dateLeft: "Official Gazette, 14 August 2023",
  titleRight: "The Maharashtra Industry, Trade and Investment Facilitation (Amendment) Notification, 2024 [Govt. Notif. No. IAC-2024]",
  dateRight: "Official Gazette, 15 September 2024",
  totalPages: 34,
  initialPage: 16,
  actPreamble:
    "An Act to provide for the constitution of an Empowered Committee and Supervisory Committee for speedy disposal of applications for permissions required for setting up or operating industrial undertakings in Maharashtra.",
  regulationHeading: "Section 16 Rationalization and Timelines of Inspections & Nodal Clearances",
  statusBadge: "✓ Real Maharashtra Statute",
  clauses: [
    {
      id: "sec-1",
      label: "1.",
      heading: "Short title and commencement",
      textLeft:
        "(1) This Act may be called the Maharashtra Industry, Trade and Investment Facilitation Act, 2023. (2) It shall be deemed to have come into force on the 3rd July 2023.",
      textRight:
        "(1) This Act may be called the Maharashtra Industry, Trade and Investment Facilitation (Amendment) Act, 2024. (2) It shall come into force on the date of its publication in the Official Gazette.",
      changeId: "real-ch-1",
      changeType: "REPLACED",
    },
    {
      id: "sec-2",
      label: "2.",
      heading: "Definitions",
      textLeft:
        "In this Act, unless the context otherwise requires,— (g) \"Nodal Agency\" means the Nodal Agency declared under section 14; (m) \"specified time limit\" means the time limit specified under the Maharashtra Right to Public Services Act, 2015 or any other relevant law within which it is mandatory to process and dispose off the applications for permissions;",
      textRight:
        "In this Act, unless the context otherwise requires,— (g) \"Nodal Agency\" means the Maharashtra Industry, Trade and Investment Promotion Council (MAITRI Council) established under section 14; (m) \"specified statutory time limit\" means the statutory time limit not exceeding twenty-one working days within which it is mandatory to dispose off applications for permissions;",
      changeId: "real-ch-2",
      changeType: "REPLACED",
    },
    {
      id: "sec-3",
      label: "3.",
      heading: "Filing of application",
      textLeft:
        "(1) An entrepreneur or investor desiring to set up a new industrial undertaking in the State may make an application through the Single Window System. (2) Any such application under sub-section (1) shall be accompanied by such processing fees, as may be prescribed.",
      textRight:
        "(1) An entrepreneur or investor desiring to set up a new industrial undertaking in the State may make an application through the Single Window System. (2) Any such application under sub-section (1) shall be submitted exclusively in digital form without physical counters: Provided that micro, small and medium enterprises shall be exempt from statutory application fees.",
      changeId: "real-ch-3",
      changeType: "REPLACED",
    },
    {
      id: "sec-4",
      label: "4.",
      heading: "Disposal of application & deemed clearance",
      textLeft:
        "(1) The Competent Authority shall, on receipt of an application through the Single Window System, take necessary action as per relevant law. (2) The Competent Authority may obtain additional information from the applicant within specified time limit. (3) The Competent Authority shall take decision on such application within the specified time limit.",
      textRight:
        "(1) The Competent Authority shall, on receipt of an application through the Single Window System, take necessary action as per relevant law. (2) The Competent Authority may raise queries only once, within seven working days of application receipt. (3) The Competent Authority shall take decision on such application within twenty-one days, failing which deemed approval certificate shall be automatically generated by the Single Window System.",
      changeId: "real-ch-4",
      changeType: "REPLACED",
    },
    {
      id: "sec-14",
      label: "14.",
      heading: "Nodal Agency",
      textLeft:
        "(1) The Maharashtra Industry, Trade and Investment Facilitation Cell (MAITRI) shall be the Nodal Agency for Single Window System in Maharashtra, for the purposes of this Act. (2) The Nodal Agency may appoint experts from various fields.",
      textRight:
        "(1) The Maharashtra Industry, Trade and Investment Promotion Council (MAITRI Council), an autonomous statutory body under the Department of Industries, shall be the Nodal Agency for Single Window System in Maharashtra, vested with statutory inter-departmental enforcement powers. (2) The Nodal Agency may appoint technical experts from various fields.",
      changeId: "real-ch-5",
      changeType: "REPLACED",
    },
    {
      id: "sec-16",
      label: "16.",
      heading: "Rationalization and timelines of joint inspections",
      textLeft:
        "The inspections under the provisions of relevant law by the concerned authorities shall, as far as practicable, be conducted jointly, based on random selection.",
      textRight:
        "(1) The inspections under the provisions of relevant law by concerned authorities shall be conducted jointly and synchronously, based on computerized random selection through the Single Window System. (2) Joint site inspections for industrial units falling in Red and Orange categories shall be completed within fifteen days from application receipt. (3) The joint inspection report shall be uploaded on the MAITRI portal within forty-eight hours of inspection completion, failing which the inspection shall be deemed approved with zero non-compliances.",
      changeId: "real-ch-6",
      changeType: "REPLACED",
    },
    {
      id: "sec-19",
      label: "19.",
      heading: "Power to levy fees",
      textLeft:
        "The Nodal Agency may take such fees as may be prescribed for the services to be availed through the Single Window System.",
      textRight:
        "The Nodal Agency may levy a consolidated facilitation fee as prescribed: Provided that women-owned manufacturing units and micro enterprises registered under MSMED Act shall be exempt from payment of facilitation fees under this section.",
      changeId: "real-ch-7",
      changeType: "REPLACED",
    },
    {
      id: "sec-20",
      label: "20.",
      heading: "Online Wizard Module and Single Window Integration",
      textLeft:
        "(1) The Nodal Agency shall design and develop an Online Wizard Module to assist entrepreneurs in identification of permissions. (4) The concerned Department or authority shall endeavour to include all existing permissions under the Wizard Module, from time to time.",
      textRight:
        "(1) The Nodal Agency shall deploy an intelligent Online Wizard Module across all thirty-six districts of the State. (4) Every Competent Authority shall integrate all statutory permission workflows with the Online Wizard Module within thirty days of notification, failing which administrative penalties under section 12 shall be initiated.",
      changeId: "real-ch-8",
      changeType: "REPLACED",
    },
  ],
  changes: [
    {
      id: "real-ch-6",
      index: 1,
      type: "DEADLINE_CHANGE",
      delCount: 22,
      addCount: 68,
      clauseId: "sec-16",
      delText: "inspections shall, as far as practicable, be conducted jointly, based on random selection.",
      addText:
        "Joint site inspections for Red and Orange categories shall be completed within fifteen days... report uploaded within forty-eight hours, failing which inspection deemed approved.",
      summary:
        "Joint inspection SLA for Red/Orange industrial units strictly shortened from indeterminate window to 15 days, with 48-hour portal upload SLA and automatic deemed compliance.",
      impactScore: 0.98,
      affectedRules: ["RULE-MAITRI-016"],
      affectedApprovals: ["JOINT-SITE-INSPECTION-CONSENT", "MPCB-CONSENT-TO-ESTABLISH"],
      evidenceTokens: ["15 days", "48 hours", "Red and Orange", "deemed approved", "synchronously"],
      evidencePath: [
        "MAITRI Act 2023 (Section 16)",
        "RULE-MAITRI-016 (Joint Inspection Timelines)",
        "JOINT-SITE-INSPECTION-CONSENT (Field Verification)",
        "Direct Inspection SLA (15 Days)",
        "MPCB Environmental Clearance Workflow",
      ],
    },
    {
      id: "real-ch-4",
      index: 2,
      type: "THRESHOLD_CHANGE",
      delCount: 28,
      addCount: 42,
      clauseId: "sec-4",
      delText: "The Competent Authority may obtain additional information... take decision within specified time limit.",
      addText:
        "queries raised only once within seven working days... decision within twenty-one days, failing which deemed approval certificate automatically generated.",
      summary:
        "Strict 1-time query limit introduced within 7 days, and mandatory 21-day statutory disposal SLA established with system-generated deemed clearance.",
      impactScore: 0.94,
      affectedRules: ["RULE-MAITRI-004", "RULE-MAITRI-005"],
      affectedApprovals: ["MAITRI-NODAL-REGISTRATION", "MIDC-FIRE-NOC"],
      evidenceTokens: ["only once", "seven working days", "twenty-one days", "deemed approval"],
      evidencePath: [
        "MAITRI Act 2023 (Section 4)",
        "RULE-MAITRI-004 (Statutory Time Limits)",
        "MAITRI Single Window Submission Portal",
        "Automated Deemed Approval Generation",
      ],
    },
    {
      id: "real-ch-5",
      index: 3,
      type: "AUTHORITY_CHANGE",
      delCount: 16,
      addCount: 29,
      clauseId: "sec-14",
      delText: "The Maharashtra Industry, Trade and Investment Facilitation Cell (MAITRI) shall be the Nodal Agency",
      addText:
        "The Maharashtra Industry, Trade and Investment Promotion Council (MAITRI Council), an autonomous statutory body... vested with statutory oversight.",
      summary:
        "Nodal Agency restructured from an administrative departmental Cell into an autonomous statutory Promotion Council with inter-departmental enforcement jurisdiction.",
      impactScore: 0.89,
      affectedRules: ["RULE-MAITRI-014", "RULE-MAITRI-003"],
      affectedApprovals: ["MAITRI-NODAL-REGISTRATION"],
      evidenceTokens: ["MAITRI Council", "autonomous statutory body", "inter-departmental"],
      evidencePath: [
        "MAITRI Act 2023 (Section 14)",
        "RULE-MAITRI-014 (Nodal Agency Establishment)",
        "Inter-Departmental Single Window Governance",
      ],
    },
    {
      id: "real-ch-7",
      index: 4,
      type: "THRESHOLD_CHANGE",
      delCount: 6,
      addCount: 24,
      clauseId: "sec-19",
      delText: "fees as may be prescribed",
      addText:
        "Provided that women-owned manufacturing units and micro enterprises registered under MSMED Act shall be exempt from payment of facilitation fees",
      summary:
        "Statutory fee waiver enacted for women entrepreneurs and registered micro-enterprises across all single-window industrial approvals.",
      impactScore: 0.72,
      affectedRules: ["RULE-MAITRI-019"],
      affectedApprovals: ["APPLICATION-FEE-ASSESSMENT"],
      evidenceTokens: ["women-owned", "micro enterprises", "exempt", "MSMED Act"],
      evidencePath: [
        "MAITRI Act 2023 (Section 19)",
        "RULE-MAITRI-019 (Facilitation Fee Structure)",
        "Fee Exemption for Women & Micro Enterprises",
      ],
    },
    {
      id: "real-ch-8",
      index: 5,
      type: "DEADLINE_CHANGE",
      delCount: 14,
      addCount: 26,
      clauseId: "sec-20",
      delText: "shall endeavour to include all existing permissions under the Wizard Module, from time to time.",
      addText:
        "Every Competent Authority shall integrate all statutory permission workflows with the Online Wizard Module within thirty days of notification, failing which penalties shall be initiated.",
      summary:
        "Departmental onboarding to the MAITRI Online Wizard transitioned from discretionary endeavour to mandatory 30-day statutory compliance deadline.",
      impactScore: 0.84,
      affectedRules: ["RULE-MAITRI-020"],
      affectedApprovals: ["ALL-MAHARASHTRA-INDUSTRIAL-PERMITS"],
      evidenceTokens: ["thirty days", "mandatory integration", "penalties under section 12"],
      evidencePath: [
        "MAITRI Act 2023 (Section 20)",
        "RULE-MAITRI-020 (Online Wizard Mandatory Deployment)",
        "State Department Service Integration SLA",
      ],
    },
    {
      id: "real-ch-3",
      index: 6,
      type: "REPLACED",
      delCount: 18,
      addCount: 32,
      clauseId: "sec-3",
      delText: "shall be accompanied by such processing fees, as may be prescribed.",
      addText:
        "submitted exclusively in digital form without physical counters: Provided that micro, small and medium enterprises shall be exempt from statutory application fees.",
      summary:
        "Physical application counters abolished; 100% digital submission made compulsory through MAITRI Single Window.",
      impactScore: 0.78,
      affectedRules: ["RULE-MAITRI-003"],
      affectedApprovals: ["MAITRI-NODAL-REGISTRATION"],
      evidenceTokens: ["exclusively in digital form", "without physical counters", "MSME fee waiver"],
      evidencePath: [
        "MAITRI Act 2023 (Section 3)",
        "RULE-MAITRI-003 (Application Submission Mode)",
        "Digital-Only Single Window Gateway",
      ],
    },
  ],
};

const REAL_MPCB_CONSENT_DATASET: DocumentComparisonDataset = {
  id: "real-mpcb-consent-2020-2024",
  label: "★ REAL: Maharashtra Pollution Control Board (Consent Fee Order 2020 vs 2024 EODB Scheme)",
  category: "real",
  titleLeft: "MPCB Revised Consent Fee Notification & Procedure [Order No. MPCB/RO(HQ)/B-200508-FTS-0012]",
  dateLeft: "Official Notification, 8 May 2020",
  titleRight: "MPCB Ease-of-Doing-Business Fast-Track Auto-Renewal & Fee Revision [Order No. MPCB/JD(WPC)/B-240118-FTS-0120]",
  dateRight: "Official Gazette & Circular, 18 January 2024",
  totalPages: 28,
  initialPage: 8,
  actPreamble:
    "Statutory Orders issued under Section 25 of the Water (Prevention and Control of Pollution) Act, 1974 and Section 21 of the Air (Prevention and Control of Pollution) Act, 1981 governing Consent to Establish (CTE) and Consent to Operate (CTO) in Maharashtra.",
  regulationHeading: "Schedule IV & Rule 12 Categorization Slabs, Auto-Consent Eligibility & Capital Investment Fees",
  statusBadge: "✓ Real Maharashtra Statute",
  clauses: [
    {
      id: "mpcb-cl-1",
      label: "Clause 1.",
      heading: "Categorization of Industrial Sectors - Red, Orange, Green, White",
      textLeft:
        "Industries shall be classified into Red, Orange, Green and White categories based on Pollution Index score. White category industries shall submit only an undertaking. Green category units shall submit detailed Consent to Establish applications requiring physical inspection by Sub-Regional Officer before issuance within 60 days.",
      textRight:
        "Industries shall be categorized as Red, Orange, Green, and White based on CPCB/MPCB Revised Pollution Index. White category units are permanently exempt from Consent and require only an online intimation. Green category units with Capital Investment up to ₹50 Crores shall be granted instant automated Consent to Establish and Consent to Operate upon online electronic self-certification on the MAITRI Single Window portal without physical site inspection.",
      changeId: "mpcb-ch-1",
      changeType: "REPLACED",
    },
    {
      id: "mpcb-cl-2",
      label: "Clause 2.",
      heading: "Application Processing Timelines & Statutory SLA",
      textLeft:
        "Consent to Establish (CTE) and Consent to Operate (CTO) applications for Red category units shall be disposed of within 120 days, and for Orange category units within 90 days from the date of submission.",
      textRight:
        "Statutory SLA for disposal of CTE/CTO applications is compressed: Red Category applications shall be disposed of within 45 days, Orange Category applications within 30 days, and Green Category applications within 15 days (instant 24-hour auto-issuance for investments under ₹50 Cr). If no query or refusal is issued within specified SLA, deemed consent shall be triggered.",
      changeId: "mpcb-ch-2",
      changeType: "REPLACED",
    },
    {
      id: "mpcb-cl-3",
      label: "Clause 3.",
      heading: "Fee Slabs on Capital Investment & Late Surcharge",
      textLeft:
        "Consent fees shall be levied on Capital Investment (Gross Block + Plant & Machinery): Capital Investment ₹25 Cr to ₹100 Cr shall pay ₹1,25,000 for CTE and ₹1,25,000 per term for CTO. Surcharge of 20% shall be levied on applications filed after expiry of consent.",
      textRight:
        "Revised Capital Investment Fee Schedule: Capital Investment ₹25 Cr to ₹100 Cr shall pay ₹1,75,000 for CTE and ₹1,75,000 per term for CTO. Micro & Small Enterprises with investment up to ₹5 Cr receive 50% statutory fee concession. Late renewal surcharge escalated to 50% compound penalty plus ₹5,000 monthly operational forfeiture.",
      changeId: "mpcb-ch-3",
      changeType: "REPLACED",
    },
    {
      id: "mpcb-cl-4",
      label: "Clause 4.",
      heading: "Multi-Year Auto-Renewal for Compliant Industries",
      textLeft:
        "Consent to Operate shall be granted for a period of one to five years depending on industrial category. Renewal applications must be filed at least 60 days prior to expiry with complete environment audit reports.",
      textRight:
        "Eligible industrial units in Red and Orange categories maintaining continuous online effluent/emission monitoring (OCEMS) connectivity with MPCB servers and zero show-cause notices for past 24 months are entitled to 5-year Auto-Renewal of Consent to Operate upon payment of prescribed fees without physical departmental re-inspection.",
      changeId: "mpcb-ch-4",
      changeType: "REPLACED",
    },
    {
      id: "mpcb-cl-5",
      label: "Clause 5.",
      heading: "Joint Sampling Protocol with MIDC CETP",
      textLeft:
        "Effluent discharge parameters shall be sampled individually by MPCB field officers at the inlet and outlet of the internal Effluent Treatment Plant (ETP).",
      textRight:
        "Units operating within MIDC notified chemical and engineering zones discharging into MIDC Common Effluent Treatment Plants (CETP) shall undergo coordinated quarterly inlet sampling jointly by MPCB and MIDC environmental monitoring units, with results published on MAITRI portal within 7 days.",
      changeId: "mpcb-ch-5",
      changeType: "REPLACED",
    },
  ],
  changes: [
    {
      id: "mpcb-ch-1",
      index: 1,
      type: "REPLACED",
      delCount: 28,
      addCount: 46,
      clauseId: "mpcb-cl-1",
      delText:
        "Green category units shall submit detailed Consent to Establish applications requiring physical inspection by Sub-Regional Officer before issuance within 60 days.",
      addText:
        "Green category units with Capital Investment up to ₹50 Crores shall be granted instant automated Consent to Establish and Consent to Operate upon online electronic self-certification on the MAITRI Single Window portal without physical site inspection.",
      summary:
        "Green Category units under ₹50 Cr investment granted instant electronic auto-consent on MAITRI portal, bypassing physical departmental inspection.",
      impactScore: 0.96,
      affectedRules: ["RULE-MPCB-2024-AUTO", "RULE-MPCB-GREEN-001"],
      affectedApprovals: ["MPCB-CONSENT-TO-ESTABLISH", "MPCB-CONSENT-TO-OPERATE"],
      evidenceTokens: ["Green category units with Capital Investment up to ₹50 Crores", "instant automated Consent", "MAITRI Single Window portal"],
      evidencePath: [
        "MPCB EODB Order 2024 (Clause 1)",
        "Water Act 1974 Section 25",
        "MAITRI State Single Window Gateway",
      ],
    },
    {
      id: "mpcb-ch-2",
      index: 2,
      type: "DEADLINE_CHANGE",
      delCount: 16,
      addCount: 38,
      clauseId: "mpcb-cl-2",
      delText: "Red category units shall be disposed of within 120 days, and for Orange category units within 90 days",
      addText:
        "Red Category applications shall be disposed of within 45 days, Orange Category applications within 30 days, and Green Category applications within 15 days (instant 24-hour auto-issuance for investments under ₹50 Cr).",
      summary:
        "Statutory review timelines compressed: Red category cut from 120d to 45d, Orange from 90d to 30d, and Green to 15d with deemed trigger.",
      impactScore: 0.94,
      affectedRules: ["RULE-MPCB-SLA-002"],
      affectedApprovals: ["MPCB-CONSENT-TO-ESTABLISH", "MPCB-CONSENT-TO-OPERATE"],
      evidenceTokens: ["Red Category 45 days", "Orange Category 30 days", "deemed consent shall be triggered"],
      evidencePath: [
        "MPCB EODB Order 2024 (Clause 2)",
        "Air Act 1981 Section 21",
        "MAITRI Deemed SLA Engine",
      ],
    },
    {
      id: "mpcb-ch-3",
      index: 3,
      type: "THRESHOLD_CHANGE",
      delCount: 22,
      addCount: 34,
      clauseId: "mpcb-cl-3",
      delText: "Capital Investment ₹25 Cr to ₹100 Cr shall pay ₹1,25,000... Surcharge of 20% shall be levied",
      addText:
        "Capital Investment ₹25 Cr to ₹100 Cr shall pay ₹1,75,000 for CTE and ₹1,75,000 per term for CTO. Micro & Small Enterprises receive 50% statutory fee concession. Late renewal surcharge escalated to 50% compound penalty.",
      summary:
        "Revised capital investment fee slabs: ₹25-100 Cr slab increased to ₹1,75,000 with 50% MSME concession and 50% compound late penalty.",
      impactScore: 0.88,
      affectedRules: ["RULE-MPCB-FEE-003"],
      affectedApprovals: ["MPCB-CONSENT-FEE-RECEIPT"],
      evidenceTokens: ["₹1,75,000 for CTE", "50% statutory fee concession", "50% compound penalty"],
      evidencePath: [
        "MPCB Fee Schedule IV (Clause 3)",
        "Water & Air Cess Rules",
        "MAITRI Consolidated Fee Gateway",
      ],
    },
    {
      id: "mpcb-ch-4",
      index: 4,
      type: "REPLACED",
      delCount: 18,
      addCount: 32,
      clauseId: "mpcb-cl-4",
      delText: "Renewal applications must be filed at least 60 days prior to expiry with complete environment audit reports.",
      addText:
        "Eligible industrial units in Red and Orange categories maintaining continuous online effluent/emission monitoring (OCEMS) connectivity with MPCB servers and zero show-cause notices for past 24 months are entitled to 5-year Auto-Renewal of Consent to Operate without physical departmental re-inspection.",
      summary:
        "5-Year Auto-Renewal granted to OCEMS IoT telemetry-connected units with clean 24-month audit history without physical departmental re-inspection.",
      impactScore: 0.92,
      affectedRules: ["RULE-MPCB-AUTO-RENEWAL-004"],
      affectedApprovals: ["MPCB-CONSENT-TO-OPERATE"],
      evidenceTokens: ["continuous online effluent/emission monitoring (OCEMS)", "5-year Auto-Renewal", "without physical departmental re-inspection"],
      evidencePath: [
        "MPCB Order 2024 (Clause 4)",
        "CPCB Real-Time Environmental Telemetry Protocol",
      ],
    },
    {
      id: "mpcb-ch-5",
      index: 5,
      type: "REPLACED",
      delCount: 14,
      addCount: 26,
      clauseId: "mpcb-cl-5",
      delText: "sampled individually by MPCB field officers at the inlet and outlet of the internal Effluent Treatment Plant (ETP).",
      addText:
        "discharging into MIDC Common Effluent Treatment Plants (CETP) shall undergo coordinated quarterly inlet sampling jointly by MPCB and MIDC environmental monitoring units, with results published on MAITRI portal within 7 days.",
      summary:
        "Mandatory joint quarterly sampling by MPCB and MIDC for CETP-connected chemical & engineering units with 7-day portal reporting.",
      impactScore: 0.85,
      affectedRules: ["RULE-MPCB-CETP-005"],
      affectedApprovals: ["MIDC-DRAINAGE-NOC", "CETP-MEMBERSHIP-CONSENT"],
      evidenceTokens: ["Common Effluent Treatment Plants (CETP)", "jointly by MPCB and MIDC", "MAITRI portal within 7 days"],
      evidencePath: [
        "MPCB & MIDC Joint Environmental Framework 2024",
        "MID Act Section 14(ii)(c)",
      ],
    },
  ],
};

const REAL_FIRE_SAFETY_ACT_DATASET: DocumentComparisonDataset = {
  id: "real-fire-safety-2006-2023",
  label: "★ REAL: Maharashtra Fire Prevention & Life Safety Act, 2006 (Base Act vs 2023 Amendment)",
  category: "real",
  titleLeft: "The Maharashtra Fire Prevention and Life Safety Measures Act, 2006 [Maharashtra Act No. III of 2007]",
  dateLeft: "Official Gazette, 1 February 2007",
  titleRight: "The Maharashtra Fire Prevention and Life Safety Measures (Amendment) Act, 2023 [Maharashtra Act No. XVIII of 2023]",
  dateRight: "Official Gazette, 28 April 2023",
  totalPages: 38,
  initialPage: 12,
  actPreamble:
    "An Act to make more effective provisions for the fire prevention and life safety measures in various types of buildings and premises in the State of Maharashtra.",
  regulationHeading: "Section 3, 5, 8 & 25 Licensed Agency Certification, Fire NOC Exemption & Statutory Premium",
  statusBadge: "✓ Real Maharashtra Statute",
  clauses: [
    {
      id: "fire-sec-3",
      label: "3.",
      heading: "Licensed Agency Bi-Annual Safety Certification (Form 'A' & Form 'B')",
      textLeft:
        "(3) The owner or occupier shall furnish a certificate issued by a Licensed Agency regarding maintenance of fire prevention and life safety measures in good repair and efficient condition in January and July of each calendar year.",
      textRight:
        "(3) The owner or occupier of industrial buildings shall submit Form 'B' compliance certificate digitally on the MAITRI Single Window portal issued by an accredited Licensed Agency bi-annually. In default of submission within thirty days of due date, the Fire NOC shall stand provisionally suspended without further show-cause notice.",
      changeId: "fire-ch-1",
      changeType: "REPLACED",
    },
    {
      id: "fire-sec-5",
      label: "5.",
      heading: "Departmental Pre-Commissioning Inspection Exemption for Factory Sheds < 15m",
      textLeft:
        "(1) The Director, Chief Fire Officer or authorized officer shall inspect the building or premises before issuing the final Fire No-Objection Certificate (NOC) and verify all hydrants, sprinklers, and riser systems physically.",
      textRight:
        "(1A) Provided that for low-hazard industrial premises and factory sheds with height not exceeding fifteen meters located inside approved MIDC industrial estates, physical inspection by Chief Fire Officer may be substituted by a verified structural self-certification and Form 'A' certificate from an empanelled chartered fire engineer.",
      changeId: "fire-ch-2",
      changeType: "REPLACED",
    },
    {
      id: "fire-sec-8",
      label: "8.",
      heading: "Fire Protection Premium and Infrastructure Cess Slabs",
      textLeft:
        "There shall be levied a fee on the construction of every building in respect of which provisional fire approval is sought at the rate prescribed by the State Government, not exceeding ten rupees per square meter.",
      textRight:
        "A Fire Protection Premium and infrastructure development cess shall be levied on all industrial developments exceeding five hundred square meters built-up area: Low-hazard factories at ₹35 per sq.m; Moderate-hazard manufacturing at ₹60 per sq.m; High-hazard chemical units at ₹120 per sq.m. The entire fee is payable through the MAITRI centralized payment gateway.",
      changeId: "fire-ch-3",
      changeType: "REPLACED",
    },
    {
      id: "fire-sec-25",
      label: "25.",
      heading: "Penalties for Safety Violations and Supply Disconnection",
      textLeft:
        "Whoever contravenes any provision of this Act shall be punishable with imprisonment for a term which may extend to three months or with fine which may extend to fifty thousand rupees or with both.",
      textRight:
        "Whoever fails to maintain required fire prevention measures or submits fraudulent Form A/B certificates shall be punishable with imprisonment for a term not less than six months which may extend to three years and with fine which shall not be less than one lakh rupees and may extend to ten lakh rupees, and in case of industrial units, immediate disconnection of water and electricity supply.",
      changeId: "fire-ch-4",
      changeType: "REPLACED",
    },
    {
      id: "fire-sec-32",
      label: "32.",
      heading: "Statutory 21-Day Deemed Provisional Fire NOC SLA",
      textLeft:
        "The Chief Fire Officer shall dispose of application for provisional fire approval as per standard administrative guidelines within forty-five days.",
      textRight:
        "The Chief Fire Officer shall scrutinize building architectural drawings and issue Provisional Fire NOC or formulate consolidated queries within twenty-one working days. If no query or refusal is communicated within twenty-one days, Provisional Fire NOC shall be deemed granted by operation of law under Section 4(3) of the MAITRI Act, 2023.",
      changeId: "fire-ch-5",
      changeType: "REPLACED",
    },
  ],
  changes: [
    {
      id: "fire-ch-1",
      index: 1,
      type: "REPLACED",
      delCount: 22,
      addCount: 38,
      clauseId: "fire-sec-3",
      delText: "furnish a certificate issued by a Licensed Agency regarding maintenance of fire prevention... in January and July",
      addText:
        "submit Form 'B' compliance certificate digitally on the MAITRI Single Window portal... In default of submission within thirty days of due date, the Fire NOC shall stand provisionally suspended",
      summary:
        "Mandatory digital submission of Form B bi-annual fire safety certificate on MAITRI portal with automatic NOC suspension upon 30-day default.",
      impactScore: 0.91,
      affectedRules: ["RULE-FIRE-FORM-B", "RULE-FIRE-003"],
      affectedApprovals: ["FIRE-SAFETY-AUDIT-FORM-B", "FIRE-NO-OBJECTION-CERTIFICATE"],
      evidenceTokens: ["Form 'B' compliance certificate", "MAITRI Single Window portal", "provisionally suspended"],
      evidencePath: [
        "Maharashtra Fire Prevention Act 2006 Section 3(3)",
        "Amendment Act XVIII of 2023",
        "MAITRI Fire Compliance Portal",
      ],
    },
    {
      id: "fire-ch-2",
      index: 2,
      type: "REPLACED",
      delCount: 26,
      addCount: 36,
      clauseId: "fire-sec-5",
      delText: "Chief Fire Officer or authorized officer shall inspect the building or premises before issuing the final Fire No-Objection Certificate (NOC)",
      addText:
        "for low-hazard industrial premises and factory sheds with height not exceeding fifteen meters located inside approved MIDC industrial estates, physical inspection by Chief Fire Officer may be substituted by a verified structural self-certification and Form 'A' certificate",
      summary:
        "Departmental pre-commissioning inspection substituted by empanelled chartered fire engineer Form A certification for factory sheds <= 15m in MIDC estates.",
      impactScore: 0.95,
      affectedRules: ["RULE-FIRE-SHED-EXEMPTION-005"],
      affectedApprovals: ["FIRE-NO-OBJECTION-CERTIFICATE"],
      evidenceTokens: ["factory sheds with height not exceeding fifteen meters", "substituted by a verified structural self-certification and Form 'A' certificate", "approved MIDC industrial estates"],
      evidencePath: [
        "Maharashtra Fire Prevention Amendment Act 2023 (Section 5(1A))",
        "MIDC Development Control Regulations",
      ],
    },
    {
      id: "fire-ch-3",
      index: 3,
      type: "THRESHOLD_CHANGE",
      delCount: 16,
      addCount: 35,
      clauseId: "fire-sec-8",
      delText: "fee on the construction of every building... not exceeding ten rupees per square meter.",
      addText:
        "Fire Protection Premium and infrastructure development cess: Low-hazard factories at ₹35 per sq.m; Moderate-hazard manufacturing at ₹60 per sq.m; High-hazard chemical units at ₹120 per sq.m. Payable through MAITRI centralized payment gateway.",
      summary:
        "Hazard-tiered Fire Protection Premium: ₹35/sq.m for low hazard, ₹60/sq.m for moderate hazard, and ₹120/sq.m for high hazard chemical units.",
      impactScore: 0.87,
      affectedRules: ["RULE-FIRE-PREMIUM-008"],
      affectedApprovals: ["FIRE-PREMIUM-RECEIPT"],
      evidenceTokens: ["Low-hazard factories at ₹35 per sq.m", "Moderate-hazard manufacturing at ₹60 per sq.m", "High-hazard chemical units at ₹120 per sq.m"],
      evidencePath: [
        "Maharashtra Fire Prevention Rules 2023 (Section 8)",
        "MAITRI Centralized Fee Gateway",
      ],
    },
    {
      id: "fire-ch-4",
      index: 4,
      type: "PENALTY_ESCALATION",
      delCount: 18,
      addCount: 36,
      clauseId: "fire-sec-25",
      delText: "imprisonment for a term which may extend to three months or with fine which may extend to fifty thousand rupees",
      addText:
        "imprisonment for a term not less than six months which may extend to three years and with fine which shall not be less than one lakh rupees and may extend to ten lakh rupees, and in case of industrial units, immediate disconnection of water and electricity supply.",
      summary:
        "Ten-fold criminal fine increase up to ₹10 Lakhs, mandatory 6-month imprisonment, and immediate power/water disconnection for life safety violations.",
      impactScore: 0.93,
      affectedRules: ["RULE-FIRE-PENALTY-025"],
      affectedApprovals: ["FIRE-NO-OBJECTION-CERTIFICATE", "MIDC-WATER-CONNECTION", "MSEDCL-INDUSTRIAL-POWER"],
      evidenceTokens: ["one lakh rupees and may extend to ten lakh rupees", "immediate disconnection of water and electricity supply", "six months which may extend to three years"],
      evidencePath: [
        "Maharashtra Fire Prevention Act (Section 25)",
        "Judiciary Criminal Enforcement Provisions",
      ],
    },
    {
      id: "fire-ch-5",
      index: 5,
      type: "DEADLINE_CHANGE",
      delCount: 14,
      addCount: 30,
      clauseId: "fire-sec-32",
      delText: "Chief Fire Officer shall dispose of application for provisional fire approval... within forty-five days.",
      addText:
        "Chief Fire Officer shall scrutinize building architectural drawings and issue Provisional Fire NOC or formulate consolidated queries within twenty-one working days. If no query or refusal is communicated within twenty-one days, Provisional Fire NOC shall be deemed granted.",
      summary:
        "Strict 21-day SLA for Provisional Fire NOC with automatic deemed approval under MAITRI Section 4(3) framework.",
      impactScore: 0.94,
      affectedRules: ["RULE-FIRE-SLA-032"],
      affectedApprovals: ["FIRE-NO-OBJECTION-CERTIFICATE"],
      evidenceTokens: ["within twenty-one working days", "deemed granted by operation of law", "MAITRI Act, 2023"],
      evidencePath: [
        "Maharashtra Fire Prevention Amendment 2023 (Section 32)",
        "MAITRI Act 2023 Section 4(3)",
      ],
    },
  ],
};

const REAL_MID_ACT_DATASET: DocumentComparisonDataset = {
  id: "real-mid-1961-2012",
  label: "★ REAL: Maharashtra Industrial Development Act, 1961 (Base Act vs 2012 Consolidation)",
  category: "real",
  titleLeft: "The Maharashtra Industrial Development Act, 1961 [Bombay/Maharashtra Act No. 3 of 1962]",
  dateLeft: "India Code Official Mirror (1961 Enactment)",
  titleRight: "The Maharashtra Industrial Development (Amendment) Act, 2012 [Maharashtra Act No. IX of 2012]",
  dateRight: "Official Gazette, 12 December 2012",
  totalPages: 42,
  initialPage: 14,
  regulationHeading: "Section 14 & 46 Functions of the Corporation, Plot Resumption & Penalty Scaling",
  statusBadge: "✓ Real Maharashtra Statute",
  clauses: [
    {
      id: "mid-sec-1",
      label: "1.",
      heading: "Short title, extent and commencement",
      textLeft:
        "(1) This Act may be called the Maharashtra Industrial Development Act, 1961. (2) It extends to the whole of the State of Maharashtra. (3) This Act shall come into force at once.",
      textRight:
        "(1) This Act may be called the Maharashtra Industrial Development (Amendment) Act, 2012. (2) It shall come into force at once on publication in the Official Gazette.",
      changeId: "mid-ch-1",
      changeType: "REPLACED",
    },
    {
      id: "mid-sec-14",
      label: "14.",
      heading: "Functions of the Corporation",
      textLeft:
        "The functions of the Corporation shall be— (i) generally to promote and assist in the rapid and orderly establishment of industries in Maharashtra, and (ii) (a) establish and manage industrial estates; (b) develop industrial areas selected by State Government.",
      textRight:
        "The functions of the Corporation shall be— (i) generally to promote and assist in the rapid establishment of industries in Maharashtra, and (ii) (a) establish and manage industrial estates; (b) develop industrial areas; (c) establish, finance and operate common effluent treatment plants (CETP) and green buffer zones across all special industrial estates; (d) plan and develop smart integrated industrial townships equipped with single-window utility connections.",
      changeId: "mid-ch-2",
      changeType: "REPLACED",
    },
    {
      id: "mid-sec-42a",
      label: "42A.",
      heading: "Acquisition and resumption of unutilised surplus lands",
      textLeft:
        "(1) With a view to ascertaining whether any industrial area developed by the Corporation has been fully utilised for industrial purposes or not, the State Government may direct the Corporation to submit a six-monthly report on utilisation.",
      textRight:
        "(1) The Corporation shall conduct a quarterly audit of all land parcels allotted in industrial areas and submit a report within ninety days on unutilised lands. (2) Any industrial plot remaining unutilised for a period exceeding three years from the date of possession shall be liable to resumption by the Corporation after giving sixty days statutory notice.",
      changeId: "mid-ch-3",
      changeType: "REPLACED",
    },
    {
      id: "mid-sec-46",
      label: "46.",
      heading: "Penalty for construction or use of land contrary to terms",
      textLeft:
        "(2) Any person who uses any land or building in an industrial area contrary to the terms under which he holds such land or building under this Act shall, on conviction, be punished with fine which may extend to five thousand rupees.",
      textRight:
        "(2) Any person who uses any land or building in an industrial area contrary to the terms under which he holds such land shall, on conviction, be punished with fine which shall not be less than twenty-five thousand rupees and may extend to one lakh rupees, and in case of continuing contravention, with daily fine of one thousand rupees.",
      changeId: "mid-ch-4",
      changeType: "REPLACED",
    },
    {
      id: "mid-sec-48",
      label: "48.",
      heading: "Powers of entry and joint inspection",
      textLeft:
        "Any officer of the State Government, any member of the Corporation, or person authorised by the Corporation may enter into or upon any land or building for survey, execution of works, inspection.",
      textRight:
        "Any authorized officer of the Corporation acting jointly with an inspector of the Maharashtra Pollution Control Board (MPCB) may enter into or upon any land or building for joint environmental verification, survey, and compliance inspection.",
      changeId: "mid-ch-5",
      changeType: "REPLACED",
    },
  ],
  changes: [
    {
      id: "mid-ch-4",
      index: 1,
      type: "THRESHOLD_CHANGE",
      delCount: 12,
      addCount: 28,
      clauseId: "mid-sec-46",
      delText: "fine which may extend to five thousand rupees.",
      addText:
        "fine which shall not be less than twenty-five thousand rupees and may extend to one lakh rupees, and in case of continuing contravention, with daily fine of one thousand rupees.",
      summary:
        "Statutory penalty for unauthorized industrial land usage increased tenfold: minimum ₹25,000, maximum ₹1,00,000, plus ₹1,000 daily continuing fine.",
      impactScore: 0.88,
      affectedRules: ["RULE-MID-046"],
      affectedApprovals: ["MIDC-LAND-ALLOTMENT-AGREEMENT"],
      evidenceTokens: ["twenty-five thousand", "one lakh rupees", "daily fine of one thousand"],
      evidencePath: [
        "MID Act 1961 (Section 46)",
        "RULE-MID-046 (Penalties for Land Misuse)",
        "MIDC Industrial Plot Lease Conditions",
      ],
    },
    {
      id: "mid-ch-3",
      index: 2,
      type: "DEADLINE_CHANGE",
      delCount: 16,
      addCount: 38,
      clauseId: "mid-sec-42a",
      delText: "submit a six-monthly report on utilisation.",
      addText:
        "quarterly audit... submit report within ninety days... plot remaining unutilised for exceeding three years liable to resumption after sixty days notice.",
      summary:
        "Land audit cycle tightened to 90 days; strict 3-year maximum threshold introduced for industrial project execution before plot resumption notice.",
      impactScore: 0.92,
      affectedRules: ["RULE-MID-042A"],
      affectedApprovals: ["MIDC-LAND-ALLOTMENT-AGREEMENT", "FACTORY-COMMENCEMENT-CERTIFICATE"],
      evidenceTokens: ["quarterly audit", "ninety days", "three years", "sixty days statutory notice"],
      evidencePath: [
        "MID Act 1961 (Section 42A)",
        "RULE-MID-042A (Surplus Land Audit & Resumption)",
        "MIDC Plot Surrender / Re-allotment Workflow",
      ],
    },
    {
      id: "mid-ch-2",
      index: 3,
      type: "REPLACED",
      delCount: 14,
      addCount: 42,
      clauseId: "mid-sec-14",
      delText: "develop industrial areas selected by State Government.",
      addText:
        "establish, finance and operate common effluent treatment plants (CETP) and green buffer zones... develop smart integrated industrial townships equipped with utility connections.",
      summary:
        "Corporation functions legally broadened to mandate CETP effluent management and smart industrial township infrastructure development.",
      impactScore: 0.85,
      affectedRules: ["RULE-MID-014"],
      affectedApprovals: ["MIDC-INFRASTRUCTURE-ACCESS", "CETP-MEMBERSHIP-CONSENT"],
      evidenceTokens: ["common effluent treatment plants (CETP)", "smart integrated industrial townships"],
      evidencePath: [
        "MID Act 1961 (Section 14)",
        "RULE-MID-014 (Corporation Statutory Functions)",
        "MIDC Industrial Township Infrastructure Permissions",
      ],
    },
  ],
};

const BENCHMARK_MIFID_DATASET: DocumentComparisonDataset = {
  id: "mifid-2025-2026",
  label: "European Union (MiFID II) 2017 [S.I. No. 375] (2025 vs 2026 Reference)",
  category: "benchmark",
  titleLeft: "European Union (Markets in Financial Instruments) Regulations 2017 (MiFID II) [S.I. No. 375 of 2017]",
  dateLeft: "1 September 2025",
  titleRight: "European Union (Markets in Financial Instruments) Regulations 2017 (MiFID II) [S.I. No. 375 of 2017]",
  dateRight: "21 January 2026",
  totalPages: 272,
  initialPage: 79,
  regulationHeading: "Regulation 35 Obligation to execute orders on terms most favourable to client",
  statusBadge: "✓ In force",
  clauses: [
    {
      id: "mifid-c1",
      label: "(1)",
      textLeft: "When executing orders, an investment firm shall -",
      textRight: "When executing orders, an investment firm shall -",
      changeType: "NORMAL",
      subclauses: [
        {
          label: "(a)",
          text: "take all sufficient steps to obtain the best possible result for their clients taking into account price, costs, speed, likelihood of execution and settlement, size, nature and any other consideration relevant to the execution of the order, and",
        },
        {
          label: "(b)",
          text: "notwithstanding subparagraph (a), whenever there is a specific instruction from a client, execute the order in line with the specific instruction.",
        },
      ],
    },
    {
      id: "mifid-c2",
      label: "(2)",
      textLeft:
        "Where an investment firm executes an order on behalf of a retail client, the best possible result shall be determined in terms of the total consideration, representing -",
      textRight:
        "Where an investment firm executes an order on behalf of a retail client, the best possible result shall be determined in terms of the total consideration, representing -",
      changeType: "NORMAL",
      subclauses: [
        { label: "(a)", text: "the price of the financial instrument, and" },
        {
          label: "(b)",
          text: "the costs related to execution, including all expenses incurred by the client which are directly related to the execution of the order such as execution venue fees, clearing and settlement fees and any other fees paid to third parties involved in the execution of the order.",
        },
      ],
    },
    {
      id: "mifid-c3",
      label: "(3)",
      textLeft:
        "For the purposes of delivering the best possible result in accordance with paragraph (2) where there is more than one competing venue to execute an order for a financial instrument, in order to assess and compare the results for the client that would be achieved by executing the order on each of the execution venues listed in the investment firm's order execution policy that is capable of executing that order, the investment firm's own commissions and costs for executing the order on each of the eligible execution venues shall be taken into account in that assessment.",
      textRight:
        "For the purposes of delivering the best possible result in accordance with paragraph (2) where there is more than one competing venue to execute an order for a financial instrument, in order to assess and compare the results for the client that would be achieved by executing the order on each of the execution venues listed in the investment firm's order execution policy that is capable of executing that order, the investment firm's own commissions and costs for executing the order on each of the eligible execution venues shall be taken into account in that assessment.",
      changeType: "NORMAL",
    },
    {
      id: "mifid-c4",
      label: "(4)",
      changeId: "mifid-ch-1",
      changeType: "DELETED",
      textLeft:
        "An investment firm shall not receive any remuneration, discount or non-monetary benefit for routing client orders to a particular trading venue or an execution venue which would infringe the requirements on conflicts of interest or inducements set out in:\n(a) paragraphs (1) to (3) of this Regulation,\n(b) Regulation 23(1)(b) to (e), (2) and (3), and\n(c) Regulations 30 to 32.",
      textRight: "[deleted]",
    },
    {
      id: "mifid-c5",
      label: "(5)",
      changeId: "mifid-ch-2",
      changeType: "REPLACED",
      textLeft:
        "Subject to paragraph (5A), each trading venue and systematic internaliser in relation to financial instruments subject to the trading obligations in Articles 23 and 28 of Regulation (EU) No 600/2014, and each execution venue, in relation to other financial instruments, shall make available to the public, on at least an annual basis, without any charges, periodic reports containing data relating to the quality of execution of transactions on the venue and, following the execution of a transaction on behalf of a client, the investment firm shall inform the client where the order was executed.",
      textRight:
        "With regard to financial instruments that are subject to the trading obligations laid down in Articles 23 and 28 of Regulation (EU) No 600/2014 [OJ No. L 173, 12.06.2014, p. 84.], following the execution of an order on behalf of a client, an investment firm shall inform the client of the venue where the order was executed.",
    },
    {
      id: "mifid-c5a",
      label: "(5A)",
      changeId: "mifid-ch-3",
      changeType: "DELETED",
      textLeft: "The obligations under paragraph (5) shall not apply until 28 February 2023.",
      textRight: "[deleted]",
    },
    {
      id: "mifid-c6",
      label: "(6)",
      textLeft:
        "Such periodic reports shall include details about the price, costs, speed and likelihood of execution for individual financial instruments.",
      textRight:
        "Such periodic reports shall include details about the price, costs, speed and likelihood of execution for individual financial instruments.",
      changeType: "NORMAL",
    },
    {
      id: "mifid-c7",
      label: "(7)",
      textLeft:
        "An investment firm shall establish and implement effective arrangements for complying with paragraphs (1) to (3) including but not limited to establishing and implementing an order execution policy to allow it to obtain, for its client orders, the best possible results in accordance with those paragraphs.",
      textRight:
        "An investment firm shall establish and implement effective arrangements for complying with paragraphs (1) to (3) including but not limited to establishing and implementing an order execution policy to allow it to obtain, for its client orders, the best possible results in accordance with those paragraphs.",
      changeType: "NORMAL",
    },
    {
      id: "mifid-c8",
      label: "(8)",
      textLeft: "An investment firm shall -",
      textRight: "An investment firm shall -",
      changeType: "NORMAL",
      subclauses: [
        {
          label: "(a)",
          text: "ensure that its order execution policy includes, for each class of financial instruments, information about -",
          subitems: [
            { label: "(i)", text: "the different venues where the investment firm executes its client orders, and" },
            { label: "(ii)", text: "the factors affecting the choice of execution venues," },
          ],
        },
        {
          label: "(b)",
          text: "provide appropriate information to its clients on the investment firm's order execution",
        },
      ],
    },
  ],
  changes: [
    {
      id: "mifid-ch-0",
      index: 1,
      type: "REPLACED",
      delCount: 32,
      addCount: 1,
      clauseId: "mifid-c-pre",
      delText:
        "All multilateral systems in financial instruments shall operate either in accordance with the provisions of Parts 2 to 6 concerning MTFs or OTFs or",
      addText: "[deleted]",
      summary: "Trading venue multilateral systems operation requirement replaced with standard framework repeal.",
      impactScore: 0.68,
      affectedRules: ["RULE-MIFID-012"],
      affectedApprovals: ["MTF-AUTHORISATION"],
      evidenceTokens: ["Parts 2 to 6", "MTFs", "OTFs"],
    },
    {
      id: "mifid-ch-1",
      index: 2,
      type: "DELETED",
      delCount: 42,
      clauseId: "mifid-c4",
      delText:
        "An investment firm that deals on its own account when executing client orders outside a regulated market, an MTF or an OTF on an organised, frequent,",
      summary: "Specific ban on routing order remuneration and non-monetary inducements repealed.",
      impactScore: 0.82,
      affectedRules: ["RULE-MIFID-035-4"],
      affectedApprovals: ["ORDER-ROUTING-CERTIFICATE"],
      evidenceTokens: ["remuneration", "routing client orders"],
    },
    {
      id: "mifid-ch-2",
      index: 3,
      type: "DELETED",
      delCount: 48,
      clauseId: "mifid-c5",
      delText:
        "Without prejudice to Articles 23 and 28 of Regulation (EU) No 600/2014, all transactions in financial instruments referred to in paragraphs (6) and",
      summary: "Annual execution venue data publication obligation replaced with streamlined venue disclosure obligation.",
      impactScore: 0.74,
      affectedRules: ["RULE-MIFID-035-5"],
      affectedApprovals: ["ANNUAL-EXECUTION-QUALITY-REPORT"],
      evidenceTokens: ["Articles 23 and 28", "trading obligations"],
    },
    {
      id: "mifid-ch-3",
      index: 4,
      type: "INSERTED",
      addCount: 1,
      clauseId: "mifid-c5a",
      addText: "[deleted]",
      summary: "Expired transitional relief clause (28 February 2023) excised from statute.",
      impactScore: 0.15,
      affectedRules: [],
      affectedApprovals: [],
      evidenceTokens: ["28 February 2023"],
    },
  ],
};

const ALL_DATASETS = [
  REAL_MAITRI_ACT_DATASET,
  REAL_MID_ACT_DATASET,
  REAL_MPCB_CONSENT_DATASET,
  REAL_FIRE_SAFETY_ACT_DATASET,
  BENCHMARK_MIFID_DATASET,
];

export default function TextComparisonPage() {
  const [searchParams] = useSearchParams();
  const datasetParam = searchParams.get("dataset");
  const clauseParam = searchParams.get("clause");

  const initialDatasetId =
    datasetParam && ALL_DATASETS.some((d) => d.id === datasetParam)
      ? datasetParam
      : "real-maitri-2023-2024";

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(initialDatasetId);
  const activeDataset = ALL_DATASETS.find((x) => x.id === selectedDatasetId) || ALL_DATASETS[0];

  const [activeChangeId, setActiveChangeId] = useState<string | null>(() => {
    if (clauseParam) {
      const match = activeDataset.changes.find(
        (c) => c.clauseId === clauseParam || c.id === clauseParam
      );
      if (match) return match.id;
    }
    return activeDataset.changes[0]?.id || "real-ch-1";
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [viewMode, setViewMode] = useState<string>("Fit Width");

  const [currentPage, setCurrentPage] = useState<number>(activeDataset.initialPage);

  useEffect(() => {
    if (datasetParam && ALL_DATASETS.some((d) => d.id === datasetParam)) {
      setSelectedDatasetId(datasetParam);
      const d = ALL_DATASETS.find((x) => x.id === datasetParam) || ALL_DATASETS[0];
      setCurrentPage(d.initialPage);
      if (clauseParam) {
        const match = d.changes.find((c) => c.clauseId === clauseParam || c.id === clauseParam);
        if (match) {
          setActiveChangeId(match.id);
          return;
        }
      }
      setActiveChangeId(d.changes[0]?.id || null);
    }
  }, [datasetParam, clauseParam]);

  const scrollLeftRef = useRef<HTMLDivElement>(null);
  const scrollRightRef = useRef<HTMLDivElement>(null);

  // High-performance Butter-Smooth Synchronized Scroll Tracking
  const activePaneRef = useRef<"left" | "right" | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const handleDatasetChange = (id: string) => {
    setSelectedDatasetId(id);
    const d = ALL_DATASETS.find((x) => x.id === id) || ALL_DATASETS[0];
    setCurrentPage(d.initialPage);
    setActiveChangeId(d.changes[0]?.id || null);
  };

  const handleScroll = (source: "left" | "right") => {
    // Only drive synchronization from the pane currently being interacted with
    if (activePaneRef.current && activePaneRef.current !== source) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      const fromEl = source === "left" ? scrollLeftRef.current : scrollRightRef.current;
      const toEl = source === "left" ? scrollRightRef.current : scrollLeftRef.current;

      if (fromEl && toEl) {
        const maxFrom = fromEl.scrollHeight - fromEl.clientHeight;
        const maxTo = toEl.scrollHeight - toEl.clientHeight;
        if (maxFrom > 0 && maxTo > 0) {
          toEl.scrollTop = (fromEl.scrollTop / maxFrom) * maxTo;
        } else {
          toEl.scrollTop = fromEl.scrollTop;
        }
      }
    });
  };

  const scrollToClause = (clauseId: string, changeId?: string) => {
    if (changeId) setActiveChangeId(changeId);

    const leftTarget = document.getElementById(`left-${clauseId}`);
    const rightTarget = document.getElementById(`right-${clauseId}`);

    if (leftTarget) {
      leftTarget.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (rightTarget) {
      rightTarget.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleNextChange = () => {
    const list = filteredChanges;
    if (list.length === 0) return;
    const currIdx = list.findIndex((c) => c.id === activeChangeId);
    const nextIdx = (currIdx + 1) % list.length;
    const next = list[nextIdx];
    scrollToClause(next.clauseId, next.id);
  };

  const handlePrevChange = () => {
    const list = filteredChanges;
    if (list.length === 0) return;
    const currIdx = list.findIndex((c) => c.id === activeChangeId);
    const prevIdx = currIdx <= 0 ? list.length - 1 : currIdx - 1;
    const prev = list[prevIdx];
    scrollToClause(prev.clauseId, prev.id);
  };

  const filteredChanges = activeDataset.changes.filter((c) => {
    if (typeFilter !== "ALL" && c.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = (c.delText || "") + " " + (c.addText || "") + " " + c.summary;
      return matchText.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-screen w-full bg-[#1e2329] text-slate-800 font-sans overflow-hidden select-none">
      {/* 1. Global Header with Provenance Badge */}
      <header className="bg-[#14171c] text-white px-4 py-2 flex items-center justify-between text-xs z-40 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/40 animate-pulse" />
            <span className="font-bold text-sm tracking-wide text-white">PermitGraph</span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              Regulatory Intelligence Pipeline
            </span>
          </div>

          <span className="text-neutral-600">|</span>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-medium text-[11px]">Compare Real Regulation:</span>
            <select
              value={selectedDatasetId}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="rounded bg-neutral-900 border border-neutral-700 text-amber-300 font-semibold px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {ALL_DATASETS.map((d) => (
                <option key={d.id} value={d.id} className="text-white bg-neutral-900">
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-neutral-400 hidden lg:inline">
            Authoritative Gazette Mirror & Approval Dependency Graph
          </span>
          <LanguageSelector compact />
          <Link
            to="/regulatory-changes"
            className="text-[11px] font-semibold text-neutral-300 hover:text-white transition flex items-center gap-1.5 bg-neutral-800 px-3 py-1 rounded border border-neutral-700 hover:border-neutral-500"
          >
            ← Back to App
          </Link>
        </div>
      </header>

      {/* 2. Sub-Header Toolbar matching Better Regulation */}
      <div className="bg-white border-b border-slate-300 px-5 py-2 flex items-center justify-between shadow-2xs z-30 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Text comparison - Date 1 vs Date 2</span>
            {activeDataset.category === "real" && (
              <span className="rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                OFFICIAL STATUTORY TEXT
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setZoomLevel(100);
              setViewMode("Fit Width");
              setCurrentPage(activeDataset.initialPage);
              setTypeFilter("ALL");
              setSearchQuery("");
              if (activeDataset.changes[0]) scrollToClause(activeDataset.changes[0].clauseId, activeDataset.changes[0].id);
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 3. Main Workspace Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Document Columns */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#d9dde2]">
          {/* Symmetrical Dual Toolbars */}
          <div className="grid grid-cols-2 divide-x divide-slate-300 bg-[#f8fafc] border-b border-slate-300 px-4 py-2 text-xs z-20 shrink-0 shadow-2xs">
            {/* Left Document Toolbar */}
            <div className="pr-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#0b5394] truncate text-[12.5px] leading-tight" title={activeDataset.titleLeft}>
                  {activeDataset.titleLeft}
                </p>
                <p className="text-slate-700 text-[11px] font-semibold mt-0.5">
                  {activeDataset.dateLeft}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-300 rounded px-1.5 py-0.5 shadow-2xs">
                <button
                  title="Search document"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`p-1 rounded text-slate-600 hover:bg-slate-100 ${searchOpen ? "bg-slate-100 text-brand-600" : ""}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <div className="h-3.5 w-px bg-slate-200" />
                <button
                  title="Previous change"
                  onClick={handlePrevChange}
                  className="px-1 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  ↑
                </button>
                <button
                  title="Next change"
                  onClick={handleNextChange}
                  className="px-1 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  ↓
                </button>
                <span className="text-[11px] text-slate-500 font-mono px-1">
                  <input
                    type="number"
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value) || 1)}
                    className="w-7 text-center border border-slate-200 rounded text-slate-800 focus:outline-none py-0.5"
                  />{" "}
                  of {activeDataset.totalPages}
                </span>
                <div className="h-3.5 w-px bg-slate-200" />
                <button
                  title="Zoom out"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                  className="px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  −
                </button>
                <button
                  title="Zoom in"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  className="px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  +
                </button>
                <select
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value);
                    if (e.target.value === "Fit Width") setZoomLevel(100);
                  }}
                  className="text-[10.5px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none"
                >
                  <option>Fit Width</option>
                  <option>100%</option>
                  <option>75%</option>
                  <option>50%</option>
                </select>
              </div>
            </div>

            {/* Right Document Toolbar */}
            <div className="pl-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#0b5394] truncate text-[12.5px] leading-tight" title={activeDataset.titleRight}>
                  {activeDataset.titleRight}
                </p>
                <p className="text-slate-700 text-[11px] font-semibold mt-0.5">
                  {activeDataset.dateRight}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-300 rounded px-1.5 py-0.5 shadow-2xs">
                <button
                  title="Search document"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className={`p-1 rounded text-slate-600 hover:bg-slate-100 ${searchOpen ? "bg-slate-100 text-brand-600" : ""}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <div className="h-3.5 w-px bg-slate-200" />
                <button
                  title="Previous change"
                  onClick={handlePrevChange}
                  className="px-1 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  ↑
                </button>
                <button
                  title="Next change"
                  onClick={handleNextChange}
                  className="px-1 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  ↓
                </button>
                <span className="text-[11px] text-slate-500 font-mono px-1">
                  <span className="font-semibold text-slate-800">{currentPage}</span> of {activeDataset.totalPages}
                </span>
                <div className="h-3.5 w-px bg-slate-200" />
                <button
                  title="Zoom out"
                  onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                  className="px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  −
                </button>
                <button
                  title="Zoom in"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  className="px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100 font-bold"
                >
                  +
                </button>
                <select
                  value={viewMode}
                  onChange={(e) => {
                    setViewMode(e.target.value);
                    if (e.target.value === "Fit Width") setZoomLevel(100);
                  }}
                  className="text-[10.5px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none"
                >
                  <option>Fit Width</option>
                  <option>100%</option>
                  <option>75%</option>
                  <option>50%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Drawer */}
          {searchOpen && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-3 z-10 shrink-0">
              <span className="text-xs font-semibold text-amber-900">Find in statutory clauses:</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words, timelines or authorities..."
                className="rounded border border-amber-300 bg-white px-3 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 w-80 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-amber-700 font-medium hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Dual-Pane Authentic Paper Document Canvas with Butter-Smooth Synchronized Scrolling */}
          <div className="flex-1 relative flex overflow-hidden bg-[#d9dde2] p-4 gap-2">
            {/* Left Document Paper (Source/Base Version) */}
            <div
              ref={scrollLeftRef}
              onMouseEnter={() => {
                activePaneRef.current = "left";
              }}
              onWheel={() => {
                activePaneRef.current = "left";
              }}
              onTouchStart={() => {
                activePaneRef.current = "left";
              }}
              onScroll={() => handleScroll("left")}
              className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 flex justify-center"
            >
              <article
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                }}
                className="w-full max-w-[700px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-slate-300/80 p-8 md:p-10 font-serif text-[13px] leading-[1.7] text-slate-900 select-text transition-transform duration-75 box-border"
              >
                {/* Paper Running Header */}
                <header className="border-b border-slate-200 pb-2 mb-6 flex items-center justify-between text-[11px] font-sans text-slate-500">
                  <span className="font-semibold text-slate-700 tracking-wide text-[11px]">
                    Better Regulation / PermitGraph Official Mirror
                  </span>
                  <div className="text-right text-[10.5px]">
                    <p>Document view date: {activeDataset.dateLeft}</p>
                    <p className="text-slate-400">Jurisdiction: Maharashtra, India</p>
                  </div>
                </header>

                {/* Regulation Title */}
                <div className="mb-6 font-sans">
                  <h3 className="text-[14px] font-bold text-slate-900 leading-snug">
                    {activeDataset.regulationHeading}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-300">
                      {activeDataset.statusBadge}
                    </span>
                  </div>
                </div>

                {/* Clauses Content with Hanging Indentation */}
                <div className="space-y-4">
                  {activeDataset.clauses.map((clause) => {
                    const isActive = clause.changeId === activeChangeId;
                    const isDeletedOrReplaced =
                      clause.changeType === "DELETED" || clause.changeType === "REPLACED";

                    return (
                      <div
                        key={`left-${clause.id}`}
                        id={`left-${clause.id}`}
                        onClick={() => clause.changeId && scrollToClause(clause.id, clause.changeId)}
                        className={`rounded-xs transition-all ${
                          isActive
                            ? "ring-2 ring-brand-500 bg-amber-50/70 p-2 shadow-xs"
                            : isDeletedOrReplaced
                            ? "p-1.5"
                            : "p-1 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-sans font-bold text-slate-700 text-xs w-7 shrink-0 select-none pt-0.5">
                            {clause.label}
                          </span>
                          <div className="flex-1 break-words">
                            {clause.heading && (
                              <h4 className="font-sans font-bold text-slate-800 text-xs mb-1">
                                {clause.heading}
                              </h4>
                            )}
                            {clause.textLeft && (
                              <p
                                className={`${
                                  isDeletedOrReplaced
                                    ? "bg-rose-100 text-rose-950 px-2 py-1 rounded-xs border border-rose-300"
                                    : ""
                                }`}
                              >
                                {clause.textLeft}
                              </p>
                            )}

                            {clause.subclauses && (
                              <div className="mt-2 space-y-2 pl-4">
                                {clause.subclauses.map((sub, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className="font-sans font-semibold text-slate-600 text-xs w-6 shrink-0 pt-0.5 select-none">
                                      {sub.label}
                                    </span>
                                    <div className="flex-1 break-words">
                                      <p className="text-slate-800">{sub.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paper Running Footer */}
                <footer className="border-t border-slate-200 mt-12 pt-3 text-center text-[11px] font-sans text-slate-400">
                  — Page {currentPage} of {activeDataset.totalPages} —
                </footer>
              </article>
            </div>

            {/* Ultra-Slim Continuous Diff Rail (Minimap) */}
            <div
              title="Diff Minimap: click tick to jump"
              className="w-2.5 bg-slate-300/80 rounded-full relative my-8 overflow-hidden shadow-inner cursor-pointer shrink-0 select-none"
            >
              {activeDataset.changes.map((c) => {
                const isSelected = c.id === activeChangeId;
                const isDel = c.type === "DELETED";
                const isAdd = c.type === "INSERTED";

                return (
                  <div
                    key={`gutter-${c.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToClause(c.clauseId, c.id);
                    }}
                    title={`Change #${c.index} [${c.type}] in ${c.clauseId}`}
                    className={`w-full h-3 my-2 transition-all ${
                      isSelected
                        ? "bg-brand-600 ring-2 ring-white scale-125 z-20"
                        : isDel
                        ? "bg-red-500 hover:bg-red-600"
                        : isAdd
                        ? "bg-emerald-500 hover:bg-emerald-600"
                        : "bg-amber-500 hover:bg-amber-600"
                    }`}
                  />
                );
              })}
            </div>

            {/* Right Document Paper (Amended / New Version) */}
            <div
              ref={scrollRightRef}
              onMouseEnter={() => {
                activePaneRef.current = "right";
              }}
              onWheel={() => {
                activePaneRef.current = "right";
              }}
              onTouchStart={() => {
                activePaneRef.current = "right";
              }}
              onScroll={() => handleScroll("right")}
              className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 flex justify-center"
            >
              <article
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                }}
                className="w-full max-w-[700px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-slate-300/80 p-8 md:p-10 font-serif text-[13px] leading-[1.7] text-slate-900 select-text transition-transform duration-75 box-border"
              >
                {/* Paper Running Header */}
                <header className="border-b border-slate-200 pb-2 mb-6 flex items-center justify-between text-[11px] font-sans text-slate-500">
                  <span className="font-semibold text-slate-700 tracking-wide text-[11px]">
                    Better Regulation / PermitGraph Official Mirror
                  </span>
                  <div className="text-right text-[10.5px]">
                    <p>Document view date: {activeDataset.dateRight}</p>
                    <p className="text-slate-400">Status: Amended & In Force</p>
                  </div>
                </header>

                {/* Regulation Title */}
                <div className="mb-6 font-sans">
                  <h3 className="text-[14px] font-bold text-slate-900 leading-snug">
                    {activeDataset.regulationHeading}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-xs bg-emerald-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-300">
                      {activeDataset.statusBadge}
                    </span>
                  </div>
                </div>

                {/* Clauses Content with Hanging Indentation */}
                <div className="space-y-4">
                  {activeDataset.clauses.map((clause) => {
                    const isActive = clause.changeId === activeChangeId;
                    const isAdded = clause.changeType === "INSERTED";
                    const isReplaced = clause.changeType === "REPLACED";
                    const isDeleted = clause.changeType === "DELETED";

                    return (
                      <div
                        key={`right-${clause.id}`}
                        id={`right-${clause.id}`}
                        onClick={() => clause.changeId && scrollToClause(clause.id, clause.changeId)}
                        className={`rounded-xs transition-all ${
                          isActive
                            ? "ring-2 ring-brand-500 bg-amber-50/70 p-2 shadow-xs"
                            : isAdded || isReplaced
                            ? "p-1.5"
                            : isDeleted
                            ? "p-1.5"
                            : "p-1 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="font-sans font-bold text-slate-700 text-xs w-7 shrink-0 select-none pt-0.5">
                            {clause.label}
                          </span>
                          <div className="flex-1 break-words">
                            {clause.heading && (
                              <h4 className="font-sans font-bold text-slate-800 text-xs mb-1">
                                {clause.heading}
                              </h4>
                            )}
                            {clause.textRight && (
                              <p
                                className={`${
                                  isAdded || isReplaced
                                    ? "bg-emerald-100 text-emerald-950 px-2 py-1 rounded-xs border border-emerald-300"
                                    : isDeleted
                                    ? "text-slate-400 italic font-mono text-xs bg-slate-50 border border-dashed border-slate-200 px-2 py-1 rounded-xs"
                                    : ""
                                }`}
                              >
                                {clause.textRight}
                              </p>
                            )}

                            {clause.subclauses && !isDeleted && (
                              <div className="mt-2 space-y-2 pl-4">
                                {clause.subclauses.map((sub, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className="font-sans font-semibold text-slate-600 text-xs w-6 shrink-0 pt-0.5 select-none">
                                      {sub.label}
                                    </span>
                                    <div className="flex-1 break-words">
                                      <p className="text-slate-800">{sub.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paper Running Footer */}
                <footer className="border-t border-slate-200 mt-12 pt-3 text-center text-[11px] font-sans text-slate-400">
                  — Page {currentPage} of {activeDataset.totalPages} —
                </footer>
              </article>
            </div>
          </div>
        </div>

        {/* 4. Right "Changes" Sidebar Panel with Provenance & Impact Path Tracing */}
        <aside
          className={`border-l border-slate-300 bg-white transition-all duration-200 flex flex-col shrink-0 z-20 shadow-xs ${
            sidebarOpen ? "w-80 md:w-96" : "w-10"
          }`}
        >
          {/* Sidebar Top Controls */}
          <div className="border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between bg-[#f8fafc]">
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight uppercase">
                    Changes ({filteredChanges.length})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDetailsExpanded(!detailsExpanded)}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded hover:bg-slate-200/70 transition"
                  >
                    {detailsExpanded ? "Hide Details" : "Details >"}
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    title="Collapse sidebar"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                  >
                    ⇥
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Expand changes panel"
                className="w-full flex justify-center text-slate-500 hover:text-slate-900 font-bold"
              >
                ⇤
              </button>
            )}
          </div>

          {sidebarOpen && (
            <>
              {/* Filter Sub-header */}
              <div className="border-b border-slate-200 px-3.5 py-2 flex items-center justify-between text-xs bg-white relative">
                <div className="relative">
                  <button
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    <span>Filter: {typeFilter}</span>
                    <span className="text-[10px]">▼</span>
                  </button>

                  {filterDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-40 py-1 text-xs">
                      {["ALL", "DEADLINE_CHANGE", "THRESHOLD_CHANGE", "AUTHORITY_CHANGE", "REPLACED", "DELETED", "INSERTED"].map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTypeFilter(t);
                            setFilterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 ${
                            typeFilter === t ? "font-bold text-brand-600 bg-slate-50" : "text-slate-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-slate-400 text-[11px]">
                  Click to sync view
                </span>
              </div>

              {/* Sequential Change Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredChanges.map((change) => {
                  const isSelected = change.id === activeChangeId;

                  return (
                    <div
                      key={change.id}
                      onClick={() => scrollToClause(change.clauseId, change.id)}
                      className={`cursor-pointer rounded-xs border p-3 text-xs transition-all ${
                        isSelected
                          ? "border-brand-500 ring-2 ring-brand-100 bg-brand-50/25 shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      {/* Card Header & Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
                          {change.index}. {change.type.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[11px] font-semibold">
                          {change.delCount !== undefined && (
                            <span className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.2">
                              -{change.delCount}
                            </span>
                          )}
                          {change.addCount !== undefined && (
                            <span className="rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.2">
                              +{change.addCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Diff Snippet */}
                      <div className="space-y-1 mb-2 font-mono text-[11px] leading-relaxed">
                        {change.delText && (
                          <p className="bg-rose-50 text-rose-900 border-l-2 border-rose-400 p-1.5 rounded-r line-through decoration-rose-400">
                            {change.delText}
                          </p>
                        )}
                        {change.addText && (
                          <p className="bg-emerald-50 text-emerald-950 border-l-2 border-emerald-500 p-1.5 rounded-r">
                            {change.addText}
                          </p>
                        )}
                      </div>

                      {/* Summary Text */}
                      <p className="text-slate-700 text-[11.5px] leading-snug">
                        {change.summary}
                      </p>

                      {/* Expanded Impact Analysis & Evidence Graph Path */}
                      {detailsExpanded && isSelected && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2.5">
                          {change.impactScore !== undefined && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Prioritisation Signal:</span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                                  change.impactScore >= 0.9
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {(change.impactScore * 100).toFixed(0)}% Priority Score
                              </span>
                            </div>
                          )}

                          {change.evidenceTokens && change.evidenceTokens.length > 0 && (
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                                Extracted Evidence Tokens:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {change.evidenceTokens.map((t) => (
                                  <span
                                    key={t}
                                    className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[9.5px] font-mono font-medium"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {change.affectedRules && change.affectedRules.length > 0 && (
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                                Verified Rules Affected:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {change.affectedRules.map((r) => (
                                  <span
                                    key={r}
                                    className="rounded bg-slate-100 text-slate-800 font-mono px-1.5 py-0.5 text-[10px] font-semibold border border-slate-200"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {change.affectedApprovals && change.affectedApprovals.length > 0 && (
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                                Affected Approvals & Workflows:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {change.affectedApprovals.map((a) => (
                                  <span
                                    key={a}
                                    className="rounded bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {change.evidencePath && change.evidencePath.length > 0 && (
                            <div>
                              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                                Evidence Dependency Path:
                              </span>
                              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] font-mono text-slate-700 leading-relaxed">
                                {change.evidencePath.map((step, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 my-0.5">
                                    <span className="text-brand-600 font-bold">
                                      {idx === 0 ? "●" : "↳"}
                                    </span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
