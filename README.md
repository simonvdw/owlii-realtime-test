# Owlii Realtime Test

Een minimal OpenAI Realtime API test applicatie voor **OWLY**, een Nederlands-sprekende educatieve AI-assistent voor kinderen. OWLY is een wijze uil die kinderen helpt leren via real-time voice gesprekken.

## ✨ Functionaliteiten

- 🎙️ **Real-time voice interactie** via OpenAI Realtime API
- 🦉 **OWLY karakter** - vriendelijke Nederlandse educatieve assistent
- 👤 **Gepersonaliseerd** - vraagt om de voornaam van het kind
- 🔒 **Veilige token proxy** - API key blijft server-side
- ⌨️ **Push-to-talk** - spreek via knop of spatiebalk

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

3. Maak een `.env` bestand met je OpenAI API key:
```bash
OPENAI_API_KEY=sk-proj-...
PORT=3000
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
2. Klik op "Start gesprek" of druk Enter
3. Geef microfoontoegang wanneer gevraagd
4. Gebruik de "Talk" knop of **spatiebalk** om te spreken (push-to-talk)
5. Laat los om te stoppen met spreken
6. Klik "Stop gesprek" om de sessie te beëindigen

## 📁 Projectstructuur

```
owlii-realtime-test/
├── server.js                    # Express backend met token proxy
├── public/
│   ├── index.html              # UI met voornaam input en knoppen
│   ├── main.js                 # Frontend logica en session management
│   └── owly-instructions.js    # OWLY karakterinstructies (Nederlands)
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
- `@openai/agents-realtime` - Geladen via CDN

**Geen build stap nodig** - pure ES modules in de browser.

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

Gemaakt met ❤️ voor educatieve voice AI experimenten
