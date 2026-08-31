export interface LocalUser {
  id: string;
  name: string;
  email: string;
}

const USERS_KEY = "ent-users";
const CURRENT_USER_KEY = "ent-current-user";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getUsers(): LocalUser[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveUsers(users: LocalUser[]) {
  if (!isBrowser()) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): LocalUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: LocalUser | null) {
  if (!isBrowser()) return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): { ok: true; user: LocalUser } | { ok: false; error: string } {
  const email = data.email.trim().toLowerCase();
  const users = getUsers();

  if (users.some((u) => u.email === email)) {
    return { ok: false, error: "userExists" };
  }

  const user: LocalUser = {
    id: crypto.randomUUID(),
    name: data.name.trim(),
    email,
  };

  // Пароль храним отдельно (упрощённо, только для локального демо)
  localStorage.setItem(`ent-pwd-${email}`, data.password);
  saveUsers([...users, user]);
  return { ok: true, user };
}

export function loginUser(data: {
  email: string;
  password: string;
}): { ok: true; user: LocalUser } | { ok: false; error: string } {
  const email = data.email.trim().toLowerCase();
  const users = getUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    return { ok: false, error: "wrongCredentials" };
  }

  const storedPwd = localStorage.getItem(`ent-pwd-${email}`);
  if (storedPwd !== data.password) {
    return { ok: false, error: "wrongCredentials" };
  }

  setCurrentUser(user);
  return { ok: true, user };
}

export function logoutUser() {
  setCurrentUser(null);
}
