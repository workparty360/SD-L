import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useApp } from "./store.jsx";
import { ROLES, CATEGORIES } from "./data.js";
import {
  Heading,
  Table,
  Badge,
  Modal,
  Field,
  Select,
  ErrorBox,
  Confirm,
  fmtDate,
} from "./components.jsx";
export function EntityForm({ collection, record, onClose }) {
  const { db, user, run } = useApp(),
    [v, setV] = useState(
      record
        ? { ...record }
        : {
            name: "",
            code: "",
            description: "",
            status: "Active",
            departmentId: user.departmentId,
            role: "faculty",
            courseIds: [],
            category: CATEGORIES[0],
            priority: "Medium",
            targetType: "Department",
          },
    ),
    [error, setError] = useState("");
  const set = (k, val) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Modal
      title={`${record ? "Edit" : "Add"} ${collection === "criteria" ? "criterion" : collection.slice(0, -1)}`}
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run("saveEntity", { collection, id: record?.id, values: v });
            onClose();
          } catch (e) {
            setError(e.message);
          }
        }}
      >
        <div className="form-grid">
          <Field
            label="Name"
            value={v.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
          {collection === "users" ? (
            <>
              <Field
                label="Email"
                type="email"
                value={v.email || ""}
                onChange={(e) => set("email", e.target.value)}
                required
              />
              <Select
                label="Role"
                value={v.role}
                onChange={(x) => set("role", x)}
                options={Object.entries(ROLES).map(([id, name]) => ({
                  id,
                  name,
                }))}
                required
              />
            </>
          ) : (
            collection !== "criteria" && (
              <Field
                label="Code"
                value={v.code}
                onChange={(e) => set("code", e.target.value)}
                required
              />
            )
          )}
          {["users", "programs", "courses"].includes(collection) && (
            <Select
              label="Department"
              value={v.departmentId}
              onChange={(x) =>
                setV((s) => ({
                  ...s,
                  departmentId: x,
                  programId: "",
                  facultyId: "",
                }))
              }
              options={db.departments.filter(
                (d) => user.role === "admin" || d.id === user.departmentId,
              )}
              required
            />
          )}
          {collection === "departments" && (
            <Select
              label="HOD"
              value={v.hodId}
              onChange={(x) => set("hodId", x)}
              options={db.users.filter(
                (u) => u.role === "hod" && u.status === "Active",
              )}
            />
          )}
          {collection === "courses" && (
            <>
              <Select
                label="Program"
                value={v.programId}
                onChange={(x) => set("programId", x)}
                options={db.programs.filter(
                  (p) =>
                    p.departmentId === v.departmentId && p.status === "Active",
                )}
                required
              />
              <Select
                label="Faculty"
                value={v.facultyId}
                onChange={(x) => set("facultyId", x)}
                options={db.users.filter(
                  (u) =>
                    u.role === "faculty" &&
                    u.departmentId === v.departmentId &&
                    u.status === "Active",
                )}
                required
              />
              <Field
                label="Academic year"
                value={v.academicYear || ""}
                placeholder="2026–27"
                onChange={(e) => set("academicYear", e.target.value)}
                required
              />
              <Select
                label="Semester"
                value={v.semester}
                onChange={(x) => set("semester", x)}
                options={["Odd", "Even"]}
                required
              />
            </>
          )}
          {collection === "criteria" && (
            <>
              <Select
                label="Category"
                value={v.category}
                onChange={(x) => set("category", x)}
                options={CATEGORIES}
                required
              />
              <Select
                label="Priority"
                value={v.priority}
                onChange={(x) => set("priority", x)}
                options={["Low", "Medium", "High"]}
                required
              />
              <Select
                label="Applicable target"
                value={v.targetType}
                onChange={(x) => set("targetType", x)}
                options={["Department", "Program", "Course"]}
                required
              />
              <Field label="Requirement">
                <textarea
                  required
                  value={v.requirement || ""}
                  onChange={(e) => set("requirement", e.target.value)}
                />
              </Field>
              <Field label="Evidence requirement">
                <textarea
                  required
                  value={v.evidenceRequirement || ""}
                  onChange={(e) => set("evidenceRequirement", e.target.value)}
                />
              </Field>
            </>
          )}
          <Select
            label="Status"
            value={v.status}
            onChange={(x) => set("status", x)}
            options={["Active", "Inactive"]}
            required
          />
          {collection !== "users" && (
            <Field label="Description">
              <textarea
                value={v.description || ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          )}
        </div>
        {collection === "users" && (
          <p className="hint">
            Accounts use the shared demo password. Course assignments are
            maintained in Courses so faculty and course records remain
            consistent.
          </p>
        )}
        {collection === "criteria" && record && (
          <p className="hint">
            Saving a revision preserves earlier versions, notifies audit
            participants and clears affected evaluations on open audits for
            reassessment.
          </p>
        )}
        <ErrorBox error={error} />
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary">
            Save {collection === "criteria" ? "criterion" : "record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function Administration({ collection, create = false }) {
  const { db, data, user } = useApp(),
    [edit, setEdit] = useState(create ? {} : null),
    [remove, setRemove] = useState(null),
    { run } = useApp(),
    navigate = useNavigate();
  const allowed =
    user.role === "admin" || (collection === "courses" && user.role === "hod");
  if (!allowed && collection !== "criteria" && collection !== "courses")
    return <Navigate to="/access-denied" replace />;
  if (create && !allowed) return <Navigate to="/access-denied" replace />;
  const label =
    collection === "criteria"
      ? "Audit criteria"
      : collection[0].toUpperCase() + collection.slice(1);
  const rows = db[collection]
    .filter(
      (r) =>
        collection !== "criteria" ||
        ["admin", "management"].includes(user.role) ||
        data.audits.some((a) => a.criterionIds.includes(r.id)),
    )
    .filter(
      (r) =>
        collection !== "courses" ||
        user.role !== "faculty" ||
        r.facultyId === user.id,
    )
    .filter(
      (r) =>
        !["users", "courses"].includes(collection) ||
        user.role === "admin" ||
        r.departmentId === user.departmentId,
    )
    .map((r) => ({
      ...r,
      department:
        db.departments.find((d) => d.id === r.departmentId)?.code ||
        "Institution",
      roleName: ROLES[r.role],
      faculty: db.users.find((u) => u.id === r.facultyId)?.name,
      program: db.programs.find((p) => p.id === r.programId)?.name,
    }));
  const close = () => {
    setEdit(null);
    if (create) navigate("/audit-criteria");
  };
  return (
    <>
      <Heading
        title={label}
        description={
          collection === "criteria"
            ? "Maintain the standards and evidence requirements used across academic audits."
            : "Maintain institutional records and responsibilities."
        }
      >
        {allowed && (
          <button className="btn primary" onClick={() => setEdit({})}>
            <Plus size={17} /> Add{" "}
            {collection === "criteria" ? "criterion" : collection.slice(0, -1)}
          </button>
        )}
      </Heading>
      {!allowed && (
        <div className="notice">
          Read-only view · Changes are managed by the authorized administrator.
        </div>
      )}
      <div className="panel">
        <Table
          rows={rows}
          filters={[
            { key: "status", label: "statuses" },
            ...(collection === "criteria"
              ? [{ key: "category", label: "categories" }]
              : [{ key: "department", label: "departments" }]),
            ...(collection === "users"
              ? [{ key: "roleName", label: "roles" }]
              : []),
          ]}
          columns={[
            {
              key: "name",
              label: collection === "criteria" ? "Criterion" : "Name",
              render: (r) => (
                <div>
                  <strong>{r.name}</strong>
                  <small>
                    {r.id}
                    {r.code ? ` · ${r.code}` : ""}
                  </small>
                  {r.email && <small>{r.email}</small>}
                </div>
              ),
            },
            ...(collection === "criteria"
              ? [
                  { key: "category", label: "Category" },
                  {
                    key: "requirement",
                    label: "Requirement",
                    render: (r) => (
                      <div>
                        {r.requirement}
                        <small>Evidence: {r.evidenceRequirement}</small>
                        <small>
                          {r.targetType} · v{r.version}
                        </small>
                      </div>
                    ),
                  },
                  {
                    key: "priority",
                    label: "Priority",
                    render: (r) => <Badge>{r.priority}</Badge>,
                  },
                ]
              : [
                  { key: "department", label: "Department" },
                  ...(collection === "users"
                    ? [
                        {
                          key: "roleName",
                          label: "Role",
                          render: (r) => (
                            <div>
                              {r.roleName}
                              <small>
                                Courses:{" "}
                                {r.courseIds
                                  ?.map(
                                    (id) =>
                                      db.courses.find((c) => c.id === id)?.code,
                                  )
                                  .join(", ") || "—"}
                              </small>
                              <small>Created {fmtDate(r.createdAt)}</small>
                            </div>
                          ),
                        },
                      ]
                    : collection === "courses"
                      ? [
                          { key: "faculty", label: "Faculty" },
                          { key: "program", label: "Program" },
                        ]
                      : [{ key: "description", label: "Description" }]),
                ]),
            {
              key: "status",
              label: "Status",
              render: (r) => <Badge>{r.status}</Badge>,
            },
            ...(allowed
              ? [
                  {
                    key: "actions",
                    label: "Manage",
                    render: (r) => (
                      <div className="row">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${r.name}`}
                          onClick={() => setEdit(r)}
                        >
                          <Pencil size={16} />
                        </button>
                        {collection === "programs" && (
                          <button
                            className="icon-button"
                            aria-label={`Delete ${r.name}`}
                            onClick={() => setRemove(r)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
      {edit && (
        <EntityForm
          collection={collection}
          record={edit.id ? edit : null}
          onClose={close}
        />
      )}{" "}
      {remove && (
        <Confirm
          title="Delete program"
          text={`Delete ${remove.name}? Programs with dependent records cannot be deleted.`}
          onClose={() => setRemove(null)}
          onConfirm={() => run("deleteProgram", { id: remove.id })}
        />
      )}
    </>
  );
}
