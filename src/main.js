import './styles.css';
import { addHabit, listHabits, removeHabit, addLog, listLogs, queueSync, drainOutbox } from './db.js';
import { Workbox } from 'workbox-window';

const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

function toast(msg){
  let t = $('.toast');
  if(!t){ t = document.createElement('div'); t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._to);
  t._to = setTimeout(()=> t.style.opacity='0', 1800);
}

function weekStart(date=new Date()){
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}

async function render(){
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="container">
      <header class="header">
        <div class="brand">Offtrail <span>• PWA</span></div>
        <button class="button" id="installBtn" style="display:none">Install</button>
      </header>

      <div class="card">
        <div class="row">
          <input class="input" id="habitName" placeholder="Add a new habit (e.g., Read 20m)" />
          <select id="habitTarget">
            <option value="3">Target: 3×/week</option>
            <option value="5">Target: 5×/week</option>
            <option value="7">Target: 7×/week</option>
          </select>
          <button class="button primary" id="addHabit">Add</button>
        </div>
        <hr/>
        <div class="habits" id="habits"></div>
      </div>

      <div class="footer">Works fully offline. Data stored locally in IndexedDB. When online, queued actions can sync.</div>
    </div>
  `;

  $('#addHabit').addEventListener('click', async () => {
    const name = $('#habitName').value.trim();
    const target = parseInt($('#habitTarget').value,10);
    if(!name) return;
    const id = await addHabit(name, target);
    await queueSync('addHabit', { id, name, target });
    $('#habitName').value = '';
    toast('Habit added');
    drawHabits();
  });

  drawHabits();
}

async function drawHabits(){
  const wrap = $('#habits');
  wrap.innerHTML = '';
  const habits = await listHabits();
  const start = weekStart();
  for (const h of habits) {
    const logs = await listLogs(h.id);
    const thisWeek = logs.filter(l => new Date(l.date) >= start).length;
    const card = document.createElement('div');
    card.className = 'habit';
    card.innerHTML = `
      <h3>${h.name}</h3>
      <div class="badge">This week: ${thisWeek}/${h.targetPerWeek}</div>
      <div class="controls">
        <button class="button" data-act="log">Log today</button>
        <button class="button" data-act="remove">Delete</button>
      </div>
      <div class="log"></div>
    `;
    wrap.appendChild(card);

    card.querySelector('[data-act="log"]').addEventListener('click', async () => {
      await addLog(h.id);
      await queueSync('addLog', { habitId: h.id, date: new Date().toISOString() });
      toast('Logged for today');
      drawHabits();
    });

    card.querySelector('[data-act="remove"]').addEventListener('click', async () => {
      await removeHabit(h.id);
      await queueSync('removeHabit', { id: h.id });
      toast('Habit removed');
      drawHabits();
    });

    // render log dates short
    const logEl = card.querySelector('.log');
    logs.slice(-14).reverse().forEach(l => {
      const d = new Date(l.date);
      const tag = document.createElement('button');
      tag.textContent = d.toLocaleDateString(undefined,{month:'short', day:'numeric'});
      logEl.appendChild(tag);
    });
  }
}

// Basic online sync stub
async function trySync(){
  if(!navigator.onLine) return;
  await drainOutbox(async (item) => {
    // Replace with real API call if you add a backend; here we just simulate
    await new Promise(r => setTimeout(r, 50));
    // console.log('Synced', item);
  });
}

window.addEventListener('online', trySync);
setInterval(trySync, 10_000);

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.style.display = 'inline-block';
  btn.onclick = async () => {
    btn.style.display='none';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    toast(outcome === 'accepted' ? 'App installed' : 'Install dismissed');
    deferredPrompt = null;
  };
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');
  wb.addEventListener('waiting', () => {
    wb.messageSW({ type: 'SKIP_WAITING' });
  });
  wb.register();
}

render();
