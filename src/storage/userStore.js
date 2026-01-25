const fs = require("fs");
const path = require("path");

const storePath = process.env.USER_STORE_PATH || path.join(process.cwd(), "data", "user-store.json");

const ensureStore = () => {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify({ users: {} }, null, 2));
  }
};

const load = () => {
  ensureStore();
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { users: {} };
  }
};

const save = (data) => {
  ensureStore();
  const tmpPath = `${storePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, storePath);
};

const getUser = (username) => {
  const data = load();
  return data.users[username] || null;
};

const addUser = (username, payload) => {
  const data = load();
  data.users[username] = payload;
  save(data);
};

const updateUser = (username, updates) => {
  const data = load();
  const current = data.users[username];
  if (!current) return false;
  data.users[username] = { ...current, ...updates };
  save(data);
  return true;
};

const deleteUser = (username) => {
  const data = load();
  if (!data.users[username]) return false;
  delete data.users[username];
  save(data);
  return true;
};

const listUsers = () => {
  const data = load();
  return Object.entries(data.users).map(([username, payload]) => ({
    username,
    ...payload,
  }));
};

const findByEmail = (email) => {
  const data = load();
  const entries = Object.entries(data.users);
  for (const [username, payload] of entries) {
    if (payload?.email && payload.email.toLowerCase() === email.toLowerCase()) {
      return { username, ...payload };
    }
  }
  return null;
};

module.exports = {
  getUser,
  addUser,
  updateUser,
  deleteUser,
  listUsers,
  findByEmail,
  findByUsernameInsensitive: (username) => {
    const data = load();
    const entries = Object.entries(data.users);
    const needle = String(username || "").toLowerCase();
    for (const [key, payload] of entries) {
      if (key.toLowerCase() === needle) {
        return { username: key, ...payload };
      }
    }
    return null;
  },
};
