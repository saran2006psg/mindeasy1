const path = require('path');
const backendDir = path.join(__dirname, '../MindEase/Backend');
const nodeModulesPath = path.join(backendDir, 'node_modules');

// Manual require for local dependencies
const dotenv = require(path.join(nodeModulesPath, 'dotenv'));
const elevenlabsService = require(path.join(backendDir, 'services', 'elevenlabsService'));
const fs = require('fs');

dotenv.config({ path: path.join(backendDir, '.env') });

async function runTranscription() {
  const mockDir = path.join(backendDir, 'mock');
  const userAudio = path.join(mockDir, 'recording.wav');
  const aiAudio = path.join(mockDir, 'voicedby.wav');

  try {
    console.log('--- USER MESSAGE TRANSCRIPTION ---');
    const userText = await elevenlabsService.transcribeAudio(userAudio);
    console.log(`USER: ${userText}`);

    console.log('\n--- AI RESPONSE TRANSCRIPTION ---');
    const aiText = await elevenlabsService.transcribeAudio(aiAudio);
    console.log(`AI: ${aiText}`);

    const result = {
      userText,
      aiText,
    };

    fs.writeFileSync(path.join(__dirname, 'transcription_result.json'), JSON.stringify(result, null, 2));
    console.log('\nResult saved to transcription_result.json');
  } catch (err) {
    console.error('Transcription failed:', err.message);
  }
}

runTranscription();
