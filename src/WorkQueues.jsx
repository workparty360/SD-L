import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "./store.jsx";
import { latest } from "./domain.js";
import { Panel, Badge, Empty, fmtDate } from "./components.jsx";
export default function WorkQueues({ auditIds }) {
  const { data, user, db } = useApp();
  const evidence = data.evidence.filter(
    (e) =>
      auditIds.has(e.auditId) &&
      (user.role === "auditor"
        ? latest(e).status === "Pending Review"
        : ["Rejected", "Revision Required"].includes(latest(e).status)),
  );
  const observations = data.observations.filter(
    (o) => auditIds.has(o.auditId) && o.status !== "Closed",
  );
  const reviews = data.actions.filter(
    (a) => auditIds.has(a.auditId) && a.status === "Submitted for Review",
  );
  return (
    <>
      <div className="grid-two">
        <Panel
          title={
            user.role === "auditor"
              ? "Pending evidence review queue"
              : "Evidence requiring revision"
          }
          subtitle="Open a record to inspect the submission and its review history."
        >
          {evidence.map((e) => (
            <Link className="task-row" to={`/evidence/${e.id}`} key={e.id}>
              <div>
                <strong>{latest(e).title}</strong>
                <small>
                  {e.id} · {e.auditId}
                </small>
              </div>
              <Badge>{latest(e).status}</Badge>
            </Link>
          ))}
          {!evidence.length && <Empty text="No evidence awaiting attention" />}
        </Panel>
        <Panel
          title={
            user.role === "auditor"
              ? "Actions awaiting verification"
              : "Observations requiring attention"
          }
        >
          {user.role === "auditor"
            ? reviews.map((a) => (
                <Link
                  className="task-row"
                  to={`/corrective-actions/${a.id}`}
                  key={a.id}
                >
                  <div>
                    <strong>{a.description}</strong>
                    <small>
                      {db.users.find((u) => u.id === a.responsibleId)?.name} ·
                      Due {fmtDate(a.dueDate)}
                    </small>
                  </div>
                  <Badge>{a.status}</Badge>
                </Link>
              ))
            : observations.map((o) => (
                <Link
                  className="task-row"
                  to={`/observations/${o.id}`}
                  key={o.id}
                >
                  <div>
                    <strong>{o.description}</strong>
                    <small>
                      {o.id} · {o.auditId}
                    </small>
                  </div>
                  <Badge>{o.severity}</Badge>
                </Link>
              ))}
          {(user.role === "auditor"
            ? !reviews.length
            : !observations.length) && (
            <Empty text="No items awaiting attention" />
          )}
        </Panel>
      </div>
      {user.role === "auditor" && (
        <Panel title="Observations requiring attention">
          {observations.map((o) => (
            <Link className="task-row" to={`/observations/${o.id}`} key={o.id}>
              <div>
                <strong>{o.description}</strong>
                <small>
                  {o.id} · {o.auditId}
                </small>
              </div>
              <Badge>{o.severity}</Badge>
              <Badge>{o.status}</Badge>
            </Link>
          ))}
        </Panel>
      )}
    </>
  );
}
