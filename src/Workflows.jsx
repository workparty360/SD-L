import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Plus, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { useApp, prepareFile } from "./store.jsx";
import {
  latest,
  isOverdue,
  observationBlockers,
  canViewAudit,
} from "./domain.js";
import {
  Heading,
  Panel,
  Table,
  Badge,
  Modal,
  Field,
  Select,
  ErrorBox,
  FileView,
  Comments,
  Confirm,
  History,
  fmtDate,
  fmtTime,
  Empty,
} from "./components.jsx";
export function UploadForm({
  kind = "evidence",
  record,
  auditId,
  criterionId,
  onClose,
}) {
  const { db, data, user, run } = useApp(),
    [v, setV] = useState({
      auditId:
        record?.auditId ||
        auditId ||
        data.audits.find((a) => a.status === "Evidence Collection")?.id ||
        "",
      criterionId: record?.criterionId || criterionId || "",
      title: record && kind === "evidence" ? latest(record).title : "",
      description: "",
      remarks: "",
      comment: "",
    }),
    [file, setFile] = useState(null),
    [error, setError] = useState("");
  const a = db.audits.find((a) => a.id === v.auditId),
    set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Modal
      title={`${record ? "Resubmit" : "Submit"} ${kind === "action" ? "action taken" : "evidence"}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (!file) throw Error("Choose a valid supporting file.");
            run(kind === "action" ? "submitAction" : "submitEvidence", {
              ...v,
              id: record?.id,
              file,
            });
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        {kind === "evidence" && (
          <>
            <Select
              label="Audit"
              value={v.auditId}
              onChange={(x) =>
                setV((s) => ({ ...s, auditId: x, criterionId: "" }))
              }
              disabled={!!record || !!auditId}
              options={data.audits.filter(
                (a) =>
                  !["Draft", "Closed", "Closure Review"].includes(a.status),
              )}
              required
            />
            <Select
              label="Criterion"
              value={v.criterionId}
              onChange={(x) => set("criterionId", x)}
              disabled={!!record || !!criterionId}
              options={db.criteria.filter((c) =>
                a?.criterionIds.includes(c.id),
              )}
              required
            />
            <Field
              label="Evidence title"
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </>
        )}
        <Field label={kind === "action" ? "Action taken" : "Description"}>
          <textarea
            required
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Supporting file (up to 5 MB)">
          <input
            required
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
            onChange={(e) => {
              try {
                setFile(
                  e.target.files[0] ? prepareFile(e.target.files[0]) : null,
                );
                setError("");
              } catch (e) {
                setError(e.message);
                setFile(null);
              }
            }}
          />
        </Field>
        <Field label="Remarks / comments">
          <textarea
            value={v.remarks}
            onChange={(e) => {
              set("remarks", e.target.value);
              set("comment", e.target.value);
            }}
          />
        </Field>
        <p className="hint">
          File previews and downloads are available during this browser session.
          Only metadata and version history persist after refresh.
        </p>
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">
            <Upload size={16} />
            {record ? "Resubmit" : "Submit"}{" "}
            {kind === "action" ? "action" : "evidence"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ReviewForm({ kind, record, onClose }) {
  const { run } = useApp(),
    [status, setStatus] = useState(
      kind === "evidence" ? "Accepted" : "Approved",
    ),
    [comment, setComment] = useState(""),
    [error, setError] = useState("");
  return (
    <Modal title={`Review ${kind}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run(kind === "evidence" ? "reviewEvidence" : "reviewAction", {
              id: record.id,
              status,
              comment,
            });
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <Select
          label="Decision"
          value={status}
          onChange={setStatus}
          options={
            kind === "evidence"
              ? ["Accepted", "Rejected", "Revision Required"]
              : ["Approved", "Rejected", "Revision Required"]
          }
          required
        />
        <Field label="Review comments / reason">
          <textarea
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Explain your decision or request additional evidence…"
          />
        </Field>
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Save review</button>
        </div>
      </form>
    </Modal>
  );
}
export function ObservationForm({ auditId, criterionId, onClose }) {
  const { db, data, run } = useApp(),
    [v, setV] = useState({
      auditId: auditId || data.audits[0]?.id,
      criterionId: criterionId || "",
      description: "",
      severity: "Medium",
    }),
    [error, setError] = useState("");
  const a = db.audits.find((a) => a.id === v.auditId);
  return (
    <Modal title="Create observation" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run("createObservation", v);
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <Select
          label="Audit"
          options={data.audits.filter((a) => a.status !== "Closed")}
          value={v.auditId}
          onChange={(x) => setV({ ...v, auditId: x, criterionId: "" })}
          disabled={!!auditId}
          required
        />
        <Select
          label="Criterion"
          options={db.criteria.filter((c) => a?.criterionIds.includes(c.id))}
          value={v.criterionId}
          onChange={(x) => setV({ ...v, criterionId: x })}
          required
        />
        <Field label="Observation description">
          <textarea
            required
            value={v.description}
            onChange={(e) => setV({ ...v, description: e.target.value })}
          />
        </Field>
        <Select
          label="Severity"
          options={["Low", "Medium", "High"]}
          value={v.severity}
          onChange={(x) => setV({ ...v, severity: x })}
        />
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Create observation</button>
        </div>
      </form>
    </Modal>
  );
}
export function ActionForm({ observationId, record, onClose }) {
  const { db, data, run } = useApp(),
    [v, setV] = useState({
      observationId:
        observationId ||
        record?.observationId ||
        data.observations.find((o) => o.status !== "Closed")?.id ||
        "",
      description: record?.description || "",
      responsibleId: record?.responsibleId || "",
      dueDate: record?.dueDate || "",
      priority: record?.priority || "Medium",
    }),
    [error, setError] = useState("");
  const o = db.observations.find((o) => o.id === v.observationId),
    a = db.audits.find((a) => a.id === o?.auditId);
  return (
    <Modal
      title={record ? "Assign responsibility" : "Create corrective action"}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run("saveAction", { ...v, id: record?.id });
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <Select
          label="Observation"
          value={v.observationId}
          onChange={(x) => setV({ ...v, observationId: x, responsibleId: "" })}
          options={data.observations
            .filter((o) => o.status !== "Closed")
            .map((o) => ({ id: o.id, name: `${o.id} · ${o.description}` }))}
          disabled={!!observationId || !!record}
          required
        />
        {!record && (
          <Field label="Corrective action">
            <textarea
              required
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
            />
          </Field>
        )}
        <Select
          label="Responsible person"
          value={v.responsibleId}
          onChange={(x) => setV({ ...v, responsibleId: x })}
          options={db.users.filter(
            (u) =>
              ["faculty", "hod"].includes(u.role) &&
              u.departmentId === a?.departmentId &&
              u.status === "Active",
          )}
          required
        />
        {!record && (
          <div className="form-grid">
            <Field
              label="Due date"
              type="date"
              required
              value={v.dueDate}
              onChange={(e) => setV({ ...v, dueDate: e.target.value })}
            />
            <Select
              label="Priority"
              value={v.priority}
              onChange={(x) => setV({ ...v, priority: x })}
              options={["Low", "Medium", "High"]}
            />
          </div>
        )}
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Assign action</button>
        </div>
      </form>
    </Modal>
  );
}
export function EvidenceTable({ auditId }) {
  const { db, data } = useApp(),
    [params] = useSearchParams();
  const rows = data.evidence
    .filter((e) => !auditId || e.auditId === auditId)
    .map((e) => ({
      ...e,
      ...latest(e),
      status: latest(e).status,
      submitter: db.users.find((u) => u.id === latest(e).submittedBy)?.name,
      department: db.departments.find(
        (d) => d.id === db.audits.find((a) => a.id === e.auditId)?.departmentId,
      )?.code,
    }));
  return (
    <Table
      rows={rows}
      initialFilter={params.get("status") || ""}
      filters={[
        { key: "status", label: "statuses" },
        { key: "auditId", label: "audits" },
        { key: "department", label: "departments" },
        { key: "submitter", label: "submitters" },
        { key: "criterionId", label: "criteria" },
      ]}
      columns={[
        {
          key: "title",
          label: "Evidence",
          render: (r) => (
            <Link className="record-title" to={`/evidence/${r.id}`}>
              <strong>{r.title}</strong>
              <small>
                {r.id} · {r.file.name} · v{r.number}
              </small>
            </Link>
          ),
        },
        { key: "auditId", label: "Audit" },
        { key: "criterionId", label: "Criterion" },
        { key: "submitter", label: "Submitted by" },
        {
          key: "submittedAt",
          label: "Submitted",
          render: (r) => fmtDate(r.submittedAt),
        },
        {
          key: "status",
          label: "Status",
          render: (r) => <Badge>{r.status}</Badge>,
        },
      ]}
    />
  );
}
export function ObservationTable({ auditId }) {
  const { db, data } = useApp(),
    [params] = useSearchParams();
  const rows = data.observations
    .filter((o) => !auditId || o.auditId === auditId)
    .map((o) => ({
      ...o,
      department: db.departments.find(
        (d) => d.id === db.audits.find((a) => a.id === o.auditId)?.departmentId,
      )?.code,
      date: o.createdAt.slice(0, 10),
    }));
  return (
    <Table
      rows={rows}
      initialFilter={params.get("status") || ""}
      filters={[
        { key: "status", label: "statuses" },
        { key: "severity", label: "severity" },
        { key: "auditId", label: "audits" },
        { key: "department", label: "departments" },
        { key: "date", label: "dates" },
      ]}
      columns={[
        {
          key: "description",
          label: "Observation",
          render: (o) => (
            <Link className="record-title" to={`/observations/${o.id}`}>
              <strong>{o.description}</strong>
              <small>
                {o.id} · {o.criterionId}
              </small>
            </Link>
          ),
        },
        { key: "department", label: "Department" },
        {
          key: "severity",
          label: "Severity",
          render: (o) => <Badge>{o.severity}</Badge>,
        },
        {
          key: "createdAt",
          label: "Created",
          render: (o) => fmtDate(o.createdAt),
        },
        {
          key: "status",
          label: "Status",
          render: (o) => <Badge>{o.status}</Badge>,
        },
      ]}
    />
  );
}
export function ActionTable({ auditId, observationId }) {
  const { db, data, user } = useApp(),
    [params] = useSearchParams();
  const rows = data.actions
    .filter(
      (a) =>
        (!auditId || a.auditId === auditId) &&
        (!observationId || a.observationId === observationId) &&
        (user.role !== "faculty" || a.responsibleId === user.id),
    )
    .map((a) => ({
      ...a,
      workflowStatus: a.status,
      status: isOverdue(a) ? "Overdue" : a.status,
      responsible: db.users.find((u) => u.id === a.responsibleId)?.name,
    }));
  return (
    <Table
      rows={rows}
      initialFilter={params.get("status") || ""}
      filters={[
        { key: "status", label: "statuses" },
        { key: "responsible", label: "owners" },
        { key: "auditId", label: "audits" },
      ]}
      columns={[
        {
          key: "description",
          label: "Corrective action",
          render: (a) => (
            <Link className="record-title" to={`/corrective-actions/${a.id}`}>
              <strong>{a.description}</strong>
              <small>
                {a.id} · {a.observationId}
              </small>
            </Link>
          ),
        },
        { key: "responsible", label: "Responsible person" },
        {
          key: "dueDate",
          label: "Due date",
          render: (a) => fmtDate(a.dueDate),
        },
        {
          key: "priority",
          label: "Priority",
          render: (a) => <Badge>{a.priority}</Badge>,
        },
        {
          key: "status",
          label: "Status",
          render: (a) => (
            <div>
              <Badge>{a.status}</Badge>
              {a.status === "Overdue" && <small>{a.workflowStatus}</small>}
            </div>
          ),
        },
      ]}
    />
  );
}
export function WorkflowList({ kind }) {
  const { user, data, db } = useApp(),
    [form, setForm] = useState(false);
  const label = {
    evidence: "Evidence library",
    observations: "Observations",
    actions: "Corrective actions",
  }[kind];
  const canAdd =
    kind === "evidence"
      ? ["faculty", "hod"].includes(user.role)
      : kind === "observations"
        ? user.role === "auditor"
        : ["admin", "auditor"].includes(user.role);
  return (
    <>
      <Heading
        title={label}
        description={
          {
            evidence:
              "Submit, review and track evidence with a complete version history.",
            observations:
              "Record findings and follow them through to verified closure.",
            actions:
              "Assign improvements, track deadlines and verify the action taken.",
          }[kind]
        }
      >
        {canAdd && (
          <button className="btn primary" onClick={() => setForm(true)}>
            <Plus size={17} />
            {kind === "evidence"
              ? "Submit evidence"
              : kind === "observations"
                ? "Create observation"
                : "Create action"}
          </button>
        )}
      </Heading>
      {kind === "evidence" && ["faculty", "hod"].includes(user.role) && (
        <Panel title="Criteria awaiting evidence">
          <div className="deadline-grid">
            {data.audits
              .filter(
                (a) =>
                  !["Draft", "Closed", "Closure Review"].includes(a.status),
              )
              .flatMap((a) =>
                a.criterionIds
                  .filter(
                    (id) =>
                      !data.evidence.some(
                        (e) => e.auditId === a.id && e.criterionId === id,
                      ),
                  )
                  .map((id) => (
                    <Link key={`${a.id}-${id}`} to={`/audits/${a.id}/criteria`}>
                      <small>
                        {a.id} · Due {fmtDate(a.endDate)}
                      </small>
                      <strong>
                        {db.criteria.find((c) => c.id === id)?.name}
                      </strong>
                      <span>Open evidence request →</span>
                    </Link>
                  )),
              )}
          </div>
        </Panel>
      )}
      <div className="panel">
        {kind === "evidence" ? (
          <EvidenceTable />
        ) : kind === "observations" ? (
          <ObservationTable />
        ) : (
          <ActionTable />
        )}
      </div>
      {form &&
        (kind === "evidence" ? (
          <UploadForm onClose={() => setForm(false)} />
        ) : kind === "observations" ? (
          <ObservationForm onClose={() => setForm(false)} />
        ) : (
          <ActionForm onClose={() => setForm(false)} />
        ))}
    </>
  );
}
export function WorkflowDetail({ kind }) {
  const params = useParams(),
    { db, user, run } = useApp(),
    [form, setForm] = useState(""),
    [error, setError] = useState("");
  const collection = {
      evidence: "evidence",
      observation: "observations",
      action: "actions",
    }[kind],
    id = params.evidenceId || params.observationId || params.actionId,
    r = db[collection].find((r) => r.id === id),
    a = db.audits.find((a) => a.id === r?.auditId);
  if (!r || !canViewAudit(db, user, a))
    return (
      <Empty text="Record not found or access denied">
        <Link to="/audits">Back to audits</Link>
      </Empty>
    );
  const ev = kind === "evidence" ? latest(r) : null,
    isAuditor = user.role === "auditor",
    editable = a.status !== "Closed",
    blocked = kind === "observation" ? observationBlockers(db, r) : [];
  return (
    <>
      <Link className="back-link" to={`/audits/${a.id}`}>
        <ArrowLeft size={15} /> {a.title}
      </Link>
      <Heading
        eyebrow={`${kind.toUpperCase()} / ${r.id}`}
        title={ev?.title || r.description}
        description={`${r.id} · ${a.id} · ${db.departments.find((d) => d.id === a.departmentId)?.name}`}
      >
        <Badge>{ev?.status || r.status}</Badge>
        {kind === "evidence" && editable && (
          <>
            {isAuditor && ev.status === "Pending Review" && (
              <button className="btn primary" onClick={() => setForm("review")}>
                Review evidence
              </button>
            )}
            {["faculty", "hod"].includes(user.role) &&
              (user.role === "hod" || ev.submittedBy === user.id) &&
              ["Rejected", "Revision Required"].includes(ev.status) && (
                <button
                  className="btn primary"
                  onClick={() => setForm("upload")}
                >
                  Resubmit evidence
                </button>
              )}
          </>
        )}
        {kind === "action" && editable && (
          <>
            {r.responsibleId === user.id &&
              [
                "Assigned",
                "In Progress",
                "Revision Required",
                "Rejected",
              ].includes(r.status) && (
                <>
                  <button
                    className="btn"
                    onClick={() => {
                      try {
                        run("startAction", { id: r.id });
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Mark in progress
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => setForm("upload")}
                  >
                    {r.submissions.length
                      ? "Resubmit action"
                      : "Submit action taken"}
                  </button>
                </>
              )}
            {isAuditor && r.status === "Submitted for Review" && (
              <button className="btn primary" onClick={() => setForm("review")}>
                Review submission
              </button>
            )}
            {["admin", "auditor", "hod"].includes(user.role) &&
              r.status !== "Approved" && (
                <button className="btn" onClick={() => setForm("assign")}>
                  Reassign
                </button>
              )}
          </>
        )}
        {kind === "observation" && (
          <>
            {isAuditor &&
              (r.status === "Closed" ? (
                <button className="btn" onClick={() => setForm("reopen")}>
                  Reopen observation
                </button>
              ) : (
                <button
                  className="btn primary"
                  disabled={blocked.length > 0}
                  onClick={() => setForm("close")}
                >
                  Verify & close
                </button>
              ))}
            {editable &&
              r.status !== "Closed" &&
              ["admin", "auditor"].includes(user.role) && (
                <button className="btn" onClick={() => setForm("action")}>
                  Create corrective action
                </button>
              )}
          </>
        )}
      </Heading>
      <ErrorBox error={error} />
      {kind === "evidence" && (
        <>
          <Panel
            title="Latest submission"
            subtitle={`Version ${ev.number} · ${fmtTime(ev.submittedAt)} · ${db.users.find((u) => u.id === ev.submittedBy)?.name}`}
          >
            <p>{ev.description}</p>
            <p className="muted">{ev.remarks}</p>
            <FileView file={ev.file} />
            {ev.reviewComment && (
              <div className="notice">
                <strong>Auditor review</strong>
                <p>{ev.reviewComment}</p>
                <small>
                  {db.users.find((u) => u.id === ev.reviewedBy)?.name} ·{" "}
                  {fmtTime(ev.reviewedAt)}
                </small>
              </div>
            )}
          </Panel>
          <Panel title="Version history">
            {r.versions
              .slice()
              .reverse()
              .map((v) => (
                <div className="version" key={v.number}>
                  <div className="row spread">
                    <h3>
                      Version {v.number}
                      {v.number === ev.number ? " · Latest" : ""}
                    </h3>
                    <Badge>{v.status}</Badge>
                  </div>
                  <p>{v.description}</p>
                  <FileView file={v.file} />
                  <small>
                    {fmtTime(v.submittedAt)} ·{" "}
                    {v.reviewComment || "Awaiting review"}
                  </small>
                </div>
              ))}
          </Panel>
        </>
      )}
      {kind === "action" && (
        <>
          <Panel title="Action responsibility">
            <div className="detail-grid">
              <div>
                <small>Responsible person</small>
                <strong>
                  {db.users.find((u) => u.id === r.responsibleId)?.name}
                </strong>
              </div>
              <div>
                <small>Due date</small>
                <strong>{fmtDate(r.dueDate)}</strong>
                {isOverdue(r) && <Badge>Overdue</Badge>}
              </div>
              <div>
                <small>Priority</small>
                <Badge>{r.priority}</Badge>
              </div>
              <div>
                <small>Related observation</small>
                <Link to={`/observations/${r.observationId}`}>
                  {r.observationId}
                </Link>
              </div>
            </div>
          </Panel>
          <Panel title="Submission & review history">
            {r.submissions.length ? (
              r.submissions
                .slice()
                .reverse()
                .map((v) => (
                  <div className="version" key={v.number}>
                    <div className="row spread">
                      <h3>Submission {v.number}</h3>
                      <Badge>{v.status}</Badge>
                    </div>
                    <p>{v.description}</p>
                    <p>{v.comment}</p>
                    <FileView file={v.file} />
                    <small>{fmtTime(v.submittedAt)}</small>
                    {v.reviewComment && (
                      <div className="notice">
                        {v.reviewComment}
                        <small>
                          Reviewed by{" "}
                          {db.users.find((u) => u.id === v.reviewedBy)?.name} ·{" "}
                          {fmtTime(v.reviewedAt)}
                        </small>
                      </div>
                    )}
                  </div>
                ))
            ) : (
              <Empty text="No action submission yet" />
            )}
          </Panel>
        </>
      )}
      {kind === "observation" && (
        <>
          <Panel
            title="Closure readiness"
            subtitle="An assigned auditor verifies evidence and corrective actions before closure."
          >
            <div className="row">
              <Badge>{r.severity}</Badge>
              <Link to={`/audits/${a.id}/criteria`}>
                {r.criterionId} · View criterion
              </Link>
            </div>
            {r.status === "Closed" ? (
              <div className="notice success">
                <CheckCircle2 size={18} /> Verified closed by{" "}
                {db.users.find((u) => u.id === r.closedBy)?.name} on{" "}
                {fmtDate(r.closedAt)}
              </div>
            ) : blocked.length ? (
              <ul className="blockers">
                {blocked.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : (
              <div className="notice success">
                All corrective actions are approved. Ready for auditor
                verification.
              </div>
            )}
          </Panel>
          <Panel title="Related evidence">
            <EvidenceTable auditId={a.id} />
          </Panel>
          <Panel title="Corrective actions">
            <ActionTable observationId={r.id} />
          </Panel>
          <Comments auditId={a.id} observationId={r.id} />
        </>
      )}
      <Panel title="Audit activity">
        <History auditId={a.id} />
      </Panel>
      {form === "upload" && (
        <UploadForm
          kind={kind === "action" ? "action" : "evidence"}
          record={r}
          onClose={() => setForm("")}
        />
      )}{" "}
      {form === "review" && (
        <ReviewForm
          kind={kind === "action" ? "action" : "evidence"}
          record={r}
          onClose={() => setForm("")}
        />
      )}{" "}
      {form === "assign" && (
        <ActionForm record={r} onClose={() => setForm("")} />
      )}{" "}
      {form === "action" && (
        <ActionForm observationId={r.id} onClose={() => setForm("")} />
      )}{" "}
      {form === "close" && (
        <Confirm
          title="Close observation"
          text="Confirm that all corrective actions and their supporting evidence have been verified."
          onClose={() => setForm("")}
          onConfirm={() => run("closeObservation", { id: r.id })}
        />
      )}{" "}
      {form === "reopen" && (
        <Confirm
          title="Reopen observation"
          text="Prior closure history is retained. Related actions will require revision, and a closed audit will return to Corrective Action."
          reason
          onClose={() => setForm("")}
          onConfirm={(reason) => run("reopenObservation", { id: r.id, reason })}
        />
      )}
    </>
  );
}
