const mongoose = require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['learner', 'admin'], default: 'learner' }
}, { timestamps: true }));

// One document per (user, item): tracks tries and whether it was ever solved.
const attemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kind: { type: String, enum: ['sql', 'quiz'], required: true },
  itemId: { type: String, required: true },
  topic: String,
  correct: { type: Boolean, default: false },
  tries: { type: Number, default: 0 }
}, { timestamps: true });
attemptSchema.index({ user: 1, kind: 1, itemId: 1 }, { unique: true });
const Attempt = mongoose.model('Attempt', attemptSchema);

// Exercises added by admins (the built-in ones live in data/exercises.js).
const Exercise = mongoose.model('Exercise', new mongoose.Schema({
  topic: { type: String, required: true },
  title: { type: String, required: true },
  prompt: { type: String, required: true },
  hint: String,
  solution: { type: String, required: true },
  ordered: { type: Boolean, default: false }
}, { timestamps: true }));

module.exports = { User, Attempt, Exercise };
