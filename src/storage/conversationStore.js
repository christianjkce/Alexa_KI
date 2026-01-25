const fs = require("fs");
const path = require("path");

const storePath =
  process.env.CONVERSATION_STORE_PATH ||
  path.join(process.cwd(), "data", "conversation-store.json");

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

const getRecord = (userId) => {
  if (!userId) return null;
  const data = load();
  return data.users?.[userId] || null;
};

const getHistory = (userId) => {
  const record = getRecord(userId);
  return record?.history || null;
};

const setHistory = (userId, history) => {
  if (!userId) return;
  const data = load();
  if (!data.users) data.users = {};
  data.users[userId] = {
    history,
    updatedAt: new Date().toISOString(),
  };
  save(data);
};

const clearHistory = (userId) => {
  if (!userId) return;
  const data = load();
  if (data.users && data.users[userId]) {
    delete data.users[userId];
    save(data);
  }
};

module.exports = {
  getRecord,
  getHistory,
  setHistory,
  clearHistory,
};
