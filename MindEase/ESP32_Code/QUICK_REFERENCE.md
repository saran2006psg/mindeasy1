# ⚡ MindEase Quick Wiring Reference Card

## 🔌 MAX4466 Microphone → ESP32

```
MAX4466          ESP32
-------          -----
  VCC    ──────→  3V3
  GND    ──────→  GND
  OUT    ──────→  GPIO 34
```

## 🔊 MAX98357A Amplifier → ESP32

```
MAX98357A        ESP32
---------        -----
  VIN    ──────→  5V (or VIN pin)
  GND    ──────→  GND
  DIN    ──────→  GPIO 22
  BCLK   ──────→  GPIO 26
  LRC    ──────→  GPIO 25
  GAIN   ──────→  (leave unconnected)
  SD     ──────→  (leave unconnected)
```

## 🔊 Speaker → MAX98357A

```
Speaker           MAX98357A
-------           ---------
  (+)     ──────→  OUT+
  (-)     ──────→  OUT-
```

## ⚠️ CRITICAL: Common Ground

**All GND pins MUST connect together:**

- ESP32 GND
- MAX4466 GND
- MAX98357A GND

## 📱 Serial Commands

| Command        | Action            |
| -------------- | ----------------- |
| `start` or `s` | Start recording   |
| `status`       | Check WiFi status |

## 🎛️ Settings

- **Serial Monitor:** 115200 baud
- **Recording Time:** 5 seconds
- **Sample Rate:** 16kHz
- **Speaker:** 8Ω, 0.5W

## 🚦 Status Messages

- ✅ "Setup complete!" → Ready to use
- 🎤 "Recording Start" → Speak now
- 📤 "Upload FILE" → Sending to server
- 🔊 "Playing response" → Listen to reply
- ✅ "Workflow completed" → Ready for next command

---

_Keep this card handy while assembling your MindEase device!_
