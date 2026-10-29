import React, { useState } from "react";
import WorkQueues from "./WorkQueues.jsx";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FileCheck2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useApp } from "./store.jsx";
import { metrics, latest, isOverdue } from "./domain.js";
import {
  Heading,
  Panel,
  Badge,
  Table,
  fmtDate,
  fmtTime,
} from "./components.jsx";
export const COLORS = [
  "#3265db",
  "#7797ed",
  "#b1c4f4",
  "#cdd9f5",
  "#f3b85d",
  "#39a483",
];
export function Distribution({ items }) {
  const rows = Object.entries(items).map(([name, value]) => ({ name, value }));
  return (
    <div className="distribution">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={rows}
            innerRadius={52}
            outerRadius={77}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {rows.map((r, i) => (
              <Cell key={r.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="legend">
        {rows.map((r, i) => (
          <div key={r.name}>
            <i style={{ background: COLORS[i % COLORS.length] }} />
            <span>{r.name}</span>
            <strong>{r.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
export function tally(rows, key) {
  return rows.reduce((o, r) => ({ ...o, [r[key]]: (o[r[key]] || 0) + 1 }), {});
}
export const auditColumns = [
  {
    key: "title",
    label: "Audit",
    render: (a) => (
      <Link className="record-title" to={`/audits/${a.id}`}>
        <strong>{a.title}</strong>
        <small>
          {a.id} · {a.targetType}
        </small>
      </Link>
    ),
  },
  { key: "department", label: "Department" },
  { key: "endDate", label: "Due date", render: (a) => fmtDate(a.endDate) },
  {
    key: "progress",
    label: "Evidence",
    render: (a) => (
      <div className="progress-cell">
        <div className="progress">
          <span style={{ width: `${a.progress}%` }} />
        </div>
        <small>{a.progress}%</small>
      </div>
    ),
  },
  { key: "status", label: "Status", render: (a) => <Badge>{a.status}</Badge> },
];
export function enrichedAudits(db, audits) {
  return audits.map((a) => ({
    ...a,
    department: db.departments.find((d) => d.id === a.departmentId)?.code,
    progress: Math.round(
      (a.criterionIds.filter((id) =>
        db.evidence.some(
          (e) =>
            e.auditId === a.id &&
            e.criterionId === id &&
            latest(e).status === "Accepted",
        ),
      ).length /
        Math.max(1, a.criterionIds.length)) *
        100,
    ),
  }));
}
export default function Dashboard() {
  const { db, data, user } = useApp(),
    [department, setDepartment] = useState(""),
    [year, setYear] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState("");
  const audits = data.audits.filter(
      (a) =>
        (!department || a.departmentId === department) &&
        (!year || a.academicYear === year) &&
        (!type || a.type === type) &&
        (!status || a.status === status),
    ),
    ids = new Set(audits.map((a) => a.id)),
    s = {
      ...data,
      audits,
      evidence: data.evidence.filter((e) => ids.has(e.auditId)),
      observations: data.observations.filter((o) => ids.has(o.auditId)),
      actions: data.actions.filter((a) => ids.has(a.auditId)),
    },
    m = metrics(s);
  const titles = {
    admin: "Administration overview",
    auditor: "Your audit workspace",
    hod: "Department overview",
    faculty: "Your academic workspace",
    management: "Institutional overview",
  };
  const requests = audits.flatMap((a) =>
    a.criterionIds
      .filter(
        (id) =>
          !s.evidence.some((e) => e.auditId === a.id && e.criterionId === id),
      )
      .map((id) => ({
        id: `${a.id}-${id}`,
        audit: a,
        criterion: db.criteria.find((c) => c.id === id),
      })),
  );
  const ownActions = s.actions.filter(
    (a) => user.role !== "faculty" || a.responsibleId === user.id,
  );
  let cards = [
    ["Total audits", m.total, "/audits", ClipboardCheck],
    ["Active audits", m.active, "/audits?status=Active%20audits", Clock],
    ["Completed audits", m.completed, "/audits?status=Closed", CheckCircle2],
    [
      "Open observations",
      m.open,
      "/observations?status=Open%20observations",
      AlertCircle,
    ],
    ["Overdue actions", m.overdue, "/corrective-actions?status=Overdue", Clock],
    ["Closure rate", `${m.closureRate}%`, "/reports/observations", FileCheck2],
  ];
  if (user.role === "admin")
    cards[5] = [
      "Closed corrective actions",
      m.approved,
      "/corrective-actions?status=Approved",
      FileCheck2,
    ];
  if (user.role === "auditor")
    cards = [
      ["Assigned audits", m.total, "/audits", ClipboardCheck],
      [
        "Pending evidence",
        m.pendingEvidence,
        "/evidence?status=Pending%20Review",
        FileCheck2,
      ],
      ["Open observations", m.open, "/observations", AlertCircle],
      [
        "Awaiting verification",
        m.pendingActions,
        "/corrective-actions?status=Submitted%20for%20Review",
        Clock,
      ],
    ];
  if (user.role === "faculty")
    cards = [
      [
        "Assigned courses",
        db.courses.filter((c) => c.facultyId === user.id).length,
        "/courses",
        BookOpen,
      ],
      ["Evidence requests", requests.length, "/evidence", FileCheck2],
      [
        "Assigned actions",
        ownActions.filter((a) => a.status !== "Approved").length,
        "/corrective-actions",
        ClipboardCheck,
      ],
      [
        "Needs revision",
        s.evidence.filter(
          (e) =>
            ["Rejected", "Revision Required"].includes(latest(e).status) &&
            latest(e).submittedBy === user.id,
        ).length,
        "/evidence?status=Needs%20revision",
        AlertCircle,
      ],
    ];
  if (user.role === "hod")
    cards[1] = ["Evidence pending", requests.length, "/evidence", FileCheck2];
  const deptRows = db.departments
    .filter((d) => !department || d.id === department)
    .map((d) => ({
      name: d.code,
      Active: audits.filter(
        (a) => a.departmentId === d.id && a.status !== "Closed",
      ).length,
      Closed: audits.filter(
        (a) => a.departmentId === d.id && a.status === "Closed",
      ).length,
    }));
  return (
    <>
      <Heading
        eyebrow="WORKSPACE / OVERVIEW"
        title={titles[user.role]}
        description={`Welcome back, ${user.name.replace(/^Dr\. |^Prof\. /, "").split(" ")[0]}. Here’s where your academic audits stand.`}
      >
        <Link className="btn" to="/reports">
          View reports <ArrowUpRight size={16} />
        </Link>
        {user.role === "admin" && (
          <Link className="btn primary" to="/audits/new">
            <Plus size={16} /> Create audit
          </Link>
        )}
      </Heading>
      <div className="overview-strip">
        <div>
          <span className="live-dot" />
          Academic quality & compliance{" "}
          <span className="muted">· {fmtDate(new Date())}</span>
        </div>
        <div className="row">
          {["admin", "management"].includes(user.role) && (
            <select
              aria-label="Dashboard department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All departments</option>
              {db.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Dashboard academic year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">All academic years</option>
            {[...new Set(data.audits.map((a) => a.academicYear))].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          {user.role === "management" && (
            <>
              <select
                aria-label="Dashboard audit type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">All audit types</option>
                {[...new Set(data.audits.map((a) => a.type))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <select
                aria-label="Dashboard status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {[...new Set(data.audits.map((a) => a.status))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
      <div className={`metrics metrics-${cards.length}`}>
        {cards.map(([label, value, url, Icon], i) => (
          <Link className="metric" key={label} to={url}>
            <div className="row spread">
              <span>{label}</span>
              <Icon size={18} className={i === 4 ? "danger-text" : ""} />
            </div>
            <strong>{value}</strong>
            <small>
              {i === 4 && m.overdue ? "Requires attention" : "View details"}{" "}
              <ArrowUpRight size={13} />
            </small>
          </Link>
        ))}
      </div>
      {["auditor", "hod", "faculty"].includes(user.role) && (
        <WorkQueues auditIds={ids} />
      )}
      <div className="grid-two charts">
        <Panel
          title="Audit progress by department"
          subtitle="Current workload and completed audits"
          action={<span className="pill">{audits.length} audits</span>}
        >
          <ResponsiveContainer width="100%" height={235}>
            <BarChart data={deptRows} barSize={27}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#edf0f6"
              />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="Active" fill="#3b6ddd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Closed" fill="#abc1f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="chart-caption">
            <i /> Active / pending <i className="light" /> Closed
          </div>
        </Panel>
        <Panel
          title="Audit status"
          subtitle="Distribution across the audit lifecycle"
        >
          <Distribution items={tally(audits, "status")} />
        </Panel>
      </div>
      <Panel
        title={user.role === "auditor" ? "Assigned audits" : "Audit overview"}
        subtitle="Track evidence collection, reviews and closure"
        action={<Link to="/audits">View all audits →</Link>}
      >
        <Table
          rows={enrichedAudits(db, audits)}
          columns={auditColumns}
          pageSize={5}
        />
      </Panel>
      <div className="grid-two">
        <Panel
          title="Priority actions"
          subtitle={`${m.overdue} overdue · ${m.approved} approved`}
          action={<Link to="/corrective-actions">All actions →</Link>}
        >
          {ownActions
            .filter((a) => a.status !== "Approved")
            .slice(0, 5)
            .map((a) => (
              <Link
                className="task-row"
                to={`/corrective-actions/${a.id}`}
                key={a.id}
              >
                <div
                  className={`task-icon ${isOverdue(a) ? "danger-text" : ""}`}
                >
                  <Clock size={18} />
                </div>
                <div>
                  <strong>{a.description}</strong>
                  <small>
                    {db.users.find((u) => u.id === a.responsibleId)?.name} · Due{" "}
                    {fmtDate(a.dueDate)}
                  </small>
                </div>
                <Badge>{isOverdue(a) ? "Overdue" : a.status}</Badge>
              </Link>
            ))}
          {!ownActions.some((a) => a.status !== "Approved") && (
            <p className="muted">No pending corrective actions.</p>
          )}
        </Panel>
        <Panel
          title="Recent activity"
          subtitle="The latest updates in your audit scope"
          action={<Link to="/audit-history">View history →</Link>}
        >
          {data.logs
            .filter((l) => ids.has(l.auditId))
            .slice(-5)
            .reverse()
            .map((l) => (
              <div className="activity" key={l.id}>
                <span />
                <div>
                  <strong>{l.action}</strong>
                  <small>
                    {db.users.find((u) => u.id === l.actorId)?.name} ·{" "}
                    {fmtTime(l.createdAt)}
                  </small>
                  <Link to={`/audits/${l.auditId}`}>{l.auditId}</Link>
                </div>
              </div>
            ))}
        </Panel>
      </div>
      {["hod", "faculty"].includes(user.role) && (
        <div className="grid-two">
          <Panel
            title="Evidence requests"
            subtitle="Assigned criteria awaiting a submission"
          >
            {requests.slice(0, 8).map((r) => (
              <Link
                key={r.id}
                className="task-row"
                to={`/audits/${r.audit.id}/criteria`}
              >
                <FileCheck2 size={18} />
                <div>
                  <strong>{r.criterion?.name}</strong>
                  <small>
                    {r.audit.title} · Due {fmtDate(r.audit.endDate)}
                  </small>
                </div>
              </Link>
            ))}
            {!requests.length && <p>No outstanding evidence requests.</p>}
          </Panel>
          <Panel
            title={
              user.role === "faculty"
                ? "Assigned courses"
                : "Faculty responsibilities"
            }
          >
            {db.courses
              .filter((c) =>
                user.role === "faculty"
                  ? c.facultyId === user.id
                  : c.departmentId === user.departmentId,
              )
              .map((c) => (
                <div className="task-row" key={c.id}>
                  <BookOpen size={19} />
                  <div>
                    <strong>
                      {c.code} · {c.name}
                    </strong>
                    <small>
                      {db.users.find((u) => u.id === c.facultyId)?.name}
                    </small>
                  </div>
                </div>
              ))}
          </Panel>
        </div>
      )}
      <div className="grid-two">
        <Panel title="Observation severity">
          <Distribution items={tally(s.observations, "severity")} />
        </Panel>
        <Panel title="Corrective action status">
          <Distribution items={tally(s.actions, "status")} />
        </Panel>
      </div>
      <Panel title="Upcoming audit deadlines">
        <div className="deadline-grid">
          {audits
            .filter((a) => a.status !== "Closed")
            .sort((a, b) => a.endDate.localeCompare(b.endDate))
            .map((a) => (
              <Link to={`/audits/${a.id}`} key={a.id}>
                <small>{fmtDate(a.endDate)}</small>
                <strong>{a.title}</strong>
                <Badge>{a.status}</Badge>
              </Link>
            ))}
        </div>
      </Panel>
      {user.role === "admin" && (
        <div className="quick-links">
          <Link to="/users">Manage users →</Link>
          <Link to="/audit-criteria">Manage criteria →</Link>
          <Link to="/reports/corrective-actions">
            Closed corrective actions: {m.approved} →
          </Link>
        </div>
      )}
    </>
  );
}
