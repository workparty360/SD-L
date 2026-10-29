# Academic Audit Portal (AAP)

A responsive, interactive React frontend prototype for CS314, Software Development Laboratory, Team T094, The LNM Institute of Information Technology, Jaipur. The supplied `T094_Assignment_6&7.pdf` is the requirements baseline. The application models planning, evidence collection, evaluation, findings, corrective actions and verified closure using synthetic data.

## Run locally

Prerequisite: Node.js 20.19+ or 22.12+ and npm (verified here with Node 24).

```bash
cd /home/daksh/Desktop/swe1
npm install
npm run dev
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173. If Node/npm are not on your shell PATH on this machine, run `source ~/.nvm/nvm.sh` first. No environment secrets or API keys are needed.

```bash
npm run build          # production assets in dist/
npm run preview        # serve the production build locally
npm test               # critical workflow, session and persistence tests
npm run format:check   # source formatting check
npm run format         # format source and tests
```

A static production host must fall back to `index.html` for client-side routes. There is no application server or database. Use a consistent hostname and port: `localhost` and `127.0.0.1` have separate browser storage.

## Demo access

All demo accounts use **Demo@123**. Role buttons on the login screen fill the corresponding credentials; press Sign in. Passwords are never written to localStorage. The account list is synthetic and this is not production authentication.

| Role | Email | Scope |
| --- | --- | --- |
| Administrator | admin@aap.demo | Institution-wide administration |
| Auditor / Audit Committee | auditor@aap.demo | Assigned CSE and ME audits |
| HOD / Coordinator | hod@aap.demo | CSE department |
| Faculty / Course Instructor | faculty@aap.demo | CSE department and assigned CS314 course |
| Management / QAC | management@aap.demo | Institution-wide read-only reporting |

Additional accounts: auditor2@aap.demo, hod2@aap.demo, hod3@aap.demo, faculty2@aap.demo, faculty3@aap.demo, faculty4@aap.demo. `inactive@aap.demo` demonstrates rejected login for an inactive account. All active accounts added by an administrator also use the shared demo password. Role changes and deactivation affect subsequent access. Sessions expire after eight hours. Sign out through the profile menu or Profile & demo settings to switch roles.

## Implemented modules

- Five calculated dashboards with audit, evidence, finding, action and deadline views; department/year filters and management type/status filters.
- Users and roles; department activation; program maintenance and safe deletion; course/faculty assignments.
- Audit creation, target selection, team assignment, criterion assignment, lifecycle changes, resubmission and version snapshots.
- Criteria in all eight SRS categories, with requirements, priorities, version history and faculty read-only views.
- Browser File API evidence selection, metadata, validation, review, revisions and retained earlier versions.
- Four criterion evaluation outcomes with auditor comments and evaluation history.
- Observation severity, discussions, corrective actions, responsibility assignment, submission and review.
- Explicit observation verification and audit closure blockers, confirmation, closure date/actor, immutable report snapshots and reopening history.
- Recipient-specific notifications, read/unread state, faculty-to-admin messages, optional delayed in-app visibility, comment votes and comment attachments.
- Audit/observation/action reports, filtered PDF and Excel-compatible CSV exports, audit history and activity logs.
- Search, sorting, pagination, empty states, validation messages, accessible native dialogs, responsive navigation and demo reset.

## Permission matrix

| Capability | Admin | Assigned auditor | HOD | Faculty | Management |
| --- | --- | --- | --- | --- | --- |
| Users / departments / programs | Manage | — | — | — | — |
| Courses | Manage | — | Own department | Assigned courses, view | — |
| Create / edit audit and criteria | Manage | View | View | View only | View only |
| Audit stages / final audit closure | Yes, readiness required | Yes, assigned audits | — | — | — |
| Submit / revise evidence | View | Review | Own department | Relevant audits; own revisions | View |
| Evaluate / create observations | — | Yes | — | — | — |
| Create corrective action | Yes | Yes | Reassign only | — | — |
| Submit corrective action | — | — | If responsible | If responsible | — |
| Approve action / close or reopen observation | — | Yes | — | — | — |
| Comments / notifications | Yes | Assigned context | Department context | Comments; messages to admins | Read only |
| Reports / history | Institution | Assigned audits | Department | Relevant audits | Institution |

The route layer and centralized `execute()` commands both check permissions. These are demonstration controls only: client-side JavaScript and localStorage can be modified by a browser user. Production authorization must be enforced by a trusted server.

## Data and calculations

Data is seeded on first use, then saved under `aap.demo.v1`; the session uses `aap.session.v1`. All modules read the same shared state. Invalid JSON, incompatible schemas and damaged nested records recover to a fresh seed dataset with a visible warning. Storage write failure rejects the change without showing success. The frontend does not provide cross-tab conflict resolution or shared multi-user concurrency; use one editing tab for a demonstration.

- **Active audits:** statuses other than Draft and Closed.
- **Evidence progress:** criteria with at least one accepted latest submission / assigned criteria, rounded to a whole percentage. Final closure additionally requires every relevant latest submission accepted.
- **Open observations:** observations whose status is not Closed.
- **Observation closure rate / HOD closure percentage:** Closed observations / all scoped observations × 100. An empty denominator yields 0%.
- **Action completion/closure rate:** Approved actions / all scoped actions × 100. The administrator's closed-action count means Approved actions.
- **Overdue action:** due date earlier than the browser's local calendar date and status not Approved. Overdue is a calculated badge; the underlying workflow status is retained.
- **Overdue observation:** not Closed and at least one linked action is overdue. There is no invented observation deadline field.
- Reports use the same records and apply department, year, type, status and report search before exporting. Table pagination affects display only, not the full filtered export.
- UTC event timestamps display in the browser's locale/timezone. Calendar due dates are date-only. Deadline reminders are deduplicated by action and due date when the portal is used.

## Source interpretation

Detailed FR permissions take precedence over older actor descriptions: FR-009/013/015 give administrators audit/criteria creation and assignment, while auditors evaluate and verify. Assignment 6/7 UC-003 means **Comment**, despite the earlier catalogue also assigning UC-003 to Create Audit. The PDF's FR-28 and FR-41 are normalized in documentation to FR-028 and FR-041.

The prototype uses Evaluation / Review as an explicit intermediate audit stage. Observation statuses Open, In Progress, Awaiting Verification, Closed and Reopened, and action statuses including Revision Required are practical prototype extensions of the less detailed SRS lifecycle. Rejected action submissions remain revisable. Comment voting and file attachments implement the explicit alternative paths in Assignments 5–7.

Assignment 7 closure readiness is enforced: Closure Review stage, every applicable criterion Compliant (Not Applicable excluded), latest required evidence Accepted, all observations verified Closed and corrective actions Approved with supporting evidence and auditor verification. Administrators cannot bypass auditor verification. A repeat close does not duplicate the report. Changing global criteria invalidates affected evaluations on open audits and preserves prior snapshots; already closed report snapshots remain unchanged.

## File behavior

Permitted evidence: PDF, DOC/DOCX, XLS/XLSX, JPG/JPEG, PNG and TXT; maximum 5 MB per file. Comment attachments: PDF/TXT, maximum 5 MB. Filename extension and size are validated; malware scanning and content-signature verification require a backend. Selected files stay in browser memory via object URLs for preview/download during the running page session. PDF/images can be previewed where the browser supports them. Refreshing or navigating via a full page load loses file bytes; metadata and historical review decisions remain. The UI explicitly indicates unavailable files. Seed files are metadata demonstrations, not fabricated downloadable documents.

## Restore demo data

Profile menu → Profile & demo settings → Restore demo data → Confirm. This replaces local records with the original synthetic dataset; it does not modify the supplied PDF or project source. This demo-only control is available to each role for evaluation convenience.

## Architecture and project layout

- `src/App.jsx`: login, route guards, shared shell, profile and reset.
- `src/data.js`: constants and coherent synthetic seed data.
- `src/domain.js`: pure command handlers, permissions, relationships, closure checks, metrics and report snapshots.
- `src/session.js`, `src/persistence.js`, `src/store.jsx`: simulated sessions, save validation and React Context persistence.
- `src/components.jsx`: accessible dialogs, validation, tables, comments, file metadata and history.
- `src/Admin.jsx`, `src/Audits.jsx`, `src/Workflows.jsx`: administration and lifecycle modules.
- `src/Dashboard.jsx`, `src/WorkQueues.jsx`: role dashboards and work queues.
- `src/Notifications.jsx`, `src/Reports.jsx`: inbox/compose and reports/exports.
- `src/styles.css`: design tokens, responsive layouts and print rules, with Tailwind's Vite integration.
- `tests/`: Node test runner regression tests.
- `REQUIREMENTS_TRACEABILITY.md`: every FR-001–047 and NFR-001–020.
- `BUSINESS_RULES.md`: BR-001–012 with verification procedures.
- `TEST_PLAN.md`: executed checks, expected outcomes and remaining verification limits.
- `UI_GUIDE.md`: a suggested viva/demo walkthrough.

Stack: React 19, Vite 6, JavaScript, React Router, React Context, Tailwind CSS 4, Lucide, Recharts, jsPDF and AutoTable. PDF dependencies load on demand; chart, React and PDF bundles are separated. No Express, authentication service, cloud database or external integration is included. `.gitignore` excludes dependencies, builds, logs and environment files. The folder is Git-ready; no remote repository or commit is claimed.

## Prototype limits and future production architecture

Authentication, roles, notifications, record persistence and audit trails are simulated locally. No email or push is actually sent; a delayed notification becomes visible only while the portal is used. A DB outage journal, SMTP/push retry service, protected file store, server transactions, CSRF controls, tamper-proof audit log, backups, concurrency locks and guarantees of confidentiality are not implemented. CSV is Excel-compatible; native `.xlsx` is not included. Multi-browser compatibility has not been certified across Firefox, Safari and Edge.

A production implementation can retain these UI modules and replace the Context adapter with authenticated API calls. Implement the SRS managers as server services backed by a relational database, audit-scoped authorization, version checks/transactions, append-only logs, private object storage and an asynchronous notification outbox. See the traceability document for each NFR's production gap.

## Verification

Run `npm test` and `npm run build`. The executed functional, browser and export checks are recorded in `TEST_PLAN.md`; unexecuted browser/platform checks are explicitly identified. The team should review the implementation and understand its source interpretation before presenting or submitting it.
