import React, { useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Plus,
  ArrowLeft,
  CheckCircle2,
  Send,
  FileCheck2,
  ClipboardList,
} from "lucide-react";
import { useApp } from "./store.jsx";
import { AUDIT_STATES, OUTCOMES } from "./data.js";
import { canViewAudit, closureBlockers, latest } from "./domain.js";
import {
  Heading,
  Panel,
  Table,
  Badge,
  Field,
  Select,
  ErrorBox,
  Modal,
  Confirm,
  Comments,
  History,
  Empty,
  fmtDate,
  fmtTime,
} from "./components.jsx";
import { enrichedAudits, auditColumns } from "./Dashboard.jsx";
import {
  UploadForm,
  ObservationForm,
  EvidenceTable,
  ObservationTable,
  ActionTable,
} from "./Workflows.jsx";
import { Compose } from "./Notifications.jsx";
import { AuditReport } from "./Reports.jsx";
export function AuditForm({ record, onClose }) {
  const { db, user, run } = useApp(),
    navigate = useNavigate(),
    [v, setV] = useState(
      record
        ? { ...record }
        : {
            title: "",
            type: "Internal Academic",
            academicYear: "2026–27",
            targetType: "Department",
            targetId: "",
            startDate: "",
            endDate: "",
            coordinatorId: "",
            auditorIds: [],
            criterionIds: [],
            description: "",
          },
    ),
    [error, setError] = useState("");
  if (user.role !== "admin") return <Navigate to="/access-denied" />;
  const targets = db[
      { Department: "departments", Program: "programs", Course: "courses" }[
        v.targetType
      ]
    ].filter((t) => t.status === "Active"),
    target = targets.find((t) => t.id === v.targetId),
    dept = v.targetType === "Department" ? target?.id : target?.departmentId,
    set = (k, x) => setV((s) => ({ ...s, [k]: x }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const id = run("saveAudit", { id: record?.id, values: v });
          if (onClose) onClose();
          else navigate(`/audits/${id}`);
        } catch (e) {
          setError(e.message);
        }
      }}
    >
      <div className="form-grid">
        <Field
          label="Audit title"
          required
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <Select
          label="Audit type"
          value={v.type}
          onChange={(x) => set("type", x)}
          options={[
            "Internal Academic",
            "Accreditation Readiness",
            "Course Review",
            "Quality Improvement",
          ]}
          required
        />
        <Field
          label="Academic year"
          required
          value={v.academicYear}
          onChange={(e) => set("academicYear", e.target.value)}
        />
        <Select
          label="Target type"
          value={v.targetType}
          onChange={(x) =>
            setV((s) => ({
              ...s,
              targetType: x,
              targetId: "",
              coordinatorId: "",
            }))
          }
          options={["Department", "Program", "Course"]}
          required
        />
        <Select
          label="Audit target"
          value={v.targetId}
          onChange={(x) =>
            setV((s) => ({ ...s, targetId: x, coordinatorId: "" }))
          }
          options={targets}
          required
        />
        <Select
          label="Audit coordinator"
          value={v.coordinatorId}
          onChange={(x) => set("coordinatorId", x)}
          options={db.users.filter(
            (u) =>
              u.role === "hod" &&
              u.departmentId === dept &&
              u.status === "Active",
          )}
          required
        />
        <Field
          label="Start date"
          type="date"
          required
          value={v.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
        <Field
          label="End date"
          type="date"
          min={v.startDate}
          required
          value={v.endDate}
          onChange={(e) => set("endDate", e.target.value)}
        />
        <Select
          label="Audit team"
          multiple
          required
          value={v.auditorIds}
          onChange={(x) => set("auditorIds", x)}
          options={db.users.filter(
            (u) => u.role === "auditor" && u.status === "Active",
          )}
        />
        <Select
          label="Applicable criteria"
          multiple
          required
          value={v.criterionIds}
          onChange={(x) => set("criterionIds", x)}
          options={db.criteria.filter((c) => c.status === "Active")}
        />
      </div>
      <Field label="Description">
        <textarea
          required
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <p className="hint">
        {record
          ? "Changes create a historical version. Criteria with submitted records cannot be removed."
          : "New audits start in Draft. Publish to Evidence Collection when the audit team and criteria are ready."}
      </p>
      <ErrorBox error={error} />
      <div className="form-actions">
        <button
          className="btn"
          type="button"
          onClick={() => (onClose ? onClose() : navigate("/audits"))}
        >
          Cancel
        </button>
        <button className="btn primary">
          {record ? "Save audit" : "Create audit"}
        </button>
      </div>
    </form>
  );
}
export function AuditNew() {
  return (
    <>
      <Heading
        title="Create academic audit"
        description="Define the academic scope, assign the team and select the criteria."
      />
      <Panel>
        <AuditForm />
      </Panel>
    </>
  );
}
export function AuditList() {
  const { db, data, user } = useApp(),
    [params] = useSearchParams();
  return (
    <>
      <Heading
        title="Academic audits"
        description="Plan, review and track the full academic audit lifecycle."
      >
        {user.role === "admin" && (
          <Link className="btn primary" to="/audits/new">
            <Plus size={17} /> Create audit
          </Link>
        )}
      </Heading>
      <div className="panel">
        <Table
          rows={enrichedAudits(db, data.audits)}
          columns={[
            ...auditColumns,
            { key: "academicYear", label: "Academic year" },
            { key: "type", label: "Type" },
          ]}
          initialFilter={params.get("status") || ""}
          filters={[
            { key: "status", label: "statuses" },
            { key: "department", label: "departments" },
            { key: "academicYear", label: "academic years" },
            { key: "type", label: "audit types" },
          ]}
        />
      </div>
    </>
  );
}
function EvaluationForm({ auditId, criterionId, onClose }) {
  const { db, run } = useApp(),
    old = db.evaluations.find(
      (e) => e.auditId === auditId && e.criterionId === criterionId,
    ),
    [outcome, setOutcome] = useState(old?.outcome || "Compliant"),
    [comment, setComment] = useState(old?.comment || ""),
    [confirmed, setConfirmed] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal title="Evaluate criterion" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (old && !confirmed)
              throw Error("Confirm the update to the existing evaluation.");
            run("evaluate", { auditId, criterionId, outcome, comment });
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <p>{db.criteria.find((c) => c.id === criterionId)?.requirement}</p>
        <Select
          label="Outcome"
          value={outcome}
          onChange={setOutcome}
          options={OUTCOMES}
        />
        <Field label="Auditor comments">
          <textarea
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Field>
        {old && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I confirm this update may change closure readiness. The previous
            evaluation will be retained.
          </label>
        )}
        <ErrorBox error={error} />
        <div className="form-actions">
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save evaluation</button>
        </div>
      </form>
    </Modal>
  );
}
export function AuditDetail({ view }) {
  const navigate = useNavigate();
  const chooseTab = (next) =>
    view ? navigate(`/audits/${auditId}?tab=${next}`) : setTab(next);
  const { auditId } = useParams(),
    { db, user, run } = useApp(),
    [tab, setTab] = useState(view || "overview"),
    [form, setForm] = useState(""),
    [criterion, setCriterion] = useState("");
  const a = db.audits.find((a) => a.id === auditId);
  if (!canViewAudit(db, user, a))
    return (
      <Empty text="Audit not found or access denied">
        <Link to="/audits">Back to audits</Link>
      </Empty>
    );
  const current = view || tab,
    admin = user.role === "admin",
    auditor = user.role === "auditor",
    editable = a.status !== "Closed",
    blockers = closureBlockers(db, a),
    next = AUDIT_STATES[AUDIT_STATES.indexOf(a.status) + 1],
    tabs = [
      "overview",
      "criteria",
      "evidence",
      "observations",
      "actions",
      "comments",
      "closure",
      "history",
      "report",
    ];
  return (
    <>
      <Link className="back-link" to="/audits">
        <ArrowLeft size={15} /> All audits
      </Link>
      <Heading
        eyebrow={`${a.id} / VERSION ${a.version}`}
        title={a.title}
        description={`${db.departments.find((d) => d.id === a.departmentId)?.name} · ${a.academicYear} · ${a.type}`}
      >
        <Badge>{a.status}</Badge>
        {admin && editable && (
          <button className="btn" onClick={() => setForm("edit")}>
            Edit audit
          </button>
        )}
        {user.role !== "management" && (
          <button className="btn" onClick={() => setForm("notify")}>
            <Send size={16} /> Notify users
          </button>
        )}
      </Heading>
      <div className="lifecycle">
        {AUDIT_STATES.map((s, i) => (
          <div
            key={s}
            className={i <= AUDIT_STATES.indexOf(a.status) ? "done" : ""}
          >
            <span>{i < AUDIT_STATES.indexOf(a.status) ? "✓" : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <nav className="tabs" aria-label="Audit sections">
        {tabs.map((t) =>
          view ? (
            <Link
              key={t}
              to={
                t === "criteria"
                  ? `/audits/${a.id}/criteria`
                  : `/audits/${a.id}${t === "overview" ? "" : `?tab=${t}`}`
              }
              className={current === t ? "active" : ""}
            >
              {t === "actions"
                ? "Corrective actions"
                : t[0].toUpperCase() + t.slice(1)}
            </Link>
          ) : (
            <button
              key={t}
              onClick={() => chooseTab(t)}
              className={current === t ? "active" : ""}
            >
              {t === "actions"
                ? "Corrective actions"
                : t[0].toUpperCase() + t.slice(1)}
            </button>
          ),
        )}
      </nav>
      {current === "overview" && (
        <>
          <Panel title="Audit summary">
            <p>{a.description}</p>
            <div className="detail-grid">
              <div>
                <small>Scope</small>
                <strong>
                  {a.targetType} · {a.targetId}
                </strong>
              </div>
              <div>
                <small>Coordinator</small>
                <strong>
                  {db.users.find((u) => u.id === a.coordinatorId)?.name}
                </strong>
              </div>
              <div>
                <small>Start date</small>
                <strong>{fmtDate(a.startDate)}</strong>
              </div>
              <div>
                <small>End date</small>
                <strong>{fmtDate(a.endDate)}</strong>
              </div>
            </div>
            <h3 className="spaced">Audit committee</h3>
            <div className="team-grid">
              {a.auditorIds.map((id) => (
                <div key={id}>
                  <span className="avatar">
                    {
                      db.users
                        .find((u) => u.id === id)
                        ?.name.split(" ")
                        .slice(-1)[0][0]
                    }
                  </span>
                  <div>
                    <strong>{db.users.find((u) => u.id === id)?.name}</strong>
                    <small>
                      Auditor · Assigned{" "}
                      {fmtDate(
                        a.assignments?.find((x) => x.userId === id)?.assignedAt,
                      )}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
          {(admin || auditor) && editable && (
            <Panel
              title="Manage lifecycle"
              subtitle="Progress through the audit stages; final closure requires all readiness checks."
            >
              <div className="row">
                {next && next !== "Closed" && (
                  <button
                    className="btn primary"
                    onClick={() => setForm("status")}
                  >
                    Move to {next}
                  </button>
                )}
                {a.status === "Closure Review" && (
                  <button
                    className="btn primary"
                    onClick={() => chooseTab("closure")}
                  >
                    Review closure
                  </button>
                )}
                {admin && a.status !== "Draft" && (
                  <button className="btn" onClick={() => setForm("resubmit")}>
                    Resubmit audit / criteria
                  </button>
                )}
              </div>
            </Panel>
          )}
          {a.status === "Closed" && (
            <Panel title="Audit closed">
              <div className="notice success">
                <CheckCircle2 size={20} /> Closed on {fmtTime(a.closedAt)} by{" "}
                {db.users.find((u) => u.id === a.closedBy)?.name}
              </div>
              <button className="btn" onClick={() => chooseTab("report")}>
                View closure report
              </button>
            </Panel>
          )}
          <Comments auditId={a.id} />
        </>
      )}
      {current === "criteria" && (
        <Panel
          title="Assigned criteria & evaluations"
          subtitle={`${a.criterionIds.length} criteria · Faculty access is read-only`}
          action={
            admin &&
            editable && (
              <button className="btn" onClick={() => setForm("edit")}>
                Manage assignment
              </button>
            )
          }
        >
          {a.criterionIds.map((id) => {
            const c = db.criteria.find((c) => c.id === id),
              evaluation = db.evaluations.find(
                (e) => e.auditId === a.id && e.criterionId === id,
              ),
              evidence = db.evidence.filter(
                (e) => e.auditId === a.id && e.criterionId === id,
              );
            return (
              <div className="criterion" key={id}>
                <div className="row spread">
                  <div>
                    <small>
                      {id} · {c.category} · {c.targetType}
                    </small>
                    <h3>{c.name}</h3>
                  </div>
                  <Badge>{evaluation?.outcome || "Not evaluated"}</Badge>
                </div>
                <p>{c.requirement}</p>
                <small>Evidence required: {c.evidenceRequirement}</small>
                <div className="row wrap">
                  {evidence.map((e) => (
                    <Link
                      className="evidence-chip"
                      key={e.id}
                      to={`/evidence/${e.id}`}
                    >
                      {e.id} · {latest(e).status}
                    </Link>
                  ))}
                </div>
                {evaluation && (
                  <div className="evaluation">
                    <p>{evaluation.comment}</p>
                    <small>
                      {
                        db.users.find((u) => u.id === evaluation.auditorId)
                          ?.name
                      }{" "}
                      · {fmtTime(evaluation.createdAt)}
                    </small>
                    {evaluation.history.length > 0 && (
                      <details>
                        <summary>
                          Earlier evaluations ({evaluation.history.length})
                        </summary>
                        {evaluation.history.map((h, i) => (
                          <p key={i}>
                            {h.outcome}: {h.comment} · {fmtTime(h.createdAt)}
                          </p>
                        ))}
                      </details>
                    )}
                  </div>
                )}
                <div className="row">
                  {editable &&
                    ["faculty", "hod"].includes(user.role) &&
                    !["Draft", "Closure Review"].includes(a.status) && (
                      <button
                        className="btn"
                        onClick={() => {
                          setCriterion(id);
                          setForm("upload");
                        }}
                      >
                        <UploadIcon /> Submit evidence
                      </button>
                    )}
                  {auditor && editable && (
                    <>
                      <button
                        className="btn primary"
                        onClick={() => {
                          setCriterion(id);
                          setForm("evaluate");
                        }}
                      >
                        Evaluate
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setCriterion(id);
                          setForm("observation");
                        }}
                      >
                        Add observation
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </Panel>
      )}
      {current === "evidence" && (
        <Panel title="Evidence submissions">
          <EvidenceTable auditId={a.id} />
        </Panel>
      )}
      {current === "observations" && (
        <Panel
          title="Audit observations"
          action={
            auditor &&
            editable && (
              <button
                className="btn primary"
                onClick={() => {
                  setCriterion("");
                  setForm("observation");
                }}
              >
                Create observation
              </button>
            )
          }
        >
          <ObservationTable auditId={a.id} />
        </Panel>
      )}
      {current === "actions" && (
        <Panel title="Corrective actions">
          <ActionTable auditId={a.id} />
        </Panel>
      )}
      {current === "comments" && <Comments auditId={a.id} />}{" "}
      {current === "history" && (
        <>
          <Panel title="Audit activity">
            <History auditId={a.id} />
          </Panel>
          <Panel title="Historical audit versions">
            {a.history.length ? (
              a.history
                .slice()
                .reverse()
                .map((v, i) => (
                  <details className="version" key={i}>
                    <summary>
                      Version {v.version} · {v.status} · {fmtTime(v.changedAt)}
                    </summary>
                    <p>{v.title}</p>
                    <p>{v.description}</p>
                    <p>Criteria: {v.criterionIds.join(", ")}</p>
                    <p>
                      Team:{" "}
                      {v.auditorIds
                        .map((id) => db.users.find((u) => u.id === id)?.name)
                        .join(", ")}
                    </p>
                    {v.snapshot && <AuditReport snapshot={v.snapshot} />}
                  </details>
                ))
            ) : (
              <p className="muted">No earlier audit versions.</p>
            )}
          </Panel>
        </>
      )}
      {current === "report" && <AuditReport auditId={a.id} />}{" "}
      {current === "closure" && (
        <>
          <Panel
            title="Closure review"
            subtitle="W05 · Readiness is rechecked when you confirm closure."
          >
            {a.status === "Closed" ? (
              <div className="notice success">
                Closed on {fmtTime(a.closedAt)} by{" "}
                {db.users.find((u) => u.id === a.closedBy)?.name}
              </div>
            ) : (
              <>
                {[
                  "Applicable criteria are Compliant or Not Applicable",
                  "Latest required evidence is Accepted",
                  "All observations are verified Closed",
                  "All corrective actions are Approved",
                ].map((x) => (
                  <div className="check-row" key={x}>
                    <FileCheck2 size={19} />
                    {x}
                  </div>
                ))}
                {blockers.length ? (
                  <div className="notice">
                    <h3>Outstanding blockers ({blockers.length})</h3>
                    <ul className="blockers">
                      {blockers.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="notice success">
                    <CheckCircle2 size={20} /> All checks passed. Ready for
                    final closure.
                  </div>
                )}
                <div className="row">
                  {(admin || auditor) && (
                    <button
                      className="btn primary"
                      disabled={blockers.length > 0}
                      onClick={() => setForm("close")}
                    >
                      Confirm close audit
                    </button>
                  )}
                  <button className="btn" onClick={() => chooseTab("overview")}>
                    Cancel
                  </button>
                  {user.role !== "management" && (
                    <button className="btn" onClick={() => setForm("notify")}>
                      Notify users
                    </button>
                  )}
                </div>
              </>
            )}
          </Panel>
          <Panel title="Evidence verification">
            <EvidenceTable auditId={a.id} />
          </Panel>
          <Panel title="Observation verification">
            <ObservationTable auditId={a.id} />
          </Panel>
          <Panel title="Action verification">
            <ActionTable auditId={a.id} />
          </Panel>
        </>
      )}
      {form === "edit" && (
        <Modal title="Edit academic audit" onClose={() => setForm("")}>
          <AuditForm record={a} onClose={() => setForm("")} />
        </Modal>
      )}
      {form === "status" && (
        <Confirm
          title="Change audit stage"
          text={`Move ${a.id} to ${next}? Participants will be notified.`}
          onClose={() => setForm("")}
          onConfirm={() => run("auditStatus", { auditId: a.id, status: next })}
        />
      )}{" "}
      {form === "resubmit" && (
        <Confirm
          title="Resubmit audit"
          text="A historical snapshot will be retained. The audit returns to Evidence Collection and participants are notified."
          onClose={() => setForm("")}
          onConfirm={() => run("resubmitAudit", { auditId: a.id })}
        />
      )}{" "}
      {form === "close" && (
        <Confirm
          title="Confirm final closure"
          text="This saves the closure date, closing user and a report snapshot. All checks will be revalidated."
          onClose={() => setForm("")}
          onConfirm={() => {
            run("closeAudit", { auditId: a.id, version: a.version });
            navigate(`/audits/${a.id}`);
            setTab("overview");
          }}
        />
      )}{" "}
      {form === "upload" && (
        <UploadForm
          auditId={a.id}
          criterionId={criterion}
          onClose={() => setForm("")}
        />
      )}{" "}
      {form === "evaluate" && (
        <EvaluationForm
          auditId={a.id}
          criterionId={criterion}
          onClose={() => setForm("")}
        />
      )}{" "}
      {form === "observation" && (
        <ObservationForm
          auditId={a.id}
          criterionId={criterion}
          onClose={() => setForm("")}
        />
      )}{" "}
      {form === "notify" && (
        <Compose auditId={a.id} onClose={() => setForm("")} />
      )}
    </>
  );
}
const UploadIcon = () => <FileCheck2 size={16} />;
export function AuditDetailRoute({ view }) {
  const [params] = useSearchParams();
  return (
    <AuditDetail
      key={params.get("tab") || view || "overview"}
      view={view || params.get("tab") || undefined}
    />
  );
}
