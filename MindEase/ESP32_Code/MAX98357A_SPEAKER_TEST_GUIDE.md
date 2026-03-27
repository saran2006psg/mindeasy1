# MAX98357A Speaker Test - Connection Guide

## Hardware Connection Diagram

```
┌─────────────────┐              ┌──────────────────┐
│   MAX98357A     │              │   ESP32 Board    │
│    Speaker      │              │                  │
│   Amplifier     │              │                  │
│                 │              │                  │
│  [VIN]  ────────┼──────────────┤ 5V (or 3.3V)     │
│                 │              │                  │
│  [GND]  ────────┼──────────────┤ GND              │
│                 │              │                  │
│  [DIN]  ────────┼──────────────┤ GPIO 22          │
│                 │              │                  │
│  [BCLK] ────────┼──────────────┤ GPIO 26          │
│                 │              │                  │
│  [LRC]  ────────┼──────────────┤ GPIO 25          │
│                 │              │                  │
│  [GAIN] ────────┤              │ (Leave floating) │
│                 │              │                  │
│  [SD]   ────────┤              │ (Leave floating) │
│                 │              │                  │
└─────────────────┘              └──────────────────┘
         │
         │ Connect to
         ▼
    🔊 SPEAKER
   (4-8 Ohm, 3W)
```

## Pin Mapping Table

| MAX98357A Pin | ESP32 Pin  | Description                           |
| ------------- | ---------- | ------------------------------------- |
| VIN           | 5V or 3.3V | Power supply                          |
| GND           | GND        | Ground                                |
| DIN           | GPIO 22    | I2S Data Input                        |
| BCLK          | GPIO 26    | I2S Bit Clock                         |
| LRC           | GPIO 25    | I2S Left/Right Clock (Word Select)    |
| GAIN          | Float      | Leave unconnected (15dB gain)         |
| SD            | Float      | Leave unconnected (Shutdown - Active) |

## Important Notes

### ⚡ Power Supply:

- **VIN can be 5V or 3.3V** (module has onboard regulator)
- **5V recommended** for maximum volume
- **3.3V works** but lower volume output

### 🔊 Speaker Connection:

- Connect **speaker wires** to `+` and `-` terminals on MAX98357A
- **Speaker impedance:** 4Ω or 8Ω
- **Power output:** Up to 3.2W at 5V

### 🎚️ Gain Setting (GAIN Pin):

- **GAIN floating** = 15dB gain (default, recommended)
- **GAIN to GND** = 12dB gain (slightly quieter)
- **GAIN to VIN** = 9dB gain (quieter)
- **GAIN to 100kΩ to GND** = 6dB gain (very quiet)

### 🔇 Shutdown Pin (SD):

- **SD floating or HIGH** = Active (speaker ON)
- **SD to GND** = Shutdown (speaker OFF)
- For this test, leave it **floating** (speaker always ON)

## Testing Steps

1. **Connect all pins** as shown in the diagram above
2. **Upload the code** to ESP32
3. **Open Serial Monitor** (115200 baud)
4. **Listen for tones:**
   - LOW tone (500 Hz) - 500ms
   - MEDIUM tone (1000 Hz) - 500ms
   - HIGH tone (2000 Hz) - 500ms
   - BEEP BEEP BEEP pattern (1500 Hz)

5. **Sequence repeats** every 3 seconds

## Expected Output

### Serial Monitor:

```
========================================
  🔊 MAX98357A Speaker Test
========================================
✅ Speaker initialized!
🔊 You should hear beeping tones now...

🔊 Playing LOW tone (500 Hz)...
🔊 Playing MEDIUM tone (1000 Hz)...
🔊 Playing HIGH tone (2000 Hz)...
🔊 Playing BEEP BEEP pattern...

✅ Test sequence complete!
⏸️  Waiting 3 seconds before repeating...
```

### Audio Output:

- You should hear **clear tones** from the speaker
- Each tone should be distinct (low, medium, high)
- Three quick beeps at the end

## Troubleshooting

### Problem: No sound at all

1. **Check power** - VIN connected to 5V or 3.3V?
2. **Check GND** - Common ground between ESP32 and MAX98357A?
3. **Check speaker** - Is it connected to `+` and `-` terminals?
4. **Check pins** - DIN=22, BCLK=26, LRC=25?
5. **SD pin** - Make sure it's NOT connected to GND (would shutdown speaker)

### Problem: Very quiet/distorted sound

1. **Use 5V instead of 3.3V** for VIN (more power = louder)
2. **Check speaker impedance** - 4Ω or 8Ω works best
3. **Adjust GAIN pin** - leave floating for maximum gain (15dB)
4. **Check speaker polarity** - doesn't matter for testing, but proper polarity is better

### Problem: Clicking/popping sounds only

1. **Check all three I2S pins** - DIN, BCLK, LRC must all be connected
2. **Restart ESP32** after uploading
3. **Check wiring** - loose connections can cause issues

### Problem: ESP32 won't upload/boot

1. **Disconnect I2S pins** during upload if needed
2. **Hold BOOT button** during upload
3. **GPIO 26** can sometimes interfere with boot - disconnect during upload if issues occur

## Wiring Tips

### ✅ Good Practices:

- Use **short wires** (< 20cm) to reduce noise
- **Twist I2S wires together** (DIN, BCLK, LRC) to reduce interference
- Keep speaker wires **away from ESP32 antenna**
- Use **solid connections** - no loose jumper wires

### ⚠️ Common Mistakes:

- ❌ Connecting SD pin to GND (speaker will be shut down)
- ❌ Swapping BCLK and LRC pins
- ❌ Not connecting GND (common ground required)
- ❌ Using damaged/blown speaker

## Next Steps

Once speaker is working:

- ✅ You should hear 3 tones + beep pattern
- ✅ Sound should be clear and loud
- ✅ Then we can proceed with full MindEase voice assistant!

## Volume Adjustment

If speaker is **too quiet:**

1. Use **5V for VIN** instead of 3.3V
2. Keep **GAIN pin floating** (15dB - loudest)
3. Increase amplitude in code (change `8000` to higher value like `16000`)

If speaker is **too loud:**

1. Connect **GAIN to GND** (12dB)
2. Or decrease amplitude in code (change `8000` to lower value like `4000`)
