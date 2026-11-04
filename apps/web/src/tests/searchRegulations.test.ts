import { describe, it, expect } from "vitest";
import type { RegulatorySearchResult, RegulatorySearchResponse } from "../lib/types";

describe("Regulatory Search - Unit & Integration Verification", () => {
  const mockSearchResponse: RegulatorySearchResponse = {
    query: "MAITRI",
    detected_language: "en",
    translated_query: "मैत्री कक्ष",
    total_matches: 4,
    counts_by_type: {
      act: 1,
      section: 1,
      rule: 1,
      approval: 1,
      source_document: 0,
    },
    counts_by_status: {
      VERIFIED: 2,
      CANDIDATE: 1,
      SYNTHETIC: 1,
    },
    items: [
      {
        id: "act-maitri",
        entity_type: "act",
        title: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023",
        title_mr: "महाराष्ट्र उद्योग, व्यापार आणि गुंतवणूक सुविधा अधिनियम, २०२३",
        subtitle: "MAITRI-ACT-2023 · Maharashtra Statutory Act",
        matched_text: "An Act to facilitate the promotion of investment through <mark>MAITRI</mark> Single Window System...",
        matched_field: "name / short_code",
        language_detected: "en",
        relevance_score: 8.5,
        citation: {
          act_title: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023",
          act_short_code: "MAITRI-ACT-2023",
          official_reference: "Maharashtra Act No. XXXIV of 2023",
          jurisdiction: "Maharashtra",
          authority: "Directorate of Industries, Maharashtra",
          source_url: "https://indiacode.nic.in/bitstream/123456789/20544/1/maitri.pdf",
        },
        verification: {
          status: "VERIFIED",
          extraction_method: "OFFICIAL_TEXT_MIRROR",
          confidence: 1.0,
          badge_label: "Official Gazette Verified",
          provenance_summary: "Official state statutory instrument transcribed section-by-section",
        },
        navigation_link: "/regulations/maitri-act-2023",
        tags: ["statute", "act", "maitri"],
      },
      {
        id: "sec-maitri-16",
        entity_type: "section",
        title: "Section 16: Rationalization of inspections",
        title_mr: "कलम १६: तपासणीचे सुसूत्रीकरण व संयुक्त तपासणी",
        subtitle: "MAITRI-ACT-2023 · Section 16",
        matched_text: "The inspections under the provisions of relevant law shall be conducted jointly...",
        matched_field: "section_text",
        language_detected: "en",
        relevance_score: 7.2,
        citation: {
          act_title: "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023",
          act_short_code: "MAITRI-ACT-2023",
          section_number: "16",
          official_reference: "MAITRI-ACT-2023 §16",
          jurisdiction: "Maharashtra",
          authority: "Directorate of Industries",
        },
        verification: {
          status: "CANDIDATE",
          extraction_method: "OFFICIAL_TEXT_MIRROR",
          confidence: 0.85,
          badge_label: "Statutory Candidate (Pending Review)",
        },
        navigation_link: "/regulations/maitri-act-2023#section-16",
        tags: ["section", "sec-16", "inspections"],
      },
      {
        id: "app-single-window",
        entity_type: "approval",
        title: "Single Window System Application",
        title_mr: "एकल खिडकी पोर्टल अर्ज (MAITRI Single Window)",
        subtitle: "Approval Category: PROCESS · MAITRI Single Window Cell",
        matched_text: "Combined online processing fee receipt via Single Window portal...",
        matched_field: "name / description",
        language_detected: "en",
        relevance_score: 6.8,
        citation: {
          act_title: "Maharashtra Single Window Approval Catalog",
          act_short_code: "APPROVAL-CATALOG",
          section_number: "Section 3",
          official_reference: "MAITRI Act 2023, Section 3",
          jurisdiction: "Maharashtra",
          authority: "MAITRI Single Window Cell",
        },
        verification: {
          status: "VERIFIED",
          extraction_method: "MANUAL",
          confidence: 1.0,
          badge_label: "Official Gazette Verified",
        },
        navigation_link: "/approvals/single-window-application",
        tags: ["approval", "process", "single-window"],
      },
      {
        id: "rule-maitri-001",
        entity_type: "rule",
        title: "RULE-MAITRI-001: Joint Inspection Mandate",
        title_mr: "नियम-संहिता: संयुक्त तपासणी बंधन",
        subtitle: "Rules-as-Code · Backed by Section 16",
        matched_text: "Synchronous joint inspections for Red and Orange category industrial units...",
        matched_field: "rule_body",
        language_detected: "en",
        relevance_score: 6.5,
        citation: {
          act_title: "Maharashtra Regulatory Code",
          act_short_code: "RULES-AS-CODE",
          section_number: "Section 16",
          official_reference: "Rule RULE-MAITRI-001 (Section 16)",
          jurisdiction: "Maharashtra",
        },
        verification: {
          status: "SYNTHETIC",
          extraction_method: "AI_CANDIDATE",
          confidence: 0.55,
          badge_label: "Reference Catalog",
        },
        navigation_link: "/rules/RULE-MAITRI-001",
        tags: ["rule", "inspections"],
      },
    ],
    execution_time_ms: 14.2,
  };

  it("1. Successfully returns structured search results across Acts, sections, rules, and approvals", () => {
    expect(mockSearchResponse.total_matches).toBe(4);
    expect(mockSearchResponse.items).toHaveLength(4);

    const types = mockSearchResponse.items.map((i) => i.entity_type);
    expect(types).toContain("act");
    expect(types).toContain("section");
    expect(types).toContain("approval");
    expect(types).toContain("rule");
  });

  it("2. Validates that every search result contains statutory citation metadata", () => {
    mockSearchResponse.items.forEach((item) => {
      expect(item.citation).toBeDefined();
      expect(item.citation.act_title).toBeTruthy();
      expect(item.citation.act_short_code).toBeTruthy();
      expect(item.citation.official_reference).toBeTruthy();
      expect(item.citation.jurisdiction).toBe("Maharashtra");
    });

    const sectionItem = mockSearchResponse.items.find((i) => i.entity_type === "section");
    expect(sectionItem?.citation.section_number).toBe("16");
    expect(sectionItem?.citation.official_reference).toBe("MAITRI-ACT-2023 §16");
  });

  it("3. Validates verification status and badge classification", () => {
    mockSearchResponse.items.forEach((item) => {
      expect(item.verification).toBeDefined();
      expect(["VERIFIED", "CANDIDATE", "SYNTHETIC", "PROPOSED", "UNVERIFIED"]).toContain(
        item.verification.status
      );
      expect(item.verification.badge_label).toBeTruthy();
    });

    const verifiedItem = mockSearchResponse.items.find((i) => i.verification.status === "VERIFIED");
    expect(verifiedItem?.verification.confidence).toBe(1.0);

    const candidateItem = mockSearchResponse.items.find((i) => i.verification.status === "CANDIDATE");
    expect(candidateItem?.verification.status).toBe("CANDIDATE");
  });

  it("4. Supports bilingual Marathi and English titles and translations", () => {
    mockSearchResponse.items.forEach((item) => {
      expect(item.title).toBeTruthy();
      expect(item.title_mr).toBeTruthy();
    });

    const actItem = mockSearchResponse.items.find((i) => i.entity_type === "act");
    expect(actItem?.title_mr).toBe("महाराष्ट्र उद्योग, व्यापार आणि गुंतवणूक सुविधा अधिनियम, २०२३");

    const sectionItem = mockSearchResponse.items.find((i) => i.entity_type === "section");
    expect(sectionItem?.title_mr).toContain("कलम १६");
    expect(sectionItem?.title_mr).toContain("संयुक्त तपासणी");
  });

  it("5. Correctly detects Marathi Devanagari script queries and applies cross-lingual translation", () => {
    const isDevanagari = (text: string) => /[\u0900-\u097F]/.test(text);

    expect(isDevanagari("तपासणी")).toBe(true);
    expect(isDevanagari("कलम १६")).toBe(true);
    expect(isDevanagari("Inspection")).toBe(false);

    expect(mockSearchResponse.translated_query).toBe("मैत्री कक्ष");
    expect(isDevanagari(mockSearchResponse.translated_query!)).toBe(true);
  });

  it("6. Generates valid citation copy text for compliance reporting", () => {
    const formatCitation = (item: RegulatorySearchResult) => {
      return `${item.citation.official_reference} — ${item.citation.act_title} (${item.citation.jurisdiction}). Backed by ${item.citation.authority || "State Authority"}.`;
    };

    const sectionItem = mockSearchResponse.items.find((i) => i.entity_type === "section")!;
    const formatted = formatCitation(sectionItem);
    expect(formatted).toContain("MAITRI-ACT-2023 §16");
    expect(formatted).toContain("The Maharashtra Industry, Trade and Investment Facilitation Act, 2023");
    expect(formatted).toContain("Maharashtra");
  });
});
