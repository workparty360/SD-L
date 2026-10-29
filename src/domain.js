import { AUDIT_STATES, OUTCOMES, EVIDENCE_STATES, ROLES, uid } from "./data.js";
export const latest = (e) => e.versions.at(-1);
export const today = () => new Date().toLocaleDateString("en-CA");
export const isOverdue = (a) => a.status !== "Approved" && a.dueDate < today();
export const active = (u) => u?.status === "Active";
export function canViewAudit(db, u, a) {
  return !!(
    active(u) &&
    a &&
    (u.role === "admin" ||
      u.role === "management" ||
      (u.role === "auditor" && a.auditorIds.includes(u.id)) ||
      (["hod", "faculty"].includes(u.role) &&
        a.departmentId === u.departmentId &&
        (a.targetType !== "Course" ||
          u.role === "hod" ||
          db.courses.some((c) => c.id === a.targetId && c.facultyId === u.id))))
  );
}
export function scope(db, u) {
  const audits = db.audits.filter((a) => canViewAudit(db, u, a)),
    ids = new Set(audits.map((a) => a.id));
  return {
    ...db,
    audits,
    evidence: db.evidence.filter((e) => ids.has(e.auditId)),
    evaluations: db.evaluations.filter((e) => ids.has(e.auditId)),
    observations: db.observations.filter((o) => ids.has(o.auditId)),
    actions: db.actions.filter((a) => ids.has(a.auditId)),
    comments: db.comments.filter((c) => ids.has(c.auditId)),
    logs: db.logs.filter((l) => u.role === "admin" || ids.has(l.auditId)),
    notifications: db.notifications.filter(
      (n) =>
        n.recipientId === u.id &&
        (!n.deliverAt || new Date(n.deliverAt) <= new Date()),
    ),
  };
}
export function observationBlockers(db, o) {
  const actions = db.actions.filter((a) => a.observationId === o.id);
  if (!actions.length) return ["No corrective action has been assigned."];
  return actions.flatMap((a) =>
    a.status !== "Approved" ||
    !a.submissions.length ||
    !a.submissions.at(-1).file ||
    !a.submissions.at(-1).reviewedBy
      ? [`${a.id}: supporting evidence and auditor approval are required.`]
      : [],
  );
}
export function closureBlockers(db, a) {
  const b = [];
  if (a.status !== "Closure Review")
    b.push("Move the audit to Closure Review.");
  if (!a.criterionIds.length) b.push("Assign at least one criterion.");
  for (const id of a.criterionIds) {
    const ev = db.evaluations.find(
      (e) => e.auditId === a.id && e.criterionId === id,
    );
    if (!ev || !["Compliant", "Not Applicable"].includes(ev.outcome))
      b.push(`${id}: a Compliant or Not Applicable evaluation is required.`);
    if (
      ev?.outcome !== "Not Applicable" &&
      !db.evidence.some(
        (e) =>
          e.auditId === a.id &&
          e.criterionId === id &&
          latest(e).status === "Accepted",
      )
    )
      b.push(`${id}: accepted latest evidence is required.`);
    if (
      db.evidence.some(
        (e) =>
          e.auditId === a.id &&
          e.criterionId === id &&
          latest(e).status !== "Accepted",
      ) &&
      ev?.outcome !== "Not Applicable"
    )
      b.push(`${id}: an evidence submission still needs acceptance.`);
  }
  for (const o of db.observations.filter((o) => o.auditId === a.id))
    if (o.status !== "Closed" || observationBlockers(db, o).length)
      b.push(`${o.id}: observation must be verified Closed.`);
  for (const x of db.actions.filter((x) => x.auditId === a.id))
    if (x.status !== "Approved")
      b.push(`${x.id}: corrective action is not Approved.`);
  return b;
}
export function metrics(db) {
  const closed = db.observations.filter((o) => o.status === "Closed").length;
  return {
    total: db.audits.length,
    active: db.audits.filter((a) => !["Draft", "Closed"].includes(a.status))
      .length,
    completed: db.audits.filter((a) => a.status === "Closed").length,
    open: db.observations.length - closed,
    overdue: db.actions.filter(isOverdue).length,
    approved: db.actions.filter((a) => a.status === "Approved").length,
    closureRate: db.observations.length
      ? Math.round((closed / db.observations.length) * 100)
      : 0,
    actionRate: db.actions.length
      ? Math.round(
          (db.actions.filter((a) => a.status === "Approved").length /
            db.actions.length) *
            100,
        )
      : 0,
    pendingEvidence: db.evidence.filter(
      (e) => latest(e).status === "Pending Review",
    ).length,
    pendingActions: db.actions.filter(
      (a) => a.status === "Submitted for Review",
    ).length,
  };
}
function requireThat(ok, message) {
  if (!ok) throw Error(message);
}
function required(x, keys) {
  for (const k of keys)
    requireThat(
      x[k] !== undefined && x[k] !== null && String(x[k]).trim(),
      `Please complete ${k.replace(/([A-Z])/g, " $1").toLowerCase()}.`,
    );
}
export function validateFile(file, comment = false) {
  requireThat(file, "Choose a file.");
  requireThat(file.size > 0, "The file is empty.");
  requireThat(file.size <= 5 * 1024 * 1024, "Choose a file up to 5 MB.");
  requireThat(
    (comment ? /\.(pdf|txt)$/i : /\.(pdf|docx?|xlsx?|jpe?g|png|txt)$/i).test(
      file.name,
    ),
    "This file format is not permitted.",
  );
  return true;
}
export function recipients(db, a) {
  return db.users
    .filter((u) => active(u) && canViewAudit(db, u, a))
    .map((u) => u.id);
}
export function notify(
  db,
  eventId,
  auditId,
  message,
  recipientIds,
  type = "In-app",
  deliverAt,
) {
  for (const recipientId of new Set(recipientIds))
    if (
      !db.notifications.some(
        (n) => n.eventId === eventId && n.recipientId === recipientId,
      )
    )
      db.notifications.push({
        id: uid("NOT"),
        eventId,
        auditId,
        message,
        recipientId,
        type,
        deliverAt,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
}
export function reportSnapshot(db, a) {
  return structuredClone({
    audit: { ...a, history: [] },
    team: db.users
      .filter((u) => a.auditorIds.includes(u.id) || u.id === a.coordinatorId)
      .map(({ name, role }) => ({ name, role })),
    criteria: db.criteria.filter((c) => a.criterionIds.includes(c.id)),
    evidence: db.evidence.filter((e) => e.auditId === a.id),
    evaluations: db.evaluations.filter((e) => e.auditId === a.id),
    observations: db.observations.filter((o) => o.auditId === a.id),
    actions: db.actions.filter((x) => x.auditId === a.id),
  });
}
export function execute(source, userId, command, p = {}) {
  const db = structuredClone(source),
    u = db.users.find((u) => u.id === userId);
  requireThat(active(u), "Your account is inactive. Please sign in again.");
  const now = new Date().toISOString();
  let auditId = p.auditId || "",
    before = "—",
    after = "—",
    message = "Changes saved",
    resultId = p.id;
  const role = (...roles) =>
    requireThat(
      roles.includes(u.role),
      "You are not allowed to perform this action.",
    );
  const audit = (id = auditId, editable = true) => {
    const a = db.audits.find((a) => a.id === id);
    requireThat(canViewAudit(db, u, a), "Audit not found or access denied.");
    if (editable)
      requireThat(
        a.status !== "Closed",
        "This audit is closed. Reopen an observation before changing its workflow.",
      );
    auditId = a.id;
    return a;
  };
  const review = (a) => {
    role("auditor");
    requireThat(
      a.auditorIds.includes(u.id),
      "Only an assigned auditor may verify this record.",
    );
  };
  const record = (collection, id) => {
    const x = db[collection].find((x) => x.id === id);
    requireThat(x, "Record not found.");
    return x;
  };
  const announce = (text, event = uid("EVENT"), ids) => {
    if (auditId) {
      const a = record("audits", auditId);
      notify(db, event, auditId, text, ids || recipients(db, a));
    }
  };
  if (command === "saveEntity") {
    const { collection, values } = p;
    requireThat(
      ["users", "departments", "programs", "courses", "criteria"].includes(
        collection,
      ),
      "Invalid module.",
    );
    if (collection === "courses") role("admin", "hod");
    else role("admin");
    const old = p.id ? record(collection, p.id) : null;
    const x = {
      ...old,
      ...values,
      id: old?.id || uid(collection.slice(0, 3).toUpperCase()),
    };
    resultId = x.id;
    required(x, ["name", "status"]);
    if (collection === "users") {
      required(x, ["email", "role"]);
      requireThat(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email),
        "Enter a valid email.",
      );
      requireThat(ROLES[x.role], "Select a valid role.");
      requireThat(
        !db.users.some(
          (y) =>
            y.id !== x.id && y.email.toLowerCase() === x.email.toLowerCase(),
        ),
        "That email is already used.",
      );
      requireThat(
        x.id !== u.id || (x.status === "Active" && x.role === "admin"),
        "You cannot deactivate or remove your own administrator role.",
      );
      x.createdAt = old?.createdAt || now;
      x.courseIds = x.courseIds || [];
    }
    if (["users", "programs", "courses"].includes(collection)) {
      requireThat(
        db.departments.some((d) => d.id === x.departmentId),
        "Select an existing department.",
      );
      if (u.role === "hod")
        requireThat(
          x.departmentId === u.departmentId &&
            (!old || old.departmentId === u.departmentId),
          "You may maintain only your department courses.",
        );
    }
    if (["departments", "programs", "courses"].includes(collection)) {
      required(x, ["code"]);
      requireThat(
        !db[collection].some(
          (y) => y.id !== x.id && y.code.toLowerCase() === x.code.toLowerCase(),
        ),
        "This code already exists.",
      );
    }
    if (collection === "departments" && x.hodId)
      requireThat(
        db.users.some((z) => z.id === x.hodId && z.role === "hod" && active(z)),
        "Select an active HOD.",
      );
    if (collection === "courses") {
      requireThat(
        db.programs.some(
          (z) =>
            z.id === x.programId &&
            z.departmentId === x.departmentId &&
            z.status === "Active",
        ),
        "Select an active program in this department.",
      );
      requireThat(
        db.users.some(
          (z) =>
            z.id === x.facultyId &&
            z.departmentId === x.departmentId &&
            z.role === "faculty" &&
            active(z),
        ),
        "Select an active faculty member in this department.",
      );
    }
    if (collection === "criteria") {
      required(x, [
        "category",
        "requirement",
        "evidenceRequirement",
        "priority",
        "targetType",
      ]);
      x.history = [
        ...(old?.history || []),
        ...(old ? [{ ...old, history: undefined, changedAt: now }] : []),
      ];
      x.version = (old?.version || 0) + 1;
    }
    if (old)
      db[collection] = db[collection].map((y) => (y.id === x.id ? x : y));
    else db[collection].push(x);
    before = old?.status || "—";
    after = x.status;
    if (collection === "criteria" && old)
      for (const a of db.audits.filter(
        (a) => a.criterionIds.includes(x.id) && a.status !== "Closed",
      )) {
        a.history.push({
          ...a,
          history: undefined,
          snapshot: reportSnapshot(
            source,
            source.audits.find((y) => y.id === a.id),
          ),
          changedAt: now,
        });
        a.version++;
        db.evaluations = db.evaluations.filter(
          (e) => !(e.auditId === a.id && e.criterionId === x.id),
        );
        notify(
          db,
          `criteria-${x.id}-${x.version}`,
          a.id,
          `${x.name} was revised. Review the latest criteria.`,
          recipients(db, a),
        );
      }
    if (collection === "courses")
      db.users.forEach(
        (user) =>
          (user.courseIds = db.courses
            .filter((c) => c.facultyId === user.id)
            .map((c) => c.id)),
      );
  } else if (command === "deleteProgram") {
    role("admin");
    const x = record("programs", p.id);
    requireThat(
      !db.courses.some((c) => c.programId === x.id) &&
        !db.audits.some((a) => a.targetId === x.id),
      "This program has related records. Deactivate it instead.",
    );
    db.programs = db.programs.filter((y) => y.id !== x.id);
    message = "Program deleted";
  } else if (command === "saveAudit") {
    role("admin");
    const old = p.id ? audit(p.id) : null;
    const x = {
      ...old,
      ...p.values,
      id: old?.id || uid("AAP"),
      status: old?.status || "Draft",
    };
    required(x, [
      "title",
      "type",
      "academicYear",
      "targetType",
      "targetId",
      "startDate",
      "endDate",
      "coordinatorId",
      "description",
    ]);
    requireThat(
      x.endDate >= x.startDate,
      "End date must be on or after the start date.",
    );
    const key = {
      Department: "departments",
      Program: "programs",
      Course: "courses",
    }[x.targetType];
    requireThat(key, "Select a target type.");
    const target = db[key].find(
      (t) => t.id === x.targetId && t.status === "Active",
    );
    requireThat(target, "Select an active audit target.");
    x.departmentId = key === "departments" ? target.id : target.departmentId;
    requireThat(
      db.departments.some(
        (d) => d.id === x.departmentId && d.status === "Active",
      ),
      "The target department is inactive.",
    );
    requireThat(
      db.users.some(
        (z) =>
          z.id === x.coordinatorId &&
          z.role === "hod" &&
          active(z) &&
          z.departmentId === x.departmentId,
      ),
      "Select an active coordinator in the target department.",
    );
    requireThat(
      x.auditorIds?.length &&
        x.auditorIds.every((id) =>
          db.users.some(
            (z) => z.id === id && z.role === "auditor" && active(z),
          ),
        ),
      "Assign at least one active auditor.",
    );
    requireThat(
      x.criterionIds?.length &&
        x.criterionIds.every((id) =>
          db.criteria.some((c) => c.id === id && c.status === "Active"),
        ),
      "Assign at least one active criterion.",
    );
    if (old)
      requireThat(
        old.departmentId === x.departmentId ||
          !db.evidence.some((e) => e.auditId === old.id),
        "The department cannot change after evidence submission.",
      );
    if (old) {
      const removed = old.criterionIds.filter(
        (id) => !x.criterionIds.includes(id),
      );
      requireThat(
        !removed.some(
          (id) =>
            db.evidence.some(
              (e) => e.auditId === old.id && e.criterionId === id,
            ) ||
            db.observations.some(
              (o) => o.auditId === old.id && o.criterionId === id,
            ),
        ),
        "A criterion with evidence or observations cannot be removed.",
      );
    }
    x.assignments = x.auditorIds.map(
      (userId) =>
        old?.assignments?.find((t) => t.userId === userId) || {
          userId,
          role: "Auditor",
          assignedAt: now,
        },
    );
    x.version = (old?.version || 0) + 1;
    x.history = [
      ...(old?.history || []),
      ...(old
        ? [
            {
              ...old,
              history: undefined,
              snapshot: reportSnapshot(
                source,
                source.audits.find((y) => y.id === old.id),
              ),
              changedAt: now,
            },
          ]
        : []),
    ];
    db.audits = old
      ? db.audits.map((a) => (a.id === x.id ? x : a))
      : [...db.audits, x];
    auditId = x.id;
    resultId = x.id;
    announce(`Audit ${x.id} ${old ? "updated" : "created"}: ${x.title}`);
    message = old ? "Audit updated" : "Audit created";
  } else if (
    command === "auditStatus" ||
    command === "resubmitAudit" ||
    command === "closeAudit"
  ) {
    role("admin", "auditor");
    const a = audit(auditId, command !== "closeAudit");
    if (u.role === "auditor")
      requireThat(a.auditorIds.includes(u.id), "Audit assignment required.");
    before = a.status;
    if (command === "closeAudit") {
      if (a.status === "Closed")
        return { db: source, message: "Audit already closed", id: a.id };
      requireThat(
        p.version === a.version,
        "Audit changed. Refresh and review again.",
      );
      const blockers = closureBlockers(db, a);
      requireThat(!blockers.length, `Cannot close: ${blockers.join(" ")}`);
      a.status = "Closed";
      a.closedAt = now;
      a.closedBy = u.id;
      message = "Audit closed";
    } else if (command === "resubmitAudit") {
      role("admin");
      a.history.push({
        ...a,
        history: undefined,
        snapshot: reportSnapshot(
          source,
          source.audits.find((x) => x.id === a.id),
        ),
        changedAt: now,
      });
      a.status = "Evidence Collection";
      message = "Audit resubmitted";
    } else {
      requireThat(
        p.status === AUDIT_STATES[AUDIT_STATES.indexOf(a.status) + 1] &&
          p.status !== "Closed",
        "Use the next lifecycle stage, or complete the closure review.",
      );
      a.status = p.status;
      message = "Audit status updated";
    }
    a.version++;
    after = a.status;
    if (command === "closeAudit")
      db.reports.push({
        id: uid("REPORT"),
        auditId: a.id,
        createdAt: now,
        snapshot: reportSnapshot(db, a),
      });
    announce(`${a.id}: ${message}`, `${command}-${a.id}-${a.version}`);
  } else if (command === "submitEvidence") {
    role("faculty", "hod");
    const a = audit();
    requireThat(
      !["Draft", "Closure Review"].includes(a.status),
      "Evidence collection is not open for this audit.",
    );
    requireThat(
      a.criterionIds.includes(p.criterionId),
      "Select a criterion assigned to this audit.",
    );
    required(p, ["title", "description"]);
    validateFile(p.file);
    let e = p.id ? record("evidence", p.id) : null;
    if (e) {
      requireThat(
        e.auditId === a.id && e.criterionId === p.criterionId,
        "Evidence belongs to a different audit or criterion.",
      );
      requireThat(
        u.role === "hod" || latest(e).submittedBy === u.id,
        "Only the submitter or department coordinator may revise this evidence.",
      );
      requireThat(
        ["Rejected", "Revision Required"].includes(latest(e).status),
        "Only rejected or revision-required evidence may be resubmitted.",
      );
      before = latest(e).status;
    } else {
      e = {
        id: uid("EV"),
        auditId: a.id,
        criterionId: p.criterionId,
        versions: [],
      };
      db.evidence.push(e);
    }
    e.versions.push({
      number: e.versions.length + 1,
      title: p.title,
      description: p.description,
      remarks: p.remarks || "",
      file: p.file,
      submittedAt: now,
      submittedBy: u.id,
      status: "Pending Review",
    });
    a.version++;
    resultId = e.id;
    after = "Pending Review";
    message =
      e.versions.length > 1 ? "Evidence resubmitted" : "Evidence submitted";
    announce(`${e.id}: ${message}`);
  } else if (command === "reviewEvidence") {
    const e = record("evidence", p.id),
      a = audit(e.auditId);
    review(a);
    requireThat(
      latest(e).status === "Pending Review",
      "Only pending evidence can be reviewed.",
    );
    requireThat(
      EVIDENCE_STATES.slice(1).includes(p.status),
      "Select a valid review decision.",
    );
    required(p, ["comment"]);
    before = latest(e).status;
    Object.assign(latest(e), {
      status: p.status,
      reviewComment: p.comment,
      reviewedBy: u.id,
      reviewedAt: now,
    });
    a.version++;
    after = p.status;
    announce(`${e.id}: evidence ${p.status.toLowerCase()}`);
    message = "Evidence review saved";
  } else if (command === "evaluate") {
    const a = audit();
    review(a);
    requireThat(
      a.criterionIds.includes(p.criterionId),
      "Criterion is not assigned to this audit.",
    );
    requireThat(OUTCOMES.includes(p.outcome), "Select an evaluation outcome.");
    required(p, ["comment"]);
    requireThat(
      p.outcome === "Not Applicable" ||
        db.evidence.some(
          (e) => e.auditId === a.id && e.criterionId === p.criterionId,
        ),
      "Evidence must be submitted before evaluation.",
    );
    const old = db.evaluations.find(
      (e) => e.auditId === a.id && e.criterionId === p.criterionId,
    );
    const x = {
      id: old?.id || uid("EVAL"),
      auditId: a.id,
      criterionId: p.criterionId,
      outcome: p.outcome,
      comment: p.comment,
      auditorId: u.id,
      createdAt: now,
      history: [
        ...(old?.history || []),
        ...(old ? [{ ...old, history: undefined }] : []),
      ],
    };
    db.evaluations = old
      ? db.evaluations.map((e) => (e.id === old.id ? x : e))
      : [...db.evaluations, x];
    a.version++;
    before = old?.outcome || "—";
    after = p.outcome;
    message = "Evaluation saved";
  } else if (command === "createObservation") {
    const a = audit();
    review(a);
    required(p, ["description", "criterionId", "severity"]);
    requireThat(
      a.criterionIds.includes(p.criterionId),
      "Select an assigned criterion.",
    );
    requireThat(
      ["Low", "Medium", "High"].includes(p.severity),
      "Select a valid severity.",
    );
    requireThat(
      db.evidence.some(
        (e) => e.auditId === a.id && e.criterionId === p.criterionId,
      ) ||
        db.evaluations.some(
          (e) => e.auditId === a.id && e.criterionId === p.criterionId,
        ),
      "Review evidence or evaluate this criterion first.",
    );
    const o = {
      id: uid("OBS"),
      auditId: a.id,
      criterionId: p.criterionId,
      description: p.description,
      severity: p.severity,
      status: "Open",
      auditorId: u.id,
      createdAt: now,
      history: [],
    };
    db.observations.push(o);
    a.version++;
    resultId = o.id;
    after = "Open";
    message = "Observation created";
    announce(`${o.id}: ${o.description}`);
  } else if (command === "saveAction") {
    role("admin", "auditor", "hod");
    const old = p.id ? record("actions", p.id) : null;
    const o = record("observations", old?.observationId || p.observationId),
      a = audit(o.auditId);
    requireThat(
      o.status !== "Closed",
      "Reopen the observation before assigning corrective work.",
    );
    if (!old) role("admin", "auditor");
    if (u.role === "auditor") review(a);
    required(p, ["responsibleId"]);
    requireThat(
      db.users.some(
        (z) =>
          z.id === p.responsibleId &&
          ["faculty", "hod"].includes(z.role) &&
          z.departmentId === a.departmentId &&
          active(z),
      ),
      "Assign an active faculty member or coordinator in this department.",
    );
    if (old) {
      requireThat(
        old.status !== "Approved",
        "Approved actions cannot be reassigned.",
      );
      old.history.push({ ...old, history: undefined, changedAt: now });
      old.responsibleId = p.responsibleId;
    } else {
      required(p, ["description", "dueDate", "priority"]);
      const x = {
        id: uid("CA"),
        auditId: a.id,
        observationId: o.id,
        description: p.description,
        responsibleId: p.responsibleId,
        dueDate: p.dueDate,
        priority: p.priority,
        departmentId: a.departmentId,
        status: "Assigned",
        submissions: [],
        history: [],
        createdAt: now,
      };
      db.actions.push(x);
      resultId = x.id;
    }
    a.version++;
    o.status = "In Progress";
    message = old ? "Responsibility updated" : "Corrective action assigned";
    announce(message);
  } else if (
    command === "startAction" ||
    command === "submitAction" ||
    command === "reviewAction"
  ) {
    const x = record("actions", p.id),
      a = audit(x.auditId),
      o = record("observations", x.observationId);
    before = x.status;
    requireThat(
      o.status !== "Closed",
      "Reopen the observation before modifying this action.",
    );
    if (command === "reviewAction") {
      review(a);
      requireThat(
        x.status === "Submitted for Review" && x.submissions.at(-1)?.file,
        "A submitted action and supporting evidence are required.",
      );
      requireThat(
        ["Approved", "Rejected", "Revision Required"].includes(p.status),
        "Select a review decision.",
      );
      required(p, ["comment"]);
      x.status = p.status;
      Object.assign(x.submissions.at(-1), {
        status: p.status,
        reviewedBy: u.id,
        reviewedAt: now,
        reviewComment: p.comment,
      });
    } else {
      role("faculty", "hod");
      requireThat(
        x.responsibleId === u.id,
        "Only the responsible person may submit this action.",
      );
      requireThat(
        ["Assigned", "In Progress", "Revision Required", "Rejected"].includes(
          x.status,
        ),
        "This action is already submitted or approved.",
      );
      if (command === "startAction") x.status = "In Progress";
      else {
        required(p, ["description"]);
        validateFile(p.file);
        x.submissions.push({
          number: x.submissions.length + 1,
          description: p.description,
          comment: p.comment || "",
          file: p.file,
          submittedBy: u.id,
          submittedAt: now,
          status: "Submitted for Review",
        });
        x.status = "Submitted for Review";
      }
    }
    x.history.push({
      status: before,
      newStatus: x.status,
      actorId: u.id,
      createdAt: now,
    });
    a.version++;
    o.status = ["Submitted for Review", "Approved"].includes(x.status)
      ? "Awaiting Verification"
      : "In Progress";
    after = x.status;
    message = "Corrective action updated";
    announce(`${x.id}: ${x.status}`);
  } else if (
    command === "closeObservation" ||
    command === "reopenObservation"
  ) {
    const o = record("observations", p.id),
      a = audit(o.auditId, false);
    review(a);
    before = o.status;
    if (command === "closeObservation") {
      requireThat(o.status !== "Closed", "Observation is already closed.");
      const b = observationBlockers(db, o);
      requireThat(!b.length, b.join(" "));
      o.status = "Closed";
      o.closedAt = now;
      o.closedBy = u.id;
    } else {
      requireThat(
        o.status === "Closed",
        "Only a closed observation can be reopened.",
      );
      required(p, ["reason"]);
      o.status = "Reopened";
      o.history.push({
        status: before,
        closedAt: o.closedAt,
        closedBy: o.closedBy,
        reason: p.reason,
        createdAt: now,
      });
      o.closedAt = null;
      o.closedBy = null;
      for (const x of db.actions.filter((x) => x.observationId === o.id)) {
        x.history.push({
          status: x.status,
          newStatus: "Revision Required",
          reason: p.reason,
          createdAt: now,
        });
        x.status = "Revision Required";
      }
      if (a.status === "Closed") {
        a.history.push({ ...a, history: undefined, changedAt: now });
        a.status = "Corrective Action";
        a.closedAt = null;
        a.closedBy = null;
      }
    }
    a.version++;
    after = o.status;
    message = `Observation ${o.status.toLowerCase()}`;
    announce(`${o.id}: ${message}`);
  } else if (command === "comment") {
    const a = audit(auditId, false);
    role("admin", "auditor", "faculty", "hod");
    requireThat(
      a.status !== "Draft",
      "Comments open when the audit is published.",
    );
    const text = (p.text || "").trim();
    requireThat(text || p.file, "Enter a comment or choose a comment file.");
    requireThat(
      text.length <= 2000,
      "Comment must be 2,000 characters or fewer.",
    );
    if (p.file) validateFile(p.file, true);
    if (p.observationId)
      requireThat(
        db.observations.some(
          (o) => o.id === p.observationId && o.auditId === a.id,
        ),
        "Invalid observation link.",
      );
    if (
      p.requestId &&
      db.comments.some(
        (c) => c.requestId === p.requestId && c.authorId === u.id,
      )
    )
      return { db: source, message: "Comment already saved" };
    const c = {
      id: uid("COM"),
      auditId: a.id,
      observationId: p.observationId,
      text,
      file: p.file,
      authorId: u.id,
      createdAt: now,
      requestId: p.requestId,
      votes: {},
    };
    db.comments.push(c);
    announce(`${u.name} commented on ${a.id}`, c.id);
    message = "Commented!";
  } else if (command === "vote") {
    role("admin", "auditor", "faculty", "hod");
    const c = record("comments", p.id);
    audit(c.auditId, false);
    requireThat([-1, 1].includes(p.value), "Invalid vote.");
    c.votes = { ...c.votes, [u.id]: c.votes?.[u.id] === p.value ? 0 : p.value };
    message = "Vote updated";
  } else if (command === "notify") {
    role("admin", "auditor", "hod", "faculty");
    const a = audit(auditId, false);
    required(p, ["message"]);
    requireThat(
      p.message.length <= 2000,
      "Message must be 2,000 characters or fewer.",
    );
    const eligible = recipients(db, a).filter(
      (id) =>
        u.role !== "faculty" ||
        db.users.find((z) => z.id === id).role === "admin",
    );
    requireThat(
      p.recipientIds?.length &&
        p.recipientIds.every((id) => eligible.includes(id)),
      "Choose at least one authorized recipient.",
    );
    notify(
      db,
      p.requestId || uid("EVENT"),
      a.id,
      p.message,
      p.recipientIds,
      p.channel || "In-app",
      p.deliverAt,
    );
    message = "Notification saved to the demo inbox";
  } else if (command === "readNotification") {
    const ns = db.notifications.filter(
      (n) => n.recipientId === u.id && (!p.id || n.id === p.id),
    );
    requireThat(!p.id || ns.length, "Notification not found.");
    ns.forEach((n) => (n.isRead = true));
    message = "Marked as read";
  } else if (command === "overdueNotifications") {
    for (const x of db.actions.filter(isOverdue))
      notify(
        db,
        `overdue-${x.id}-${x.dueDate}`,
        x.auditId,
        `${x.id} is overdue. Please review the corrective action.`,
        [
          x.responsibleId,
          ...db.users.filter((z) => z.role === "admin").map((z) => z.id),
        ],
      );
    return { db, message: "" };
  } else throw Error("Unknown action.");
  db.logs.push({
    id: uid("LOG"),
    actorId: u.id,
    action:
      message === "Changes saved"
        ? `${p.collection} ${p.id ? "updated" : "created"}`
        : message,
    auditId,
    createdAt: now,
    previousStatus: before,
    newStatus: after,
  });
  return { db, message, id: resultId };
}
