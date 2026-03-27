// Libraries
#include <driver/i2s.h>
#include <driver/adc.h>
#include <SPIFFS.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <DNSServer.h>
#include "AudioFileSourceHTTPStream.h"
#include "AudioGeneratorMP3.h"
#include "AudioOutputI2S.h"
#include "config.h"

// MAX4466 Microphone (Analog Input - ADC)
#define ADC_MIC_PIN GPIO_NUM_34         // GPIO 34 for analog input (ADC)
#define ADC_ATTENUATION ADC_ATTEN_DB_12 // ADC attenuation for 0-3.6V range (was ADC_ATTEN_DB_11)
#define ADC_RESOLUTION ADC_WIDTH_BIT_12
#define ADC_CHANNEL ADC1_CHANNEL_6 // GPIO 34 maps to ADC1_CHANNEL_6

// MAX98357A Ports (I2S Output - Speaker)
#define I2S_DOUT 22 // DIN
#define I2S_BCLK 26 // BCLK
#define I2S_LRC 25  // LRC

// No button or LED components in this version
// Use Serial commands to trigger recording

// AP Mode Configuration
#define AP_SSID "Le"
#define AP_PASSWORD "12345678"
#define AP_CONFIG_TIMEOUT 300000 // 5 minutes timeout for configuration

// Server URL Selection - Choose which backend to use
// Set to 1 for LOCAL_IP (same WiFi network) or 0 for NGROK (remote access)
#define USE_LOCAL_SERVER 1 // Change to 0 to use ngrok instead

// DNS and webserver for captive portal
const byte DNS_PORT = 53;
IPAddress apIP(192, 168, 4, 1);
DNSServer dnsServer;
WebServer webServer(80);

// Configuration variables
String configSSID = "";
String configPassword = "";
String configServerIP = "";
bool configComplete = false;

volatile bool workflowInProgress = false;

// MAX98357A I2S Setup
#define MAX_I2S_NUM I2S_NUM_1
#define MAX_I2S_SAMPLE_BITS (16)
#define MAX_I2S_READ_LEN (256)
#define MAX_I2S_SAMPLE_RATE (16000)

// ADC Microphone Setup
#define ADC_SAMPLE_RATE (16000)
#define ADC_SAMPLE_BITS (16)
#define ADC_READ_LEN (1024)
#define RECORD_TIME (5) // Seconds
#define ADC_CHANNEL_NUM (1)
#define FLASH_RECORD_SIZE (ADC_CHANNEL_NUM * ADC_SAMPLE_RATE * ADC_SAMPLE_BITS / 8 * RECORD_TIME)

// Microphone processing tuning for a cleaner, passable voice capture.
#define MIC_ADC_CENTER (2048)
#define MIC_DC_SMOOTH_SHIFT (6) // 1/64 smoothing for DC offset tracking
#define MIC_NOISE_GATE_ADC (24) // Ignore very low-level background hiss
#define MIC_GAIN_X10 (18)       // 1.8x digital gain

File file;
const char audioRecordfile[] = "/recording.wav";
const char audioResponsefile[] = "/voicedby.wav";
const int headerSize = 44;
unsigned long startMicros;

bool isWIFIConnected = false;

// Dynamic server URLs that will be updated based on configuration
String serverUploadUrl;
String serverBroadcastUrl;
String broadcastPermitionUrl;

// Function prototypes
void SPIFFSInit();
void listSPIFFS(void);
void adcInitMicrophone();
void i2sInitMax98357A();
void wavHeader(byte *header, int wavSize);
void ADCDataScale(uint16_t *d_buff, uint16_t adc_raw);
void printSpaceInfo();
bool connectToWifi();
void handleVoiceAssistantWorkflow();
void recordAudio();
bool uploadFile(); // Returns true if successful
void waitForResponseAndPlay();
void testSpeaker();
void testMp3Playback();
void startConfigPortal();
void handleRoot();
void handleSave();
void handleNotFound();
void updateServerUrls();
bool tryHardcodedWifi();

void setup()
{
  Serial.begin(115200);
  delay(500);

  Serial.println("\n========================================");
  Serial.println("  🎙️ MindEase Voice Assistant");
  Serial.println("========================================");
  Serial.println("Commands:");
  Serial.println("  'start' or 's' - Start voice recording");
  Serial.println("  'test' or 't' - Play test speaker beep");
  Serial.println("  'test_mp3' - Stream and play a sample MP3 song");
  Serial.println("  'status' - Check WiFi status");
  Serial.println("========================================\n");

  // Initialize SPIFFS
  SPIFFSInit();

  // Initialize ADC for MAX4466 microphone and I2S for MAX98357A speaker
  adcInitMicrophone();
  i2sInitMax98357A();

  // First try to connect using hardcoded credentials
  isWIFIConnected = tryHardcodedWifi();

  // If hardcoded connection fails, start configuration portal
  if (!isWIFIConnected)
  {
    startConfigPortal();

    // After configuration, connect to the configured WiFi
    if (configComplete)
    {
      isWIFIConnected = connectToWifi();
    }
  }
  else
  {
    // If hardcoded connection succeeds, set as configured
    configComplete = true;
    configSSID = WIFI_SSID;
    configPassword = WIFI_PASSWORD;
    // No need to set configServerIP as we'll use the static URL
  }

  // Update server URLs with the static URL
  updateServerUrls();

  Serial.println("\n✅ Setup complete!");
  Serial.println("Type 'start' or 's' in Serial Monitor to begin recording.");
}

void updateServerUrls()
{
  String baseUrl;

#if USE_LOCAL_SERVER
  // ============================================================
  // Option 1: LOCAL IP (Recommended for same WiFi testing)
  // - Faster response time
  // - No dependency on ngrok tunnel
  // - Works only on same WiFi network (10.111.206.74)
  // ============================================================
  baseUrl = "http://10.111.206.74:3000";
  Serial.println("\n✅ Using LOCAL SERVER IP (same WiFi)");
#else
  // ============================================================
  // Option 2: NGROK URL (For remote access from anywhere)
  // - Can access from any network
  // - Public internet access
  // - May have slight latency
  // - Free tier may expire after 2 hours
  // ============================================================
  baseUrl = "https://perceptibly-preceremonial-madison.ngrok-free.dev";
  Serial.println("\n📡 Using NGROK TUNNEL (remote access)");
#endif

  serverUploadUrl = baseUrl + "/uploadAudio";
  serverBroadcastUrl = baseUrl + "/broadcastAudio";
  broadcastPermitionUrl = baseUrl + "/checkVariable";

  Serial.println("\nServer URLs updated:");
  Serial.println("Base URL: " + baseUrl);
  Serial.println("Upload URL: " + serverUploadUrl);
  Serial.println("Broadcast URL: " + serverBroadcastUrl);
  Serial.println("Permission URL: " + broadcastPermitionUrl);
  Serial.println("=" + String(50, '='));
}

void startConfigPortal()
{
  Serial.println("Starting configuration portal...");

  // Set up AP mode
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  // Start DNS server for captive portal
  dnsServer.start(DNS_PORT, "*", apIP);

  // Setup web server routes
  webServer.on("/", HTTP_GET, handleRoot);
  webServer.on("/save", HTTP_POST, handleSave);
  webServer.onNotFound(handleNotFound);
  webServer.begin();

  Serial.println("Configuration portal started!");
  Serial.println("Connect to WiFi network: " + String(AP_SSID));
  Serial.println("Password: " + String(AP_PASSWORD));
  Serial.println("Then navigate to http://192.168.4.1 to configure");

  // Wait for configuration or timeout
  unsigned long startTime = millis();
  while (!configComplete && (millis() - startTime < AP_CONFIG_TIMEOUT))
  {
    dnsServer.processNextRequest();
    webServer.handleClient();
    delay(10);
  }

  // If timed out without configuration, use defaults if available
  if (!configComplete)
  {
    Serial.println("Configuration portal timed out. Using default settings if available.");

// Check if config.h has WiFi credentials defined
#ifdef WIFI_SSID
    configSSID = WIFI_SSID;
    configPassword = WIFI_PASSWORD;
    configServerIP = "192.168.81.41"; // Default server IP
    configComplete = true;
#else
    Serial.println("No default settings available. Device may not function properly.");
#endif
  }

  // Stop AP mode properly
  webServer.stop();
  dnsServer.stop();
  WiFi.softAPdisconnect(true);

  // Switch mode and prepare for station connection
  WiFi.mode(WIFI_OFF);
  delay(500);
  WiFi.mode(WIFI_STA);
  delay(100);
}

void handleRoot()
{
  String html = "<!DOCTYPE html><html><head><title>MideEase Configuration</title>"
                "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                "<style>"
                "body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }"
                ".container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }"
                "h1 { color: #333; text-align: center; margin-bottom: 20px; }"
                "label { display: block; margin-bottom: 5px; font-weight: bold; }"
                "input[type='text'], input[type='password'] { width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }"
                "button { background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; font-size: 16px; border-radius: 5px; cursor: pointer; width: 100%; }"
                "button:hover { background-color: #45a049; }"
                ".hint { font-size: 12px; color: #666; margin-top: -15px; margin-bottom: 15px; }"
                "</style></head>"
                "<body><div class='container'>"
                "<h1>MideEase Configuration</h1>"
                "<form action='/save' method='post'>"
                "<label for='ssid'>WiFi Network Name:</label>"
                "<input type='text' id='ssid' name='ssid' placeholder='Enter your WiFi SSID' required>"
                "<label for='password'>WiFi Password:</label>"
                "<input type='password' id='password' name='password' placeholder='Enter your WiFi password' required>"
                "<div class='hint'>Password must be at least 8 characters</div>"
                "<button type='submit'>Save and Connect</button>"
                "</form></div></body></html>";
  webServer.send(200, "text/html", html);
}

void handleSave()
{
  if (webServer.hasArg("ssid") && webServer.hasArg("password"))
  {
    String ssid = webServer.arg("ssid");
    String password = webServer.arg("password");

    // Simple validation
    if (ssid.length() == 0 || password.length() < 8)
    {
      String errorHtml = "<!DOCTYPE html><html><head><title>Configuration Error</title>"
                         "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                         "<style>body {font-family: Arial; text-align: center;} "
                         ".container {max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc;}"
                         "h1 {color: #f44336;}</style></head>"
                         "<body><div class='container'>"
                         "<h1>Configuration Error</h1>"
                         "<p>Please ensure all fields are filled correctly:</p>"
                         "<ul style='text-align: left;'>";

      if (ssid.length() == 0)
        errorHtml += "<li>SSID cannot be empty</li>";
      if (password.length() < 8)
        errorHtml += "<li>Password must be at least 8 characters</li>";

      errorHtml += "</ul><p><a href='/'>Back to Configuration</a></p></div></body></html>";

      webServer.send(400, "text/html", errorHtml);
      return;
    }

    // Save the configuration
    configSSID = ssid;
    configPassword = password;
    // Server URL is now static, no need to collect it

    String html = "<!DOCTYPE html><html><head><title>Configuration Saved</title>"
                  "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                  "<style>"
                  "body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; text-align: center; }"
                  ".container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }"
                  "h1 { color: #4CAF50; }"
                  "p { margin-bottom: 20px; }"
                  ".loader { border: 5px solid #f3f3f3; border-top: 5px solid #4CAF50; border-radius: 50%; width: 50px; height: 50px; animation: spin 2s linear infinite; margin: 20px auto; }"
                  "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }"
                  "</style></head>"
                  "<body><div class='container'>"
                  "<h1>Configuration Saved!</h1>"
                  "<p>The device will now attempt to connect to your WiFi network.</p>"
                  "<div class='loader'></div>"
                  "<p>You can close this page.</p>"
                  "</div></body></html>";
    webServer.send(200, "text/html", html);

    Serial.println("Configuration received:");
    Serial.println("SSID: " + configSSID);

    configComplete = true;
  }
  else
  {
    webServer.send(400, "text/plain", "Missing required parameters");
  }
}

void handleNotFound()
{
  // Check if the request is for a recognized file type
  String uri = webServer.uri();
  if (uri.endsWith(".css") || uri.endsWith(".js") || uri.endsWith(".ico") || uri.endsWith(".png"))
  {
    // For web resources, return a 404
    webServer.send(404, "text/plain", "File not found");
  }
  else
  {
    // For all other requests, redirect to the main configuration page
    // This creates a proper captive portal experience
    String redirectUrl = "http://192.168.4.1/";
    webServer.sendHeader("Location", redirectUrl, true);
    webServer.send(302, "text/plain", "");
  }
}

void loop()
{
  // If WiFi is disconnected, try to reconnect
  if (isWIFIConnected && WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi connection lost. Reconnecting...");
    isWIFIConnected = connectToWifi();
  }

  // Check for Serial commands
  if (Serial.available() > 0 && !workflowInProgress)
  {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toLowerCase();

    if (command == "start" || command == "s")
    {
      Serial.println("\n🎤 Starting voice assistant workflow...\n");
      workflowInProgress = true;
      handleVoiceAssistantWorkflow();
      workflowInProgress = false;
      Serial.println("\n✅ Ready for next command. Type 'start' or 's' to begin.");
    }
    else if (command == "test" || command == "t")
    {
      Serial.println("\n🔊 Testing speaker...\n");
      testSpeaker();
      Serial.println("\n✅ Test complete. Type 'test' to try again.");
    }
    else if (command == "test_mp3")
    {
      Serial.println("\n🎵 Testing MP3 Playback...");
      testMp3Playback();
      Serial.println("\n✅ MP3 Test complete.");
    }
    else if (command == "status")
    {
      Serial.println("\n📊 Status:");
      Serial.print("WiFi: ");
      Serial.println(isWIFIConnected ? "Connected" : "Disconnected");
      if (isWIFIConnected)
      {
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("Signal: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
      }
      Serial.println();
    }
    else if (command.length() > 0)
    {
      Serial.println("❌ Unknown command. Use 'start', 's', 'test', 't', 'test_mp3', or 'status'");
    }
  }

  delay(100);
}

bool connectToWifi()
{
  // Ensure WiFi is in station mode
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);

  Serial.print("Connecting to WiFi: ");

  // Use the configured WiFi credentials
  if (configComplete)
  {
    Serial.println(configSSID);
    WiFi.begin(configSSID.c_str(), configPassword.c_str());
  }
  else
  {
    // Fallback to config.h credentials if configuration wasn't completed
    Serial.println(WIFI_SSID);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }

  // Wait longer for connection - some networks take time
  int attempts = 0;
  const int maxAttempts = 30; // Increased from 20 to 30

  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\nConnected to WiFi!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  else
  {
    Serial.println("\nFailed to connect to WiFi!");
    Serial.println("SSID: " + (configComplete ? configSSID : String(WIFI_SSID)));
    Serial.println("Status code: " + String(WiFi.status()));
    return false;
  }
}

void SPIFFSInit()
{
  if (!SPIFFS.begin(true))
  {
    Serial.println("SPIFFS initialization failed!");
    while (1)
      yield();
  }
  Serial.println("SPIFFS initialized");

  // List files
  listSPIFFS();
}

void handleVoiceAssistantWorkflow()
{
  unsigned long totalStart = millis();

  // Check WiFi and reconnect if needed
  if (WiFi.status() != WL_CONNECTED)
  {
    if (!connectToWifi())
    {
      Serial.println("Cannot proceed without WiFi connection");
      return;
    }
    isWIFIConnected = true;
  }

  // Clean up any existing files
  if (SPIFFS.exists(audioRecordfile))
  {
    SPIFFS.remove(audioRecordfile);
  }
  if (SPIFFS.exists(audioResponsefile))
  {
    SPIFFS.remove(audioResponsefile);
  }

  // Prepare recording file
  file = SPIFFS.open(audioRecordfile, FILE_WRITE);
  if (!file)
  {
    Serial.println("Failed to open file for writing");
    return;
  }

  // Write WAV header
  byte header[headerSize];
  wavHeader(header, FLASH_RECORD_SIZE);
  file.write(header, headerSize);

  // Record audio
  unsigned long t1 = millis();
  recordAudio();
  Serial.printf("Time taken for recording: %lu ms\n", millis() - t1);

  // Upload to server
  t1 = millis();
  bool uploadSuccess = uploadFile();
  Serial.printf("Time taken for upload: %lu ms\n", millis() - t1);

  // Clean up recording file to save space
  if (SPIFFS.exists(audioRecordfile))
  {
    SPIFFS.remove(audioRecordfile);
  }

  // Only wait for and play response if upload was successful
  if (uploadSuccess)
  {
    t1 = millis();
    waitForResponseAndPlay();
    Serial.printf("Time taken for wait + playback: %lu ms\n", millis() - t1);
  }
  else
  {
    Serial.println("❌ Skipping response playback due to upload failure");
  }

  Serial.printf("Total workflow time: %lu ms\n", millis() - totalStart);

  // Clean up response file
  if (SPIFFS.exists(audioResponsefile))
  {
    SPIFFS.remove(audioResponsefile);
  }
  Serial.println("Workflow completed. Ready for next command.");
}

void recordAudio()
{
  Serial.println(" *** Get Ready to Speak *** ");

  delay(500); // Small delay before starting

  Serial.println(" *** Recording Start *** ");

  int flash_wr_size = 0;
  int32_t dcEstimate = MIC_ADC_CENTER;
  uint16_t *adc_buff = (uint16_t *)calloc(ADC_READ_LEN, sizeof(uint16_t));
  uint8_t *flash_write_buff = (uint8_t *)calloc(ADC_READ_LEN * 2, sizeof(uint8_t));

  while (flash_wr_size < FLASH_RECORD_SIZE)
  {
    // Read ADC samples
    for (int i = 0; i < ADC_READ_LEN; i++)
    {
      adc_buff[i] = adc1_get_raw(ADC_CHANNEL);
    }

    // Convert ADC raw values to 16-bit audio and write to buffer
    for (int i = 0; i < ADC_READ_LEN; i++)
    {
      // Track and remove slow DC drift, then apply a soft noise gate + gain.
      int32_t raw = adc_buff[i];
      dcEstimate += (raw - dcEstimate) >> MIC_DC_SMOOTH_SHIFT;

      int32_t centered = raw - dcEstimate;
      if (centered < MIC_NOISE_GATE_ADC && centered > -MIC_NOISE_GATE_ADC)
      {
        centered = 0;
      }

      int32_t amplified = (centered * MIC_GAIN_X10) / 10;
      int32_t sample32 = amplified << 4;

      if (sample32 > 32767)
      {
        sample32 = 32767;
      }
      else if (sample32 < -32768)
      {
        sample32 = -32768;
      }

      int16_t audio_sample = (int16_t)sample32;
      flash_write_buff[i * 2] = audio_sample & 0xFF;
      flash_write_buff[i * 2 + 1] = (audio_sample >> 8) & 0xFF;
    }

    // Write to file
    file.write(flash_write_buff, ADC_READ_LEN * 2);
    flash_wr_size += ADC_READ_LEN * 2;

    Serial.printf("Sound recording %u%%\n", flash_wr_size * 100 / FLASH_RECORD_SIZE);

    // Small delay to avoid overwhelming the ADC
    delay(1);
  }

  file.close();

  free(adc_buff);
  free(flash_write_buff);

  Serial.println("Recording completed");
  listSPIFFS();
  startMicros = micros(); // Start time
}

bool uploadFile()
{
  file = SPIFFS.open(audioRecordfile, FILE_READ);
  if (!file)
  {
    Serial.println("FILE IS NOT AVAILABLE!");
    return false;
  }

  Serial.println("===> Upload FILE to Node.js Server");
  Serial.printf("Free heap before upload: %u bytes\n", ESP.getFreeHeap());

  HTTPClient client;
  client.begin(serverUploadUrl);
  client.addHeader("Content-Type", "audio/wav");
  client.setTimeout(60000); // Wait up to 60 seconds for upload
  // client.setReuse(true);              // optional: reuse the TCP connection
  delay(500); // Give ESP some breathing time
  yield();    // Yield to WiFi task scheduler
  int httpResponseCode = client.sendRequest("POST", &file, file.size());

  Serial.print("httpResponseCode : ");
  Serial.println(httpResponseCode);

  bool success = false;
  if (httpResponseCode == 200)
  {
    String response = client.getString();
    Serial.println("==================== Transcription ====================");
    Serial.println(response);
    Serial.println("====================      End      ====================");
    success = true;
  }
  else
  {
    Serial.printf("Upload failed, error code: %d\n", httpResponseCode);
    if (httpResponseCode == -11)
    {
      Serial.println("Likely memory or timeout issue. Try increasing timeout or reducing file size.");
    }
    else if (httpResponseCode == -3)
    {
      Serial.println("Error -3: Connection failed. Check WiFi and server availability.");
    }
    success = false;
  }

  file.close();
  client.end();
  return success;
}

void waitForResponseAndPlay()
{
  int maxAttempts = 120; // Increased from 30 to 120 (60 seconds with 500ms delay)
  bool responseReady = false;

  Serial.println("Waiting for server processing...");

  for (int i = 0; i < maxAttempts; i++)
  {
    HTTPClient http; // Create fresh for each request
    http.begin(broadcastPermitionUrl);
    http.setTimeout(3000); // Set timeout for this request
    int httpResponseCode = http.GET();

    if (httpResponseCode == 200)
    {
      String payload = http.getString();
      http.end();
      if (payload.indexOf("\"ready\":true") > -1)
      {
        responseReady = true;
        break;
      }
    }
    else if (httpResponseCode < 0)
    {
      Serial.printf("Check request error: %d. Retrying... (%d/%d)\n", httpResponseCode, i + 1, maxAttempts);
    }

    http.end();
    delay(500);
  }

  if (!responseReady)
  {
    Serial.println("❌ Server response timeout - LLM processing took too long");
    return;
  }

  Serial.println("✓ Server response ready. Playing audio...");

  // Create a fresh HTTP connection for audio download
  HTTPClient audioHttp;
  audioHttp.begin(serverBroadcastUrl);
  audioHttp.setTimeout(30000); // 30 second timeout for audio download
  int httpCode = audioHttp.GET();

  if (httpCode != 200)
  {
    Serial.printf("❌ Failed to get audio, error code: %d\n", httpCode);
    audioHttp.end();
    return;
  }

  WiFiClient *stream = audioHttp.getStreamPtr();

  // Validate stream is not null
  if (stream == nullptr)
  {
    Serial.println("❌ Error: Stream pointer is null");
    audioHttp.end();
    return;
  }

  size_t contentLength = audioHttp.getSize();

  // Validate content length
  if (contentLength <= 44)
  {
    Serial.println("❌ Error: Audio file too small or empty (size: " + String(contentLength) + " bytes)");
    audioHttp.end();
    return;
  }

  Serial.printf("Audio file size: %d bytes\n", contentLength);

  // Skip WAV header
  uint8_t header_buffer[44];
  int header_bytes_read = 0;
  int attempts = 0;
  while (header_bytes_read < 44 && attempts < 100)
  {
    int len = stream->read(header_buffer + header_bytes_read, 44 - header_bytes_read);
    if (len > 0)
      header_bytes_read += len;
    else
    {
      delay(10);
      attempts++;
    }
  }

  if (header_bytes_read < 44)
  {
    Serial.println("❌ Error: Could not read WAV header");
    audioHttp.end();
    return;
  }

  // Debug: Print WAV header info
  Serial.println("\n📊 WAV Header Analysis:");
  Serial.printf("  RIFF Marker: %c%c%c%c\n", header_buffer[0], header_buffer[1], header_buffer[2], header_buffer[3]);
  Serial.printf("  WAVE Marker: %c%c%c%c\n", header_buffer[8], header_buffer[9], header_buffer[10], header_buffer[11]);

  uint16_t channels = header_buffer[22] | (header_buffer[23] << 8);
  uint32_t sampleRate = header_buffer[24] | (header_buffer[25] << 8) | (header_buffer[26] << 16) | (header_buffer[27] << 24);
  uint16_t bitsPerSample = header_buffer[34] | (header_buffer[35] << 8);

  Serial.printf("  Channels: %d\n", channels);
  Serial.printf("  Sample Rate: %u Hz\n", sampleRate);
  Serial.printf("  Bits per Sample: %d\n", bitsPerSample);
  Serial.printf("  Expected Duration: %.2f seconds\n", (float)(contentLength - 44) / (sampleRate * channels * bitsPerSample / 8));
  Serial.println();

  uint8_t buffer[512];        // Smaller read buffer
  int16_t stereo_buffer[512]; // Smaller stereo buffer
  size_t total_bytes_written = 0;
  int no_data_count = 0;
  uint8_t leftover_byte = 0;
  bool has_leftover = false;

  i2s_zero_dma_buffer(MAX_I2S_NUM);

  while (total_bytes_written < contentLength - 44)
  {
    // If we have a leftover byte, read one less
    int max_to_read = sizeof(buffer) - (has_leftover ? 1 : 0);
    // Don't read past the end of the file
    size_t remaining = (contentLength - 44) - total_bytes_written;
    if (max_to_read > remaining)
      max_to_read = remaining;

    int len = stream->read(buffer + (has_leftover ? 1 : 0), max_to_read);

    if (len > 0)
    {
      no_data_count = 0;

      int total_len = len + (has_leftover ? 1 : 0);
      int num_samples = total_len / 2;

      has_leftover = (total_len % 2 != 0);
      if (has_leftover)
      {
        leftover_byte = buffer[total_len - 1]; // Save the odd byte
      }

      // Convert mono 16-bit samples to stereo
      for (int i = 0; i < num_samples; i++)
      {
        int16_t mono_sample = ((int16_t *)buffer)[i];
        stereo_buffer[i * 2] = mono_sample;     // Left
        stereo_buffer[i * 2 + 1] = mono_sample; // Right
      }

      // Move leftover byte to front for next iteration
      if (has_leftover)
      {
        buffer[0] = leftover_byte;
      }

      size_t written;
      i2s_write(MAX_I2S_NUM, stereo_buffer, num_samples * 4, &written, portMAX_DELAY);
      // We read `len` bytes from the stream
      total_bytes_written += len;
    }
    else
    {
      no_data_count++;
      if (no_data_count > 100) // 1 second timeout (100 * 10ms)
      {
        Serial.println("⚠️  Warning: Stream timeout during playback");
        break;
      }
      delay(10); // small wait for more data
    }
  }

  delay(500); // Let audio complete
  i2s_stop(MAX_I2S_NUM);
  i2s_zero_dma_buffer(MAX_I2S_NUM);
  i2s_start(MAX_I2S_NUM);
  Serial.printf("✓ Audio playback completed (%d bytes played)\n", total_bytes_written);

  audioHttp.end();
}

void testSpeaker()
{
  // Generate a simple 1000Hz test tone for 1 second
  Serial.println("🔊 Testing speaker with 1000Hz tone...");

  const int sample_rate = 16000;
  const int duration_ms = 1000;
  const int frequency = 1000; // 1000 Hz tone
  const int amplitude = 8000; // Volume level (max 32767)

  int num_samples = (sample_rate * duration_ms) / 1000;
  int16_t sample_buffer[512];

  i2s_zero_dma_buffer(MAX_I2S_NUM);

  for (int i = 0; i < num_samples; i += 256)
  {
    int samples_to_generate = min(256, num_samples - i);

    for (int j = 0; j < samples_to_generate; j++)
    {
      // Generate sine wave
      float t = (float)(i + j) / sample_rate;
      float value = sin(2.0 * PI * frequency * t) * amplitude;
      sample_buffer[j * 2] = (int16_t)value;     // Left channel
      sample_buffer[j * 2 + 1] = (int16_t)value; // Right channel
    }

    size_t bytes_written;
    i2s_write(MAX_I2S_NUM, sample_buffer, samples_to_generate * 4, &bytes_written, portMAX_DELAY);
  }

  delay(100);
  i2s_zero_dma_buffer(MAX_I2S_NUM);
  Serial.println("✅ Test tone complete. Did you hear a beep?");
}

void testMp3Playback()
{
  Serial.println("Temporarily uninstalling I2S driver for MP3 playback...");
  i2s_driver_uninstall(MAX_I2S_NUM);

  AudioGeneratorMP3 *mp3 = new AudioGeneratorMP3();
  AudioFileSourceHTTPStream *file = new AudioFileSourceHTTPStream("http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3");
  AudioOutputI2S *out = new AudioOutputI2S();

  out->SetPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  out->SetGain(0.5);

  Serial.println("Starting MP3 playback from HTTP stream...");
  mp3->begin(file, out);

  while (mp3->isRunning())
  {
    if (!mp3->loop())
    {
      mp3->stop();
      Serial.println("MP3 playback finished\n");
    }
  }

  // Cleanup
  delete mp3;
  delete file;
  delete out;

  Serial.println("Re-initializing I2S for default functionality...");
  i2sInitMax98357A();
}

void adcInitMicrophone()
{
  // Configure ADC for MAX4466 microphone
  Serial.println("Initializing ADC for MAX4466 microphone...");

  // Configure ADC1 for analog input
  adc1_config_width(ADC_RESOLUTION);
  adc1_config_channel_atten(ADC_CHANNEL, ADC_ATTENUATION);

  // Disable the digital part of GPIO 34 to use it as ADC input
  gpio_set_direction(ADC_MIC_PIN, GPIO_MODE_DISABLE);

  Serial.println("ADC Microphone initialized successfully");
  Serial.println("Configuration:");
  Serial.println("  - Input PIN: GPIO 34 (ADC1_CHANNEL_6)");
  Serial.println("  - Sample Rate: 16000 Hz");
  Serial.println("  - Bit Depth: 16-bit");
  Serial.println("  - Attenuation: 12dB (0-3.6V range)");
}

void i2sInitMax98357A()
{
  // Initialize I2S for MAX98357A speaker (I2S TX only)
  Serial.println("Initializing I2S for MAX98357A speaker...");

  i2s_config_t i2s_config = {
      .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
      .sample_rate = MAX_I2S_SAMPLE_RATE,
      .bits_per_sample = i2s_bits_per_sample_t(MAX_I2S_SAMPLE_BITS),
      .channel_format = I2S_CHANNEL_FMT_RIGHT_LEFT,                           // Stereo output
      .communication_format = (i2s_comm_format_t)(I2S_COMM_FORMAT_STAND_I2S), // Standard I2S format
      .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,                               // Use interrupt level 1
      .dma_buf_count = 6,                                                     // 6 buffers for stable playback
      .dma_buf_len = 256,                                                     // Smaller buffers for lower latency
      .use_apll = false,
      .tx_desc_auto_clear = true,
      .fixed_mclk = 0};

  i2s_pin_config_t pin_config = {
      .bck_io_num = I2S_BCLK,   // GPIO 26 - Bit clock
      .ws_io_num = I2S_LRC,     // GPIO 25 - Word select (Left/Right clock)
      .data_out_num = I2S_DOUT, // GPIO 22 - Data output
      .data_in_num = -1};       // No input

  i2s_driver_install(MAX_I2S_NUM, &i2s_config, 0, NULL);
  i2s_set_pin(MAX_I2S_NUM, &pin_config);
  i2s_zero_dma_buffer(MAX_I2S_NUM);
  i2s_start(MAX_I2S_NUM); // Start the I2S interface

  Serial.println("✓ I2S Speaker initialized successfully");
  Serial.println("Configuration:");
  Serial.println("  - DIN (Data): GPIO 22");
  Serial.println("  - BCLK (Bit Clock): GPIO 26");
  Serial.println("  - LRC (Word Select): GPIO 25");
  Serial.println("  - Sample Rate: 16000 Hz");
  Serial.println("  - Bit Depth: 16-bit");
  Serial.println("  - Format: Standard I2S");
  Serial.println("  - DMA: 6 buffers x256 bytes");
}

void ADCDataScale(uint16_t *d_buff, uint16_t adc_raw)
{
  // Convert 12-bit ADC (0-4095) to 16-bit audio (-32768 to 32767)
  // Subtract offset to center around 0, then shift to 16-bit range
  int16_t audio_sample = (int16_t)((adc_raw - 2048) << 4);
  d_buff[0] = (uint16_t)audio_sample;
}

void wavHeader(byte *header, int wavSize)
{
  header[0] = 'R';
  header[1] = 'I';
  header[2] = 'F';
  header[3] = 'F';
  unsigned int fileSize = wavSize + headerSize - 8;
  header[4] = (byte)(fileSize & 0xFF);
  header[5] = (byte)((fileSize >> 8) & 0xFF);
  header[6] = (byte)((fileSize >> 16) & 0xFF);
  header[7] = (byte)((fileSize >> 24) & 0xFF);
  header[8] = 'W';
  header[9] = 'A';
  header[10] = 'V';
  header[11] = 'E';
  header[12] = 'f';
  header[13] = 'm';
  header[14] = 't';
  header[15] = ' ';
  header[16] = 0x10;
  header[17] = 0x00;
  header[18] = 0x00;
  header[19] = 0x00;
  header[20] = 0x01;
  header[21] = 0x00;
  header[22] = 0x01;
  header[23] = 0x00;
  header[24] = 0x80; // 16000 & 0xFF
  header[25] = 0x3E; // (16000 >> 8) & 0xFF
  header[26] = 0x00;
  header[27] = 0x00;
  header[28] = 0x00; // 32000 & 0xFF
  header[29] = 0x7D; // (32000 >> 8) & 0xFF
  header[30] = 0x00; // (32000 >> 16) & 0xFF
  header[31] = 0x00;
  header[32] = 0x02;
  header[33] = 0x00;
  header[34] = 0x10;
  header[35] = 0x00;
  header[36] = 'd';
  header[37] = 'a';
  header[38] = 't';
  header[39] = 'a';
  header[40] = (byte)(wavSize & 0xFF);
  header[41] = (byte)((wavSize >> 8) & 0xFF);
  header[42] = (byte)((wavSize >> 16) & 0xFF);
  header[43] = (byte)((wavSize >> 24) & 0xFF);
}

void listSPIFFS(void)
{
  // DEBUG
  printSpaceInfo();
  Serial.println(F("\r\nListing SPIFFS files:"));
  static const char line[] PROGMEM = "=================================================";

  Serial.println(FPSTR(line));
  Serial.println(F("  File name                              Size"));
  Serial.println(FPSTR(line));

  fs::File root = SPIFFS.open("/");
  if (!root)
  {
    Serial.println(F("Failed to open directory"));
    return;
  }
  if (!root.isDirectory())
  {
    Serial.println(F("Not a directory"));
    return;
  }

  fs::File file = root.openNextFile();
  while (file)
  {
    if (file.isDirectory())
    {
      Serial.print("DIR : ");
      String fileName = file.name();
      Serial.print(fileName);
    }
    else
    {
      String fileName = file.name();
      Serial.print("  " + fileName);
      // File path can be 31 characters maximum in SPIFFS
      int spaces = 33 - fileName.length(); // Tabulate nicely
      if (spaces < 1)
        spaces = 1;
      while (spaces--)
        Serial.print(" ");
      String fileSize = (String)file.size();
      spaces = 10 - fileSize.length(); // Tabulate nicely
      if (spaces < 1)
        spaces = 1;
      while (spaces--)
        Serial.print(" ");
      Serial.println(fileSize + " bytes");
    }

    file = root.openNextFile();
  }

  Serial.println(FPSTR(line));
  Serial.println();
  delay(1000);
}

void printSpaceInfo()
{
  size_t totalBytes = SPIFFS.totalBytes();
  size_t usedBytes = SPIFFS.usedBytes();
  size_t freeBytes = totalBytes - usedBytes;

  Serial.print("Total space: ");
  Serial.println(totalBytes);
  Serial.print("Used space: ");
  Serial.println(usedBytes);
  Serial.print("Free space: ");
  Serial.println(freeBytes);
}
bool tryHardcodedWifi()
{
  // Try to connect with hardcoded WiFi credentials from config.h
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(100);

  Serial.print("Connecting to hardcoded WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Try to connect 3 times
  int attempts = 0;
  const int maxAttempts = 3;

  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts)
  {
    delay(1000);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("\nConnected to WiFi!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  else
  {
    Serial.println("\nFailed to connect using hardcoded credentials.");
    return false;
  }
}