# MindEase Backend - ElevenLabs Edition

Mental health chatbot backend with ElevenLabs STT/TTS and Groq LLM.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create/update `.env` file:

```
PORT=3000
ELEVENLABS_API_KEY=sk_your_key_here
GROQ_API_KEY=gsk_your_key_here
```

### 3. Start Server

```bash
npm start
```

Server will run at `http://localhost:3000/` with both WiFi IPs printed.

---

## 🌐 Setup ngrok for Remote Access

ngrok creates a public URL tunnel to your local server, allowing your ESP32 (or any device) to access the backend from anywhere.

### Step 1: Download & Install ngrok

**Option A: Using npm (Recommended)**

```bash
npm install ngrok -g
```

**Option B: Download from website**

1. Go to https://ngrok.com/download
2. Download ngrok for Windows
3. Extract to a folder
4. Add to PATH (optional, but recommended)

### Step 2: Create ngrok Account

1. Visit https://ngrok.com
2. Sign up (free account)
3. Go to **Dashboard** → **Auth** → Copy your **Auth Token**

### Step 3: Authenticate ngrok

```bash
ngrok authtoken YOUR_AUTH_TOKEN_HERE
```

Or add it to config file:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### Step 4: Start ngrok Tunnel

**Option A: In a separate terminal window**

```bash
ngrok http 3000
```

**Option B: In same terminal (run after server starts)**

```bash
# In first terminal
npm start

# In second terminal
npx ngrok http 3000
```

### Step 5: Copy Public URL

ngrok output will show:

```
ngrok                                                     (Ctrl+C to quit)

Forwarding     https://a1b2c3d4e5f6.ngrok.io -> http://localhost:3000

Connections   ttl
```

Copy the **`https://a1b2c3d4e5f6.ngrok.io`** URL (example - yours will be different)

---

## 📱 Use ngrok URL in ESP32 Code

Update your ESP32 code to use the ngrok URL:

```cpp
#define SERVER_URL "https://a1b2c3d4e5f6.ngrok.io"  // Replace with your ngrok URL

// Upload audio
http.begin(client, SERVER_URL "/uploadAudio");

// Check response ready
http.begin(client, SERVER_URL "/checkVariable");

// Download response
http.begin(client, SERVER_URL "/broadcastAudio");
```

---

## 📊 System Flow

```
ESP32 (via ngrok URL)
    ↓
POST /uploadAudio (WAV audio)
    ↓
📝 ElevenLabs Scribe v2 STT
    ↓
💭 Groq LLM (empathetic response)
    ↓
🎙️ ElevenLabs TTS (Rachel voice)
    ↓
GET /broadcastAudio
    ↓
ESP32 plays audio
```

---

## 🔌 API Endpoints

### POST /uploadAudio

Send audio from ESP32

- **Content-Type:** `application/octet-stream` (raw audio bytes)
- **Response:** Transcribed text
- **Example:**

```bash
curl -X POST --data-binary @recording.wav http://localhost:3000/uploadAudio
```

### GET /broadcastAudio

Download the AI response audio

- **Response:** WAV/MP3 audio file
- **Example:**

```bash
curl http://localhost:3000/broadcastAudio > response.wav
```

### GET /checkVariable

Check if response is ready

- **Response:** `{"ready": true/false}`
- **Example:**

```bash
curl http://localhost:3000/checkVariable
```

### GET /status

Check system status

- **Response:** JSON with configuration status
- **Example:**

```bash
curl http://localhost:3000/status
```

### GET /test-audio

Download last uploaded audio (debug)

### GET /test-response

Download last response audio (debug)

---

## 🎙️ Voice Configuration

Default voice: **rachel** (warm, empathetic)

### Change Voice at Runtime

Edit `server.js` - add this route:

```javascript
app.post("/setVoice/:voiceId", (req, res) => {
  const { voiceId } = req.params;
  elevenlabsService.setVoiceId(voiceId);
  res.json({ voice: voiceId, message: "Voice updated" });
});
```

Then call from ESP32:

```cpp
http.begin(client, "http://localhost:3000/setVoice/bella");
http.POST();
```

### Available Voices

- **rachel** (Default) - Warm, caring, empathetic
- **bella** - Friendly, supportive
- **alice** - Clear, professional, empathetic
- **thomas** - Calm, male voice
- **adam** - Warm, reassuring male voice
- **chris** - Natural male voice

---

## 🔧 Configuration Files

### `.env` (Keep Secret!)

```
PORT=3000
ELEVENLABS_API_KEY=sk_...
GROQ_API_KEY=gsk_...
```

### `services/elevenlabsService.js`

Core STT/TTS service using REST API

- `transcribeAudio(filePath)` - Scribe v2 STT
- `textToSpeech(text, outputPath)` - Multilingual v2 TTS
- `setVoiceId(id)` - Change voice
- `getVoiceId()` - Get current voice

### `server.js`

Main Express server

- Handles audio uploads
- Manages Groq LLM requests
- Routes for broadcasting responses

---

## 🐛 Troubleshooting

### Issue: ngrok won't start

**Solution:**

- Verify auth token: `ngrok authtoken YOUR_TOKEN`
- Check if port 3000 is in use: `npm start` first
- Make sure Node.js server is running

### Issue: ESP32 can't connect to ngrok URL

**Solution:**

- Verify ngrok URL is correct
- Check ESP32 WiFi is connected
- Ensure ngrok tunnel is still running (they expire after ~2 hours if free plan)
- Add `&` at end of ngrok command to keep it running: `ngrok http 3000 &`

### Issue: "ELEVENLABS_API_KEY not found"

**Solution:**

- Verify `.env` file has correct key
- Restart server after changing `.env`: `npm start`
- Make sure there are no spaces in the key

### Issue: "Audio file is empty"

**Solution:**

- Ensure ESP32 is recording properly
- Check audio buffer in ESP32 code
- Verify Content-Type header is `application/octet-stream`

### Issue: Groq API returns error

**Solution:**

- Verify `GROQ_API_KEY` in `.env`
- Check if quota is exhausted
- Test with cURL: `curl -X POST http://localhost:3000/uploadAudio --data-binary @test.wav`

---

## 📦 Dependencies

```json
{
  "axios": "HTTP client for API calls",
  "express": "Web framework",
  "cors": "CORS middleware",
  "dotenv": "Environment variables",
  "form-data": "File uploads",
  "express-async-errors": "Async error handling",
  "localtunnel": "Alternative to ngrok",
  "ngrok": "Public URL tunnel"
}
```

---

## 🎯 Next Steps

1. ✅ `npm install` - Install dependencies
2. ✅ Configure `.env` with API keys
3. ✅ `npm start` - Start server
4. ✅ `ngrok http 3000` - Create tunnel (in another terminal)
5. ✅ Copy ngrok URL to ESP32 code
6. ✅ Upload audio from ESP32 and test!

---

## 📝 Notes

- **ngrok free tier** expires after ~2 hours. Restart the tunnel if needed.
- **Response files** are saved to `tmp/` directory
- **Console logs** show detailed STT/TTS/LLM status
- **All APIs** support both localhost and ngrok URLs

---

## 🚀 Production Deployment

For production, consider:

- Using ngrok paid plan (stable URLs)
- Deploying to cloud (AWS, GCP, Azure, Heroku)
- Using environment-specific configs
- Adding authentication/API keys
- Setting up logging and monitoring

---

## 📚 Resources

- [ElevenLabs Docs](https://elevenlabs.io/docs)
- [Groq API Docs](https://console.groq.com/docs)
- [ngrok Documentation](https://ngrok.com/docs)
- [Express.js Guide](https://expressjs.com/)

---

**Backend Version:** ElevenLabs Edition
**Last Updated:** 2026-03-25
