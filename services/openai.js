const path = require("path");
const fs = require("fs");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY is not set. Admin Studio features will not work without it.");
}

async function generateStudioText({ prompt, entryType = "verhaal" }) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ontbreekt");
  }

  const systemPrompt = `Je bent OWLY Studio, een creatieve Vlaamse onderwijsauteur. Je schrijft korte, kinder- vriendelijke teksten (100-180 woorden) in het Nederlands voor 8-jarigen. Hou rekening met het gevraagde type: ${entryType}. Gebruik duidelijke alinea's en eventueel bullet points als dat nuttig is.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.STUDIO_TEXT_MODEL || "gpt-4o-mini",
      temperature: 0.85,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI text generation failed: ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Lege respons van OpenAI tekstmodel");
  }

  return text;
}

async function synthesizeStudioAudio({ text, voice = "alloy", format = "wav" }) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ontbreekt");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.STUDIO_TTS_MODEL || "gpt-4o-mini-tts",
      voice,
      format,
      input: text
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI audio synthesis failed: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

module.exports = {
  generateStudioText,
  synthesizeStudioAudio,
  ensureDirExists
};
