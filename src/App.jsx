import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  FileCheck2,
  MessageSquareWarning,
  ListChecks,
  BarChart3,
  History,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  Settings2,
  Bell,
  Search,
  LogOut,
  Menu,
  ShieldCheck,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronDown,
  Activity,
} from "lucide-react";
import { Provider, useApp } from "./store.jsx";
import { ROLES } from "./data.js";
import {
  Heading,
  Panel,
  Field,
  ErrorBox,
  Confirm,
  History as HistoryTable,
  Empty,
} from "./components.jsx";
import Dashboard from "./Dashboard.jsx";
import Administration from "./Admin.jsx";
import Notifications from "./Notifications.jsx";
import { AuditList, AuditNew, AuditDetailRoute } from "./Audits.jsx";
import { WorkflowList, WorkflowDetail } from "./Workflows.jsx";
import Reports from "./Reports.jsx";
function Login() {
  const { login, user, db } = useApp(),
    navigate = useNavigate(),
    [email, setEmail] = useState("admin@aap.demo"),
    [password, setPassword] = useState("Demo@123"),
    [show, setShow] = useState(false),
    [error, setError] = useState("");
  if (user) return <Navigate to={`/dashboard/${user.role}`} replace />;
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <GraduationCap size={27} />
          </span>
          <div>
            Academic Audit Portal
            <small>The LNM Institute of Information Technology</small>
          </div>
        </div>
        <div>
          <span className="eyebrow">ACADEMIC QUALITY & COMPLIANCE</span>
          <h1>
            A clearer path
            <br />
            to academic
            <br />
            <em>excellence.</em>
          </h1>
          <p>
            One workspace to plan audits, verify evidence and turn academic
            findings into meaningful improvements.
          </p>
          <div className="login-points">
            <span>
              <ShieldCheck /> Clear accountability
            </span>
            <span>
              <FileCheck2 /> Evidence-led reviews
            </span>
            <span>
              <History /> A complete audit trail
            </span>
          </div>
        </div>
        <small>CS314 · Software Development Laboratory · Team T094</small>
      </div>
      <div className="login-form">
        <div className="login-box">
          <span className="pill">FRONTEND DEMONSTRATION</span>
          <h2>Welcome back</h2>
          <p>Sign in to your academic audit workspace.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const u = login(email, password);
                navigate(`/dashboard/${u.role}`);
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <Field
              label="Email address"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field label="Password">
              <div className="password">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <ErrorBox error={error} />
            <button className="btn primary full">Sign in to workspace →</button>
          </form>
          <div className="demo-access">
            <h3>Explore a demo role</h3>
            <p>Select a role to fill its demonstration account.</p>
            <div>
              {["admin", "auditor", "hod", "faculty", "management"].map(
                (role) => (
                  <button
                    key={role}
                    type="button"
                    className={email === `${role}@aap.demo` ? "selected" : ""}
                    onClick={() => {
                      setEmail(`${role}@aap.demo`);
                      setPassword("Demo@123");
                      setError("");
                    }}
                  >
                    {ROLES[role].split(" /")[0]}
                  </button>
                ),
              )}
            </div>
            <small>
              All demo accounts use <strong>Demo@123</strong>. Synthetic
              accounts only; authentication is simulated. Sessions expire after
              eight hours.
            </small>
          </div>
        </div>
        <footer>Academic Audit Portal · Local frontend prototype</footer>
      </div>
    </div>
  );
}
function Shell() {
  const { user, data, logout, storageError } = useApp(),
    [menu, setMenu] = useState(false),
    [profile, setProfile] = useState(false),
    navigate = useNavigate(),
    location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  const items = [
      ["Overview", `/dashboard/${user.role}`, LayoutDashboard],
      ["Academic audits", "/audits", ClipboardList],
      ["Audit criteria", "/audit-criteria", ListChecks],
      ["Evidence library", "/evidence", FileCheck2],
      ["Observations", "/observations", MessageSquareWarning],
      ["Corrective actions", "/corrective-actions", ClipboardList],
      ["Reports & insights", "/reports", BarChart3],
      ["Audit history", "/audit-history", History],
    ],
    admin = [
      ["Users & roles", "/users", Users],
      ["Departments", "/departments", Building2],
      ["Programs", "/programs", GraduationCap],
      ["Courses", "/courses", BookOpen],
      ["Activity logs", "/activity-logs", Activity],
    ];
  const unread = data.notifications.filter((n) => !n.isRead).length;
  return (
    <div className="app-shell">
      {menu && (
        <div className="mobile-overlay" onClick={() => setMenu(false)} />
      )}
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link className="brand" to={`/dashboard/${user.role}`}>
          <span className="brand-icon">
            <GraduationCap size={25} />
          </span>
          <div>
            Academic Audit<small>PORTAL · LNMIIT</small>
          </div>
        </Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          {items.map(([name, path, Icon]) => (
            <NavLink key={path} to={path} onClick={() => setMenu(false)}>
              <Icon size={18} />
              {name}
              {name === "Corrective actions" &&
                data.actions.filter((a) => a.status !== "Approved").length >
                  0 && (
                  <span className="nav-count">
                    {data.actions.filter((a) => a.status !== "Approved").length}
                  </span>
                )}
            </NavLink>
          ))}
        </nav>
        {(user.role === "admin" || ["hod", "faculty"].includes(user.role)) && (
          <>
            <div className="workspace-label">
              {user.role === "admin" ? "ADMINISTRATION" : "ACADEMICS"}
            </div>
            <nav>
              {admin
                .filter((x) => user.role === "admin" || x[1] === "/courses")
                .map(([name, path, Icon]) => (
                  <NavLink key={path} to={path} onClick={() => setMenu(false)}>
                    <Icon size={18} />
                    {name}
                  </NavLink>
                ))}
            </nav>
          </>
        )}
        <div className="sidebar-bottom">
          <div>
            <ShieldCheck size={18} />
            <span>
              Academic quality,
              <br />
              <strong>accounted for.</strong>
            </span>
          </div>
          <small>Academic Quality & Compliance Management</small>
          <span className="demo-label">DEMO WORKSPACE</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="row">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span className="topbar-title">
              The LNM Institute of Information Technology <small>Jaipur</small>
            </span>
          </div>
          <div className="row">
            <Link
              className="bell icon-button"
              to="/notifications"
              aria-label={`Notifications, ${unread} unread`}
            >
              <Bell size={20} />
              {unread > 0 && <span>{unread}</span>}
            </Link>
            <div className="topbar-divider" />
            <div className="profile-wrap">
              <button
                className="profile-button"
                onClick={() => setProfile(!profile)}
              >
                <span className="avatar">
                  {user.name
                    .split(" ")
                    .slice(-2)
                    .map((n) => n[0])
                    .join("")}
                </span>
                <span>
                  <strong>{user.name}</strong>
                  <small>{ROLES[user.role]}</small>
                </span>
                <ChevronDown size={15} />
              </button>
              {profile && (
                <div className="profile-menu">
                  <Link to="/profile" onClick={() => setProfile(false)}>
                    Profile & demo settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          {storageError && <ErrorBox error={storageError} />}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>
            Academic Audit Portal{" "}
            <span>· Academic Quality & Compliance Management</span>
          </span>
          <span>CS314 / T094 · Frontend prototype</span>
        </footer>
      </div>
    </div>
  );
}
function RoleDashboard() {
  const { user } = useApp(),
    path = useLocation().pathname;
  if (path !== `/dashboard/${user.role}`)
    return <Navigate to={`/dashboard/${user.role}`} replace />;
  return <Dashboard />;
}
function Profile() {
  const { user, db, reset, logout } = useApp(),
    [confirm, setConfirm] = useState(false);
  return (
    <>
      <Heading
        title="Profile & demo settings"
        description="Your current account and local demonstration data."
      />
      <Panel title={user.name}>
        <div className="detail-grid">
          <div>
            <small>Email</small>
            <strong>{user.email}</strong>
          </div>
          <div>
            <small>Role</small>
            <strong>{ROLES[user.role]}</strong>
          </div>
          <div>
            <small>Department</small>
            <strong>
              {db.departments.find((d) => d.id === user.departmentId)?.name}
            </strong>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn" onClick={logout}>
            <LogOut size={16} /> Sign out / change demo role
          </button>
        </div>
      </Panel>
      <Panel title="Restore demonstration data">
        <p>
          Restore the initial synthetic dataset. This removes all local edits
          and submitted metadata in this browser.
        </p>
        <button className="btn" onClick={() => setConfirm(true)}>
          <RotateCcw size={16} /> Restore demo data
        </button>
      </Panel>
      <div className="notice">
        This is a frontend-only prototype. Local storage is not secure
        authentication, shared multi-user storage, or a permanent evidence
        archive. Do not enter real institutional credentials or confidential
        information.
      </div>
      {confirm && (
        <Confirm
          title="Restore original demo data"
          text="All local changes and submissions will be replaced with the original demonstration dataset."
          onClose={() => setConfirm(false)}
          onConfirm={reset}
        />
      )}
    </>
  );
}
function Logs({ activity = false }) {
  const { user } = useApp();
  if (activity && user.role !== "admin")
    return <Navigate to="/access-denied" />;
  return (
    <>
      <Heading
        title={activity ? "Activity logs" : "Audit history"}
        description="Trace changes, reviews and decisions in chronological order."
      />
      <Panel>
        <HistoryTable />
      </Panel>
    </>
  );
}
function Home() {
  const { user } = useApp();
  return <Navigate to={user ? `/dashboard/${user.role}` : "/login"} replace />;
}
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    if (this.state.error)
      return (
        <div className="fatal">
          <h1>The page could not be displayed</h1>
          <p>Your saved data has not been deleted. Reload the page to retry.</p>
          <button
            className="btn primary"
            onClick={() => window.location.reload()}
          >
            Reload application
          </button>
        </div>
      );
    return this.props.children;
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <Provider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Shell />}>
              <Route path="/dashboard/:role" element={<RoleDashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/audits" element={<AuditList />} />
              <Route path="/audits/new" element={<AuditNew />} />
              <Route path="/audits/:auditId" element={<AuditDetailRoute />} />
              <Route
                path="/audits/:auditId/criteria"
                element={<AuditDetailRoute view="criteria" />}
              />
              <Route
                path="/audits/:auditId/closure"
                element={<AuditDetailRoute view="closure" />}
              />
              {["users", "departments", "programs", "courses"].map((c) => (
                <Route
                  key={c}
                  path={`/${c}`}
                  element={<Administration key={c} collection={c} />}
                />
              ))}
              <Route
                path="/audit-criteria"
                element={
                  <Administration key="criteria" collection="criteria" />
                }
              />
              <Route
                path="/audit-criteria/new"
                element={
                  <Administration
                    key="newcriteria"
                    collection="criteria"
                    create
                  />
                }
              />
              <Route
                path="/evidence"
                element={<WorkflowList kind="evidence" />}
              />
              <Route
                path="/evidence/:evidenceId"
                element={<WorkflowDetail kind="evidence" />}
              />
              <Route
                path="/observations"
                element={<WorkflowList kind="observations" />}
              />
              <Route
                path="/observations/:observationId"
                element={<WorkflowDetail kind="observation" />}
              />
              <Route
                path="/corrective-actions"
                element={<WorkflowList kind="actions" />}
              />
              <Route
                path="/corrective-actions/:actionId"
                element={<WorkflowDetail kind="action" />}
              />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:reportType" element={<Reports />} />
              <Route path="/audit-history" element={<Logs />} />
              <Route path="/activity-logs" element={<Logs activity />} />
              <Route
                path="/access-denied"
                element={
                  <Empty text="Access denied">
                    <p>Your demo role does not have access to this page.</p>
                    <Link to="/">Return to dashboard</Link>
                  </Empty>
                }
              />
            </Route>
            <Route path="/" element={<Home />} />
            <Route
              path="*"
              element={
                <Empty text="Page not found">
                  <Link to="/">Return to dashboard</Link>
                </Empty>
              }
            />
          </Routes>
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  );
}
