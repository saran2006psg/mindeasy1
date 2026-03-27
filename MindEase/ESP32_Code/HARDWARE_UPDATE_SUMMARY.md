# ESP32 Code Update Summary - MAX4466 Microphone

## ✅ Changes Made

### 1. **Microphone Input: INMP441 → MAX4466 (ADC)**

**Old Configuration (INMP441 - I2S):**

- I2S Port 0 (I2S_NUM_0)
- GPIO 18 (BCLK), GPIO 5 (LRCK), GPIO 19 (DOUT)
- I2S digital protocol
- Complex I2S buffer management

**New Configuration (MAX4466 - ADC):**

- ADC1 on GPIO 34 (ADC1_CHANNEL_6)
- Simple analog-to-digital conversion
- 12-bit ADC resolution → 16-bit audio conversion
- Direct ADC sampling with scale conversion

### 2. **Updated Pin Assignments**

```
Component              ESP32 Pin    Previous Pin
─────────────────────────────────────────────────
MAX4466 (Mic OUT)     GPIO 34      (N/A - new)
MAX98357A (DIN)       GPIO 22      GPIO 22 ✓
MAX98357A (BCLK)      GPIO 26      GPIO 15 ✓
MAX98357A (LRC)       GPIO 25      GPIO 21 ✓
WiFi LED              GPIO 27      GPIO 25 ✓
Recording LED         GPIO 32      GPIO 32 ✓
Built-in LED          GPIO 2       GPIO 2  ✓
Push Button           GPIO 4       GPIO 4  ✓
```

### 3. **Code Changes**

#### Removed:

- `#include <driver/i2s.h>` for input (kept for output)
- `i2sInitINMP441()` function
- `I2SAudioRecord_dataScale()` function
- I2S buffer flushing logic in `recordAudio()`

#### Added:

- `#include <driver/adc.h>` for analog input
- ADC configuration defines
- `adcInitMicrophone()` function
- `ADCDataScale()` helper function (simple conversion)
- Direct ADC sampling in `recordAudio()`

#### Modified:

- `recordAudio()` - Now uses ADC1 instead of I2S
- `i2sInitMax98357A()` - Updated pin assignments
- `setup()` - Calls `adcInitMicrophone()` instead of `i2sInitINMP441()`

### 4. **Audio Recording Flow (New)**

```
┌─────────────────┐
│  MAX4466 Mic    │ (Analog output on GPIO 34)
└────────┬────────┘
         │
    ┌────▼─────┐
    │  ADC1    │ (12-bit: 0-4095)
    └────┬─────┘
         │
    ┌────▼──────────────────────────┐
    │  ADC Conversion (ADCDataScale) │ (12-bit → 16-bit)
    │  Formula: (raw - 2048) << 4    │
    └────┬──────────────────────────┘
         │
    ┌────▼─────────────┐
    │  16-bit Audio    │ (WAV file)
    │  -32768 to 32767 │
    └──────────────────┘
```

### 5. **Key Configuration details**

**ADC Settings:**

- Sample Rate: 16000 Hz
- Bit Depth: 16-bit (after conversion)
- ADC Resolution: 12-bit
- ADC Attenuation: 11dB (supports 0-3.6V range)
- Channel: ADC1_CHANNEL_6 (GPIO 34)

**Speaker (MAX98357A) Settings:**

- Sample Rate: 16000 Hz
- Bit Depth: 16-bit
- Channel Format: I2S Right Channel
- DMA Buffers: 4 buffer, 1024 bytes each

---

## 📋 Files Modified

1. **`d:\IOT\MindEase\ESP32_Code\src\main.cpp`**
   - Updated pin definitions
   - Added ADC initialization
   - Modified recording function
   - Updated I2S speaker configuration

---

## 🧪 Testing Checklist

- [ ] Upload code to ESP32
- [ ] Verify Serial output shows correct pin configuration
- [ ] Press button to start recording
- [ ] Check Serial output: "Get Ready to Speak"
- [ ] Speak into MAX4466 microphone (5 seconds)
- [ ] Check Serial shows "Recording completed"
- [ ] Verify audio file uploads to backend
- [ ] Check backend STT transcription output
- [ ] Verify response audio plays through MAX98357A
- [ ] Check LED status indicators work correctly

---

## 🔊 Volume & Sensitivity Tips

### If Audio is Too Quiet:

- Adjust the gain pot on MAX4466 (onboard potentiometer)
- Turn clockwise to increase sensitivity
- Test with your voice level

### If Audio is Clipping:

- Turn MAX4466 gain pot counter-clockwise
- Ensure microphone is not too close to mouth
- Test with normal speaking distance (~15cm)

### ADC Voltage Range:

- MAX4466 output: 0-3.3V (safe for ESP32)
- ADC Attenuation: 11dB (0-3.6V range)
- No external biasing needed

---

## 📚 Technical Notes

### ADC Sampling

- Default ESP32 ADC has noise issues
- Using single ADC1 channel to avoid conflicts
- ADC runs continuously in main loop
- ~62.5µs per sample @ 16kHz (should be fine)

### Audio Encoding

- RAW 16-bit PCM (little-endian)
- Mono channel
- 16000 Hz sample rate
- WAV header: 44 bytes (standard format)

### Recommended Microphone Settings

- MAX4466 bias: DC coupled
- Input sensitivity: Medium (50% gain pot)
- Distance from speaker: >50cm (avoid feedback)

---

## 🐛 Troubleshooting

### Issue: No audio recorded (silent file)

**Solution:**

- Check MAX4466 connections (VCC, GND, OUT)
- Adjust gain potentiometer
- Serial debug: Check ADC values with `Serial.println(adc1_get_raw(ADC_CHANNEL))`

### Issue: Recording sounds distorted

**Solution:**

- Lower MAX4466 gain (turn pot counter-clockwise)
- Speak more quietly
- Move further from microphone

### Issue: Compiler errors with ADC

**Solution:**

- Ensure `#include <driver/adc.h>` is present
- Check pin configuration: GPIO 34 must be ADC1_CHANNEL_6
- Verify ESP32 board selected in Arduino IDE

---

## ✨ Next Steps

1. Upload the updated code to ESP32
2. Test microphone input with various gain settings
3. Monitor Serial output for ADC sample values
4. Verify backend receives audio frames
5. Test full voice assistant workflow

---

**Hardware Used:**

- MAX4466 Microphone Amplifier (Analog)
- MAX98357A Class D Amplifier (I2S)
- ESP32 (with ADC + I2S)

**Audio Path:**
Sound → MAX4466 → ADC (GPIO 34) → Processing → WAV file
Response → Backend → MAX98357A → Speaker
