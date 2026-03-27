# MAX4466 Microphone Troubleshooting Guide

## Problem: Recording Only Static/Noise

If your transcription shows `[static]` or no audio is being picked up:

---

## ✅ Hardware Checks

### 1. **Check Wiring Connections**

```
MAX4466 → ESP32
├─ VCC → 3.3V (NOT 5V!)
├─ GND → GND
└─ OUT → GPIO 34
```

**Important:**

- ✅ Use only **3.3V** (5V can damage the module)
- ✅ Ensure **GPIO 34** connection is solid (not loose)
- ✅ Check **common ground** between MAX4466 and ESP32

### 2. **Adjust Microphone Gain (CRITICAL!)**

The MAX4466 has a **blue potentiometer** on the board:

```
    TOP VIEW
   ┌─────────┐
   │    🔵   │  ← Blue potentiometer
   │  MAX4466│
   └─────────┘
```

**How to adjust:**

- Use a small screwdriver (Phillips or flathead)
- Turn **clockwise** ⟳ to increase gain (more sensitive)
- Turn **counter-clockwise** ⟲ to decrease gain (less sensitive)

**Start position:** Turn fully clockwise (maximum gain) for testing

### 3. **Microphone Placement**

```
❌ WRONG                    ✅ CORRECT
Speaker facing down        Speaker facing up/forward
[●]  ↓                          ↑  [●]
────────                    ────────
```

- The small hole with mesh is the microphone
- Keep 5-15cm away from your mouth
- Speak directly toward the microphone hole

---

## 🔧 Software Tests

### Test 1: Check Raw ADC Values

Add this to your Serial Monitor after recording starts:

The code already prints recording progress. After recording, check if you see actual sound detection.

### Test 2: Verify ADC Configuration

In Serial Monitor, you should see:

```
ADC Microphone initialized successfully
Configuration:
  - Input PIN: GPIO 34 (ADC1_CHANNEL_6)
  - Sample Rate: 16000 Hz
  - Bit Depth: 16-bit
  - Attenuation: 12dB (0-3.6V range)
```

### Test 3: Check Recorded File Size

After recording, you should see:

```
recording.wav    161836 bytes  ← Should be around 160KB
```

If file size is correct but transcription is `[static]`, it's a **gain/placement issue**.

---

## 🎯 Step-by-Step Troubleshooting

### **Step 1: Verify Physical Connection**

1. Power off ESP32
2. Check all 3 wires: VCC, GND, OUT
3. Ensure no loose connections
4. Power on and check Serial Monitor for initialization messages

### **Step 2: Adjust Gain to Maximum**

1. Find the blue potentiometer on MAX4466
2. Turn it **fully clockwise** (maximum gain)
3. Try recording again with `start` command

### **Step 3: Optimal Recording Technique**

1. Position microphone 10cm from your mouth
2. Speak **clearly and loudly**
3. Avoid background noise
4. Make sure the mic hole faces you

### **Step 4: Test Recording**

```
Type: start
Wait for: *** Recording Start ***
Speak: "What is artificial intelligence?"
Wait: Recording completed
Check: Transcription should show your words, not [static]
```

---

## 🔍 Common Problems & Solutions

| Problem                  | Cause                    | Solution                                 |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `[static]` transcription | Gain too low             | Turn potentiometer clockwise (⟳)         |
| No audio file created    | GPIO 34 not connected    | Check wiring to GPIO 34                  |
| File created but empty   | No power to MAX4466      | Verify 3.3V connection                   |
| Distorted/clipped audio  | Gain too high            | Turn potentiometer counter-clockwise (⟲) |
| Very quiet audio         | Speaker facing wrong way | Rotate module, hole should face up       |

---

## 📋 Current Settings

Your system is configured for:

- **Sample rate:** 16 kHz
- **Bit depth:** 16-bit
- **Recording time:** 5 seconds
- **ADC attenuation:** 12dB (0-3.6V range)

These settings are **correct** and don't need changing. Focus on **hardware gain adjustment**.

---

## ✅ Expected Results

After fixing gain and placement:

```
Transcription example:
==================== Transcription ====================
What is artificial intelligence?
====================      End      ====================
```

Not `[static]` - that means your voice was captured!

---

## 🆘 Still Not Working?

Try these advanced steps:

1. **Test with different GPIO:**
   - Try GPIO 35 or 36 (also ADC pins)
   - Update code: `#define ADC_MIC_PIN GPIO_NUM_35`

2. **Check MAX4466 module:**
   - Look for physical damage
   - Test with multimeter: VCC should read 3.3V

3. **Environmental check:**
   - Move away from noisy power supplies
   - Test in a quiet room
   - Avoid WiFi router interference

---

## 💡 Pro Tips

1. **Start with maximum gain** - You can always reduce it later
2. **Speak loudly during initial tests** - Ensures the mic is working
3. **Use the `test` command first** - Verify speaker works before testing full workflow
4. **Check backend logs** - See what ElevenLabs Scribe received

Good luck! 🎤
