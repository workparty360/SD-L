# Verification and test plan

Verified on 30 October 2026 (Asia/Kolkata), using Node 24.22.0 and the Chromium-based in-app browser. This is a local frontend prototype.

## Repeatable checks

```bash
npm ci
npm test
npm run format:check
npm run build
npm run preview
```

Expected: 31 passing Node tests, clean formatting and successful production build. Preview uses port 4173; development uses port 5173. Login shortcuts fill synthetic accounts using `Demo@123`.

## Automated checks executed

All 31 tests passed. The 25 domain tests cover seed relationships, assignment scope, role restrictions, inactive accounts, audit validation and lifecycle transitions, resubmission snapshots, evidence review/version history, file limits, evaluation history, comment validation, event deduplication, recipient restrictions, notification ownership, corrective-action revision/approval, observation closure/reopening, closure prerequisites and stale versions, atomic/idempotent closure, immutable reports, overdue reminders, HOD course scope, referenced-record protection, criterion revision invalidation and derived metrics.

Six session/storage tests cover all five role logins, invalid/inactive credentials, expiry/deactivation, corrupt-state recovery, valid persistence round-trip and unavailable storage recovery.

## Browser checks executed

| Check | Result |
| --- | --- |
| Login and guards | Invalid credentials rejected; logout returned to login; signed-out audit route redirected; faculty administration route denied. |
| Five role dashboards | Administrator, auditor, faculty, HOD and management dashboards rendered with role-specific navigation and metrics. |
| Audit creation/publication | Administrator created a synthetic QA audit and published it from Draft to Evidence Collection through confirmation. |
| Comments/persistence | Posted audit comment retained after refresh together with session. |
| Evidence upload | Faculty selected a real synthetic TXT file; version 1 saved with filename/type/size and Pending Review; current-session download available. |
| Review/evaluation | Assigned auditor accepted evidence and saved a Compliant criterion outcome with comments. |
| Closure | Incomplete audit displayed blockers and disabled confirmation; eligible AAP-2026-005 closed through confirmation and produced a report. |
| Auditor route smoke | Audits, criteria, evidence, observations, actions, report views, history, notifications and profile rendered. |
| Administration smoke | Departments, programs, courses and activity logs rendered in production preview. |
| Report downloads | Management filtered CSE to four records. Downloaded CSV parsed with Python CSV reader and PDF extracted with pdftotext; both contained the same four records, headings, generation time and filter metadata. |
| Notification read state | Management unread count changed from 1 to 0 after marking the seeded notification read. |
| Notification compose | Administrator sent a synthetic message to own local inbox; message appeared and unread count increased. |
| Responsive layout | At 390 × 844, report filters/cards fit, table stayed in its scroll area, and navigation drawer opened and navigated to management dashboard. Viewport reset afterward. |
| Production console | No error-level console entries in fresh production-preview tab. |

Core workflow browser checks used development; final role, report, notification, administration and responsive checks used the production build. QA records were browser-local, not added to the source seed.

## Additional manual acceptance checks

Follow `UI_GUIDE.md`. Restore demo data from Profile for a clean dataset. These additional browser exercises are not claimed as executed; domain tests cover applicable rules separately:

1. Create/edit every administrative entity; try blanks, duplicates, invalid dates and deletion of referenced records.
2. Resubmit rejected evidence and inspect versions. Refresh to verify the explicit unavailable-file notice while metadata remains.
3. Request action revision, resubmit, approve, close observation and reopen with a reason.
4. Attempt closure with each prerequisite independently missing, then satisfy all prerequisites and close once.
5. Compare reports across year/status/search filters and inspect detailed PDF pagination with large datasets.
6. Test delayed notifications while the app remains open and revisit overdue actions for reminder deduplication.

## Verification limits

No independent Safari/Firefox/Edge run, assistive-technology audit, full keyboard-only audit or accessibility certification. Every form/modal variant was not individually browser-tested. Summary export contents were inspected; exhaustive visual PDF pagination and detailed-export combinations remain manual acceptance checks.

No real backend, email/push delivery, database outage recovery, concurrent-browser write protection, upload malware scanning or protected storage is implemented. File bytes last only for the running page; metadata persists. Authentication and role restrictions are demonstration logic, not production security.
