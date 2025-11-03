const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// security: hide framework header
app.disable("x-powered-by");

// health check dla Render / innych hostów
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const DATA_FILE = path.join(__dirname, "data.json");
const ASSIGN_FILE = path.join(__dirname, "assignments.json");

const defaultNames = [
  "Ania",
  "Bartek",
  "Celina",
  "Daniel",
  "Ewa",
  "Filip",
  "Gosia",
  "Hubert",
];

function readJson(filePath, fallback) {
  try {
    const txt = fs.readFileSync(filePath, "utf8");
    return JSON.parse(txt);
  } catch (e) {
    return fallback;
  }
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
}

function createDefaultData() {
  const users = defaultNames.map((n) => ({ name: n, wishlist: [] }));
  writeJson(DATA_FILE, { users });
  return { users };
}

function createAssignmentsDerangement(names) {
  // simple shuffle until no one maps to themselves (small N so acceptable)
  let assigns = {};
  let shuffled = [];
  const maxTries = 1000;
  for (let t = 0; t < maxTries; t++) {
    shuffled = names.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let ok = true;
    for (let i = 0; i < names.length; i++) {
      if (names[i] === shuffled[i]) {
        ok = false;
        break;
      }
    }
    if (ok) break;
  }
  names.forEach((n, i) => (assigns[n] = shuffled[i]));
  return assigns;
}

function ensureFiles() {
  let data = readJson(DATA_FILE, null);
  if (!data) {
    data = createDefaultData();
    console.log("Created default data.json");
  }

  let assigns = readJson(ASSIGN_FILE, null);
  if (!assigns) {
    assigns = createAssignmentsDerangement(defaultNames);
    writeJson(ASSIGN_FILE, assigns);
    console.log("Created assignments.json");
  }
}

ensureFiles();

// API: GET /users
app.get("/users", (req, res) => {
  const data = readJson(DATA_FILE, { users: [] });
  res.json(data);
});

// API: GET /assigned/:name
app.get("/assigned/:name", (req, res) => {
  const name = req.params.name;
  const assigns = readJson(ASSIGN_FILE, {});
  const assignedName = assigns[name];
  if (!assignedName) {
    return res.json({ assigned: null, message: "Brak przypisanej osoby" });
  }
  const data = readJson(DATA_FILE, { users: [] });
  const assignedUser = data.users.find((u) => u.name === assignedName) || {
    name: assignedName,
    wishlist: [],
  };
  res.json({ assigned: assignedName, wishlist: assignedUser.wishlist || [] });
});

// API: POST /wishlist
// body: { name: string, wishlist: [{url, note}, ...] }
app.post("/wishlist", (req, res) => {
  const body = req.body;
  if (!body || !body.name || !Array.isArray(body.wishlist)) {
    return res.status(400).json({ error: "Niepoprawne dane" });
  }
  const data = readJson(DATA_FILE, { users: [] });
  const user = data.users.find((u) => u.name === body.name);
  if (!user)
    return res.status(404).json({ error: "Użytkownik nie znaleziony" });

  // sanitize: keep up to 5 entries, require strings
  const wl = body.wishlist
    .slice(0, 5)
    .map((item) => {
      return {
        url: (item.url || "").toString().trim(),
        note: (item.note || "").toString().trim(),
      };
    })
    .filter((it) => it.url !== "" || it.note !== "");

  user.wishlist = wl;
  writeJson(DATA_FILE, data);
  res.json({ ok: true, wishlist: user.wishlist });
});

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// zamiast bezpośredniego app.listen przechowujemy server, żeby móc je zamknąć
const server = app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

// obsługa zamknięcia (Render wysyła SIGTERM)
function shutdown() {
  console.log("Shutdown signal received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  // wymuś zamknięcie po 10s
  setTimeout(() => {
    console.error("Forcing shutdown");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
