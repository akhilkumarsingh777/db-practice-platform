const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { runQuery, sameResult, SCHEMA } = require('./db');
const { User, Attempt, Exercise } = require('./models');
const seedExercises = require('./data/exercises');
const quiz = require('./data/quiz');

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/db_practice';
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(400).json({ error: e.message }));

function auth(req, res, next) {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in' });
  }
}
const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' });

const sign = u => ({
  token: jwt.sign({ id: u._id, name: u.name, role: u.role }, SECRET, { expiresIn: '7d' }),
  name: u.name, role: u.role
});

// ---------- Auth ----------
app.post('/api/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) throw new Error('Name, email and a password of 6+ characters are required.');
  if (await User.findOne({ email })) throw new Error('This email is already registered.');
  const user = await User.create({
    name, email, password: await bcrypt.hash(password, 10),
    role: email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'learner'
  });
  res.json(sign(user));
}));

app.post('/api/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) throw new Error('Wrong email or password.');
  res.json(sign(user));
}));

// ---------- SQL exercises ----------
async function allExercises() {
  const fromDb = await Exercise.find().lean();
  return [...seedExercises, ...fromDb.map(e => ({ ...e, id: 'd' + e._id }))];
}

async function record(user, kind, itemId, topic, correct) {
  const upd = { $set: { topic }, $inc: { tries: 1 } };
  if (correct) upd.$set.correct = true; else upd.$setOnInsert = { correct: false };
  await Attempt.updateOne({ user, kind, itemId }, upd, { upsert: true });
}

app.get('/api/exercises', auth, wrap(async (req, res) => {
  const solved = new Set((await Attempt.find({ user: req.user.id, kind: 'sql', correct: true })).map(a => a.itemId));
  const list = (await allExercises()).map(e => ({
    id: e.id, topic: e.topic, title: e.title, prompt: e.prompt, hint: e.hint, solved: solved.has(e.id)
  }));
  res.json({ schema: SCHEMA, exercises: list });
}));

app.post('/api/exercises/:id/run', auth, wrap(async (req, res) => {
  const ex = (await allExercises()).find(e => e.id === req.params.id);
  if (!ex) throw new Error('Exercise not found.');
  const out = runQuery(req.body.sql);
  const correct = sameResult(out.rows, runQuery(ex.solution).rows, !!ex.ordered);
  await record(req.user.id, 'sql', ex.id, ex.topic, correct);
  res.json({ columns: out.columns, rows: out.rows.slice(0, 50), correct });
}));

// ---------- Quiz ----------
app.get('/api/quiz', auth, wrap(async (req, res) => {
  const done = new Set((await Attempt.find({ user: req.user.id, kind: 'quiz', correct: true })).map(a => a.itemId));
  res.json(quiz.map(({ answer, explain, ...q }) => ({ ...q, solved: done.has(String(q.id)) })));
}));

app.post('/api/quiz/:id', auth, wrap(async (req, res) => {
  const q = quiz.find(x => x.id === Number(req.params.id));
  if (!q) throw new Error('Question not found.');
  const correct = Number(req.body.choice) === q.answer;
  await record(req.user.id, 'quiz', String(q.id), q.topic, correct);
  res.json({ correct, answer: q.answer, explain: q.explain });
}));

// ---------- Progress ----------
app.get('/api/progress', auth, wrap(async (req, res) => {
  const items = [
    ...(await allExercises()).map(e => ({ key: 'sql:' + e.id, topic: e.topic })),
    ...quiz.map(q => ({ key: 'quiz:' + q.id, topic: q.topic }))
  ];
  const done = new Set((await Attempt.find({ user: req.user.id, correct: true })).map(a => a.kind + ':' + a.itemId));
  const topics = {};
  items.forEach(i => {
    topics[i.topic] = topics[i.topic] || { solved: 0, total: 0 };
    topics[i.topic].total++;
    if (done.has(i.key)) topics[i.topic].solved++;
  });
  const solved = Object.values(topics).reduce((n, t) => n + t.solved, 0);
  res.json({ solved, total: items.length, topics });
}));

// ---------- Admin: add a new exercise (validated against the practice DB) ----------
app.post('/api/admin/exercises', auth, adminOnly, wrap(async (req, res) => {
  const { topic, title, prompt, hint, solution, ordered } = req.body;
  runQuery(solution); // rejects invalid solutions
  const ex = await Exercise.create({ topic, title, prompt, hint, solution, ordered: !!ordered });
  res.json({ id: 'd' + ex._id });
}));

mongoose.connect(MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`)))
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
