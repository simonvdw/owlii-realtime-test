// public/main.js

import { RealtimeAgent, RealtimeSession } from "https://cdn.jsdelivr.net/npm/@openai/agents-realtime@latest/+esm";
import { getOwlyInstructions } from "./owly-instructions.js";

const button = document.getElementById("talkButton");          // Start gesprek
const stopButton = document.getElementById("stopButton");      // Stop gesprek
const pressToTalkButton = document.getElementById("pressToTalkButton"); // Talk ingedrukt houden
const pushToTalkContainer = document.getElementById("pushToTalkContainer"); // Container voor push-to-talk
const nameInput = document.getElementById("nameInput");        // Voornaam input

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const toggleLogsLink = document.getElementById("toggleLogs");

let session = null;
let hasStarted = false;
let userName = "";
let userAge = "";
let conversationType = "standaard";
let conversationTopic = "";
let tailTimeoutId = null;

function log(message) {
  console.log(message);
  logEl.textContent += message + "\n";

  // Show toggle link when there are logs
  if (toggleLogsLink && toggleLogsLink.style.display === 'none') {
    toggleLogsLink.style.display = 'inline-block';
  }
}

/**
 * OWLY instructies, gecombineerd met extra veiligheidsregels.
 * @param {string} name - De voornaam van het kind
 * @param {number} age - De leeftijd van het kind
 * @param {string} type - Het gesprekstype (standaard, verhaaltjes, raadsels, mopjes, praatover)
 * @param {string} topic - Het onderwerp voor "praat over" type (optioneel)
 */
function createOwlyAgent(name, age, type, topic = "") {
  return new RealtimeAgent({
    name: "OWLY",
    instructions: getOwlyInstructions(name, age, type, topic),
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
  userAge = sessionStorage.getItem('userAge') || '';
  conversationType = sessionStorage.getItem('conversationType') || 'standaard';
  conversationTopic = sessionStorage.getItem('conversationTopic') || '';

  if (!userName || !userAge) {
    statusEl.textContent = "Vul eerst je gegevens in!";
    return;
  }

  // Validate topic for "praatover" type
  if (conversationType === 'praatover' && !conversationTopic.trim()) {
    statusEl.textContent = "Vul eerst een onderwerp in!";
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

    const agent = createOwlyAgent(userName, userAge, conversationType, conversationTopic);

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
    button.style.display = "none";
    stopButton.style.display = "inline-block";
    stopButton.disabled = false;
    pushToTalkContainer.style.display = "block";
    pressToTalkButton.disabled = false;

    log("Connected. Push to talk is actief.");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Kon niet verbinden. Zie console voor details.";
    hasStarted = false;
    button.style.display = "inline-block";
    button.disabled = false;
    stopButton.style.display = "none";
    stopButton.disabled = true;
    pushToTalkContainer.style.display = "none";
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
  button.style.display = "inline-block";
  button.disabled = false;
  button.textContent = "Start gesprek";
  stopButton.style.display = "none";
  stopButton.disabled = true;
  pushToTalkContainer.style.display = "none";
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
    event.preventDefault(); // Prevent page scrolling
    startTalking(event);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    event.preventDefault(); // Prevent page scrolling
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

// Conversation Type Carousel Logic
const conversationTypes = ['standaard', 'verhaaltjes', 'raadsels', 'mopjes', 'praatover'];
let currentTypeIndex = 0;

// Initialize carousel from sessionStorage
const savedType = sessionStorage.getItem('conversationType');
if (savedType) {
  const savedIndex = conversationTypes.indexOf(savedType);
  if (savedIndex !== -1) {
    currentTypeIndex = savedIndex;
  }
}

function updateCarousel() {
  const allTypes = document.querySelectorAll('.conversation-type');
  allTypes.forEach((typeEl, index) => {
    if (index === currentTypeIndex) {
      typeEl.classList.add('active');
    } else {
      typeEl.classList.remove('active');
    }
  });

  // Save to sessionStorage
  conversationType = conversationTypes[currentTypeIndex];
  sessionStorage.setItem('conversationType', conversationType);

  // Save topic if praatover type is active
  if (conversationType === 'praatover') {
    const topicInput = document.getElementById('topicInput');
    if (topicInput) {
      conversationTopic = topicInput.value.trim();
      sessionStorage.setItem('conversationTopic', conversationTopic);
    }
  }
}

// Initialize carousel display
updateCarousel();

// Carousel navigation
const carouselLeft = document.getElementById('carouselLeft');
const carouselRight = document.getElementById('carouselRight');

if (carouselLeft) {
  carouselLeft.addEventListener('click', () => {
    currentTypeIndex = (currentTypeIndex - 1 + conversationTypes.length) % conversationTypes.length;
    updateCarousel();
  });
}

if (carouselRight) {
  carouselRight.addEventListener('click', () => {
    currentTypeIndex = (currentTypeIndex + 1) % conversationTypes.length;
    updateCarousel();
  });
}

// Topic input event listener
const topicInput = document.getElementById('topicInput');
if (topicInput) {
  // Load saved topic
  const savedTopic = sessionStorage.getItem('conversationTopic');
  if (savedTopic) {
    topicInput.value = savedTopic;
  }

  // Save topic on input
  topicInput.addEventListener('input', () => {
    conversationTopic = topicInput.value.trim();
    sessionStorage.setItem('conversationTopic', conversationTopic);
  });

  // Prevent carousel navigation when clicking in input
  topicInput.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}
