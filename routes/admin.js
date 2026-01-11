const express = require("express");
const path = require("path");
const fs = require("fs");
const { query } = require("../db");
const { generateStudioText, synthesizeStudioAudio } = require("../services/openai");

const AUDIO_DIR = path.join(__dirname, "..", "public", "studio-audio");
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

const router = express.Router();

function isAuthenticated(req) {
  return Boolean(req.session && req.session.isAdmin);
}

function ensureAdmin(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Niet gemachtigd" });
  }
  next();
}

router.get("/session", (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === "admin" && password === "computer") {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Ongeldige login" });
});

router.post("/logout", ensureAdmin, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.use(ensureAdmin);

router.get("/categories", async (req, res) => {
  const { rows } = await query("SELECT * FROM studio_categories ORDER BY name ASC");
  const categories = rows
    .filter((row) => !row.parent_id)
    .map((cat) => ({
      ...cat,
      subcategories: rows.filter((row) => row.parent_id === cat.id)
    }));
  res.json({ categories });
});

router.post("/categories", async (req, res) => {
  const name = (req.body?.name || "").trim();
  if (!name) {
    return res.status(400).json({ error: "Naam is verplicht" });
  }
  const result = await query(
    "INSERT INTO studio_categories (name) VALUES ($1) RETURNING *",
    [name]
  );
  res.status(201).json({ category: result.rows[0] });
});

router.post("/categories/:parentId/subcategories", async (req, res) => {
  const name = (req.body?.name || "").trim();
  const parentId = Number(req.params.parentId);
  if (!name || Number.isNaN(parentId)) {
    return res.status(400).json({ error: "Naam en parentId zijn verplicht" });
  }
  const parent = await query("SELECT id FROM studio_categories WHERE id = $1", [parentId]);
  if (!parent.rowCount) {
    return res.status(404).json({ error: "Categorie niet gevonden" });
  }
  const result = await query(
    "INSERT INTO studio_categories (name, parent_id) VALUES ($1, $2) RETURNING *",
    [name, parentId]
  );
  res.status(201).json({ subcategory: result.rows[0] });
});

router.post("/studio/draft", async (req, res) => {
  const prompt = (req.body?.prompt || "").trim();
  const entryType = (req.body?.entryType || "verhaal").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is verplicht" });
  }
  try {
    const text = await generateStudioText({ prompt, entryType });
    res.json({ text });
  } catch (err) {
    console.error("Studio draft error", err);
    res.status(500).json({ error: err.message || "Kon tekst niet genereren" });
  }
});

router.post("/studio/audio", async (req, res) => {
  const {
    title = "",
    prompt = "",
    contentText = "",
    entryType = "",
    categoryId,
    subcategoryId,
    voice = "alloy"
  } = req.body || {};

  const parsedCategoryId = categoryId ? Number(categoryId) : null;
  const parsedSubcategoryId = subcategoryId ? Number(subcategoryId) : null;

  if ((categoryId && Number.isNaN(parsedCategoryId)) || (subcategoryId && Number.isNaN(parsedSubcategoryId))) {
    return res.status(400).json({ error: "Categorie-id's zijn ongeldig" });
  }

  if (!contentText.trim()) {
    return res.status(400).json({ error: "Tekst is verplicht" });
  }

  try {
    const audioBuffer = await synthesizeStudioAudio({ text: contentText, voice, format: "wav" });
    const filename = `owly-studio-${Date.now()}.wav`;
    const filePath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(filePath, audioBuffer);
    const publicPath = `/studio-audio/${filename}`;

    const result = await query(
      `INSERT INTO studio_entries (title, prompt, content_text, entry_type, category_id, subcategory_id, audio_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title.trim() || null,
        prompt.trim() || null,
        contentText.trim(),
        entryType.trim() || null,
        parsedCategoryId,
        parsedSubcategoryId,
        publicPath
      ]
    );

    res.status(201).json({ entry: result.rows[0] });
  } catch (err) {
    console.error("Studio audio error", err);
    res.status(500).json({ error: err.message || "Kon audio niet genereren" });
  }
});

router.get("/studio/entries", async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT e.*,
             c.name as category_name,
             sc.name as subcategory_name
      FROM studio_entries e
      LEFT JOIN studio_categories c ON e.category_id = c.id
      LEFT JOIN studio_categories sc ON e.subcategory_id = sc.id
      ORDER BY e.created_at DESC
      LIMIT 50
    `);
    res.json({ entries: rows });
  } catch (err) {
    console.error("Failed to load studio entries:", err);
    res.status(500).json({ error: "Kon entries niet laden" });
  }
});

router.delete("/studio/entries/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Ongeldig ID" });
  }
  try {
    // Get the audio path first to delete the file
    const { rows } = await query("SELECT audio_path FROM studio_entries WHERE id = $1", [id]);
    if (!rows.length) {
      return res.status(404).json({ error: "Entry niet gevonden" });
    }

    // Delete the audio file if it exists
    const audioPath = rows[0].audio_path;
    if (audioPath) {
      const filePath = path.join(__dirname, "..", "public", audioPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete from database
    await query("DELETE FROM studio_entries WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete studio entry:", err);
    res.status(500).json({ error: "Kon entry niet verwijderen" });
  }
});

router.get("/logs", async (req, res) => {
  const {
    firstName,
    age,
    summary,
    dateFrom,
    dateTo,
    limit = 50
  } = req.query;

  const conditions = [];
  const values = [];

  if (firstName) {
    values.push(`%${firstName.toLowerCase()}%`);
    conditions.push(`LOWER(first_name) LIKE $${values.length}`);
  }

  if (age) {
    values.push(Number(age));
    conditions.push(`age = $${values.length}`);
  }

  if (summary) {
    values.push(`%${summary.toLowerCase()}%`);
    conditions.push(`LOWER(summary) LIKE $${values.length}`);
  }

  if (dateFrom) {
    values.push(dateFrom);
    conditions.push(`created_at >= $${values.length}`);
  }

  if (dateTo) {
    values.push(dateTo);
    conditions.push(`created_at <= $${values.length}`);
  }

  values.push(Number(limit) > 0 ? Number(limit) : 50);

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await query(
    `SELECT * FROM owly_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values
  );

  res.json({ logs: rows });
});

module.exports = router;
