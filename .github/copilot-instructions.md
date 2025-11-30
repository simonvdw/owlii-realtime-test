# Owlii Realtime Test - AI Coding Agent Instructions

## Project Overview
This is a minimal OpenAI Realtime API test application for "OWLY", a Dutch-speaking educational AI assistant for an 8-year-old child (Elo). The architecture uses:
- **Backend**: Express server (`server.js`) that proxies ephemeral token requests to OpenAI
- **Frontend**: Vanilla JS client (`public/main.js`) using `@openai/agents-realtime` SDK via CDN
- **Communication**: WebRTC for real-time voice interaction (handled by SDK)

## Architecture & Data Flow
1. User clicks "Start gesprek" → Frontend requests ephemeral key from `/api/token`
2. Backend calls OpenAI's `/v1/realtime/client_secrets` endpoint with API key from `.env`
3. Backend returns ephemeral key (format: `ek_*`) to frontend
4. Frontend creates `RealtimeAgent` with Dutch instructions, then `RealtimeSession` connects via WebRTC
5. Audio flows directly browser ↔ OpenAI (not through our server)

## Critical Configuration

### Agent Instructions (`public/main.js`)
The `createOwlyAgent()` function contains the core system prompt that defines OWLY's personality and behavior:
- **Language**: Always Dutch, child-friendly (8-year-old level)
- **Character**: Wise owl mentor living in Gent, educational focus
- **Safety boundaries**: Explicitly blocks adult/controversial topics
- **Behavior patterns**: Spontaneously asks math problems, shares facts, keeps conversations educational

**When modifying**: Update the multi-line `instructions` string inside `createOwlyAgent()`. This is the ONLY place where agent behavior is defined.

### Environment Setup
Required in `.env`:
```
OPENAI_API_KEY=sk-proj-...  # Full OpenAI API key (NOT ephemeral)
PORT=3000                     # Optional, defaults to 3000
```

**Security note**: The `.env` file contains the actual API key and must never be committed (already in `.gitignore`).

## Development Workflows

### Start the server
```bash
npm start  # Runs node server.js
```
Then open `http://localhost:3000` in a browser that supports WebRTC (Chrome, Firefox, Safari).

### Key Dependencies
- `express` v5.1.0 - HTTP server
- `dotenv` - Environment variable loading
- `@openai/agents-realtime` - Loaded via CDN (not in package.json)

**No build step**: Pure ES modules in browser, no bundling required.

## Common Modifications

### Changing agent voice
Uncomment and set `voice` property in `createOwlyAgent()`:
```javascript
return new RealtimeAgent({
  name: "OWLY",
  instructions: `...`,
  voice: "shimmer",  // Options: alloy, echo, shimmer, etc.
});
```

### Adjusting conversation behavior
Edit the `instructions` text in `createOwlyAgent()`. Current structure:
- ALGEMEEN GEDRAG - personality traits
- TAAL EN STIJL - language requirements
- EDUCATIEVE FOCUS - teaching approach
- GRENZEN EN VEILIGHEID - safety guardrails (critical for child safety)

### Session lifecycle management
- `session.connect()` - Establishes WebRTC connection
- `session.interrupt()` - Stops current audio playback (used by stop button)
- `session.close()` - Tears down connection completely

## Project-Specific Patterns

### Token Proxy Pattern
The backend serves as a secure proxy to hide the OpenAI API key from the browser:
- Backend has full API key in `.env`
- Frontend receives short-lived ephemeral key (`ek_*` format)
- Ephemeral keys expire quickly and can't be reused for other purposes

**Never** expose the main API key to the frontend or commit it to version control.

### UI State Management
The app uses simple boolean flags (`hasStarted`) and DOM manipulation:
- Button states toggle between "Start gesprek" / "Stop gesprek"
- `statusEl` updates provide user feedback in Dutch
- `log()` function writes to both console and on-screen log div

### Dutch Language Context
All user-facing text is in Dutch (Flemish variant for Gent region). When adding features:
- Keep UI text in Dutch
- Use child-appropriate vocabulary
- Follow existing naming: "gesprek" (conversation), "verbonden" (connected), etc.

## Testing Considerations
- Requires microphone permissions in browser
- Test with actual voice input (speech recognition depends on OpenAI model)
- Error handling shows in `statusEl` + console (check both for debugging)
- Check Network tab for `/api/token` response to verify ephemeral key format

## Key Files Reference
- `server.js` - Token proxy endpoint at `/api/token`
- `public/main.js` - Agent configuration in `createOwlyAgent()`, session lifecycle
- `public/index.html` - UI layout (Dutch text, dark theme)
- `.env` - **Never commit** - contains OpenAI API key
