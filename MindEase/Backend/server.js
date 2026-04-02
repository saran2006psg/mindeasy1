require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const elevenlabsService = require('./services/elevenlabsService'); // Switched to ElevenLabs
require('express-async-errors');

const mongoose = require('mongoose');
const JournalEntry = require('./models/JournalEntry');

const port = process.env.PORT || 3000;

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindease';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();

const recordFile = path.join(__dirname, 'tmp', 'recording.wav');
const voicedMp3File = path.join(__dirname, 'public', 'response.mp3');
const groqApiKey = process.env.GROQ_API_KEY;
const ngrokUrl = process.env.NGROK_URL || '';

const MENTAL_HEALTH_SYSTEM_PROMPT =
  'You are MindEase, a compassionate and insightful mental health support companion. '
  + 'Respond with warmth and genuine understanding to help users feel heard and supported. '
  + 'Provide practical, actionable advice grounded in evidence-based wellness techniques. '
  + 'Use calming language and encourage healthy coping strategies. '
  + 'Avoid medical diagnosis, but always encourage professional help if there are signs of crisis. '
  + 'Keep responses concise but meaningful, with a touch of human warmth.';

let shouldDownloadFile = false;
let journalEntries = [];

// Load mock journal data if it exists (for demo sync)
try {
  const mockJournalFile = path.join(__dirname, 'mock', 'journal.json');
  if (fs.existsSync(mockJournalFile)) {
    const mockData = JSON.parse(fs.readFileSync(mockJournalFile, 'utf8'));
    journalEntries = [...mockData];
    console.log(`✅ Loaded ${mockData.length} mock entries for software demo sync.`);
  }
} catch (error) {
  console.error('Error loading mock journal data:', error.message);
}

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use('/mock', express.static(path.join(__dirname, 'mock')));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.post('/uploadAudio', async (req, res) => {
  try {
    shouldDownloadFile = false;
    const recordingFile = fs.createWriteStream(recordFile);
    let dataSize = 0;
    let responseSent = false;
    const startTime = Date.now();

    req.on('data', (chunk) => {
      dataSize += chunk.length;
    });

    req.on('error', (err) => {
      if (!responseSent) {
        responseSent = true;
        console.error('Error receiving file:', err.message);
        res.status(500).send('Error uploading audio');
      }
    });

    recordingFile.on('error', (err) => {
      if (!responseSent) {
        responseSent = true;
        console.error('Error writing file:', err.message);
        res.status(500).send('Error writing audio file');
      }
    });

    recordingFile.on('finish', async () => {
      console.log(`Audio upload complete. Size: ${dataSize} bytes (${((Date.now() - startTime) / 1000).toFixed(2)}s)`);

      try {
        const transcription = await speechToTextAPI();

        if (transcription) {
          if (!responseSent) {
            responseSent = true;
            res.status(200).send(transcription);
          }
          await callElevenLabsForEsp32(transcription);
        } else {
          if (!responseSent) {
            responseSent = true;
            res.status(200).send('Error transcribing audio');
          }
        }
      } catch (err) {
        console.error('Error in audio processing:', err.message);
        if (!responseSent) {
          responseSent = true;
          res.status(200).send('Error processing audio');
        }
      }
    });

    req.pipe(recordingFile);
  } catch (error) {
    console.error('Unexpected error:', error.message);
    res.status(500).send('Unexpected server error');
  }
});

app.get('/checkVariable', (req, res) => {
  res.json({ ready: shouldDownloadFile });
});

app.get('/broadcastAudio', (req, res) => {
  fs.stat(voicedMp3File, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'Audio file not ready' });
    }

    if (stats.size === 0) {
      return res.status(500).json({ error: 'Audio file is empty' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);

    const readStream = fs.createReadStream(voicedMp3File);
    readStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading audio file' });
      }
    });

    readStream.pipe(res);
  });
});

app.get('/broadcastAudioMp3', (req, res) => {
  fs.stat(voicedMp3File, (err, stats) => {
    if (err) {
      return res.status(404).json({ error: 'MP3 file not ready' });
    }

    if (stats.size === 0) {
      return res.status(500).json({ error: 'MP3 file is empty' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stats.size);

    const readStream = fs.createReadStream(voicedMp3File);
    readStream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading MP3 file' });
      }
    });

    readStream.pipe(res);
  });
});

app.get('/test-audio', (req, res) => {
  res.sendFile(recordFile);
});

app.get('/test-response', (req, res) => {
  res.sendFile(voicedMp3File);
});

app.get('/test-response-mp3', (req, res) => {
  res.sendFile(voicedMp3File);
});

app.get('/status', (req, res) => {
  res.json({
    recordingExists: fs.existsSync(recordFile),
    responseExists: fs.existsSync(voicedMp3File),
    responseReady: shouldDownloadFile,
    responseReady: shouldDownloadFile,
    groqKeyConfigured: !!groqApiKey,
    elevenLabsKeyConfigured: !!process.env.ELEVENLABS_API_KEY,
    audioServiceProvider: 'ElevenLabs (Scribe STT + Multilingual TTS)',
    ngrokUrl,
  });
});

app.get('/debug-audio', (req, res) => {
  fs.stat(voicedMp3File, (err, stats) => {
    if (err) {
      return res.json({ error: 'Audio file not found', file: voicedMp3File });
    }

    const buffer = Buffer.alloc(100);
    const fd = fs.openSync(voicedMp3File, 'r');
    fs.readSync(fd, buffer, 0, 100);
    fs.closeSync(fd);

    res.json({
      fileSize: stats.size,
      firstBytesHex: buffer.slice(0, 16).toString('hex'),
      mp3Signature: buffer.slice(0, 3).toString('ascii'),
      status: buffer.slice(0, 3).toString('ascii') === 'ID3' ? 'Likely MP3 (ID3)' : 'MP3 header not ID3 (could still be valid MPEG frame)',
    });
  });
});

app.get('/list-voices', async (req, res) => {
  const voices = await elevenlabsService.getSupportedVoices();
  res.json({
    success: true,
    voices,
    currentVoice: elevenlabsService.getVoiceId(),
  });
});

app.post('/chat', async (req, res) => {
  const userMessage = (req.body?.message || '').trim();
  if (!userMessage) {
    return res.status(400).json({ success: false, error: 'Message is required.' });
  }

  const assistantResponse = await generateGroqResponse(userMessage);

  try {
    const chunkBuffers = await elevenlabsService.textToSpeechChunks(assistantResponse);
    const audioDataUrls = chunkBuffers.map((buffer) => `data:audio/mpeg;base64,${buffer.toString('base64')}`);

    // Create entry
    const tag = detectTag(`${userMessage} ${assistantResponse}`);
    const moodScore = await calculateMoodScore(userMessage, assistantResponse);
    
    const entry = new JournalEntry({
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date(),
      userMessage,
      aiResponse: assistantResponse,
      tag,
      moodScore,
      audioDataUrls,
      audioDataUrl: audioDataUrls[0] || '',
    });

    await entry.save();
    console.log('✅ Journal entry saved to MongoDB (Chat)');

    return res.json({ success: true, ...entry.toObject() });
  } catch (error) {
    console.error('Error in chat processing:', error.message);
    const tag = detectTag(`${userMessage} ${assistantResponse}`);
    
    const entry = new JournalEntry({
      id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date(),
      userMessage,
      aiResponse: assistantResponse,
      tag,
      moodScore: 5,
    });
    
    await entry.save().catch(e => console.error('Failed to save fallback entry:', e));

    return res.json({ success: true, ...entry.toObject(), warning: 'Audio generation failed' });
  }
});

app.get('/settings', (req, res) => {
  res.json({
    success: true,
    voiceId: elevenlabsService.getVoiceId(),
    voiceSettings: elevenlabsService.getVoiceSettings(),
    audioProvider: 'ElevenLabs (Scribe STT + Multilingual TTS)',
    backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
    ngrokUrl,
  });
});

app.put('/settings/voice', async (req, res) => {
  const voiceId = (req.body?.voiceId || '').trim();
  
  if (!voiceId) {
    return res.status(400).json({ success: false, error: 'voiceId is required' });
  }

  elevenlabsService.setVoiceId(voiceId);
  return res.json({ success: true, voiceId: elevenlabsService.getVoiceId() });
});

app.put('/settings/voice-config', (req, res) => {
  const stability = Number(req.body?.stability || 0.5);
  const similarityBoost = Number(req.body?.similarityBoost || 0.75);

  elevenlabsService.setVoiceSettings({ stability, similarity_boost: similarityBoost });
  return res.json({ success: true, voiceSettings: elevenlabsService.getVoiceSettings() });
});

const ttsCache = new Map();

app.post('/settings/preview', async (req, res) => {
  const previewText = (req.body?.text || 'Hello, I am MindEase. Take a deep breath. You are not alone.').trim();

  if (ttsCache.has(previewText)) {
    return res.json(ttsCache.get(previewText));
  }

  try {
    const chunkBuffers = await elevenlabsService.textToSpeechChunks(previewText);
    const audioDataUrls = chunkBuffers.map((buffer) => `data:audio/mpeg;base64,${buffer.toString('base64')}`);
    
    const result = {
      success: true,
      audioDataUrl: audioDataUrls[0] || '',
      audioDataUrls,
    };

    ttsCache.set(previewText, result);
    return res.json(result);
  } catch (error) {
    console.error('Error in preview TTS:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate preview audio' });
  }
});

app.get('/journal', async (req, res) => {
  try {
    const entries = await JournalEntry.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
  }
});

app.post('/journal', async (req, res) => {
  try {
    const body = req.body || {};
    const entry = new JournalEntry({
      id: body.id || `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: body.createdAt || new Date(),
      userMessage: body.userMessage || '',
      aiResponse: body.aiResponse || '',
      tag: body.tag || detectTag(`${body.userMessage || ''} ${body.aiResponse || ''}`),
      moodScore: body.moodScore || 5,
      audioDataUrl: body.audioDataUrl || '',
    });

    await entry.save();
    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save manual journal entry' });
  }
});

app.get('/analytics', async (req, res) => {
  try {
    const entries = await JournalEntry.find().sort({ createdAt: 1 });
    
    // Format mood data for charts
    const moodTrend = entries.map(e => ({
      date: e.createdAt.toISOString().split('T')[0],
      score: e.moodScore
    }));

    // Aggregate tags
    const tagCounts = {};
    entries.forEach(e => {
      tagCounts[e.tag] = (tagCounts[e.tag] || 0) + 1;
    });

    res.json({
      success: true,
      moodTrend,
      tagDistribution: Object.entries(tagCounts).map(([name, value]) => ({ name, value })),
      totalEntries: entries.length,
      averageMood: entries.length > 0 ? (entries.reduce((acc, curr) => acc + curr.moodScore, 0) / entries.length).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'MindEase backend is running.' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
  const interfaces = require('os').networkInterfaces();
  for (const interfaceName in interfaces) {
    const addresses = interfaces[interfaceName];
    for (const address of addresses) {
      if (address.family === 'IPv4' && !address.internal) {
        console.log(`Server IP: ${address.address}`);
      }
    }
  }
});

async function speechToTextAPI() {
  try {
    const transcription = await elevenlabsService.transcribeAudio(recordFile);
    if (!transcription) {
      throw new Error('Transcription returned empty result');
    }

    return transcription;
  } catch (error) {
    console.error('Error in speechToTextAPI:', error.message);
    return null;
  }
}

async function callElevenLabsForEsp32(text) {
  const responseText = await generateGroqResponse(text);
  try {
    // Generate voice for hardware
    await elevenlabsService.textToSpeech(responseText, voicedMp3File);
    shouldDownloadFile = true;

    // CAPTURE DATA FROM HARDWARE
    const tag = detectTag(`${text} ${responseText}`);
    const moodScore = await calculateMoodScore(text, responseText);
    
    const entry = new JournalEntry({
      id: `hw-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: new Date(),
      userMessage: text,
      aiResponse: responseText,
      tag,
      moodScore,
    });
    
    await entry.save();
    console.log('✅ Hardware conversation captured in MongoDB');
  } catch (error) {
    shouldDownloadFile = false;
    console.error('Error processing hardware conversation:', error.message);
  }
}

async function calculateMoodScore(userText, aiText) {
  try {
    const prompt = `Analyze the sentiment of this user message: "${userText}". 
    The AI responded with: "${aiText}".
    On a scale of 1 to 10 (1 being extremely distressed/sad, 10 being extremely happy/positive), what is the user's mood?
    Respond with ONLY a single number.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 5,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    const scoreStr = response?.data?.choices?.[0]?.message?.content?.trim();
    const score = parseInt(scoreStr);
    return isNaN(score) ? 5 : Math.max(1, Math.min(10, score));
  } catch (error) {
    console.warn('Mood scoring failed, defaulting to 5');
    return 5;
  }
}

async function generateGroqResponse(text) {
  try {
    if (!text || text.trim() === '' || text.toLowerCase().includes('static') || text.length < 3) {
      return "I couldn't hear you clearly. Could you try again, maybe a little slower?";
    }

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const response = await axios.post(
      apiUrl,
      {
        messages: [
          {
            role: 'system',
            content: MENTAL_HEALTH_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 320,
        top_p: 1,
        stream: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
      }
    );

    return response?.data?.choices?.[0]?.message?.content || 'I am here with you. Would you like to share a little more?';
  } catch (error) {
    console.error('Error in Groq API:', error.message);
    return "I'm here with you. I'm having a small connection issue right now, but we can keep going together.";
  }
}

function detectTag(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes('anxious') || normalized.includes('anxiety') || normalized.includes('panic')) return 'Anxiety';
  if (normalized.includes('stress') || normalized.includes('pressure') || normalized.includes('overwhelmed')) return 'Stress';
  if (normalized.includes('sleep') || normalized.includes('insomnia') || normalized.includes('night')) return 'Sleep';
  if (normalized.includes('sad') || normalized.includes('hopeless') || normalized.includes('down')) return 'Sadness';
  if (normalized.includes('motivation') || normalized.includes('goal') || normalized.includes('focus')) return 'Motivation';
  if (normalized.includes('happy') || normalized.includes('grateful') || normalized.includes('excited')) return 'Happy';
  return 'Stress';
}
