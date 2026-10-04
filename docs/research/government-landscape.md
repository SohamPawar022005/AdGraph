# Government Landscape Research

Status: research note. Figures below are sourced from public press releases, official
portal pages and news coverage current as of **October 2026**, and are cited inline.
Government platforms change frequently — treat all capability numbers as indicative,
not contractual, and re-verify before relying on them.

This document exists so that PermitGraph does not duplicate what already exists.
It is a primary input to `product-gap-analysis.md`.

---

## 1. National Single Window System (NSWS)

| Field | Detail |
|---|---|
| Owner | Department for Promotion of Industry and Internal Trade (DPIIT), Ministry of Commerce & Industry, Government of India |
| Launched | September 2021 (beta), progressively expanded |
| Purpose | Common digital interface to **discover, apply for, and track** Central and State regulatory approvals |
| Coverage (as reported, Sept 2026) | 327+ Central approvals, 3,452+ State approvals across 34 States/UTs; ~3.06 lakh applications/year, ~2.26 lakh approvals processed/year |

**Major capabilities** (self-reported):
- **Know Your Approvals (KYA)** — a dynamic questionnaire wizard that lists the approvals a described business activity will likely need, across ~32 Central departments and ~34-35 states.
- **Common Registration Form** — one data-capture form, reused across multiple department applications.
- **Applicant Dashboard** — single interface to submit, track status, and respond to departmental queries.
- **Document Repository** — one-time upload, reused across applications.
- **E-Communication Module** — online query/response channel with departments.
- **PAN as Single Business ID**, DSC/DigiLocker-based authentication.
- Deep backend integration for specific flows: Industrial Entrepreneur Memorandum (IEM) fully migrated October 2025; Industrial License (IL) fully migrated March 2026; PESO integrated all 74 licensing modules.
- State Registration Form links out to onboarded State single-window systems (including Maharashtra's MAITRI).

**What NSWS explicitly does NOT do:**
- It does **not** replace the approving Ministries/Departments/States — "NSWS does not replace the Ministries, Departments or State Governments responsible for individual approvals... What NSWS provides is a common digital window."
- KYA guidance is explicitly **advisory**, "does not constitute legal advice."
- No public API / open data feed for third-party developers has been found; KYA logic and approval catalogs are not published as open, machine-readable, versioned data with provenance.
- No published change-detection or regulatory-diff capability.
- No public graph of approval *dependencies* (which approval blocks which) — the KYA list is a flat list per session, not an inspectable dependency graph.

Sources: [1](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2313670&reg=48&lang=2), [2](https://pibindia.substack.com/p/the-national-single-window-system), [3](https://accorppartners.com/blogs/incorporation/india-incorporation/single-window-clearance-for-foreign-companies-in-india-whats-actually-available-now)

---

## 2. Maharashtra MAITRI / MAITRI 2.0

| Field | Detail |
|---|---|
| Owner | Directorate of Industries, Government of Maharashtra; statutory backing under the Maharashtra Industry, Trade and Investment Facilitation Act, 2023 |
| Full form | Maharashtra Industry, Trade and Investment Facilitation (cell) |
| MAITRI 2.0 launch | 4 February 2025, by the Chief Minister |
| Coverage | ~119–128 services across ~14–16 State departments (figures vary slightly by source/date) |

**Major capabilities (MAITRI 2.0, self-reported):**
- Single-window filing and desk-level real-time tracking of applications (RTS).
- **Online Wizard** for approval/compliance guidance — this is now a *statutory* feature: Section 20 of the MAITRI Act, 2023 requires the Nodal Agency to build an "Online Wizard Module" that accepts inputs (industry type, employees, location, etc.) and links to relevant application forms and notifications.
- **Incentive Calculator** for scheme/subsidy eligibility.
- **AI chatbot** for policy/incentive queries.
- **Compliance dashboard** and **grievance redressal system** (self-reported 98.28% resolution rate).
- **Centralized document repository**, public dashboards, call-centre support.
- **Seamless NSWS integration** — MAITRI pushes submitted data to NSWS.
- Statutory escalation mechanism: an **Empowered Committee** (Ch. III, MAITRI Act) can take over applications a Competent Authority fails to decide within a "specified time limit," and its decisions are **binding** (Section 9).
- A **Supervisory Committee** (Ch. IV) gives policy direction and can recommend disciplinary action against delaying authorities.
- **Rationalisation of inspections** — Section 16 requires that inspections be, "as far as practicable," conducted **jointly** and based on **random selection**.
- Confidentiality duty on officials re: applicant IP/business information (Section 22).
- Public-consultation mechanism for draft rules/policies (Section 21).

**What MAITRI explicitly does NOT publish:**
- No public API, developer portal, or open dataset of its approval catalogue, SOPs, incentive formulas, or wizard decision logic.
- No published machine-readable version of "specified time limits" per approval (these are set by prescribed rules under the Maharashtra Right to Public Services Act, 2015, which are not bundled here).
- No public regulatory-change feed (e.g., "which rule changed, which approvals affected").
- No published dependency graph between approvals (e.g., "Consent to Establish required before Consent to Operate").

Sources: [1](https://mahamitra.org/wp-content/uploads/2025/05/Letter-announcing-MAITRI-2.0-Launch_IAs_v05.pdf), [2](https://munsifdaily.com/maharashtra-government-launches-maitri-2-0/), [3](https://edgere.in/maharashtra-single-window-clearances-for-land-projects-maitri-online-permits-and-faster-approvals/), and the Maharashtra Industry, Trade and Investment Facilitation Act, 2023 (primary legal text, see `docs/regulatory/`).

---

## 3. MIDC Single Window Clearance / Maharashtra Industrial Development Corporation

- MIDC is a statutory corporation created under the **Maharashtra Industrial Development Act, 1961** (the first uploaded source document) to acquire/develop land, establish industrial areas/estates, and allot plots to industries (Sections 3, 14, 32–39 of the Act).
- MIDC provides its own portal for land allotment, plot transfer, and related industrial-area services; land-use and building-plan approvals for larger corporations may run through dedicated AutoDCR/BPMS instances rather than MIDC itself.
- MIDC is a **land/infrastructure authority**, not a general cross-department approval tracker — it is one of the many "Competent Authorities" that MAITRI's Single Window System and Empowered Committee can escalate against if MIDC fails to act within a specified time limit.
- No evidence of a public, machine-readable dataset of MIDC's land-allotment rules, dependency structure, or open API was found in this research pass.

Source: Maharashtra Industrial Development Act, 1961 (primary text); [4](https://edgere.in/maharashtra-single-window-clearances-for-land-projects-maitri-online-permits-and-faster-approvals/).

---

## 4. PARIVESH (where relevant)

PARIVESH (Pro-Active and Responsive facilitation by Interactive, Virtuous and Environmental Single-window Hub) is the Ministry of Environment, Forest and Climate Change's single window for Environment/Forest/Wildlife/CRZ clearances. It is relevant to PermitGraph only insofar as:
- Environmental clearances are one *category* of approval that an industrial undertaking in Maharashtra may need, parallel to MAITRI's industrial permissions.
- It demonstrates a sector-specific, Central single-window precedent distinct from NSWS/MAITRI — reinforcing that India's compliance landscape is a **federation of single windows**, not one system, which is exactly the gap PermitGraph's dependency-graph layer is meant to make legible.
- PermitGraph does not integrate with PARIVESH in this release; it is referenced in the approval catalogue only as an **authority name** for synthetic/candidate data, never as a live data source.

---

## 5. Common limitations across existing systems (what PermitGraph should NOT duplicate)

1. **Portal, not infrastructure.** All of the above are *applicant-facing portals*. None publish their underlying rule logic, approval dependency graph, or SOPs as versioned, machine-readable, open artifacts that third-party developers, researchers, or other state governments can inspect, test, or build on.
2. **No regulatory change intelligence.** None of the above publish a "what changed in this regulation, and who is affected" feed. When a rule, fee, or time limit changes, applicants and integrators have no structured signal — only a new PDF notification or an unannounced portal update.
3. **No open dependency graph.** Which approvals require which other approvals, documents, or authorities is implicit institutional knowledge, not an inspectable graph.
4. **No source-cited rule objects.** Guidance (e.g., KYA, Wizard) is presented as answers, not as "rule R derived from Section S of Document D, page P."
5. **Not developer infrastructure.** None expose a general-purpose API/SDK for third parties (consultants, legal-tech startups, researchers, or other states) to build their own compliance tooling on top of verified rule data.

**PermitGraph's job is therefore to sit beside/underneath these systems** — ingesting the same authoritative sources (Acts, notifications), turning them into versioned, provenance-tracked, testable rules and an approval dependency graph, detecting when they change, and exposing all of this through an open API — not to re-implement application intake, payments, or government workflow, which NSWS/MAITRI/MIDC already own.
