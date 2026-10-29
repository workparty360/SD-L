// Demo authentication only. Production must resolve identity on a trusted server.
export function authenticate(db, email, password, now = Date.now()) {
  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase().trim() &&
      u.status === "Active",
  );
  if (!user || password !== "Demo@123")
    throw Error("Email or password is incorrect.");
  return {
    user,
    session: { userId: user.id, expiresAt: now + 8 * 60 * 60 * 1000 },
  };
}
export function resolveSession(db, session, now = Date.now()) {
  return db.users.find(
    (u) =>
      u.id === session?.userId &&
      u.status === "Active" &&
      session.expiresAt > now,
  );
}
