# Backend Testing Guide for MindEase

## Prerequisites

Before testing, ensure you have:

1. **Node.js** installed (`node -v` to check)
2. **dotenv** configured with:
   - `ELEVENLABS_API_KEY` (from https://elevenlabs.io)
   - `GROQ_API_KEY` (from https://console.groq.com)
3. Create a `.env` file in the Backend folder with:

```
ELEVENLABS_API_KEY=sk_xxxxx
GROQ_API_KEY=gsk_xxxxx
PORT=3000
```

4. Install dependencies:

```bash
cd MindEase/Backend
npm install
```

---

## Method 1: Using Postman (GUI - Easiest for Testing)

### 1.1 Check Server Status

**Endpoint:** `GET http://localhost:3000/status`

**Steps:**

1. Open Postman
2. Create new request → GET
3. URL: `http://localhost:3000/status`
4. Click "Send"

**Expected Response:**

```json
{
  "recordingExists": false,
  "responseExists": false,
  "responseReady": false,
  "elevenLabsConfigured": true,
  "groqKeyConfigured": true
}
```

### 1.2 Upload Audio File (Main Test)

**Endpoint:** `POST http://localhost:3000/uploadAudio`

**Steps:**

1. Create new POST request
2. URL: `http://localhost:3000/uploadAudio`
3. Go to **Body** tab → Select **binary**
4. Click "Select File" and choose an audio file (`.wav`, `.mp3`, etc.)
5. Click "Send"

**Expected Response:**

- First response: Transcribed text (e.g., "What is the weather today?")
- Server processes in background
- Check `/checkVariable` to see when response is ready

### 1.3 Check if Response is Ready

**Endpoint:** `GET http://localhost:3000/checkVariable`

**Steps:**

1. Create new GET request
2. URL: `http://localhost:3000/checkVariable`
3. Click "Send" repeatedly until `ready: true`

**Response:**

```json
{
  "ready": true // True when TTS response is ready
}
```

### 1.4 Download the Audio Response

**Endpoint:** `GET http://localhost:3000/broadcastAudio`

**Steps:**

1. Create new GET request
2. URL: `http://localhost:3000/broadcastAudio`
3. Click "Send"
4. Save the response as `.wav` file or play it

---

## Method 2: Using cURL (Command Line)

### 2.1 Check Status

```bash
curl http://localhost:3000/status
```

### 2.2 Upload Audio File

```bash
# Replace 'audio.wav' with your actual audio file
curl -X POST --data-binary @audio.wav http://localhost:3000/uploadAudio
```

### 2.3 Check if Response Ready

```bash
curl http://localhost:3000/checkVariable
```

### 2.4 Download Response Audio

```bash
curl http://localhost:3000/broadcastAudio -o response.wav
```

---

## Method 3: Using JavaScript/Node.js (Automated Testing)

Create a file `test.js` in Backend folder:

```javascript
const axios = require("axios");
const fs = require("fs");

const BASE_URL = "http://localhost:3000";

async function testBackend() {
  try {
    // Step 1: Check status
    console.log("📊 Checking server status...");
    const status = await axios.get(`${BASE_URL}/status`);
    console.log("✅ Server Status:", status.data);

    // Step 2: Upload audio
    console.log("\n📤 Uploading audio...");
    const audioPath = "./test.wav"; // Use your real audio file
    if (!fs.existsSync(audioPath)) {
      console.error("❌ Audio file not found:", audioPath);
      return;
    }

    const audioData = fs.readFileSync(audioPath);
    const uploadResponse = await axios.post(
      `${BASE_URL}/uploadAudio`,
      audioData,
      {
        headers: { "Content-Type": "audio/wav" },
      },
    );
    console.log("✅ Transcription:", uploadResponse.data);

    // Step 3: Wait for response to be ready
    console.log("\n⏳ Waiting for TTS response...");
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 30) {
      const checkResponse = await axios.get(`${BASE_URL}/checkVariable`);
      ready = checkResponse.data.ready;
      if (!ready) {
        console.log(`⏳ Not ready yet (${attempts + 1}/30)...`);
        await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds
      }
      attempts++;
    }

    if (ready) {
      console.log("✅ Response ready!");

      // Step 4: Download audio response
      console.log("\n📥 Downloading response audio...");
      const response = await axios.get(`${BASE_URL}/broadcastAudio`, {
        responseType: "arraybuffer",
      });
      fs.writeFileSync("./response.wav", response.data);
      console.log("✅ Response saved to: response.wav");
    } else {
      console.log("❌ Response timeout after 60 seconds");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

testBackend();
```

**Run with:**

```bash
node test.js
```

---

## Method 4: Using Python (Alternative)

Create `test.py`:

```python
import requests
import time
import json

BASE_URL = "http://localhost:3000"

def test_backend():
    try:
        # Step 1: Check status
        print("📊 Checking server status...")
        response = requests.get(f"{BASE_URL}/status")
        print("✅ Status:", response.json())

        # Step 2: Upload audio
        print("\n📤 Uploading audio...")
        with open('test.wav', 'rb') as f:
            audio_data = f.read()

        response = requests.post(f"{BASE_URL}/uploadAudio", data=audio_data)
        print("✅ Transcription:", response.text)

        # Step 3: Wait for response
        print("\n⏳ Waiting for TTS response...")
        for i in range(30):
            response = requests.get(f"{BASE_URL}/checkVariable")
            if response.json()['ready']:
                print("✅ Response ready!")
                break
            else:
                print(f"⏳ Waiting... ({i+1}/30)")
                time.sleep(2)

        # Step 4: Download response
        print("\n📥 Downloading response audio...")
        response = requests.get(f"{BASE_URL}/broadcastAudio")
        with open('response.wav', 'wb') as f:
            f.write(response.content)
        print("✅ Response saved to: response.wav")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_backend()
```

**Run with:**

```bash
python test.py
```

---

## Complete End-to-End Test Flow

1. **Start the server:**

   ```bash
   npm start
   ```

2. **Verify server is running:**

   ```bash
   curl http://localhost:3000/status
   ```

3. **Upload audio and get response:**
   - Use Postman (Method 1.2) OR
   - Use Python script (Method 4)

4. **Wait and download:**
   - Poll `/checkVariable` until ready
   - Download from `/broadcastAudio`

---

## Troubleshooting

### Problem: "ELEVENLABS_API_KEY not found"

- **Solution:** Check your `.env` file exists and contains `ELEVENLABS_API_KEY=sk_xxxxx`

### Problem: "Cannot transcribe audio"

- **Solution:**
  - Ensure audio file is valid WAV/MP3
  - Check ElevenLabs API quota

### Problem: "Groq API Error"

- **Solution:**
  - Verify `GROQ_API_KEY` is correct
  - Check if Groq API is accessible

### Problem: "Response never becomes ready"

- **Solution:**
  - Check server logs for errors
  - Check if voicedFile is being created in `tmp/` folder
  - Verify ElevenLabs TTS is working

---

## File Locations

- **Recorded audio:** `MindEase/Backend/tmp/recording.wav`
- **Response audio:** `MindEase/Backend/tmp/voicedby.wav`

---

## Key Endpoints Summary

| Endpoint          | Method | Purpose                                   |
| ----------------- | ------ | ----------------------------------------- |
| `/uploadAudio`    | POST   | Send audio file, get transcription        |
| `/checkVariable`  | GET    | Check if response is ready                |
| `/broadcastAudio` | GET    | Download the response audio               |
| `/status`         | GET    | Check server & API configuration          |
| `/test-audio`     | GET    | Download the uploaded recording           |
| `/test-response`  | GET    | Download the response audio (alternative) |
