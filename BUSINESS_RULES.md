# Business rules

The following rules reproduce the SRS intent. All enforcement is a frontend demonstration; production needs trusted server checks.

| Rule | SRS intent | Implemented behavior | How to test | Executed verification |
| --- | --- | --- | --- | --- |
| BR-001 | Only authorized users can create audits | Administrator-only route and saveAudit command | Sign in as Faculty; open /audits/new and attempt command in domain test | Permission and create-audit tests |
| BR-002 | An audit must be viewable | Scoped details, status, tabs and linked records | Open an assigned audit; another department/course is denied | Scope tests + browser detail routes |
| BR-003 | Use the latest version | Current version is default; earlier evidence/audit snapshots retained | Reject/resubmit evidence and inspect versions; edit/resubmit an audit | Versioning and snapshot tests |
| BR-004 | Addition of comments must be possible | Audit and observation comments with author/time and history | Post a nonblank comment, refresh and find it again | Comment tests + browser persistence |
| BR-005 | Notify on audit resubmission while portal is accessed | Relevant recipient inbox entries and faculty login popup | Admin resubmits; sign in as relevant faculty and open inbox | Resubmission notification test |
| BR-006 | Faculty may raise questions and comments | Faculty comments on relevant published audits and observations | Ask a question as faculty; show author/role/time | Comment and scope tests |
| BR-007 | Notify faculty/admin when an audit is submitted | Publication and resubmission events notify eligible participants | Publish Draft to Evidence Collection; inspect recipient notifications | Publication recipient regression test |
| BR-008 | Faculty/admin can check audit status | Status badges, lifecycle stages and dashboard/list views | View the same relevant audit under both roles | Browser role screens + shared-state tests |
| BR-009 | Faculty/admin can check audit-team reports | Scoped reports with evaluation and closure details | Open Reports as faculty and admin; inspect audit detail report | Report route checks + scope tests |
| BR-010 | Faculty cannot edit audit-team criteria | Read-only criteria UI and domain-level administrator guard | Faculty has no edit buttons; execute saveEntity criteria is rejected | Permission tests + browser faculty criteria |
| BR-011 | Admin can submit notifications to faculty | Audit-scoped Compose with eligible recipients | Admin selects faculty and sends a local notification | Recipient validation + notification ownership tests |
| BR-012 | Faculty can submit notifications to admins | Faculty Compose recipient choices restricted to administrators | Send a clarification to admin; auditor/broadcast recipients rejected | Faculty notification restriction regression test |

## Additional closure and history invariants

These come from FR-019/022/032/034 and Assignment 7 CS-03; they do not replace the twelve numbered SRS business rules.

- Only an assigned auditor may approve an action, verify-close an observation or reopen an observation.
- Audit closure is permitted for an administrator or assigned auditor only after all readiness checks pass. An administrator cannot bypass verification.
- Supporting action evidence, a submission and auditor approval are mandatory for observation closure.
- A stale expected audit version is rejected; a repeated successful closure returns the existing result.
- Closure writes status, actor, timestamp, report, log and notifications into one next-state object. The Context persists that object before rendering success. This is not a database transaction or concurrency guarantee.
- Reopening requires a reason, retains prior closure/report history and returns linked actions to Revision Required. A closed audit returns to Corrective Action.
- Overdue status is derived from the current local date; passing a deadline never completes an action.
- Repeated source events produce one inbox record per recipient; distinct comments with identical text are still separate events.

These invariants are exercised in `tests/domain.test.js`.
