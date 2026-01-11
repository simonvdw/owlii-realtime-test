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
let conversationStartTime = null;
let micMode = "push-to-talk"; // "push-to-talk" or "open-mic"

function log(message) {
  console.log(message);
  logEl.textContent += message + "\n";

  // Show toggle link when there are logs
  if (toggleLogsLink && toggleLogsLink.style.display === 'none') {
    toggleLogsLink.style.display = 'inline-block';
  }
}

/**
 * Update status text based on mic mode
 */
function updateStatusForMicMode() {
  if (micMode === "push-to-talk") {
    statusEl.textContent = "Verbonden met OWLY. Gebruik de TALK knop om te praten.";
  } else {
    statusEl.textContent = "Verbonden met OWLY. Microfoon staat open.";
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

    // Set mic mode based on current setting
    if (micMode === "push-to-talk") {
      session.mute(true);
    } else {
      session.mute(false);
    }
    conversationStartTime = Date.now();

    updateStatusForMicMode();
    button.style.display = "none";
    stopButton.style.display = "inline-block";
    stopButton.disabled = false;
    pushToTalkContainer.style.display = "block";
    pressToTalkButton.disabled = false;

    // Show advanced settings link
    const toggleAdvancedLink = document.getElementById('toggleAdvanced');
    if (toggleAdvancedLink) {
      toggleAdvancedLink.style.display = 'inline-block';
    }

    // Disable conversation type controls during active call
    setConversationControlsEnabled(false);

    log(`Connected. ${micMode === "push-to-talk" ? "Push to talk" : "Open mic"} is actief.`);
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
    conversationStartTime = null;

    // Re-enable conversation type controls on error
    setConversationControlsEnabled(true);
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

  const historySnapshot = snapshotHistory(session.history || []);
  const durationMs = conversationStartTime ? Date.now() - conversationStartTime : 0;
  const hasHistoryForLog = hasConversationMessages(historySnapshot);
  conversationStartTime = null;

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

  statusEl.textContent = hasHistoryForLog
    ? "Gesprek gestopt. Samenvatting wordt opgeslagen..."
    : "Gesprek gestopt. Je kan opnieuw starten.";
  button.style.display = "inline-block";
  button.disabled = false;
  button.textContent = "Start gesprek";
  stopButton.style.display = "none";
  stopButton.disabled = true;
  pushToTalkContainer.style.display = "none";
  pressToTalkButton.disabled = true;
  pressToTalkButton.classList.remove("active");
  pressToTalkButton.classList.remove("tail");

  // Hide advanced settings link and panel
  const toggleAdvancedLink = document.getElementById('toggleAdvanced');
  const advancedPanel = document.getElementById('advancedPanel');
  if (toggleAdvancedLink) {
    toggleAdvancedLink.style.display = 'none';
    toggleAdvancedLink.textContent = 'Geavanceerd';
  }
  if (advancedPanel) {
    advancedPanel.style.display = 'none';
  }

  // Re-enable conversation type controls after call ends
  setConversationControlsEnabled(true);

  if (hasHistoryForLog) {
    saveConversationLog(historySnapshot, durationMs);
  }
}

function snapshotHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }
  try {
    return typeof structuredClone === "function"
      ? structuredClone(rawHistory)
      : JSON.parse(JSON.stringify(rawHistory));
  } catch (err) {
    console.warn("Kon gesprekshistorie niet volledig kopieren", err);
    try {
      return JSON.parse(JSON.stringify(rawHistory));
    } catch (_) {
      return [];
    }
  }
}

function hasConversationMessages(history = []) {
  return history.some((item) => item?.type === "message" && (item.role === "user" || item.role === "assistant"));
}

function extractMessageText(item) {
  if (!item || item.type !== "message") {
    return "";
  }
  const fragments = (item.content || []).map((part) => {
    if (!part) return "";
    if (part.type === "input_text" || part.type === "output_text") {
      return part.text || "";
    }
    if ((part.type === "output_audio" || part.type === "input_audio") && part.transcript) {
      return part.transcript;
    }
    return "";
  });
  return fragments.join(" ").replace(/\s+/g, " ").trim();
}

function truncateText(text, maxLength = 180) {
  if (!text) {
    return "";
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

// Bouw beknopte bullets voor Owly logs op basis van de dialoog.
function buildConversationSummary(history, durationMs, childName) {
  const messages = history.filter((item) => item?.type === "message" && (item.role === "user" || item.role === "assistant"));
  if (!messages.length) {
    return [];
  }

  const pairs = [];
  let pendingUser = null;

  messages.forEach((msg) => {
    const text = extractMessageText(msg);
    if (!text) {
      return;
    }
    if (msg.role === "user") {
      if (pendingUser) {
        pairs.push({ user: pendingUser, assistant: null });
      }
      pendingUser = text;
    } else {
      if (pendingUser) {
        pairs.push({ user: pendingUser, assistant: text });
        pendingUser = null;
      } else {
        pairs.push({ user: null, assistant: text });
      }
    }
  });

  if (pendingUser) {
    pairs.push({ user: pendingUser, assistant: null });
  }

  if (!pairs.length) {
    return [];
  }

  const blocks = Math.max(1, Math.ceil(Math.max(durationMs, 1) / (10 * 60 * 1000)));
  const limit = Math.min(pairs.length, blocks * 10, 30);
  const label = childName || "Het kind";

  return pairs
    .slice(-limit)
    .map((pair) => {
      const userPart = pair.user ? truncateText(pair.user) : "";
      const assistantPart = pair.assistant ? truncateText(pair.assistant) : "";
      if (userPart && assistantPart) {
        return `- ${label} vroeg: ${userPart}. OWLY antwoordde: ${assistantPart}`;
      }
      if (userPart) {
        return `- ${label} zei: ${userPart}`;
      }
      if (assistantPart) {
        return `- OWLY vertelde: ${assistantPart}`;
      }
      return "";
    })
    .filter(Boolean);
}

function setStatusWhenIdle(message) {
  if (!hasStarted) {
    statusEl.textContent = message;
  }
}

// Verstuur de gespreksamenvatting automatisch naar de backend logs.
async function saveConversationLog(historySnapshot, durationMs) {
  if (!userName) {
    log("Kan Owly log niet opslaan: voornaam ontbreekt.");
    setStatusWhenIdle("Gesprek gestopt. Je kan opnieuw starten.");
    return;
  }

  const summaryLines = buildConversationSummary(historySnapshot, durationMs, userName);
  if (!summaryLines.length) {
    log("Geen gespreksdata om te loggen.");
    setStatusWhenIdle("Gesprek gestopt. Je kan opnieuw starten.");
    return;
  }

  const parsedAge = Number(userAge);
  const payload = {
    firstName: userName,
    age: Number.isFinite(parsedAge) ? parsedAge : null,
    summary: summaryLines
  };

  log("Samenvatting klaar. Versturen naar /api/logs...");
  setStatusWhenIdle("Gesprek gestopt. Samenvatting wordt opgeslagen...");

  try {
    const resp = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(errorText || `Serverfout ${resp.status}`);
    }
    log("Owly log opgeslagen.");
    setStatusWhenIdle("Gesprek gestopt. Samenvatting opgeslagen.");
  } catch (err) {
    console.error("Kon Owly log niet opslaan", err);
    log(`Kon Owly log niet opslaan: ${err.message}`);
    setStatusWhenIdle("Gesprek gestopt. Opslaan mislukt.");
  }
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

  // Only respond to button press in push-to-talk mode
  if (micMode !== "push-to-talk") return;

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

  // Only respond to button release in push-to-talk mode
  if (micMode !== "push-to-talk") return;

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

// Function to disable/enable conversation type controls
function setConversationControlsEnabled(enabled) {
  const carousel = document.getElementById('conversationTypeCarousel');
  const carouselLeft = document.getElementById('carouselLeft');
  const carouselRight = document.getElementById('carouselRight');
  const topicInput = document.getElementById('topicInput');
  const clearTopicButton = document.getElementById('clearTopicButton');
  const removeBadgeButton = document.getElementById('removeBadgeButton');

  if (enabled) {
    // Enable carousel
    if (carousel) carousel.classList.remove('disabled');
    if (carouselLeft) carouselLeft.disabled = false;
    if (carouselRight) carouselRight.disabled = false;

    // Enable topic controls
    if (topicInput) topicInput.disabled = false;
    if (clearTopicButton) clearTopicButton.disabled = false;
    if (removeBadgeButton) removeBadgeButton.disabled = false;
  } else {
    // Disable carousel
    if (carousel) carousel.classList.add('disabled');
    if (carouselLeft) carouselLeft.disabled = true;
    if (carouselRight) carouselRight.disabled = true;

    // Disable topic controls
    if (topicInput) topicInput.disabled = true;
    if (clearTopicButton) clearTopicButton.disabled = true;
    if (removeBadgeButton) removeBadgeButton.disabled = true;
  }
}

// Initialize carousel from sessionStorage
const savedType = sessionStorage.getItem('conversationType');
if (savedType) {
  const savedIndex = conversationTypes.indexOf(savedType);
  if (savedIndex !== -1) {
    currentTypeIndex = savedIndex;
  }
}

// Topic input initialization
let topicInputInitialized = false;

function initializeTopicInput() {
  // Prevent multiple initializations
  if (topicInputInitialized) {
    return;
  }

  const topicInput = document.getElementById('topicInput');
  const clearTopicButton = document.getElementById('clearTopicButton');
  const topicInputContainer = document.querySelector('.topic-input-container');
  const topicBadgeContainer = document.querySelector('.topic-badge-container');
  const topicBadgeText = document.getElementById('topicBadgeText');
  const removeBadgeButton = document.getElementById('removeBadgeButton');

  if (!topicInput) {
    return;
  }

  topicInputInitialized = true;

  // Function to show badge mode
  function showBadgeMode(topic) {
    if (topicInputContainer && topicBadgeContainer && topicBadgeText) {
      topicInputContainer.style.display = 'none';
      topicBadgeContainer.style.display = 'block';
      topicBadgeText.textContent = topic;
    }
  }

  // Function to show input mode
  function showInputMode() {
    if (topicInputContainer && topicBadgeContainer) {
      topicInputContainer.style.display = 'flex';
      topicBadgeContainer.style.display = 'none';
      topicInput.focus();
    }
  }

  // Function to toggle clear button visibility
  function toggleClearButton() {
    if (clearTopicButton) {
      if (topicInput.value.trim().length > 0) {
        clearTopicButton.style.display = 'flex';
      } else {
        clearTopicButton.style.display = 'none';
      }
    }
  }

  // Load saved topic and show as badge if exists
  const savedTopic = sessionStorage.getItem('conversationTopic');
  if (savedTopic) {
    topicInput.value = savedTopic;
    conversationTopic = savedTopic;
    showBadgeMode(savedTopic);
  }

  // Save topic on input and toggle clear button
  topicInput.addEventListener('input', () => {
    conversationTopic = topicInput.value.trim();
    sessionStorage.setItem('conversationTopic', conversationTopic);
    console.log('Topic saved to sessionStorage:', conversationTopic);
    toggleClearButton();
  });

  // Enter key to confirm and show badge
  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const topic = topicInput.value.trim();
      if (topic) {
        conversationTopic = topic;
        sessionStorage.setItem('conversationTopic', topic);
        showBadgeMode(topic);
      }
    }
    // Allow spaces in input by preventing event propagation
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation();
    }
  });

  // Prevent carousel navigation when clicking in input
  topicInput.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Clear topic button event listener
  if (clearTopicButton) {
    clearTopicButton.addEventListener('click', (e) => {
      e.stopPropagation();
      topicInput.value = '';
      conversationTopic = '';
      sessionStorage.removeItem('conversationTopic');
      clearTopicButton.style.display = 'none';
      topicInput.focus();
    });
  }

  // Remove badge button event listener
  if (removeBadgeButton) {
    removeBadgeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      topicInput.value = '';
      conversationTopic = '';
      sessionStorage.removeItem('conversationTopic');
      showInputMode();
    });
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

  // Initialize topic input when praatover type becomes active
  if (conversationType === 'praatover') {
    initializeTopicInput();
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

// Initialize topic input if praatover is already selected
if (conversationTypes[currentTypeIndex] === 'praatover') {
  // Use setTimeout to ensure DOM is ready
  setTimeout(initializeTopicInput, 0);
}

// Advanced settings panel
const toggleAdvancedLink = document.getElementById('toggleAdvanced');
const advancedPanel = document.getElementById('advancedPanel');
const closeAdvancedButton = document.getElementById('closeAdvanced');
const modePushToTalkBtn = document.getElementById('modePushToTalk');
const modeOpenMicBtn = document.getElementById('modeOpenMic');
const modeDescription = document.getElementById('modeDescription');

if (toggleAdvancedLink && advancedPanel) {
  toggleAdvancedLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (advancedPanel.style.display === 'none') {
      advancedPanel.style.display = 'block';
      toggleAdvancedLink.textContent = 'Verberg geavanceerd';
    } else {
      advancedPanel.style.display = 'none';
      toggleAdvancedLink.textContent = 'Geavanceerd';
    }
  });
}

if (closeAdvancedButton && advancedPanel) {
  closeAdvancedButton.addEventListener('click', () => {
    advancedPanel.style.display = 'none';
    if (toggleAdvancedLink) {
      toggleAdvancedLink.textContent = 'Geavanceerd';
    }
  });
}

// Mode toggle buttons
if (modePushToTalkBtn && modeOpenMicBtn) {
  modePushToTalkBtn.addEventListener('click', () => {
    if (micMode === 'push-to-talk') return; // Already in this mode

    micMode = 'push-to-talk';
    modePushToTalkBtn.classList.add('active');
    modeOpenMicBtn.classList.remove('active');

    if (modeDescription) {
      modeDescription.textContent = 'Houd de knop ingedrukt om te praten';
    }

    // If session is active, mute the mic
    if (session) {
      try {
        session.mute(true);
        pressToTalkButton.classList.remove("active");
        pressToTalkButton.classList.remove("tail");
        updateStatusForMicMode();
        log("Overgeschakeld naar push-to-talk modus.");
      } catch (err) {
        console.error("Error switching to push-to-talk:", err);
      }
    }
  });

  modeOpenMicBtn.addEventListener('click', () => {
    if (micMode === 'open-mic') return; // Already in this mode

    micMode = 'open-mic';
    modeOpenMicBtn.classList.add('active');
    modePushToTalkBtn.classList.remove('active');

    if (modeDescription) {
      modeDescription.textContent = 'Microfoon staat altijd open';
    }

    // If session is active, unmute the mic
    if (session) {
      try {
        session.mute(false);
        pressToTalkButton.classList.add("active");
        updateStatusForMicMode();
        log("Overgeschakeld naar open mic modus.");
      } catch (err) {
        console.error("Error switching to open mic:", err);
      }
    }
  });
}
