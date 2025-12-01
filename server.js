// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Routes for different pages (BEFORE static middleware)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/original", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "original.html"));
});

app.get("/extras", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "extras.html"));
});

app.get("/over-ons", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "over-ons.html"));
});

// Simple health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

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

app.listen(PORT, () => {
  console.log(`Owlii test server running on http://localhost:${PORT}`);
});
