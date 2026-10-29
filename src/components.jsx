import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
  FileText,
  Download,
} from "lucide-react";
import { fileURL, useApp, prepareFile } from "./store.jsx";
import { ROLES } from "./data.js";
export const fmtDate = (x) =>
  x
    ? new Date(x).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const fmtTime = (x) =>
  x
    ? new Date(x).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
export function Badge({ children }) {
  const s = String(children);
  return (
    <span
      className={`badge ${/Closed|Accepted|Approved|Compliant|Active/.test(s) && !s.includes("Non-") && !s.includes("Partial") ? "green" : /Rejected|High|Overdue|Non-Compliant|Reopened/.test(s) ? "red" : /Pending|Revision|Medium|Progress|Collection|Partial/.test(s) ? "amber" : "blue"}`}
    >
      {children}
    </span>
  );
}
export function Heading({
  eyebrow = "ACADEMIC QUALITY",
  title,
  description,
  children,
}) {
  return (
    <div className="heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function Panel({ title, subtitle, children, action, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
export function Empty({ text = "No matching records", children }) {
  return (
    <div className="empty">
      <FileText size={30} />
      <h3>{text}</h3>
      {children}
    </div>
  );
}
export function ErrorBox({ error }) {
  return error ? (
    <div className="error" role="alert">
      {error}
    </div>
  ) : null;
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Select({
  label,
  options,
  value,
  onChange,
  required = false,
  disabled = false,
  multiple = false,
}) {
  return (
    <Field label={label}>
      <select
        required={required}
        disabled={disabled}
        multiple={multiple}
        value={value ?? (multiple ? [] : "")}
        onChange={(e) =>
          onChange(
            multiple
              ? Array.from(e.target.selectedOptions, (o) => o.value)
              : e.target.value,
          )
        }
      >
        {!multiple && <option value="">Select {label.toLowerCase()}</option>}
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.id} value={o.id}>
              {o.name || o.title || o.description || o.id}
            </option>
          ),
        )}
      </select>
      {multiple && <small>Use Ctrl / Cmd to select multiple items.</small>}
    </Field>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    const prev = document.activeElement;
    ref.current.showModal();
    const close = (e) => {
      e.preventDefault();
      onClose();
    };
    ref.current.addEventListener("cancel", close);
    return () => {
      ref.current?.removeEventListener("cancel", close);
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function Confirm({ title, text, onConfirm, onClose, reason = false }) {
  const [value, setValue] = useState(""),
    [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onConfirm(value);
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <p>{text}</p>
        {reason && (
          <Field label="Reason">
            <textarea
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
        )}
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">Confirm</button>
        </div>
      </form>
    </Modal>
  );
}
export function Table({
  rows,
  columns,
  filters = [],
  initialFilter = "",
  pageSize = 7,
  searchable = true,
}) {
  const [q, setQ] = useState(""),
    [values, setValues] = useState(
      initialFilter ? { status: initialFilter } : {},
    ),
    [sort, setSort] = useState({ key: "", dir: 1 }),
    [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [q, JSON.stringify(values), rows.length]);
  useEffect(() => {
    setValues((v) => ({ ...v, status: initialFilter }));
  }, [initialFilter]);
  let filtered = rows.filter(
    (r) =>
      (!q ||
        Object.values(r)
          .filter((v) => typeof v !== "object")
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      filters.every(
        (f) =>
          !values[f.key] ||
          (values[f.key] === "Needs revision"
            ? ["Rejected", "Revision Required"].includes(r.status)
            : values[f.key] === "Active audits"
              ? !["Draft", "Closed"].includes(r.status)
              : values[f.key] === "Open observations"
                ? r.status !== "Closed"
                : String(r[f.key]) === values[f.key]),
      ),
  );
  if (sort.key)
    filtered = [...filtered].sort(
      (a, b) =>
        String(a[sort.key] ?? "").localeCompare(
          String(b[sort.key] ?? ""),
          undefined,
          { numeric: true },
        ) * sort.dir,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)),
    current = Math.min(page, pages);
  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        {searchable && (
          <div className="search">
            <Search size={16} />
            <input
              aria-label="Search records"
              placeholder="Search records…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        )}
        {filters.map((f) => (
          <select
            key={f.key}
            aria-label={`Filter by ${f.label}`}
            value={values[f.key] || ""}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
          >
            <option value="">All {f.label}</option>
            {(
              f.options || [
                ...new Set([
                  ...rows.map((r) => r[f.key]).filter(Boolean),
                  ...(values[f.key] ? [values[f.key]] : []),
                ]),
              ]
            ).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>
                  <button
                    onClick={() =>
                      setSort({
                        key: c.key,
                        dir: sort.key === c.key ? -sort.dir : 1,
                      })
                    }
                  >
                    {c.label}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice((current - 1) * pageSize, current * pageSize)
              .map((r, i) => (
                <tr key={r.id || i}>
                  {columns.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(r) : (r[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && <Empty />}
      <div className="pagination">
        <span>
          {filtered.length
            ? `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, filtered.length)}`
            : "0"}{" "}
          of {filtered.length} records
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {current} of {pages}
          </span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function FileView({ file }) {
  const url = fileURL(file);
  return (
    <div className="file-card">
      <FileText size={24} />
      <div>
        <strong>{file?.name || "No file"}</strong>
        <small>
          {file
            ? `${(file.size / 1024).toFixed(1)} KB · ${file.type || "Document"}`
            : ""}
        </small>
        {!url && (
          <small>
            {file?.demo
              ? "Seed record: demonstration metadata only."
              : "File bytes are unavailable after a refresh. Metadata is preserved."}
          </small>
        )}
      </div>
      {url && (
        <>
          <a className="btn" href={url} download={file.name}>
            <Download size={15} /> Download
          </a>
          {/^(image\/|application\/pdf)/.test(file.type) && (
            <a className="btn" href={url} target="_blank" rel="noreferrer">
              Preview
            </a>
          )}
        </>
      )}
    </div>
  );
}
export function Comments({ auditId, observationId }) {
  const { db, user, run } = useApp(),
    [text, setText] = useState(""),
    [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [profile, setProfile] = useState(null);
  const rows = db.comments.filter(
    (c) =>
      c.auditId === auditId &&
      (observationId ? c.observationId === observationId : !c.observationId),
  );
  const a = db.audits.find((a) => a.id === auditId);
  return (
    <Panel
      title="Discussion & comments"
      subtitle="A shared record of questions, clarifications and responses."
    >
      {rows.map((c) => {
        const author = db.users.find((u) => u.id === c.authorId);
        return (
          <div className="comment" key={c.id}>
            <div className="avatar">
              {author?.name
                .split(" ")
                .map((x) => x[0])
                .slice(-2)
                .join("")}
            </div>
            <div>
              <button
                className="text-button"
                onClick={() => setProfile(author)}
              >
                {author?.name}
              </button>
              <small>
                {ROLES[author?.role]} · {fmtTime(c.createdAt)}
              </small>
              <p>{c.text}</p>
              {c.file && <FileView file={c.file} />}
              <div className="row">
                {user.role !== "management" &&
                  [1, -1].map((v) => (
                    <button
                      key={v}
                      className="tiny"
                      onClick={() => {
                        try {
                          run("vote", { id: c.id, value: v });
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      {v === 1 ? "↑ Helpful" : "↓"}{" "}
                      {c.votes?.[user.id] === v ? "✓" : ""}
                    </button>
                  ))}
                <small>
                  Score{" "}
                  {Object.values(c.votes || {}).reduce((a, b) => a + b, 0)}
                </small>
              </div>
            </div>
          </div>
        );
      })}
      {!rows.length && (
        <p className="muted">No comments yet. Start the discussion.</p>
      )}
      {user.role !== "management" && a.status !== "Draft" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              run("comment", {
                auditId,
                observationId,
                text,
                file,
                requestId: crypto.randomUUID(),
              });
              setText("");
              setFile(null);
              e.target.reset();
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <Field label="Add a comment">
            <textarea
              maxLength={2000}
              placeholder="Ask a question or share an update…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <div className="row spread">
            <Field label="Optional comment file (PDF/TXT, up to 5 MB)">
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={(e) => {
                  try {
                    setFile(
                      e.target.files[0]
                        ? prepareFile(e.target.files[0], true)
                        : null,
                    );
                    setError("");
                  } catch (e) {
                    setError(e.message);
                    setFile(null);
                  }
                }}
              />
            </Field>
            <button className="btn primary">Post comment</button>
          </div>
          <ErrorBox error={error} />
        </form>
      )}
      {profile && (
        <Modal title="Commenter profile" onClose={() => setProfile(null)}>
          <h3>{profile.name}</h3>
          <p>{ROLES[profile.role]}</p>
        </Modal>
      )}
    </Panel>
  );
}
export function History({ auditId }) {
  const { data, db } = useApp();
  const rows = (data?.logs || [])
    .filter((l) => !auditId || l.auditId === auditId)
    .slice()
    .reverse()
    .map((l) => ({
      ...l,
      actor: db.users.find((u) => u.id === l.actorId)?.name,
      date: l.createdAt.slice(0, 10),
    }));
  return (
    <Table
      rows={rows}
      filters={[
        { key: "actor", label: "users" },
        { key: "action", label: "actions" },
        { key: "date", label: "dates" },
      ]}
      columns={[
        {
          key: "createdAt",
          label: "Date / time",
          render: (r) => fmtTime(r.createdAt),
        },
        { key: "actor", label: "User" },
        { key: "action", label: "Activity" },
        {
          key: "auditId",
          label: "Audit",
          render: (r) =>
            r.auditId ? (
              <Link to={`/audits/${r.auditId}`}>{r.auditId}</Link>
            ) : (
              "—"
            ),
        },
        { key: "previousStatus", label: "Previous" },
        { key: "newStatus", label: "New status" },
      ]}
    />
  );
}
