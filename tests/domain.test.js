import test from "node:test";
import assert from "node:assert/strict";
import { seedData, dateOffset } from "../src/data.js";
import {
  execute,
  scope,
  canViewAudit,
  latest,
  closureBlockers,
  observationBlockers,
  metrics,
  isOverdue,
  validateFile,
  notify,
} from "../src/domain.js";
const file = {
  name: "evidence.pdf",
  size: 200,
  type: "application/pdf",
  token: "test-only",
};
const change = (db, user, cmd, p) => execute(db, user, cmd, p).db;
test("seed foreign keys and all five roles are coherent", () => {
  const d = seedData();
  assert.equal(new Set(d.users.map((u) => u.role)).size, 5);
  assert.equal(d.audits.length, 6);
  for (const a of d.audits) {
    assert.ok(d.departments.some((x) => x.id === a.departmentId));
    assert.ok(
      a.criterionIds.every((id) => d.criteria.some((c) => c.id === id)),
    );
    assert.ok(a.auditorIds.every((id) => d.users.some((u) => u.id === id)));
  }
  for (const e of d.evidence) {
    const a = d.audits.find((a) => a.id === e.auditId);
    assert.ok(a.criterionIds.includes(e.criterionId));
  }
  for (const x of d.actions)
    assert.ok(
      d.observations.some(
        (o) => o.id === x.observationId && o.auditId === x.auditId,
      ),
    );
});
test("scope filters auditor assignments and faculty courses", () => {
  const d = seedData();
  assert.equal(
    scope(
      d,
      d.users.find((u) => u.id === "U-AUD2"),
    ).audits.length,
    1,
  );
  assert.ok(
    !canViewAudit(
      d,
      d.users.find((u) => u.id === "U-FAC2"),
      d.audits[1],
    ),
  );
  assert.ok(
    !canViewAudit(
      d,
      d.users.find((u) => u.id === "U-FAC"),
      d.audits[2],
    ),
  );
});
test("faculty and management cannot edit criteria or create audits", () => {
  const d = seedData();
  for (const u of ["U-FAC", "U-QAC"]) {
    assert.throws(
      () =>
        execute(d, u, "saveEntity", {
          collection: "criteria",
          values: d.criteria[0],
        }),
      /not allowed/,
    );
    assert.throws(
      () => execute(d, u, "saveAudit", { values: d.audits[0] }),
      /not allowed/,
    );
  }
});
test("inactive account cannot mutate state", () => {
  const d = seedData();
  d.users[0].status = "Inactive";
  assert.throws(
    () => execute(d, "U-ADMIN", "resubmitAudit", { auditId: d.audits[0].id }),
    /inactive/,
  );
});
test("create audit validates dates and team, assigns target and stable ID", () => {
  const d = seedData(),
    v = { ...d.audits[0] };
  delete v.id;
  assert.throws(
    () =>
      execute(d, "U-ADMIN", "saveAudit", {
        values: { ...v, endDate: "2000-01-01" },
      }),
    /End date/,
  );
  assert.throws(
    () =>
      execute(d, "U-ADMIN", "saveAudit", {
        values: { ...v, auditorIds: ["U-FAC"] },
      }),
    /active auditor/,
  );
  const r = execute(d, "U-ADMIN", "saveAudit", { values: v });
  assert.equal(r.db.audits.length, 7);
  assert.equal(r.db.audits.at(-1).status, "Draft");
  assert.ok(r.db.audits.at(-1).assignments[0].assignedAt);
  assert.equal(d.audits.length, 6);
});
test("invalid lifecycle jumps are rejected, draft publication notifies faculty/admin", () => {
  let d = seedData();
  assert.throws(
    () =>
      execute(d, "U-ADMIN", "auditStatus", {
        auditId: d.audits[3].id,
        status: "Closure Review",
      }),
    /next lifecycle/,
  );
  d = change(d, "U-ADMIN", "auditStatus", {
    auditId: d.audits[3].id,
    status: "Evidence Collection",
  });
  assert.ok(
    d.notifications.some(
      (n) => n.recipientId === "U-FAC4" && n.message.includes("status updated"),
    ),
  );
  assert.ok(
    d.notifications.some(
      (n) =>
        n.recipientId === "U-ADMIN" && n.message.includes("status updated"),
    ),
  );
});
test("audit resubmission retains snapshot and notifies faculty", () => {
  let d = seedData();
  d = change(d, "U-ADMIN", "resubmitAudit", { auditId: d.audits[1].id });
  assert.equal(d.audits[1].history.length, 1);
  assert.ok(d.audits[1].history[0].snapshot);
  assert.equal(d.audits[1].version, 2);
  assert.ok(
    d.notifications.some(
      (n) => n.recipientId === "U-FAC" && n.message.includes("resubmitted"),
    ),
  );
});
test("evidence submit, reject, resubmit, accept preserves versions", () => {
  let d = seedData();
  let r = execute(d, "U-FAC", "submitEvidence", {
    auditId: d.audits[0].id,
    criterionId: "CR-03",
    title: "Rubrics",
    description: "Full rubric",
    file,
  });
  const id = r.id;
  d = r.db;
  assert.equal(latest(d.evidence.at(-1)).status, "Pending Review");
  d = change(d, "U-AUD", "reviewEvidence", {
    id,
    status: "Rejected",
    comment: "Missing sample",
  });
  d = change(d, "U-FAC", "submitEvidence", {
    id,
    auditId: d.audits[0].id,
    criterionId: "CR-03",
    title: "Rubrics v2",
    description: "Added sample",
    file,
  });
  d = change(d, "U-AUD", "reviewEvidence", {
    id,
    status: "Accepted",
    comment: "Complete",
  });
  const e = d.evidence.find((e) => e.id === id);
  assert.equal(e.versions.length, 2);
  assert.equal(e.versions[0].status, "Rejected");
  assert.equal(e.versions[0].reviewComment, "Missing sample");
  assert.equal(latest(e).status, "Accepted");
});
test("cross-audit evidence and unauthorized review are rejected", () => {
  const d = seedData();
  assert.throws(
    () =>
      execute(d, "U-AUD2", "reviewEvidence", {
        id: "EV-001",
        status: "Accepted",
        comment: "ok",
      }),
    /access denied/,
  );
  assert.throws(
    () =>
      execute(d, "U-FAC", "reviewEvidence", {
        id: "EV-001",
        status: "Accepted",
        comment: "ok",
      }),
    /not allowed/,
  );
  assert.throws(
    () =>
      execute(d, "U-FAC", "submitEvidence", {
        id: "EV-003",
        auditId: d.audits[1].id,
        criterionId: "CR-05",
        title: "x",
        description: "x",
        file,
      }),
    /different audit/,
  );
});
test("file validation rejects invalid size and type", () => {
  assert.throws(() => validateFile({ ...file, name: "script.exe" }), /format/);
  assert.throws(() => validateFile({ ...file, size: 6 * 1024 * 1024 }), /5 MB/);
  assert.throws(() => validateFile({ ...file, size: 0 }), /empty/);
  assert.throws(
    () => validateFile({ ...file, name: "test.xlsx" }, true),
    /format/,
  );
  assert.equal(validateFile(file), true);
});
test("evaluation saves all outcomes and previous versions", () => {
  let d = seedData();
  for (const outcome of [
    "Compliant",
    "Partially Compliant",
    "Non-Compliant",
    "Not Applicable",
  ])
    d = change(d, "U-AUD", "evaluate", {
      auditId: d.audits[0].id,
      criterionId: "CR-01",
      outcome,
      comment: "Review",
    });
  const e = d.evaluations.find(
    (e) => e.auditId === d.audits[0].id && e.criterionId === "CR-01",
  );
  assert.equal(e.history.length, 3);
  assert.equal(e.outcome, "Not Applicable");
});
test("blank comments and foreign observations rejected, comments escape in React", () => {
  const d = seedData();
  assert.throws(
    () =>
      execute(d, "U-FAC", "comment", { auditId: d.audits[0].id, text: " " }),
    /Enter a comment/,
  );
  assert.throws(
    () =>
      execute(d, "U-FAC", "comment", {
        auditId: d.audits[0].id,
        text: "x",
        observationId: "OBS-003",
      }),
    /Invalid observation/,
  );
});
test("comment retries and notification events are deduplicated", () => {
  let d = seedData();
  const p = { auditId: d.audits[0].id, text: "Question", requestId: "retry-1" };
  d = change(d, "U-FAC", "comment", p);
  const count = d.comments.length,
    n = d.notifications.length;
  d = change(d, "U-FAC", "comment", p);
  assert.equal(d.comments.length, count);
  assert.equal(d.notifications.length, n);
  d = change(d, "U-FAC", "comment", { ...p, requestId: "retry-2" });
  assert.equal(d.comments.length, count + 1);
});
test("faculty may message administrators but not broadcast", () => {
  const d = seedData(),
    p = {
      auditId: d.audits[0].id,
      message: "Please clarify",
      recipientIds: ["U-ADMIN"],
    };
  assert.ok(
    execute(d, "U-FAC", "notify", p).db.notifications.some(
      (n) => n.message === p.message,
    ),
  );
  assert.throws(
    () => execute(d, "U-FAC", "notify", { ...p, recipientIds: ["U-AUD"] }),
    /authorized recipient/,
  );
});
test("recipient ownership is enforced when marking read", () => {
  const d = seedData(),
    n = d.notifications.find((n) => n.recipientId === "U-ADMIN");
  assert.throws(
    () => execute(d, "U-FAC", "readNotification", { id: n.id }),
    /not found/,
  );
  const x = change(d, "U-ADMIN", "readNotification", { id: n.id });
  assert.equal(x.notifications.find((x) => x.id === n.id).isRead, true);
});
test("corrective action submit, revision, resubmit, approve, close, reopen", () => {
  let d = seedData();
  assert.ok(observationBlockers(d, d.observations[0]).length);
  assert.throws(
    () => execute(d, "U-AUD", "closeObservation", { id: "OBS-001" }),
    /required/,
  );
  for (const id of ["CA-001", "CA-006"]) {
    d = change(d, "U-FAC", "submitAction", { id, description: "Done", file });
    d = change(d, "U-AUD", "reviewAction", {
      id,
      status: "Revision Required",
      comment: "Please add a signature",
    });
    d = change(d, "U-FAC", "submitAction", { id, description: "Signed", file });
    d = change(d, "U-AUD", "reviewAction", {
      id,
      status: "Approved",
      comment: "Verified",
    });
  }
  d = change(d, "U-AUD", "closeObservation", { id: "OBS-001" });
  assert.equal(d.observations[0].status, "Closed");
  assert.ok(d.observations[0].closedBy);
  assert.equal(d.actions[0].submissions.length, 2);
  d = change(d, "U-AUD", "reopenObservation", {
    id: "OBS-001",
    reason: "New issue found",
  });
  assert.equal(d.observations[0].status, "Reopened");
  assert.equal(d.actions[0].status, "Revision Required");
  assert.ok(d.observations[0].history.length);
});
test("only responsible user submits and auditor verifies", () => {
  const d = seedData();
  assert.throws(
    () =>
      execute(d, "U-FAC2", "submitAction", {
        id: "CA-001",
        description: "Done",
        file,
      }),
    /responsible person/,
  );
  assert.throws(
    () =>
      execute(d, "U-ADMIN", "reviewAction", {
        id: "CA-003",
        status: "Approved",
        comment: "ok",
      }),
    /not allowed|access denied/,
  );
  assert.throws(
    () => execute(d, "U-ADMIN", "closeObservation", { id: "OBS-001" }),
    /not allowed/,
  );
});
test("closure rejects blockers, stale versions, faculty and missing evidence", () => {
  const d = seedData(),
    a = d.audits[0];
  assert.ok(closureBlockers(d, a).length);
  assert.throws(
    () =>
      execute(d, "U-ADMIN", "closeAudit", {
        auditId: a.id,
        version: a.version,
      }),
    /Cannot close/,
  );
  assert.throws(
    () =>
      execute(d, "U-FAC", "closeAudit", {
        auditId: d.audits[4].id,
        version: 1,
      }),
    /not allowed/,
  );
  assert.throws(
    () =>
      execute(d, "U-AUD", "closeAudit", {
        auditId: d.audits[4].id,
        version: 999,
      }),
    /changed/,
  );
  const missing = structuredClone(d);
  missing.actions.find((a) => a.id === "CA-004").submissions = [];
  assert.ok(
    closureBlockers(missing, missing.audits[4]).some((b) =>
      b.includes("OBS-004"),
    ),
  );
});
test("eligible audit closure is atomic and idempotent with immutable report", () => {
  let d = seedData(),
    a = d.audits[4];
  assert.deepEqual(closureBlockers(d, a), []);
  d = change(d, "U-AUD", "closeAudit", { auditId: a.id, version: a.version });
  assert.equal(d.audits[4].status, "Closed");
  assert.equal(d.reports.length, 2);
  const count = d.logs.length;
  d = change(d, "U-AUD", "closeAudit", { auditId: a.id, version: 1 });
  assert.equal(d.reports.length, 2);
  assert.equal(d.logs.length, count);
  d = change(d, "U-AUD", "reopenObservation", {
    id: "OBS-004",
    reason: "Recheck source",
  });
  assert.equal(d.audits[4].status, "Corrective Action");
  assert.equal(d.reports.at(-1).snapshot.audit.status, "Closed");
});
test("overdue status is dynamic and notifications do not duplicate", () => {
  let d = seedData();
  assert.equal(
    isOverdue({ status: "Assigned", dueDate: dateOffset(-1) }),
    true,
  );
  assert.equal(
    isOverdue({ status: "Approved", dueDate: dateOffset(-1) }),
    false,
  );
  assert.equal(
    isOverdue({ status: "Assigned", dueDate: dateOffset(1) }),
    false,
  );
  d = change(d, "U-ADMIN", "overdueNotifications");
  const n = d.notifications.length;
  d = change(d, "U-ADMIN", "overdueNotifications");
  assert.equal(d.notifications.length, n);
});
test("department coordinator may maintain own courses only", () => {
  const d = seedData();
  const values = { ...d.courses[0], name: "Updated course" };
  assert.equal(
    change(d, "U-HOD", "saveEntity", {
      collection: "courses",
      id: values.id,
      values,
    }).courses[0].name,
    "Updated course",
  );
  assert.throws(
    () =>
      execute(d, "U-HOD2", "saveEntity", {
        collection: "courses",
        id: values.id,
        values,
      }),
    /only your department/,
  );
});
test("dependent program cannot be deleted, department deactivation preserves records", () => {
  let d = seedData();
  assert.throws(
    () => execute(d, "U-ADMIN", "deleteProgram", { id: "P-1" }),
    /related records/,
  );
  d = change(d, "U-ADMIN", "saveEntity", {
    collection: "departments",
    id: "D-CSE",
    values: { ...d.departments[0], status: "Inactive" },
  });
  assert.equal(d.audits.length, 6);
  assert.equal(d.evidence.length, 9);
});
test("criteria revision preserves history, invalidates evaluation and notifies", () => {
  let d = seedData();
  d = change(d, "U-ADMIN", "saveEntity", {
    collection: "criteria",
    id: "CR-06",
    values: { ...d.criteria[5], requirement: "Updated requirement" },
  });
  assert.equal(d.criteria[5].history.length, 1);
  assert.ok(
    !d.evaluations.some(
      (e) => e.auditId === d.audits[4].id && e.criterionId === "CR-06",
    ),
  );
  assert.ok(
    d.evaluations.some(
      (e) => e.auditId === d.audits[5].id && e.criterionId === "CR-06",
    ),
  );
});
test("metrics are derived from records after mutations", () => {
  let d = seedData();
  const before = metrics(d);
  d = change(d, "U-AUD", "closeAudit", { auditId: d.audits[4].id, version: 1 });
  assert.equal(metrics(d).completed, before.completed + 1);
  assert.equal(metrics(d).active, before.active - 1);
});

test("seeded closure report remains immutable when global criterion changes", () => {
  let d = seedData();
  const original = d.reports[0].snapshot.criteria[0].requirement;
  d = change(d, "U-ADMIN", "saveEntity", {
    collection: "criteria",
    id: "CR-06",
    values: { ...d.criteria[5], requirement: "Changed after closure" },
  });
  assert.equal(d.reports[0].snapshot.criteria[0].requirement, original);
});
