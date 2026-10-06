const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let session = JSON.parse(localStorage.getItem('session') || 'null');

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: 'Bearer ' + session.token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { logout(); throw new Error(data.error || 'Please log in'); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const table = (cols, rows) => `<div class="scroll"><table><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr>` +
  rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('') + '</table></div>';

function logout() { session = null; localStorage.removeItem('session'); show('auth'); }

function renderNav(active) {
  $('#nav').innerHTML = session
    ? ['practice', 'quiz', 'dashboard'].map(v =>
        `<button class="${v === active ? 'active' : ''}" onclick="show('${v}')">${v[0].toUpperCase() + v.slice(1)}</button>`).join(' ') +
      ` <button class="ghost" onclick="logout()">Log out (${esc(session.name)})</button>`
    : '';
}

async function show(view) {
  renderNav(view);
  $('#app').innerHTML = '<p>Loading...</p>';
  try { await views[view](); } catch (e) { $('#app').innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
}

const views = {
  async auth() {
    $('#app').innerHTML = `<div class="card"><h3>Welcome</h3>
      <p>Practice SQL on a live database and test yourself with quizzes. Create an account or log in.</p>
      <input id="name" placeholder="Name (only for sign up)">
      <input id="email" type="email" placeholder="Email">
      <input id="password" type="password" placeholder="Password (6+ characters)">
      <button class="btn" onclick="submitAuth('login')">Log in</button>
      <button class="btn ghost" style="color:var(--brand)" onclick="submitAuth('register')">Sign up</button>
      <p id="authMsg" class="bad"></p></div>`;
  },

  async practice() {
    const { schema, exercises } = await api('/exercises');
    $('#app').innerHTML = `<details class="card" open><summary><b>Practice database</b></summary><pre>${esc(schema)}</pre></details>` +
      exercises.map(e => `<div class="card"><span class="topic">${esc(e.topic)}</span>
        <h3>${esc(e.title)} ${e.solved ? '<span class="tick">&#10003; solved</span>' : ''}</h3>
        <p>${esc(e.prompt)}</p>
        <details><summary>Hint</summary><p>${esc(e.hint || 'No hint for this one.')}</p></details>
        <textarea id="q-${e.id}" aria-label="SQL query" placeholder="SELECT ..."></textarea>
        <button class="btn" onclick="runEx('${e.id}')">Run query</button>
        <div id="r-${e.id}"></div></div>`).join('');
  },

  async quiz() {
    const qs = await api('/quiz');
    $('#app').innerHTML = qs.map(q => `<div class="card" id="qz-${q.id}"><span class="topic">${esc(q.topic)}</span>
      <h3>${esc(q.q)} ${q.solved ? '<span class="tick">&#10003;</span>' : ''}</h3>
      ${q.options.map((o, i) => `<button class="opt" onclick="answer(${q.id}, ${i})">${esc(o)}</button>`).join('')}
      <div class="fb"></div></div>`).join('');
  },

  async dashboard() {
    const p = await api('/progress');
    $('#app').innerHTML = `<div class="card"><h3>Your progress: ${p.solved} of ${p.total} solved</h3>
      <div class="bar"><span style="width:${p.total ? (p.solved / p.total) * 100 : 0}%"></span></div></div>
      <div class="card"><h3>By topic</h3>${Object.entries(p.topics).map(([t, v]) => `
        <div class="row"><span>${esc(t)}</span><span>${v.solved}/${v.total}</span></div>
        <div class="bar"><span style="width:${(v.solved / v.total) * 100}%"></span></div>`).join('')}
      <p>Topics with the lowest bars are the ones to practice next.</p></div>`;
  }
};

async function submitAuth(mode) {
  try {
    const body = { email: $('#email').value, password: $('#password').value };
    if (mode === 'register') body.name = $('#name').value;
    session = await api('/' + mode, 'POST', body);
    localStorage.setItem('session', JSON.stringify(session));
    show('practice');
  } catch (e) { $('#authMsg').textContent = e.message; }
}

async function runEx(id) {
  const out = $('#r-' + id);
  try {
    const r = await api(`/exercises/${id}/run`, 'POST', { sql: $('#q-' + id).value });
    out.innerHTML = (r.correct ? '<p class="ok">Correct! Your result matches the expected one.</p>'
                               : '<p class="bad">Not matching yet. Check the hint and try again.</p>') + table(r.columns, r.rows);
  } catch (e) { out.innerHTML = `<p class="bad">${esc(e.message)}</p>`; }
}

async function answer(id, choice) {
  const box = $(`#qz-${id}`);
  const r = await api('/quiz/' + id, 'POST', { choice });
  box.querySelectorAll('.opt').forEach((b, i) => {
    b.disabled = true;
    if (i === r.answer) b.style.borderColor = 'var(--ok)';
    else if (i === choice) b.style.borderColor = 'var(--bad)';
  });
  box.querySelector('.fb').innerHTML = `<p class="${r.correct ? 'ok' : 'bad'}">${r.correct ? 'Correct.' : 'Not quite.'}</p><p>${esc(r.explain)}</p>`;
}

show(session ? 'practice' : 'auth');
