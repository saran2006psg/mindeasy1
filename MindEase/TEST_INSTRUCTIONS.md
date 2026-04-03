# MindEase System Testing Instructions

This guide provides step-by-step instructions to set up, test, and verify the integrated MindEase ecosystem, including the **Hardware (ESP32)**, **Backend (MongoDB)**, and **Apps (Web/Mobile)**.

---

## 1. Environment Setup

### A. MongoDB (The Brain)
1. Ensure **MongoDB** is installed and running on your local machine.
2. The default connection string is: `mongodb://localhost:27017/mindease`.
3. (Optional) Use **MongoDB Compass** to visually inspect your data.

### B. Backend Configuration
1. Navigate to the `Backend` directory.
2. Copy `.env.example` to `.env` (if not already done).
3. Ensure the following keys are set:
   - `GROQ_API_KEY`: For AI responses and mood scoring.
   - `ELEVENLABS_API_KEY`: For voice responses.
   - `MONGODB_URI`: `mongodb://localhost:27017/mindease`.
4. Run `npm install` and then `npm start`.
5. **Verify**: You should see `✅ Connected to MongoDB` in the terminal.

### C. Web Frontend Configuration
1. Navigate to the `Frontend` directory.
2. Run `npm install` and then `npm run dev`.
3. **Verify**: Open `http://localhost:5173` in your browser.

### D. Mobile App Configuration
1. Navigate to the `Mobile` directory.
2. Open `src/services/api.js`.
3. **IMPORTANT**: Change the `DEFAULT_URL` to your computer's **Local IP Address** (e.g., `http://192.168.1.5:3000`) so your phone can talk to your computer.
4. Run `npx expo start`.

---

## 2. Testing Flow: Step-by-Step

### Phase 1: Hardware Interaction (ESP32)
1. Power on your **ESP32** hardware.
2. Ensure it is connected to the same Wi-Fi as your server.
3. **Speak into the hardware microphone**: Say something like, "I'm feeling a bit stressed today."
4. **Hardware Response**: Monitor the speaker; you should hear a caring response from MindEase within seconds.
5. **Console Check**: Look at the **Backend terminal**; you should see `✅ Hardware conversation captured in MongoDB`.

### Phase 2: Web Journal Verification
1. Go to your **Web App** in the browser.
2. Navigate to the **Journal** page.
3. **Verify**: You should see a brand new entry with your spoken message, the AI's response, and a **Mood Score** (e.g., "Mood: 3/10" for stress).

### Phase 3: Analytics Visualization
1. In the **Web App**, navigate to the **Analytics** page.
2. **Verify**: The **Mood Trend** line chart should show a new data point, and the **Emotional Focus** pie chart should reflect the "Stress" tag.

### Phase 4: Mobile App Sync
1. Open the **Expo Go** app on your phone and scan the QR code from Step 1D.
2. Log in (tap "Enter Sanctuary").
3. Go to the **Journal** tab.
4. **Verify**: The conversation you just had via hardware should appear instantly on your phone.

---

## 3. Troubleshooting
- **No data in Journal?** Check if `MONGODB_URI` is correct in the Backend `.env`.
- **Hardware not responding?** Ensure the `BACKEND_URL` in your ESP32 code matches your computer's IP.
- **Charts empty?** Analytics require at least one entry in the database. Talk to the AI again!

---
**MindEase is now fully integrated. Happy testing!**
