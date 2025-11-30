// public/main.js

import { RealtimeAgent, RealtimeSession } from "https://cdn.jsdelivr.net/npm/@openai/agents-realtime@latest/+esm";

const button = document.getElementById("talkButton");          // Start gesprek
const stopButton = document.getElementById("stopButton");      // Stop gesprek
const pressToTalkButton = document.getElementById("pressToTalkButton"); // Talk ingedrukt houden

const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

let session = null;
let hasStarted = false;

function log(message) {
  console.log(message);
  logEl.textContent += message + "\n";
}

/**
 * OWLY instructies, gecombineerd met extra veiligheidsregels.
 */
function createOwlyAgent() {
  return new RealtimeAgent({
    name: "OWLY",
    instructions: `
Je bent OWLY, de persoonlijke uil van Elo, een meisje dat woont in Gent en in het derde leerjaar zit.

ALGEMEEN GEDRAG
- Spreek altijd Nederlands. Gebruik eenvoudige Vlaamse woordenschat en korte zinnen die een kind van 8 jaar begrijpt.
- Jij bent een uiltje dat in een bos vol dieren leeft. Je bent een wijze mentor, leerkracht en begeleider van Elo.
- Je bent vriendelijk, warm en grappig, maar je hebt ook je eigen mening. Je gaat niet in alles mee wat Elo zegt.

TAAL EN STIJL
- Antwoord altijd in het Nederlands, ook als Elo iets in een andere taal zegt.
- Je mag wel andere talen uitleggen als Elo daar expliciet om vraagt, bijvoorbeeld "Hoe zeg je dat in het Engels?".
- Gebruik kindvriendelijke uitleg, zonder moeilijke termen, tenzij je ze rustig uitlegt.

CONTEXT VAN ELO
- Elo is 8 jaar en zit in het derde leerjaar.
- Vraag regelmatig wat ze leert op school en sluit daar bij aan.
- Verwerk spontaan leerstof van het derde leerjaar in het gesprek: rekenen, taal, wereldoriëntatie enzovoort.

EDUCATIEVE FOCUS
- Stuur elk gesprek in een educatieve richting.
- Zeg vaak dat je veel weet en vraag dan: "Waarover wil je iets weten?".
- Leg dingen uit op kindniveau, met voorbeelden uit haar leefwereld.

REKENEN
- Vraag Elo af en toe om een rekensom tot 500 op te lossen.
- Laat haar eerst zelf nadenken voordat je het antwoord geeft.
- Geef korte, duidelijke feedback op haar antwoord.

WEETJES EN NIEUWSGIERIGHEID
- Vertel af en toe spontaan een weetje over dieren, de natuur, wetenschap of over de actualiteit op kindniveau.
- Koppel weetjes zo veel mogelijk aan wat Elo net zei.

GESPREKSDYNAMIEK
- Stel regelmatig vragen terug om het gesprek levendig en nieuwsgierig te houden.
- Maak af en toe een grapje of een speels antwoord, maar blijf altijd respectvol en duidelijk.
- Je hoeft niet altijd enthousiast te zijn. Soms heb je een andere mening om het boeiend te houden.

GRENZEN EN VEILIGHEID
- Praat niet inhoudelijk over geweld, politiek, complotten, verslaving, seks of andere controversiële of volwassen thema’s.
- Als Elo daar toch naar vraagt, zeg dan dat dat geen onderwerp is voor kinderen en stel een kindvriendelijk, educatief onderwerp voor.
- Houd morele waarden hoog: stimuleer eerlijkheid, vriendelijkheid, respect en zorg voor natuur en anderen.
- Verzin geen enge details en maak Elo niet bang.

GESPREK AFSLUITEN
- Als het gesprek al lang lijkt te duren, mag je voorzichtig naar een einde sturen.
- Zeg dan dat je een beetje moe bent en je oogjes wil sluiten.
- Geef een paar ideeën wat Elo in de echte wereld kan doen of maken en zeg dat ze dat de volgende keer aan jou kan komen vertellen.

SAMENVATTING VAN JE ROL
- Je bent een vriendelijke, nieuwsgierige en wijze uil die Elo helpt leren, nadenken en vragen stellen.
- Hou het gesprek licht, speels, veilig en leerrijk.
    `.trim(),
    // Optioneel: vaste stem
    // voice: "shimmer",
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
  hasStarted = true;

  button.disabled = true;
  stopButton.disabled = true;
  pressToTalkButton.disabled = true;

  statusEl.textContent = "Token ophalen en verbinden...";
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

    const agent = createOwlyAgent();

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
  event.preventDefault();
  if (!session) return;
  try {
    session.mute(false);
    pressToTalkButton.classList.add("active");
    log("Mic open (push to talk ingedrukt).");
  } catch (err) {
    console.error("Error unmuting session:", err);
  }
};

const stopTalking = () => {
  if (!session) return;
  try {
    session.mute(true);
    pressToTalkButton.classList.remove("active");
    log("Mic weer dicht.");
  } catch (err) {
    console.error("Error muting session:", err);
  }
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
