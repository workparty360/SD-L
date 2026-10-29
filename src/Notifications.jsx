import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Send, CheckCheck } from "lucide-react";
import { useApp } from "./store.jsx";
import { recipients } from "./domain.js";
import {
  Heading,
  Panel,
  Modal,
  Field,
  Select,
  ErrorBox,
  Empty,
  fmtTime,
} from "./components.jsx";
export function Compose({ auditId, onClose }) {
  const { db, data, user, run } = useApp(),
    [aid, setAid] = useState(auditId || data.audits[0]?.id || ""),
    [ids, setIds] = useState([]),
    [message, setMessage] = useState(""),
    [channel, setChannel] = useState("In-app"),
    [deliverAt, setDeliverAt] = useState(""),
    [error, setError] = useState("");
  const a = db.audits.find((a) => a.id === aid),
    eligible = a
      ? recipients(db, a).filter(
          (id) =>
            user.role !== "faculty" ||
            db.users.find((u) => u.id === id).role === "admin",
        )
      : [];
  return (
    <Modal title="Compose notification" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run("notify", {
              auditId: aid,
              recipientIds: ids,
              message,
              channel,
              deliverAt: deliverAt
                ? new Date(deliverAt).toISOString()
                : undefined,
              requestId: crypto.randomUUID(),
            });
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <Select
          label="Related audit"
          value={aid}
          onChange={(v) => {
            setAid(v);
            setIds([]);
          }}
          options={data.audits}
          required
        />
        <Select
          label="Recipients"
          multiple
          value={ids}
          onChange={setIds}
          options={db.users.filter((u) => eligible.includes(u.id))}
          required
        />
        <Field label="Message">
          <textarea
            required
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </Field>
        <Select
          label="Simulated channel"
          options={[
            "In-app",
            "In-app + Email (simulated)",
            "In-app + Push (simulated)",
          ]}
          value={channel}
          onChange={setChannel}
        />
        {user.role === "admin" && (
          <Field
            label="Deliver after (optional, while portal is used)"
            type="datetime-local"
            value={deliverAt}
            onChange={(e) => setDeliverAt(e.target.value)}
          />
        )}
        <p className="hint">
          The message is saved to the recipient’s demo inbox. Email and push
          delivery are simulated.
        </p>
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">
            <Send size={16} /> Send notification
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function Notifications() {
  const { data, run, user } = useApp(),
    [compose, setCompose] = useState(false),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState("");
  const rows = data.notifications
    .filter((n) => filter !== "unread" || !n.isRead)
    .slice()
    .reverse();
  return (
    <>
      <Heading
        title="Notification inbox"
        description="Updates, review decisions and reminders for your audit work."
      >
        <button
          className="btn"
          onClick={() => {
            try {
              run("readNotification");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <CheckCheck size={16} /> Mark all as read
        </button>
        {user.role !== "management" && (
          <button className="btn primary" onClick={() => setCompose(true)}>
            <Send size={16} /> Compose
          </button>
        )}
      </Heading>
      <ErrorBox error={error} />
      <div className="tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All notifications
        </button>
        <button
          className={filter === "unread" ? "active" : ""}
          onClick={() => setFilter("unread")}
        >
          Unread ({data.notifications.filter((n) => !n.isRead).length})
        </button>
      </div>
      <Panel>
        {rows.map((n) => (
          <article
            className={`notification ${n.isRead ? "" : "unread"}`}
            key={n.id}
          >
            <Bell size={20} />
            <div>
              <strong>{n.message}</strong>
              <small>
                {fmtTime(n.createdAt)} · {n.type} · {n.id}
              </small>
              <div className="row">
                <Link to={`/audits/${n.auditId}`}>Open audit →</Link>
                {!n.isRead && (
                  <button
                    className="text-button"
                    onClick={() => {
                      try {
                        run("readNotification", { id: n.id });
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
            {!n.isRead && <span className="unread-dot" />}
          </article>
        ))}
        {!rows.length && <Empty text="You’re all caught up" />}
      </Panel>
      {compose && <Compose onClose={() => setCompose(false)} />}
    </>
  );
}
