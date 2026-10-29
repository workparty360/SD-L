export const DATA_KEY = "aap.demo.v1";
export const SESSION_KEY = "aap.session.v1";
const collections = [
  "users",
  "departments",
  "programs",
  "courses",
  "criteria",
  "audits",
  "evidence",
  "evaluations",
  "observations",
  "actions",
  "comments",
  "notifications",
  "logs",
  "reports",
];
// Reject incompatible or structurally damaged saves before rendering nested data.
export function validState(db) {
  if (
    !db ||
    db.schemaVersion !== 1 ||
    !collections.every(
      (k) =>
        Array.isArray(db[k]) &&
        db[k].every((r) => r && typeof r.id === "string") &&
        new Set(db[k].map((r) => r.id)).size === db[k].length,
    )
  )
    return false;
  const has = (k, id) => db[k].some((r) => r.id === id);
  return (
    db.users.every(
      (u) =>
        typeof u.name === "string" &&
        typeof u.email === "string" &&
        ["admin", "auditor", "faculty", "hod", "management"].includes(u.role) &&
        Array.isArray(u.courseIds),
    ) &&
    db.criteria.every(
      (c) => typeof c.name === "string" && Array.isArray(c.history),
    ) &&
    db.audits.every(
      (a) =>
        typeof a.title === "string" &&
        has("departments", a.departmentId) &&
        Array.isArray(a.auditorIds) &&
        a.auditorIds.every((id) => has("users", id)) &&
        Array.isArray(a.criterionIds) &&
        a.criterionIds.every((id) => has("criteria", id)) &&
        Array.isArray(a.history),
    ) &&
    db.evidence.every(
      (e) =>
        has("audits", e.auditId) &&
        has("criteria", e.criterionId) &&
        Array.isArray(e.versions) &&
        e.versions.length &&
        e.versions.every(
          (v) =>
            v.file &&
            typeof v.file.name === "string" &&
            typeof v.status === "string",
        ),
    ) &&
    db.evaluations.every(
      (e) =>
        has("audits", e.auditId) &&
        has("criteria", e.criterionId) &&
        Array.isArray(e.history),
    ) &&
    db.observations.every(
      (o) =>
        has("audits", o.auditId) &&
        has("criteria", o.criterionId) &&
        Array.isArray(o.history),
    ) &&
    db.actions.every(
      (a) =>
        has("audits", a.auditId) &&
        has("observations", a.observationId) &&
        has("users", a.responsibleId) &&
        Array.isArray(a.history) &&
        Array.isArray(a.submissions),
    ) &&
    db.comments.every(
      (c) => has("audits", c.auditId) && has("users", c.authorId),
    ) &&
    db.notifications.every(
      (n) => has("users", n.recipientId) && typeof n.message === "string",
    ) &&
    db.reports.every(
      (r) =>
        r.snapshot &&
        r.snapshot.audit &&
        [
          "team",
          "criteria",
          "evidence",
          "evaluations",
          "observations",
          "actions",
        ].every((k) => Array.isArray(r.snapshot[k])),
    )
  );
}
export function readSavedData(storage, seed) {
  try {
    const raw = storage.getItem(DATA_KEY);
    if (!raw) return { db: seed() };
    const db = JSON.parse(raw);
    if (!validState(db)) throw Error();
    return { db };
  } catch {
    return {
      db: seed(),
      warning:
        "Saved demo data could not be read. A fresh demonstration dataset has been loaded.",
    };
  }
}
