# Requirements traceability

Baseline: `T094_Assignment_6&7.pdf`, including detailed functional requirements, business rules, Assignments 6 and 7. FR-28 and FR-41 are normalized to FR-028 and FR-041. UC-003 means Comment for the detailed scenarios. Additional lifecycle labels are prototype interpretations, not verbatim SRS enumerations.

All 47 functional requirements have frontend implementations. “Simulated in frontend prototype” means the interaction works against synthetic browser-local records, not a production service. Verification descriptions distinguish automated domain checks, source inspection, and browser checks; see TEST_PLAN.md for executed scope and limits.

## Functional requirements

| ID | Requirement | Module / workflow | Demonstration | Verification method | Status / limitation |
| --- | --- | --- | --- | --- | --- |
| FR-001 | User login | `App / session` | Login with each demo role | Session tests + browser login | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-002 | Authentication failure | `App / session` | Try wrong or inactive credentials; same generic error | Session tests + browser invalid login | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-003 | Logout | `App / store` | Sign out and open a protected route | Browser logout and protected redirect | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-004 | Role assignment | `Admin / domain` | Edit a user role and sign in again | Domain role checks + admin form inspection | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-005 | Role-based access | `App / domain.scope / execute` | Faculty opens /users; access denied; commands recheck role | Scope/permission tests + browser denial | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-006 | Department management | `Admin / saveEntity` | Add/edit/activate/deactivate a department | Domain preservation test + browser module check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-007 | Program management | `Admin / deleteProgram` | Add/edit program; reject deletion with dependent courses | Dependency deletion test + browser module check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-008 | Course management | `Admin / saveEntity` | Admin or HOD maintains courses and faculty assignments | HOD scope test + browser module check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-009 | Create audit | `Audits / AuditForm` | Complete the audit form and see its new details | Creation validation test + browser audit creation | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-010 | Audit target | `Audits / AuditForm` | Select Department, Program or Course and an active target | Target validation test + browser conditional selection | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-011 | Assign audit team | `Audits / AuditForm` | Choose one or more active auditors; view assignment date | Team validation test + browser audit creation | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-012 | Audit status | `Audits / domain` | Advance stages; final closure checks readiness | Transition tests + browser publication/closure | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-013 | Create audit criteria | `Admin / criteria` | Create a named criterion with requirement and priority | Permission/revision tests + criteria form inspection | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-014 | Categorize criteria | `data / Admin` | Filter criteria across the eight exact SRS categories | Seed inspection + criteria route smoke check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-015 | Assign criteria to audit | `Audits / AuditForm` | Select criteria; prevent removal of used criteria | Domain validation + browser assignment | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-016 | Resubmit audits and retain history | `Audits / resubmitAudit` | Resubmit; review prior snapshot and latest version | Resubmission/snapshot test | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-017 | Evidence submission | `Workflows / UploadForm` | Faculty/HOD selects a supported local file | File validation tests + browser File API upload | Implemented locally; file bytes survive only the current page session. No server upload. |
| FR-018 | Evidence description | `Workflows / UploadForm` | Provide title, description, file and remarks | Submission tests + browser metadata check | Implemented locally; file bytes survive only the current page session. No server upload. |
| FR-019 | Evidence review | `Workflows / ReviewForm` | Assigned auditor accepts/rejects/requests revision | Review tests + browser acceptance | Implemented locally; file bytes survive only the current page session. No server upload. |
| FR-020 | Evidence versioning | `domain / evidence.versions` | Resubmit rejected evidence; view earlier metadata and review | Reject-resubmit-accept test | Implemented locally; file bytes survive only the current page session. No server upload. |
| FR-021 | Evidence status | `Workflows / EvidenceTable` | Filter Pending Review, Accepted, Rejected, Revision Required | Version/review tests + browser status update | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-022 | Criterion evaluation | `Audits / EvaluationForm` | Save one of four exact SRS outcomes | All-outcome test + browser evaluation | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-023 | Auditor evaluation comments | `Audits / EvaluationForm` | Enter comments; confirm changes to earlier evaluation | Evaluation history test + browser comments | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-024 | Create observation | `Workflows / ObservationForm` | Create finding against reviewed evidence/criterion | Command validation + workflow route smoke check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-025 | Observation severity | `Workflows / ObservationTable` | Assign/filter Low, Medium and High | Seed validation + observation route smoke check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-026 | Observation lifecycle | `domain / Workflows` | Track Open to verification/closure and reopen | Action/closure/reopen regression tests | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-027 | Observation comments | `components / Comments` | Post response with author/time; refresh and retain | Comment validation/retry tests + browser audit comment persistence | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-028 | Notify faculty of audit resubmission (FR-28) | `domain.notify / store / Notifications` | Resubmit as admin; relevant faculty sees inbox and login popup | Resubmission recipient test | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-029 | Create corrective action | `Workflows / ActionForm` | Admin/auditor creates action linked to an observation | Command validation + corrective-action route smoke check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-030 | Assign responsible person | `Workflows / ActionForm` | Assign active department faculty/HOD; HOD may reassign | Assignment/submitter authorization tests | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-031 | Corrective action submission | `Workflows / UploadForm` | Responsible user adds action taken, supporting file and comment | Full submit/revise/resubmit workflow test | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-032 | Corrective action review | `Workflows / ReviewForm` | Auditor approves/rejects/requests modification with comments | Review authorization + full workflow test | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-033 | Track action status | `Workflows / ActionTable` | Show workflow status and overdue badge separately | Dynamic overdue and workflow tests | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-034 | Close observation after verification | `domain.observationBlockers / WorkflowDetail` | Blocked until every action has submitted evidence and approval | Missing-evidence and verify/close tests | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-035 | Reopen observation | `domain / WorkflowDetail` | Auditor supplies reason; preserve closure history | Reopen/immutable-report tests | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-036 | Overdue actions | `domain.isOverdue` | Past due, not Approved; recalculate while portal used | Dynamic date/reminder deduplication tests | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-037 | Administrator dashboard | `Dashboard / metrics` | Inspect audit, finding, approved action, department charts | Derived metric tests + browser admin dashboard | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-038 | Auditor dashboard | `Dashboard / WorkQueues` | Assigned audits, evidence and action review queues | Assignment scope tests + browser auditor dashboard | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-039 | HOD dashboard | `Dashboard / WorkQueues` | Department evidence requests, responsibilities and closure rate | Department scope tests + browser HOD dashboard | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-040 | Faculty dashboard | `Dashboard / WorkQueues` | Assigned courses, evidence requests, revisions and actions | Scope tests + browser faculty dashboard | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-041 | Management dashboard (FR-41) | `Dashboard / metrics` | Institutional read-only view and consolidated filters | Role tests + browser management dashboard | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-042 | Audit report | `Reports / AuditReport` | View metadata, team, criteria, evidence, evaluation, findings, actions | Snapshot tests + report route/browser PDF check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-043 | Observation report | `Reports` | Total/open/closed/overdue counts and severity breakdown | Shared metric logic + report route check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-044 | Corrective action report | `Reports` | Total/approved/pending/overdue and closure rate | Shared metric logic + report route check | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-045 | Report export | `Reports / jsPDF / CSV` | Apply report filters then download PDF/CSV | Browser download + file format inspection | Implemented: real PDF and CSV; native XLSX omitted; CSV opens in Excel. |
| FR-046 | Audit history | `components.History / domain` | Open chronological history and earlier versions | Version/snapshot/comment tests + browser persistence | Simulated in frontend prototype; backend required for trusted shared records. |
| FR-047 | Activity log | `domain.execute / components.History` | Inspect actor, action, time, audit, previous/new status | Mutation tests + activity route smoke check | Simulated in frontend prototype; backend required for trusted shared records. |

## Non-functional requirements

| ID | Requirement | Implementation / demonstration | Verification | Status / production gap |
| --- | --- | --- | --- | --- |
| NFR-001 | Response times | Immediate local operations, paginated tables, on-demand PDF code | Browser navigation and production build | Implemented locally; no load or latency SLA validated |
| NFR-002 | Immediate/delayed notifications | Immediate inbox updates; optional admin delivery time checked while portal runs | Notification tests; browser inbox | Simulated in frontend prototype; no server scheduler |
| NFR-003 | Concurrent users | Separate demo roles; one browser dataset | Scope tests only | Backend required for production; no multi-user conflict resolution |
| NFR-004 | Authentication protection | Session expiry and protected routes | Session tests + browser redirect | Simulated in frontend prototype; backend required for production |
| NFR-005 | Role access control | Route guards plus role/audit checks in command handlers | Permission tests + browser access denied | Simulated in frontend prototype; backend required for production |
| NFR-006 | Confidentiality | Synthetic data, scoped audit views | Scope tests and source review | Backend required for production; localStorage is inspectable |
| NFR-007 | Administrative auditability | Central activity entries for administrative changes | Domain tests and activity-log route | Simulated in frontend prototype; logs are locally editable |
| NFR-008 | Consistent navigation | Common shell, role navigation, audit tabs and return links | Browser route smoke checks | Implemented |
| NFR-009 | Understandable errors | Inline validation, generic authentication errors, closure blocker details | Invalid-input tests + browser checks | Implemented |
| NFR-010 | Clear submit/resubmit | Explicit submission labels and confirmation dialogs | Workflow source review + browser forms | Implemented |
| NFR-011 | Reliable audit records | Validated local saves, write-before-success, damaged-save recovery | Persistence tests | Backend required for production; no backups or durable database |
| NFR-012 | Historical preservation | Evidence versions, evaluation history, audit snapshots, closure reports and logs | Version and immutable snapshot tests | Simulated in frontend prototype; browser reset/storage deletion loses data |
| NFR-013 | Notification availability | Recipient inbox, unread count and read state | Notification ownership tests + browser inbox | Simulated in frontend prototype; requires this browser dataset |
| NFR-014 | Modular architecture | UI, pure domain functions, seed, sessions, persistence and exports separated | Source and build verification | Implemented |
| NFR-015 | Version control | Git-ready structure, lockfile and .gitignore | File inspection | Prepared; no Git repository history or remote commit claimed |
| NFR-016 | Documentation | README, guide, traceability, business rules and executed-test record | Document coverage check | Implemented |
| NFR-017 | Scalability | Data adapter boundary and reusable modules | Source architecture review | Backend required for production; scalability not load-tested |
| NFR-018 | Modern browser compatibility | Standards-based React, File API, dialogs and responsive CSS | Available Chromium-based in-app browser desktop/mobile checks | Partially verified; Firefox/Edge/Safari not separately tested |
| NFR-019 | Privacy | Fictional users, scoped views and no persisted passwords | Session and scope tests | Backend required for production; frontend cannot guarantee privacy |
| NFR-020 | Significant-action auditability | Actor/time/audit/before/after log on mutations | Domain tests + activity/history screens | Simulated in frontend prototype; no tamper resistance |

## Assignment 6/7 interface and design coverage

| Interface / use case | Implemented view | Interpretation / limit |
| --- | --- | --- |
| W01 Sign in | `/login` | Demo accounts, generic failures and eight-hour session |
| W02 Audit details and comments / UC-003 | `/audits/:auditId`, Comments tab, observation details | Author/time, comments, optional PDF/TXT attachment and per-user vote; no database outage journal |
| W03 Compose notification / UC-005 | Audit Notify users and inbox Compose dialog | Authorized recipients, audit, message, simulated channel, optional delayed visibility; cancel returns to context |
| W04 Notification inbox | `/notifications`, bell link | Own inbox, unread count, mark-read and audit navigation; event/recipient deduplication |
| W05 Closure review / UC-009 | `/audits/:auditId/closure` or Closure tab | Visible blockers, action/evidence/observation tables, confirmation and cancel |
| W06 Closed audit | Closed audit Overview and Report tabs | Status, closing user/time and immutable closure report; authorized comments retained |

The class/manager design is represented by shared domain entities, `execute`, `scope`, `notify`, `closureBlockers`, `reportSnapshot`, and the storage/session adapters. No HTTP endpoints in the PDF are falsely presented as implemented services. Server locks, database transactions, protected attachment retrieval, SMTP/push delivery, durable outage recovery and provider retry jobs require production infrastructure. Failed browser persistence produces an error and retains form input instead of claiming a successful durable write.
