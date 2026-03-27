# MindEase Circuit Connection Diagram

## Components Required

1. **ESP32 Development Board** (any variant with WiFi)
2. **MAX4466 Microphone Module** (Analog electret microphone with amplifier)
3. **MAX98357A I2S Amplifier Module**
4. **8Ω 0.5W Speaker**
5. **Power Supply** (5V USB or 5V/3.3V power source)
6. **Jumper Wires**

---

## Complete Circuit Diagram (ASCII)

```
                     ┌─────────────────────────────┐
                     │      ESP32 DevKit           │
                     │                             │
   ┌─────────────────┤ 3V3  ─────────────┐        │
   │                 │                    │        │
   │  ┌──────────────┤ GND  ─────────┐   │        │
   │  │              │                │   │        │
   │  │              │ GPIO 34 (ADC)  ├───┼────────┼──── MAX4466 OUT
   │  │              │                │   │        │
   │  │              │ GPIO 22 (DOUT) ├───┼────────┼──── MAX98357A DIN
   │  │              │ GPIO 26 (BCLK) ├───┼────────┼──── MAX98357A BCLK
   │  │              │ GPIO 25 (LRC)  ├───┼────────┼──── MAX98357A LRC
   │  │              │                    │        │
   │  │              │ 5V/VIN ─────────────────────┼──── MAX98357A VIN
   │  │              │                             │
   │  │              └─────────────────────────────┘
   │  │
   │  │              ┌──────────────────┐
   │  │              │   MAX4466 MIC    │
   │  ├──────────────┤ GND              │
   │  │              │                  │
   └──┼──────────────┤ VCC (3.3V)       │
      │              │                  │
      │              │ OUT ─────────────┤──── To ESP32 GPIO 34
      │              └──────────────────┘
      │
      │              ┌──────────────────┐
      │              │   MAX98357A      │
      ├──────────────┤ GND              │
      │              │                  │
      │              │ VIN (5V) ────────┤──── To ESP32 5V/VIN
      │              │                  │
      │              │ DIN ─────────────┤──── To ESP32 GPIO 22
      │              │ BCLK ────────────┤──── To ESP32 GPIO 26
      │              │ LRC ─────────────┤──── To ESP32 GPIO 25
      │              │ GAIN             │──── Leave unconnected (15dB)
      │              │ SD               │──── Leave unconnected (enabled)
      │              │                  │
      │              │ OUT+ ────────────┤────┐
      │              │ OUT- ────────────┤────┼──── To 8Ω Speaker
      │              └──────────────────┘    │
      │                                      │
      │              ┌──────────────────┐    │
      └──────────────┤ Speaker (8Ω)     ├────┘
                     │ 0.5W             │
                     └──────────────────┘
```

---

## Pin Connection Table

### ESP32 → MAX4466 Microphone

| ESP32 Pin   | MAX4466 Pin | Wire Description    |
| ----------- | ----------- | ------------------- |
| **3V3**     | **VCC**     | Power (3.3V)        |
| **GND**     | **GND**     | Ground              |
| **GPIO 34** | **OUT**     | Analog Audio Signal |

> **Note:** GPIO 34 is ADC1_CHANNEL_6 and supports analog input. Do NOT use GPIO 0, 2, 12, or 15 as they have boot mode restrictions.

---

### ESP32 → MAX98357A Speaker Amplifier

| ESP32 Pin    | MAX98357A Pin | Description                                                 |
| ------------ | ------------- | ----------------------------------------------------------- |
| **5V (VIN)** | **VIN**       | Power supply (can also use 3.3V but 5V gives better volume) |
| **GND**      | **GND**       | Ground                                                      |
| **GPIO 22**  | **DIN**       | I2S Data Out (Audio data)                                   |
| **GPIO 26**  | **BCLK**      | I2S Bit Clock                                               |
| **GPIO 25**  | **LRC**       | I2S Left/Right Clock (Word Select)                          |
| -            | **SD**        | Leave **unconnected** (internal pull-up enables amplifier)  |
| -            | **GAIN**      | Leave **unconnected** (defaults to 12dB gain)               |

---

### MAX98357A → Speaker

| MAX98357A Pin | Speaker Terminal | Description               |
| ------------- | ---------------- | ------------------------- |
| **OUT+**      | **Positive (+)** | Speaker positive terminal |
| **OUT-**      | **Negative (-)** | Speaker negative terminal |

---

## Power Supply Options

### Option 1: USB Power (Recommended)

```
USB Cable (5V) ──→ ESP32 USB Port
                   ├─→ ESP32 gets power
                   ├─→ 3.3V regulator powers MAX4466
                   └─→ 5V/VIN powers MAX98357A
```

### Option 2: External 5V Supply

```
5V Power Supply ──→ ESP32 VIN Pin
                    ├─→ ESP32 gets power
                    ├─→ 3.3V regulator powers MAX4466
                    └─→ 5V/VIN powers MAX98357A
```

---

## Visual Breadboard Layout

```
         MAX4466            ESP32              MAX98357A         Speaker (4Ω 10W)
       ┌────────┐         ┌────────┐          ┌─────────┐      ┌────────┐
       │  VCC   ├─────────┤  3V3   │          │  SD (NC)│      │        │
       │  GND   ├────┬────┤  GND   ├────┬─────┤  GND    │      │   4Ω   │
       │  OUT   ├────┼────┤ GPIO34 │    │     │ GAIN(NC)│      │  10W   │
       └────────┘    │    │        │    │     │         │      │        │
                     │    │ GPIO22 ├────┼─────┤  DIN    │      │        │
                     │    │ GPIO26 ├────┼─────┤  BCLK   │      │        │
                     │    │ GPIO25 ├────┼─────┤  LRC    │      │        │
                     │    │  5V    ├────┴─────┤  VIN    │      │        │
                     │    └────────┘          │  OUT+   ├──────┤  +     │
                     │                        │  OUT-   ├──────┤  -     │
                     │                        └─────────┘      └────────┘
                     └───────────────────────────────────────── Common GND
```

**Pin Connections Summary:**
- MAX98357A **SD** → Leave unconnected (NC) - internal pull-up enables amplifier
- MAX98357A **GAIN** → Leave unconnected (NC) - defaults to 12dB gain

---

## Important Notes

### MAX4466 Microphone

- ✅ **Always use 3.3V** (using 5V may damage the module)
- ✅ Connect OUT to an **ADC-capable pin** (GPIO 34, 35, 36, 39 recommended)
- ✅ The blue potentiometer on MAX4466 adjusts gain (turn clockwise for more sensitivity)
- ⚠️ Keep away from noisy power sources

### MAX98357A Amplifier

- ✅ **5V recommended** for maximum volume and better audio quality
- ✅ 3.3V also works but with reduced volume
- ✅ **GAIN pin:** Leave unconnected - defaults to 12dB gain (good for most speakers)
- ✅ **SD (Shutdown) pin:** Leave unconnected - internal pull-up keeps amplifier enabled
- ⚠️ Use proper I2S pins (avoid boot mode pins GPIO 0, 2, 12, 15)

### Speaker Connection

- ✅ **4Ω to 8Ω impedance** supported by MAX98357A
- ✅ **10W power rating** provides good headroom
- ⚠️ Start with low volume and gradually increase

### Common Ground ⚠️ CRITICAL

- ✅ **All GND pins must connect together:**
  - ESP32 GND
  - MAX4466 GND
  - MAX98357A GND
  - Power supply GND (if using external power)
- ❌ **Failure to connect common ground will cause:**
  - No audio output
  - Noisy/distorted audio
  - Erratic behavior

---

## Testing Procedure

### Step 1: Test Components Separately

1. **Upload speaker test code** (see `MAX98357A_SPEAKER_TEST_GUIDE.md`)
   - Should hear beeping tones
2. **Upload microphone test code** (see `MAX4466_TEST_GUIDE.md`)
   - Should see ADC values changing with sound

### Step 2: Upload Main Code

1. Flash the updated `main.cpp`
2. Open Serial Monitor (115200 baud)
3. Connect to WiFi (either hardcoded or config portal)

### Step 3: Test Voice Assistant

1. Type `start` or `s` in Serial Monitor
2. Wait for "Recording Start" message
3. **Speak clearly** for 5 seconds
4. Wait for server processing (~3-10 seconds)
5. Listen to response through speaker

### Step 4: Troubleshooting Commands

- Type `status` to check WiFi connection
- Check Serial Monitor for error messages
- Verify server URL in code (line 168 for LOCAL or line 178 for NGROK)

---

## Safety Warnings ⚠️

1. **Power Safety:**
   - Never connect 5V directly to MAX4466 (use 3.3V only)
   - Use proper USB cable with adequate current capacity (500mA+)

2. **Speaker Safety:**
   - Start with low amplitude in code (8000-12000 range)
   - Monitor speaker temperature during testing
   - If speaker gets warm, reduce amplitude immediately

3. **Audio Feedback:**
   - Keep speaker away from microphone to prevent feedback loop
   - Use directional positioning (speaker facing away from mic)

4. **ESD Protection:**
   - Touch grounded metal before handling components
   - Avoid static-prone surfaces (carpet, synthetic fabric)

---

## Component Specifications

### MAX4466

- **Input:** Electret microphone
- **Output:** Analog (0-3.3V centered around 1.65V)
- **Supply Voltage:** 2.4V to 5.5V (use 3.3V)
- **Gain:** Adjustable 25x - 125x via potentiometer
- **Frequency Response:** 20Hz - 20kHz

### MAX98357A

- **Interface:** I2S Digital Audio
- **Supply Voltage:** 2.5V to 5.5V
- **Output Power:** 3.2W @ 4Ω, 1.6W @ 8Ω (at 5V supply)
- **Sample Rate:** 8kHz - 96kHz (using 16kHz)
- **THD+N:** 0.015% (excellent audio quality)
- **Efficiency:** 92% (Class D amplifier)

### Speaker Requirements

- **Impedance:** 4Ω to 8Ω (8Ω recommended for safety)
- **Power:** 0.5W to 3W
- **Size:** Any (larger = better bass response)

---

## Bill of Materials (BOM)

| Component              | Quantity | Approximate Cost |
| ---------------------- | -------- | ---------------- |
| ESP32 DevKit           | 1        | $5-10            |
| MAX4466 Microphone     | 1        | $2-5             |
| MAX98357A Amplifier    | 1        | $3-7             |
| 8Ω 0.5W Speaker        | 1        | $1-3             |
| Jumper Wires (M-M/M-F) | 10-15    | $2-5             |
| Breadboard (optional)  | 1        | $3-5             |
| USB Cable              | 1        | $2-5             |
| **Total**              |          | **$18-45**       |

---

## Frequently Asked Questions (FAQ)

**Q: Can I use GPIO 32 or 33 instead of GPIO 34 for the microphone?**
A: Yes! Any ADC1 pin works: GPIO 32, 33, 34, 35, 36, 39. Just update `ADC_MIC_PIN` and `ADC_CHANNEL` in code.

**Q: Can I power MAX98357A from 3.3V instead of 5V?**
A: Yes, but volume will be significantly lower (~60% of 5V performance). Use 5V for best results.

**Q: My speaker is 4Ω, not 8Ω. Is that okay?**
A: Yes! 4Ω will be louder but draws more current. Make sure your power supply can handle it.

**Q: Can I add a volume control potentiometer?**
A: Not directly. Control volume in software by adjusting amplitude in code, or use the GAIN pin settings on MAX98357A.

**Q: How do I reduce noise/static in the audio?**
A:

- Use shorter wires
- Add 10µF capacitor near ESP32 3.3V pin
- Adjust MAX4466 gain potentiometer
- Keep microphone away from ESP32 and power circuits

**Q: Can I use a different I2S amplifier like PCM5102?**
A: Yes, but you'll need to modify the I2S configuration in code.

---

## Next Steps

1. ✅ **Assemble circuit** following this diagram
2. ✅ **Test individual components** before full integration
3. ✅ **Upload modified code** with Serial command trigger
4. ✅ **Configure WiFi** and backend server
5. ✅ **Test voice assistant** workflow
6. 🎯 **Enjoy your MindEase AI assistant!**

---

## Support

If you encounter issues:

1. Check Serial Monitor output for detailed error messages
2. Verify all connections match this diagram
3. Test components individually
4. Review `TESTING_GUIDE.md` and `HARDWARE_UPDATE_SUMMARY.md`
5. Check backend server status (`http://your-ip:3000/status`)

---

_Last Updated: 2026-03-26_
_Version: 2.0 - Simplified (No LED/Button)_
