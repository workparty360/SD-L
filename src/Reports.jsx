import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, FileText } from "lucide-react";
import { useApp } from "./store.jsx";
import { metrics, isOverdue, latest, reportSnapshot } from "./domain.js";
import {
  Heading,
  Panel,
  Table,
  Badge,
  fmtDate,
  fmtTime,
} from "./components.jsx";
export function csvText(rows, columns) {
  const clean = (v) => {
    let s = String(v ?? "");
    if (/^[=+@-]/.test(s)) s = "'" + s;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      columns.map((c) => clean(c.label)).join(","),
      ...rows.map((r) => columns.map((c) => clean(r[c.key])).join(",")),
    ].join("\r\n")
  );
}
function downloadCSV(title, rows, columns, filters) {
  const content =
    "\uFEFF" +
    `Report,"${title}"\r\nGenerated,"${new Date().toISOString()}"\r\nFilters,"${filters.replaceAll('"', '""')}"\r\n` +
    csvText(rows, columns).replace(/^\uFEFF/, "");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replaceAll(" ", "-")}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function downloadPDF(title, sections, filters) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 19);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `Academic Audit Portal | Generated ${new Date().toLocaleString("en-IN")}`,
    14,
    27,
  );
  const lines = doc.splitTextToSize(`Filters: ${filters}`, 180);
  doc.text(lines, 14, 33);
  let y = 40 + lines.length * 4;
  for (const s of sections) {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text(s.title, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [s.columns.map((c) => c.label)],
      body: s.rows.map((r) => s.columns.map((c) => String(r[c.key] ?? "—"))),
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [39, 77, 144] },
      margin: { top: 16, bottom: 16 },
    });
    y = doc.lastAutoTable.finalY + 12;
  }
  doc.save(`${title.replaceAll(" ", "-")}.pdf`);
}
function snapshotSections(s) {
  return [
    {
      title: "Audit details",
      columns: [
        { key: "field", label: "Field" },
        { key: "value", label: "Value" },
      ],
      rows: Object.entries(s.audit)
        .filter(([k, v]) =>
          [
            "id",
            "title",
            "type",
            "academicYear",
            "targetType",
            "targetId",
            "status",
            "startDate",
            "endDate",
            "closedAt",
            "closedBy",
            "version",
          ].includes(k),
        )
        .map(([field, value]) => ({ field, value })),
    },
    {
      title: "Audit team",
      columns: [
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
      ],
      rows: s.team,
    },
    {
      title: "Criteria and evaluation",
      columns: [
        { key: "id", label: "Criterion" },
        { key: "name", label: "Name" },
        { key: "requirement", label: "Requirement" },
        { key: "outcome", label: "Outcome" },
        { key: "comment", label: "Auditor comments" },
      ],
      rows: s.criteria.map((c) => ({
        ...c,
        ...(() => {
          const e = s.evaluations.find((e) => e.criterionId === c.id);
          return {
            outcome: e?.outcome || "Not evaluated",
            comment: e?.comment || "",
          };
        })(),
      })),
    },
    {
      title: "Evidence",
      columns: [
        { key: "id", label: "Evidence" },
        { key: "criterionId", label: "Criterion" },
        { key: "fileName", label: "Latest file" },
        { key: "number", label: "Version" },
        { key: "status", label: "Review status" },
      ],
      rows: s.evidence.map((e) => ({
        ...e,
        ...latest(e),
        fileName: latest(e).file.name,
      })),
    },
    {
      title: "Observations",
      columns: [
        { key: "id", label: "Observation" },
        { key: "description", label: "Description" },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Status" },
      ],
      rows: s.observations,
    },
    {
      title: "Corrective actions",
      columns: [
        { key: "id", label: "Action" },
        { key: "description", label: "Description" },
        { key: "responsibleId", label: "Owner" },
        { key: "dueDate", label: "Due date" },
        { key: "status", label: "Status" },
      ],
      rows: s.actions,
    },
  ];
}
export function AuditReport({ auditId, snapshot }) {
  const { db } = useApp(),
    a = db.audits.find((a) => a.id === auditId);
  const saved =
      !snapshot && a?.status === "Closed"
        ? db.reports.filter((r) => r.auditId === a.id).at(-1)
        : null,
    s = snapshot || saved?.snapshot || (a ? reportSnapshot(db, a) : null);
  if (!s) return null;
  const sections = snapshotSections(s);
  return (
    <Panel
      title={`${snapshot ? "Historical" : saved ? "Closure" : "Current"} audit report`}
      subtitle={`${s.audit.id} · Version ${s.audit.version} · ${s.audit.status}`}
      action={
        <button
          className="btn"
          onClick={() =>
            downloadPDF(
              `Audit ${s.audit.id}`,
              sections,
              `Audit ${s.audit.id}, version ${s.audit.version}`,
            )
          }
        >
          <Download size={16} /> Export PDF
        </button>
      }
    >
      {sections.map((section) => (
        <div className="report-section" key={section.title}>
          <h3>{section.title}</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {section.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((r, i) => (
                  <tr key={i}>
                    {section.columns.map((c) => (
                      <td key={c.key}>{String(r[c.key] ?? "—")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!section.rows.length && (
            <p className="muted">No records in this section.</p>
          )}
        </div>
      ))}
    </Panel>
  );
}
export default function Reports() {
  const { db, data } = useApp(),
    location = useLocation(),
    kind = location.pathname.split("/")[2] || "audits",
    [dept, setDept] = useState(""),
    [year, setYear] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState("");
  const audits = data.audits.filter(
      (a) =>
        (!dept || a.departmentId === dept) &&
        (!year || a.academicYear === year) &&
        (!type || a.type === type),
    ),
    ids = new Set(audits.map((a) => a.id));
  let rows = (
    kind === "observations"
      ? data.observations
      : kind === "corrective-actions"
        ? data.actions
        : audits
  )
    .filter((r) => kind === "audits" || ids.has(r.auditId))
    .map((r) => ({
      ...r,
      department: db.departments.find(
        (d) =>
          d.id ===
          (kind === "audits"
            ? r.departmentId
            : db.audits.find((a) => a.id === r.auditId)?.departmentId),
      )?.code,
      overdue:
        kind === "corrective-actions"
          ? isOverdue(r)
            ? "Yes"
            : "No"
          : kind === "observations"
            ? r.status !== "Closed" &&
              data.actions.some((a) => a.observationId === r.id && isOverdue(a))
              ? "Yes"
              : "No"
            : "",
      responsible: db.users.find((u) => u.id === r.responsibleId)?.name || "",
    }))
    .filter(
      (r) =>
        (!status || r.status === status) &&
        (!query ||
          Object.values(r)
            .filter((v) => typeof v !== "object")
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
  const columns =
    kind === "audits"
      ? [
          { key: "id", label: "Audit ID" },
          { key: "title", label: "Audit title" },
          { key: "department", label: "Department" },
          { key: "academicYear", label: "Year" },
          { key: "type", label: "Type" },
          { key: "status", label: "Status" },
        ]
      : kind === "observations"
        ? [
            { key: "id", label: "Observation" },
            { key: "auditId", label: "Audit" },
            { key: "description", label: "Finding" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" },
            { key: "overdue", label: "Overdue" },
          ]
        : [
            { key: "id", label: "Action" },
            { key: "auditId", label: "Audit" },
            { key: "description", label: "Description" },
            { key: "responsible", label: "Owner" },
            { key: "dueDate", label: "Due date" },
            { key: "status", label: "Status" },
            { key: "overdue", label: "Overdue" },
          ];
  const title =
      kind === "audits"
        ? "Audit reports"
        : kind === "observations"
          ? "Observation reports"
          : "Corrective action reports",
    filters = `Department: ${dept || "All"}; Year: ${year || "All"}; Type: ${type || "All"}; Status: ${status || "All"}; Search: ${query || "None"}`;
  const completed = rows.filter(
    (r) => r.status === (kind === "corrective-actions" ? "Approved" : "Closed"),
  ).length;
  return (
    <>
      <Heading
        title="Reports & insights"
        description="Consistent, traceable reporting from the current audit records."
      >
        <button
          className="btn"
          onClick={() => downloadCSV(title, rows, columns, filters)}
        >
          <Download size={16} /> Export CSV
        </button>
        <button
          className="btn primary"
          onClick={() =>
            downloadPDF(title, [{ title, rows, columns }], filters)
          }
        >
          <FileText size={16} /> Export PDF
        </button>
      </Heading>
      <nav className="tabs">
        {[
          ["audits", "Audit reports"],
          ["observations", "Observations"],
          ["corrective-actions", "Corrective actions"],
        ].map(([id, name]) => (
          <Link
            className={kind === id ? "active" : ""}
            to={`/reports/${id}`}
            key={id}
            onClick={() => {
              setStatus("");
              setSelected("");
            }}
          >
            {name}
          </Link>
        ))}
      </nav>
      <div className="filter-bar">
        <input
          aria-label="Search report"
          placeholder="Search report…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Report department"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
        >
          <option value="">All departments</option>
          {db.departments
            .filter((d) => data.audits.some((a) => a.departmentId === d.id))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
        </select>
        <select
          aria-label="Report academic year"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">All academic years</option>
          {[...new Set(data.audits.map((a) => a.academicYear))].map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select
          aria-label="Report type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All audit types</option>
          {[...new Set(data.audits.map((a) => a.type))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Report status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {[
            ...new Set(
              (kind === "audits"
                ? data.audits
                : kind === "observations"
                  ? data.observations
                  : data.actions
              ).map((r) => r.status),
            ),
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="metrics metrics-4">
        {[
          ["Total records", rows.length],
          ["Closed / approved", completed],
          ["Open / pending", rows.length - completed],
          [
            kind === "audits" ? "Completion rate" : "Closure rate",
            `${rows.length ? Math.round((completed / rows.length) * 100) : 0}%`,
          ],
        ].map(([label, n]) => (
          <div className="metric" key={label}>
            <span>{label}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      {kind !== "audits" && (
        <div className="notice">
          Overdue: {rows.filter((r) => r.overdue === "Yes").length}
          {kind === "observations" &&
            ` · Severity: ${["Low", "Medium", "High"].map((s) => `${s} ${rows.filter((r) => r.severity === s).length}`).join(" / ")}`}
          . Closure rate = closed observations or approved actions ÷ total
          filtered records. An open observation is overdue when a linked action
          is overdue.
        </div>
      )}
      <Panel title={title}>
        <Table
          rows={rows}
          searchable={false}
          columns={columns.map((c) =>
            c.key === "id"
              ? {
                  ...c,
                  render: (r) => (
                    <Link
                      to={`/${kind === "audits" ? "audits" : kind === "observations" ? "observations" : "corrective-actions"}/${r.id}`}
                    >
                      {r.id}
                    </Link>
                  ),
                }
              : c,
          )}
        />
      </Panel>
      {kind === "audits" && (
        <Panel title="Detailed audit report">
          <select
            aria-label="Select audit report"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select an audit for its full report</option>
            {rows.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          {selected && rows.some((a) => a.id === selected) && (
            <AuditReport auditId={selected} />
          )}
        </Panel>
      )}
    </>
  );
}
