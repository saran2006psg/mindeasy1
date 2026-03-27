#include <Arduino.h>
#include <WiFi.h>
#include "AudioFileSourceICYStream.h"
#include "AudioFileSourceHTTPStream.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"

// WiFi Credentials
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// MAX98357A I2S Pins
#define I2S_DOUT 22 // DIN
#define I2S_BCLK 26 // BCLK
#define I2S_LRC 25  // LRC

// Audio objects
AudioGeneratorMP3 *mp3;
AudioFileSourceHTTPStream *file;
AudioOutputI2S *out;

void setup()
{
    Serial.begin(115200);
    delay(1000);

    // Connect to WiFi
    Serial.printf("Connecting to %s ", ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }
    Serial.println(" CONNECTED");

    // Setup I2S output for Speaker
    out = new AudioOutputI2S();
    out->SetPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);

    // Set lower gain/volume if it's too loud
    out->SetGain(0.5);

    // Setup MP3 Decoder
    mp3 = new AudioGeneratorMP3();

    // A royalty-free sample MP3 stream URL
    file = new AudioFileSourceHTTPStream("http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3");

    Serial.println("Starting MP3 playback...");
    mp3->begin(file, out);
}

void loop()
{
    if (mp3->isRunning())
    {
        if (!mp3->loop())
        {
            mp3->stop();
            Serial.println("MP3 playback finished");
        }
    }
    else
    {
        // restart after a delay or just wait
        delay(1000);
    }
}
