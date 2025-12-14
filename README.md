# Owlii Realtime Test

Een minimal OpenAI Realtime API test applicatie voor **OWLY**, een Nederlands-sprekende educatieve AI-assistent voor kinderen. OWLY is een wijze uil die kinderen helpt leren via real-time voice gesprekken.


---

## 🎨 Wouter changes Dec 1st

Sorry Simon konnet nie laten :) + test of ik ook local dev en deploys aan de praat kreeg etc + Feel free to revert everything!

**Changes:**
- 🎉 Yay multiple developers doing local dev and collaborating and pushing changes etc etc (audio werkt bij mij wel nie lokaal, hopelijk gewoon door mijn OpenAPI key of zo)
- 🎨 Introduced some first branding design because 'brand + domain' is just more fun even while still exploring
- 🧩 Some basic templating and reused styles etc
- 🎮 Eerste 'extras' spelletje (Reken Maar!) en 'over ons' pagina
- 🔧 Kept original file, hopelijk niks gebroken enkel toegevoegd

---

## ✨ Functionaliteiten

- 🎙️ **Real-time voice interactie** via OpenAI Realtime API
- 🦉 **OWLY karakter** - vriendelijke Nederlandse educatieve assistent
- 👤 **Gepersonaliseerd** - vraagt om de voornaam van het kind
- 🔒 **Veilige token proxy** - API key blijft server-side
- ⌨️ **Push-to-talk** - spreek via knop of spatiebalk
- 🎛️ **Admin Studio** - beheer jokes/raadsels/verhalen + categorieën met OpenAI schrijf- en spraakflow
- 🗂️ **Owly logs** - gespreksherinneringen met filters op datum, leeftijd en trefwoorden

## 🏗️ Architectuur

```
Browser ←--WebRTC--→ OpenAI Realtime API
   ↓
Frontend (Vanilla JS)
   ↓ HTTP
Backend (Express)
   ↓ HTTPS
OpenAI API (ephemeral tokens)
```

- **Backend**: Express server proxied ephemeral token requests
- **Frontend**: Vanilla JavaScript met `@openai/agents-realtime` SDK (via CDN)
- **Communicatie**: WebRTC voor directe audio tussen browser en OpenAI

## 🚀 Aan de slag

### Vereisten

- Node.js >= 20
- OpenAI API key met toegang tot Realtime API
- PostgreSQL (Render of lokaal)
- Database inloggegevens (host, database, user, password)
- Browser met WebRTC support (Chrome, Firefox, Safari)

### Installatie

1. Clone de repository:
```bash
git clone https://github.com/simonvdw/owlii-realtime-test.git
cd owlii-realtime-test
```

2. Installeer dependencies:
```bash
npm install
```

3. Maak een `.env` bestand met je sleutels (Render waarden staan hieronder als fallback in de code):
```bash
OPENAI_API_KEY=sk-proj-...
PORT=3000
DB_HOST=dpg-d4vg7vemcj7s73dn0nf0-a
DB_PORT=5432
DB_NAME=owly_postgres_db
DB_USER=owly_postgres_db_user
DB_PASSWORD=H7muDNQ42ufBVKXSSw3F8nn3LiwSAAz9
SESSION_SECRET=iets-super-geheim
```

4. Start de server:
```bash
npm start
```

5. Open in je browser:
```
http://localhost:3000
```

## 🎮 Gebruik

1. Vul je voornaam in
2. Vul de geheime toegangscode in ("computer")
3. Klik op "Start gesprek" of druk Enter
4. Geef microfoontoegang wanneer gevraagd
4. Gebruik de "Talk" knop of **spatiebalk** om te spreken (push-to-talk)
5. Laat los om te stoppen met spreken
6. Klik "Stop gesprek" om de sessie te beëindigen

## 📁 Projectstructuur

```
owlii-realtime-test/
├── server.js                    # Express backend + admin API + token proxy
├── db/
│   └── index.js                # Postgres pool + tabelinitialisatie
├── routes/
│   └── admin.js                # Admin API endpoints (Studio + logs)
├── public/
│   ├── admin.html / admin.js   # Admin portal
│   ├── home.js                 # Frontend logica en session management
│   └── owly-instructions.js    # OWLY karakterinstructies (Nederlands)
├── templates/                  # Hero/extras/over-ons content
├── package.json
├── .env                        # API keys (niet in git)
└── .github/
    └── copilot-instructions.md # AI agent documentatie
```

## 🔧 Configuratie

### OWLY Instructies Aanpassen

Bewerk `public/owly-instructions.js` om het karakter, toon of educatieve focus aan te passen:

```javascript
export function getOwlyInstructions(name) {
  return `Je bent OWLY, de persoonlijke uil van ${name}...`;
}
```

### Stem Aanpassen

Uncomment de `voice` property in `public/main.js`:

```javascript
return new RealtimeAgent({
  name: "OWLY",
  instructions: getOwlyInstructions(name),
  voice: "shimmer", // Options: alloy, echo, shimmer, etc.
});
```

## 🔒 Beveiliging

- **API Key**: Blijft server-side in `.env` (nooit committen!)
- **Ephemeral tokens**: Frontend krijgt kortstondige `ek_*` tokens
- **Geen authenticatie**: Dit is een test app, niet production-ready

## 🛠️ Technische Details

### Token Proxy Patroon

1. Frontend vraagt ephemeral key van `/api/token`
2. Backend roept OpenAI's `/v1/realtime/client_secrets` aan
3. Backend retourneert ephemeral key (`ek_*` format)
4. Frontend gebruikt key voor WebRTC verbinding
5. Audio gaat direct browser ↔ OpenAI (niet via onze server)

### Dependencies

- `express` (^5.1.0) - HTTP server
- `dotenv` (^17.2.3) - Environment variabelen
- `express-session` (^1.18.1) - eenvoudige admin-auth sessies
- `pg` (^8.13.1) - Postgres databank connectie
- `@openai/agents-realtime` - Geladen via CDN

**Geen build stap nodig** - pure ES modules in de browser.

## 🧑‍💻 Admin portal

- Surf naar `/admin`
- Log in met **admin / computer**
- **OWLY Studio**
   - Geef een prompt + type (mopje/raadsel/verhaal/weetje)
   - Genereer een uitgeschreven tekst via OpenAI
   - Bewerk tekst en maak daarna een WAV-bestand (tts) dat op de server onder `public/studio-audio` wordt opgeslagen
   - Koppel hoofd- en subcategorieën, maak eenvoudig nieuwe categorieën aan
- **Owly logs**
   - Bekijk samenvattingen (10 bulletpoints per 10 minuten) gefilterd op datum, leeftijd, voornaam of trefwoord
   - Logs komen binnen via `POST /api/logs` (bijv. vanuit de voice-flow)

Alle admin API's zijn afgeschermd met sessies; alleen `/api/admin/login` is publiek.

## 📝 Ontwikkeling

### Debugging

- Check browser console voor errors
- Kijk naar Network tab voor `/api/token` response
- Server logs tonen backend errors
- On-screen log div toont sessie events

### Veelvoorkomende Issues

**Geen microfoon toegang**: Controleer browser permissions
**Connection failed**: Verifieer `.env` API key is correct
**Audio werkt niet**: Test in Chrome/Firefox, niet alle browsers ondersteunen WebRTC goed

## 📚 Meer Informatie

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Agents Realtime SDK](https://github.com/openai/openai-realtime-agents-js)

## 📄 Licentie

ISC

---

Made with ❤️ by Mimo
