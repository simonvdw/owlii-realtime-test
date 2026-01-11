// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const { renderTemplate } = require("./utils/template");
const { initDb, query } = require("./db");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "owly-secret";

app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: "owly.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    }
  })
);

// Helper to load content file
function loadContent(filename) {
  return fs.readFileSync(path.join(__dirname, "templates", filename), "utf-8");
}

// Routes for different pages (BEFORE static middleware)
app.get("/", (req, res) => {
  const html = renderTemplate("app-base", {
    title: "Hey Owly - Leer en Speel met OWLY",
    containerClass: "hero",
    content: loadContent("home-content.html"),
    scripts: loadContent("home-scripts.html"),
    headExtra: ""
  });
  res.send(html);
});

app.get("/original", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "original.html"));
});

app.get("/extras", (req, res) => {
  const html = renderTemplate("app-base", {
    title: "Extra's - Hey Owly",
    containerClass: "content",
    content: loadContent("extras-content.html"),
    scripts: loadContent("extras-scripts.html"),
    headExtra: ""
  });
  res.send(html);
});

app.get("/over-ons", (req, res) => {
  const html = renderTemplate("app-base", {
    title: "Over Ons - Hey Owly",
    containerClass: "content",
    content: loadContent("over-ons-content.html"),
    scripts: "",
    headExtra: ""
  });
  res.send(html);
});

// Admin routes
app.get("/admin", (req, res) => {
  const html = renderTemplate("admin-base", {
    title: "Admin - Hey Owly",
    currentRoute: "home",
    content: loadContent("admin-home.html")
  });
  res.send(html);
});

app.get("/admin/studio", (req, res) => {
  const html = renderTemplate("admin-base", {
    title: "Studio - Admin - Hey Owly",
    currentRoute: "studio",
    content: loadContent("admin-studio.html")
  });
  res.send(html);
});

app.get("/admin/logs", (req, res) => {
  const html = renderTemplate("admin-base", {
    title: "Logs - Admin - Hey Owly",
    currentRoute: "logs",
    content: loadContent("admin-logs.html")
  });
  res.send(html);
});

// Simple health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/admin", adminRouter);

// Serve static files (CSS, JS, images, etc.) from /public
app.use(express.static(path.join(__dirname, "public")));

/**
 * Endpoint for the browser to request a short lived Realtime client secret.
 * Pattern is from the OpenAI docs: POST /v1/realtime/client_secrets. :contentReference[oaicite:1]{index=1}
 */
app.get("/api/token", async (req, res) => {
  try {
    const resp = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime"
        }
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI client_secrets error:", resp.status, text);
      return res.status(500).json({ error: "Failed to create client secret" });
    }

    const data = await resp.json();

    // The docs say the ephemeral key string is in data.value and starts with ek_ :contentReference[oaicite:2]{index=2}
    res.json({ apiKey: data.value });
  } catch (err) {
    console.error("Token route error:", err);
    res.status(500).json({ error: "Server error creating token" });
  }
});

app.post("/api/logs", async (req, res) => {
  const { firstName, age, summary } = req.body || {};
  if (!firstName || !summary) {
    return res.status(400).json({ error: "voornaam en samenvatting zijn verplicht" });
  }

  const summaryText = Array.isArray(summary) ? summary.join("\n") : String(summary);
  if (summaryText.length > 5000) {
    return res.status(400).json({ error: "Samenvatting is te lang" });
  }

  try {
    const result = await query(
      `INSERT INTO owly_logs (first_name, age, summary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [firstName.trim(), age ? Number(age) : null, summaryText.trim()]
    );
    res.status(201).json({ log: result.rows[0] });
  } catch (err) {
    console.error("Failed to store log:", err.message);
    res.status(500).json({ error: "Kon log niet opslaan" });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🦉 Owlii test server running on http://localhost:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error("⚠️  Database initialization failed:", err.message);
    console.log("Starting server anyway (database features will be disabled)...\n");
    app.listen(PORT, () => {
      console.log(`🦉 Owlii test server running on http://localhost:${PORT} (without database)\n`);
    });
  });
