# India-Specific Open-Source & Open-Data Gap Analysis

## 1. Official platforms: no public repository found

A direct search for official source code of NSWS, MAITRI, or MIDC found **no public
GitHub organization or repository** for any of the three. These are treated as closed,
proprietary government systems unless an official repo/license is found — none was.
PermitGraph **must not** claim these platforms are open source.

## 2. Adjacent open data / API infrastructure that *does* exist

| Resource | URL | What it is | License/terms | Relevance |
|---|---|---|---|---|
| India Code | indiacode.nic.in | Official repository of Central & State Acts (PDF/HTML) | Government work; Acts of a legislature are reproducible under Copyright Act 1957 s.52(1)(q) (see `data-licensing.md`) | **Primary source** used for this project's real regulatory corpus (MAITRI Act, MID Act, Khadi & Village Industries Act) |
| `indiacode.ecourtsindia.com` (community JSON API) | indiacode.ecourtsindia.com/api | Unofficial, anonymous, CORS-open JSON API built from India Code, covering 60k+ Acts | Community project, not a government service — terms not independently verified in this pass | Documented as a *possible* future ingestion source adapter; not used to generate any rule in this release because it is an unofficial third-party re-publication, not the primary source itself |
| Vaquill AI | vaquill.ai/in | Commercial structured legislation API (acts/sections, India Code-sourced) | Commercial product | Evidence that a market exists for "regulation as structured data" infra — validates PermitGraph's thesis, but it is a closed commercial product, not something to depend on or copy |
| National Judicial Data Grid (NJDG) Open API | via NAPIX / bharatapi.gov.in | Case-pendency data API for institutional litigants | Government-restricted registration | Not applicable to approvals/regulations; noted only to confirm India does have *some* precedent for government open APIs |
| `ramSeraph/opendata`, `geohacker/india` (GitHub) | see repos | General Indian open-government geospatial/data scripts | MIT / open | General inspiration for repo hygiene; not regulatory-specific |

## 3. Directly comparable prior art: other SIH 26130 submissions found on GitHub

Problem Statement 26130 has been attempted by other teams/hackathon participants.
Two public repositories were found that explicitly target the same problem statement:

- **`shubham54191/ANUMATI`** — "Smart Regulatory Clearance & Dynamic Approval Graph
  Engine," explicitly built for SIH 2026 / PS 26130. Proposes an "Open Approval Graph
  Standard (OAGS)" JSON schema, a Next.js roadmap/graph UI, a "policy reform simulator,"
  and an officer-side clearance console. Useful confirmation that **approval dependency
  graphs** and **open schemas for approvals** are seen as the right direction by
  independent teams — but (at the time of this research) it appears to ship a seeded,
  in-app rule base rather than a documented ingestion pipeline from primary legal text
  with OCR/provenance, and it does not appear to implement regulatory change detection
  or rule versioning as a first-class, tested capability.
- **`vishnu1804/NIECP-AI`** — "National Industrial Ease & Compliance Platform." Notably
  disciplined about **not fabricating facts**: deterministic rule engine, explicit
  `AI_INTERPRETATION` labelling for extracted document fields, "needs information"
  rather than silent "not applicable," and an integration manager that reports
  `MANUAL_MODE`/failure honestly instead of faking success. This validates several of
  this project's own non-negotiable safety rules (deterministic engine, honest
  verification-status labelling, no fake "real-time" integration claims) as a
  convergent, independently-reached design choice rather than an idiosyncratic one.

**Implication for PermitGraph:** the "single-window successor app" idea-space is already
crowded with hackathon submissions. This project deliberately does **not** compete there.
Its differentiation is the layer underneath: a reproducible **ingestion → candidate →
human-verified → rules-as-code → change-detection → impact-analysis** pipeline with
strict provenance and a genuinely open, testable dataset/rule format — positioned as
infrastructure other such applications (including ANUMATI- or NIECP-style frontends)
could consume via API, rather than another applicant-facing wizard competing with them.

## 4. Gap summary

1. No official Indian government regulatory dataset is published as versioned,
   machine-readable rules with source provenance (document/section/page) at the
   approval level.
2. No open, maintained **approval dependency graph** for Indian industrial approvals
   exists with cycle detection, upstream/downstream traversal, and confidence/provenance
   metadata.
3. No open **regulatory change-detection → impact-analysis** pipeline exists that is
   wired to a business/application graph.
4. Community/commercial legislation APIs (ecourtsindia, Vaquill) solve "get me the text
   of an Act" — none solve "tell me which of my rules/approvals/applications are
   affected when that Act changes."

This is the gap PermitGraph targets. It does not attempt to solve (1) at national scale —
it solves it for a **small, deliberately verified slice** (MAITRI Act 2023 in full, plus
representative sections of the MID Act 1961 and the Khadi & Village Industries Act) and
ships the *pipeline* so others can extend coverage.
