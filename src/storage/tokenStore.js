const fs = require("fs");
const path = require("path");

const storePath = process.env.TOKEN_STORE_PATH || path.join(process.cwd(), "data", "token-store.json");

const ensureStore = () => {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify({ refreshTokens: {}, accessTokens: {} }, null, 2));
  }
};

const load = () => {
  ensureStore();
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { refreshTokens: {}, accessTokens: {} };
  }
};

const save = (data) => {
  ensureStore();
  const tmpPath = `${storePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, storePath);
};

const saveRefreshToken = (token, payload) => {
  const data = load();
  data.refreshTokens[token] = payload;
  save(data);
};

const getRefreshToken = (token) => {
  const data = load();
  return data.refreshTokens[token] || null;
};

const deleteRefreshToken = (token) => {
  const data = load();
  delete data.refreshTokens[token];
  save(data);
};

const allRefreshTokens = () => {
  const data = load();
  return data.refreshTokens || {};
};

module.exports = {
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  allRefreshTokens,
  saveAccessToken: (token, payload) => {
    const data = load();
    data.accessTokens = data.accessTokens || {};
    data.accessTokens[token] = payload;
    save(data);
  },
  getAccessToken: (token) => {
    const data = load();
    return data.accessTokens?.[token] || null;
  },
  deleteAccessToken: (token) => {
    const data = load();
    if (!data.accessTokens) return;
    delete data.accessTokens[token];
    save(data);
  },
  allAccessTokens: () => {
    const data = load();
    return data.accessTokens || {};
  },
  deleteTokensForUser: (userId) => {
    if (!userId) return { refresh: 0, access: 0 };
    const data = load();
    let refreshRemoved = 0;
    let accessRemoved = 0;
    for (const [token, payload] of Object.entries(data.refreshTokens || {})) {
      if (payload?.userId === userId) {
        delete data.refreshTokens[token];
        refreshRemoved += 1;
      }
    }
    for (const [token, payload] of Object.entries(data.accessTokens || {})) {
      if (payload?.userId === userId) {
        delete data.accessTokens[token];
        accessRemoved += 1;
      }
    }
    save(data);
    return { refresh: refreshRemoved, access: accessRemoved };
  },
};
