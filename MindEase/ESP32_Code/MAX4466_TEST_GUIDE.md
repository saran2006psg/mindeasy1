# MAX4466 Microphone Test - Connection Diagram

## Hardware Connection

```
┌─────────────────┐              ┌──────────────────┐
│    MAX4466      │              │   ESP32 Board    │
│   Microphone    │              │                  │
│                 │              │                  │
│  [VCC] ─────────┼──────────────┤ 3.3V             │
│                 │              │                  │
│  [GND] ─────────┼──────────────┤ GND              │
│                 │              │                  │
│  [OUT] ─────────┼──────────────┤ GPIO 34 (ADC)    │
│                 │              │                  │
└─────────────────┘              └──────────────────┘
```

## Pin Mapping Table

| MAX4466 Pin | ESP32 Pin | Description         |
| ----------- | --------- | ------------------- |
| VCC         | 3.3V      | Power supply (3.3V) |
| GND         | GND       | Ground              |
| OUT         | GPIO 34   | Analog audio output |

## Important Notes

### ⚠️ GPIO 34 Requirements:

- **GPIO 34 is INPUT ONLY** (cannot be used as output)
- Perfect for ADC (Analog-to-Digital Converter) reading
- No pull-up/pull-down resistors available (ADC pin)

### 🔧 MAX4466 Gain Adjustment:

- The MAX4466 has a **potentiometer** (small screw on the board)
- **Clockwise** = Higher gain (more sensitive)
- **Counter-clockwise** = Lower gain (less sensitive)
- Start with **middle position** and adjust as needed

### 📊 Expected Values:

- **Silence:** ~2048 (middle of 0-4095 range)
- **Normal speech:** 1800-2300 (amplitude ~100-500)
- **Loud sounds:** Amplitude > 500

## Testing Steps

1. **Upload the code** to ESP32
2. **Open Serial Monitor** (115200 baud)
3. **Speak or clap** near the microphone
4. **Observe the readings:**
   - AVG: Average value (should be around 2048 when silent)
   - MIN/MAX: Minimum and maximum values
   - AMPLITUDE: Peak-to-peak difference (higher = louder)
   - Visual bar: Shows sound intensity
   - 🔊/🔇: Sound detected indicator

5. **If readings are too sensitive/weak:**
   - Adjust the potentiometer on MAX4466
   - Turn clockwise for more sensitivity
   - Turn counter-clockwise for less sensitivity

## Troubleshooting

### Problem: All readings show ~0 or ~4095

- Check VCC connection (must be 3.3V, not 5V)
- Check GND connection

### Problem: No change when speaking

- Verify GPIO 34 connection
- Adjust gain potentiometer
- Check if OUT pin is connected properly

### Problem: Readings jump randomly

- Add a small capacitor (0.1µF) between VCC and GND
- Keep wires short to reduce noise
- Move away from WiFi antenna

## Next Steps

Once microphone is working:
✅ You'll see amplitude changes when speaking
✅ Visual bars will appear when sound is detected
✅ Then we can proceed with full MindEase voice assistant code!
