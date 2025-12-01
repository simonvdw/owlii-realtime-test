// public/main.js

import { RealtimeAgent, RealtimeSession } from "https://cdn.jsdelivr.net/npm/@openai/agents-realtime@latest/+esm";
import { getOwlyInstructions } from "./owly-instructions.js";

const button = document.getElementById("talkButton");          // Start gesprek
const stopButton = document.getElementById("stopButton");      // Stop gesprek
const pressToTalkButton = document.getElementById("pressToTalkButton"); // Talk ingedrukt houden
const nameInput = document.getElementById("nameInput");        // Voornaam input

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

let session = null;
let hasStarted = false;
let userName = "";
let userBirthYear = "";
let tailTimeoutId = null;

function log(message) {
  console.log(message);
  logEl.textContent += message + "\n";
}

/**
 * OWLY instructies, gecombineerd met extra veiligheidsregels.
 * @param {string} name - De voornaam van het kind
 * @param {string} birthYear - Het geboortejaar van het kind
 */
function createOwlyAgent(name, birthYear) {
  return new RealtimeAgent({
    name: "OWLY",
    instructions: getOwlyInstructions(name, birthYear),
  });
}

/**
 * Start de Realtime sessie.
 * In de browser gebruikt RealtimeSession automatisch WebRTC en regelt dus microfoon en audio.
 */
async function startConversation() {
  if (hasStarted) {
    return;
  }

  // Get user data from sessionStorage (set by the form)
  userName = sessionStorage.getItem('userName') || '';
  userBirthYear = sessionStorage.getItem('userBirthYear') || '';

  if (!userName || !userBirthYear) {
    statusEl.textContent = "Vul eerst je gegevens in!";
    return;
  }

  hasStarted = true;

  button.disabled = true;
  stopButton.disabled = true;
  pressToTalkButton.disabled = true;

  statusEl.textContent = "Token ophalen en verbinden...";
  log(`${userName} start gesprek met OWLY...`);
  log("Requesting ephemeral token from /api/token");

  try {
    const tokenResp = await fetch("/api/token");
    if (!tokenResp.ok) {
      throw new Error(`Backend returned ${tokenResp.status}`);
    }
    const { apiKey } = await tokenResp.json();

    if (!apiKey || !apiKey.startsWith("ek_")) {
      throw new Error("Invalid ephemeral key returned from backend");
    }

    log("Got ephemeral key. Creating OWLY agent and session.");

    const agent = createOwlyAgent(userName, userBirthYear);

    session = new RealtimeSession(agent, {
      model: "gpt-realtime",
    });

    // Basis error logging
    session.on("error", (err) => {
      console.error("Session error:", err);
      statusEl.textContent = "Er is een fout in de sessie. Zie console.";
    });

    statusEl.textContent = "Verbinding maken met Realtime API...";
    log("Connecting RealtimeSession over WebRTC");

    await session.connect({ apiKey });

    // Mic standaard uit: push to talk
    session.mute(true);

    statusEl.textContent =
      "Verbonden met OWLY. Gebruik de TALK knop om te praten.";
    button.textContent = "Verbonden";
    button.disabled = true;
    stopButton.disabled = false;
    pressToTalkButton.disabled = false;

    log("Connected. Push to talk is actief.");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Kon niet verbinden. Zie console voor details.";
    hasStarted = false;
    button.disabled = false;
    stopButton.disabled = true;
    pressToTalkButton.disabled = true;
    nameInput.disabled = false;
  }
}

/**
 * Stopknop:
 * - onderbreekt de huidige audio
 * - sluit de sessie
 * - zet de UI terug in starttoestand
 */
function stopConversation() {
  if (!session) {
    return;
  }

  log("Stop button pressed. Interrupting and closing session.");

  if (tailTimeoutId) {
    clearTimeout(tailTimeoutId);
    tailTimeoutId = null;
  }

  try {
    // Stop huidige output en eventueel lopende respons
    session.interrupt();
    // Verbreek de verbinding en ruim middelen op
    session.close();
  } catch (err) {
    console.error("Error while closing session:", err);
  }

  session = null;
  hasStarted = false;

  statusEl.textContent = "Gesprek gestopt. Je kan opnieuw starten.";
  button.disabled = false;
  button.textContent = "Start gesprek";
  stopButton.disabled = true;
  pressToTalkButton.disabled = true;
  pressToTalkButton.classList.remove("active");
  pressToTalkButton.classList.remove("tail");
}

/**
 * Push to talk:
 * - mic blijft standaard gemute
 * - bij indrukken TALK: session.mute(false)
 * - bij loslaten: session.mute(true)
 *
 * We hangen de listeners eenmalig aan en checken binnenin of er een sessie is.
 */

const startTalking = (event) => {
  event?.preventDefault?.();
  if (!session) return;
  if (tailTimeoutId) {
    clearTimeout(tailTimeoutId);
    tailTimeoutId = null;
  }
  try {
    session.mute(false);
    pressToTalkButton.classList.add("active");
    pressToTalkButton.classList.remove("tail");
    log("Mic open (push to talk ingedrukt).");
  } catch (err) {
    console.error("Error unmuting session:", err);
  }
};

const stopTalking = () => {
  if (!session) return;
  if (tailTimeoutId) {
    clearTimeout(tailTimeoutId);
  }

  pressToTalkButton.classList.add("tail");

  tailTimeoutId = setTimeout(() => {
    tailTimeoutId = null;
    if (!session) return;
    try {
      session.mute(true);
      pressToTalkButton.classList.remove("active");
      pressToTalkButton.classList.remove("tail");
      log("Mic weer dicht.");
    } catch (err) {
      console.error("Error muting session:", err);
    }
  }, 1000);
};

// Mouse en touch voor de TALK knop
pressToTalkButton.addEventListener("mousedown", startTalking);
pressToTalkButton.addEventListener("touchstart", startTalking);

// Loslaten, ook als je van de knop schuift
window.addEventListener("mouseup", stopTalking);
window.addEventListener("touchend", stopTalking);

// Spacebar support voor de TALK knop
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat) {
    startTalking(event);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    stopTalking();
  }
});

// Start en stop knoppen
button.addEventListener("click", () => {
  startConversation();
});

stopButton.addEventListener("click", () => {
  stopConversation();
});
