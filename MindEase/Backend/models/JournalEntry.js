const mongoose = require('mongoose');

const JournalEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  userMessage: { type: String, required: true },
  aiResponse: { type: String, required: true },
  tag: { type: String, default: 'Stress' },
  moodScore: { type: Number, min: 1, max: 10, default: 5 },
  audioDataUrl: { type: String, default: '' },
  audioDataUrls: { type: [String], default: [] },
});

module.exports = mongoose.model('JournalEntry', JournalEntrySchema);
