// Österreich-Simulator – Spiellogik und Oberfläche
'use strict';

const SAVE_KEY = 'oesim-save-v1';
const SEATS_TOTAL = 183;
const MAJORITY = 92;
const TERM = 60; // Monate pro Gesetzgebungsperiode
const MONTHS = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const START_YEAR = 2026, START_MONTH = 9; // Oktober 2026

let S = null;           // Spielstand
let ui = { tab: 'overview', selected: 'w', modal: null };

/* ---------- Hilfsfunktionen ---------- */
const $ = sel => document.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a = -1, b = 1) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
const party = id => PARTIES.find(p => p.id === id) || OTHER;
const stateById = id => STATES.find(s => s.id === id);
const fmt = (n, d = 1) => n.toLocaleString('de-AT', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = n => Math.round(n).toLocaleString('de-AT');
const pct = (n, d = 1) => fmt(n, d) + ' %';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dateOf = m => { const t = START_MONTH + m; return { y: START_YEAR + Math.floor(t / 12), mo: t % 12 }; };
const dateLabel = m => { const d = dateOf(m); return `${MONTHS[d.mo]} ${d.y}`; };
const monthIndexOf = ym => { const [y, mo] = ym.split('-').map(Number); return (y - START_YEAR) * 12 + (mo - 1) - START_MONTH; };
const chip = id => `<span class="chip chip-${id}">${party(id).name}</span>`;
const TOTAL_POP = STATES.reduce((a, s) => a + s.pop, 0);

function normalize(sh) {
  ALL_IDS.forEach(id => { sh[id] = Math.max(0.5, sh[id]); });
  const sum = ALL_IDS.reduce((a, id) => a + sh[id], 0);
  ALL_IDS.forEach(id => { sh[id] = sh[id] * 100 / sum; });
  return sh;
}
function nationalShares() {
  const out = Object.fromEntries(ALL_IDS.map(id => [id, 0]));
  STATES.forEach(st => ALL_IDS.forEach(id => { out[id] += S.support[st.id][id] * st.pop / TOTAL_POP; }));
  return out;
}
function leader(sh) { return PARTY_IDS.reduce((a, b) => (sh[a] >= sh[b] ? a : b)); }
function inGov(id) { return S.gov.includes(id); }
function govSeats() { return S.gov.reduce((a, id) => a + (S.seats[id] || 0), 0); }

/* ---------- Neues Spiel ---------- */
function newGame(playerId) {
  const support = {};
  STATES.forEach(st => {
    const sh = { ...st.base };
    sh.sonst = Math.max(1, 100 - PARTY_IDS.reduce((a, id) => a + sh[id], 0));
    support[st.id] = normalize(sh);
  });
  S = {
    player: playerId, m: 0, phase: 'play',
    support, baseline: JSON.parse(JSON.stringify(support)),
    seats: {}, result: null, gov: [], mood: {},
    budget: { pens: 3, gesund: 3, bild: 3, soz: 3, infra: 3, klima: 3, sich: 3, stArb: 3, stUnt: 3 },
    econ: { gdp: 500, debt: 410, growth: 0.8, unemp: 7.3, infl: 3.2 },
    shock: { growth: 0, unemp: 0, infl: 0 },
    lawFx: { rev: 0, spend: 0, growth: 0, unemp: 0, infl: 0 },
    passed: [], failedAt: {}, lawThisMonth: false,
    sat: 40, satBoost: 0, honeymoon: 0,
    stateMood: Object.fromEntries(STATES.map(s => [s.id, 0])),
    lh: Object.fromEntries(STATES.map(s => [s.id, s.lh])),
    ltw: Object.fromEntries(STATES.map(s => [s.id, monthIndexOf(s.ltw)])),
    nextElection: 0, history: [], log: [], pendingEvent: null, recentEvents: [],
    monthsInGov: 0, monthsChancellor: 0, attempts: [], elections: 0, ltwWins: 0,
  };
  computeEcon();
  addLog('Willkommen im Österreich-Simulator. Die Wahllokale haben geöffnet.', 'info');
  runElection('Nationalratswahl');
}

/* ---------- Wahlen ---------- */
function dHondt(votes) {
  const eligible = PARTY_IDS.filter(id => votes[id] >= 4);
  const seats = Object.fromEntries(PARTY_IDS.map(id => [id, 0]));
  for (let i = 0; i < SEATS_TOTAL; i++) {
    let best = null, bestQ = -1;
    eligible.forEach(id => { const q = votes[id] / (seats[id] + 1); if (q > bestQ) { bestQ = q; best = id; } });
    seats[best]++;
  }
  return seats;
}

function runElection(kind) {
  const before = S.result ? { ...S.result.votes } : null;
  // Wahltag-Abweichung gegenüber den Umfragen
  const swing = Object.fromEntries(ALL_IDS.map(id => [id, gauss() * 1.2]));
  STATES.forEach(st => {
    const sh = S.support[st.id];
    ALL_IDS.forEach(id => { sh[id] += swing[id] + gauss() * 0.6; });
    normalize(sh);
  });
  const votes = nationalShares();
  const seats = dHondt(votes);
  const turnout = clamp(77.7 + (S.sat - 45) * -0.05 + gauss(), 65, 85);
  S.seats = seats;
  S.result = { votes, seats, turnout, before, m: S.m };
  S.elections++;
  const prevGov = S.gov.slice();
  S.gov = []; S.mood = {}; S.attempts = [];
  S.phase = 'coalition';
  S.prevGov = prevGov;
  const w = leader(votes);
  addLog(`${kind}: ${party(w).name} wird mit ${pct(votes[w])} stärkste Kraft.` +
    (w === S.player ? ' Ein Triumph für Ihre Partei!' : ` ${party(S.player).name}: ${pct(votes[S.player])}.`), w === S.player ? 'good' : 'election');
  pushHistory();
  ui.modal = 'election';
}

function coalitionOptions() {
  const p = S.player, others = PARTY_IDS.filter(id => id !== p && S.seats[id] > 0);
  const combos = [];
  if (S.seats[p] >= MAJORITY) combos.push([p]);
  others.forEach(a => combos.push([p, a]));
  others.forEach((a, i) => others.slice(i + 1).forEach(b => combos.push([p, a, b])));
  const largest = leader(S.result.votes);
  return combos
    .map(c => ({ parties: c, seats: c.reduce((a, id) => a + S.seats[id], 0) }))
    .filter(o => o.seats >= MAJORITY)
    .map(o => {
      let ch;
      if (o.parties.length === 1) ch = 1;
      else {
        const partners = o.parties.slice(1);
        const pairs = [];
        o.parties.forEach((a, i) => o.parties.slice(i + 1).forEach(b => pairs.push(compat(a, b))));
        ch = pairs.reduce((a, b) => a + b, 0) / pairs.length;
        if (o.parties.length === 3) ch *= 0.9;
        if (largest === p) ch += 0.15;
        partners.forEach(q => { if (S.seats[q] > S.seats[p]) ch -= 0.12; });
        // Zweite Runde: Die Partner wissen, dass die Alternativen knapp werden
        if (tries(o.parties.join('+')) === 1) ch += 0.2;
        ch = clamp(ch, 0.05, 0.95);
      }
      return { ...o, key: o.parties.join('+'), chance: ch };
    })
    .sort((a, b) => b.chance - a.chance);
}

const MAX_TRIES = 2;
function tries(key) { return S.attempts.filter(k => k === key).length; }

function tryCoalition(key) {
  const opt = coalitionOptions().find(o => o.key === key);
  if (!opt || tries(key) >= MAX_TRIES) return;
  const second = tries(key) === 1;
  S.attempts.push(key);
  const ok = Math.random() < opt.chance;
  if (ok) {
    S.gov = opt.parties.slice();
    S.mood = Object.fromEntries(opt.parties.slice(1).map(id => [id, (second ? 50 : 62) + rnd(-6, 6)]));
    S.phase = 'play';
    S.nextElection = S.m + TERM;
    S.honeymoon = 7;
    S.lawThisMonth = false;
    const names = opt.parties.map(id => party(id).name).join('–');
    addLog(opt.parties.length === 1
      ? `Absolute Mehrheit! ${party(S.player).name} regiert allein. Angelobung in der Hofburg.`
      : `Regierung ${names} angelobt. ${party(S.player).name} stellt das Kanzleramt.`, 'good');
    ui.modal = null;
    ui.tab = 'overview';
  } else {
    const who = opt.parties.slice(1).map(id => party(id).name).join(' und ');
    addLog(`Koalitionsverhandlungen mit ${who} gescheitert.`, 'bad');
    const left = coalitionOptions().filter(o => tries(o.key) < MAX_TRIES);
    if (!left.length) gameOver('Keine Koalition zustande gebracht. Ihre Partei geht in Opposition.');
  }
  save(); render();
}

function goOpposition() { gameOver('Sie haben auf eine Regierungsbeteiligung verzichtet. Ihre Partei geht in Opposition.'); }

function gameOver(reason) {
  S.phase = 'over';
  S.overReason = reason;
  addLog(reason, 'bad');
  ui.modal = 'over';
  save(); render();
}

/* ---------- Wirtschaft ---------- */
function computeEcon() {
  const e = S.econ, b = S.budget, gr = e.gdp / 500;
  let spending = BUDGET.reduce((a, c) => a + c.base * (1 + (b[c.id] - 3) * 0.08), 0) + FIXED_SPENDING;
  spending = spending * gr + S.lawFx.spend * gr;
  const taxFactor = 1 + TAXES.reduce((a, t) => a + (b[t.id] - 3) * t.share, 0);
  const revenue = e.gdp * 0.454 * taxFactor + S.lawFx.rev * gr;
  e.spending = spending; e.revenue = revenue;
  e.deficit = spending - revenue;
  e.deficitPct = e.deficit / e.gdp * 100;
  e.debtPct = e.debt / e.gdp * 100;
  return e;
}

function budgetPopularity() {
  let p = 0;
  BUDGET.forEach(c => { p += (S.budget[c.id] - 3) * c.pop; });
  TAXES.forEach(t => { p += (S.budget[t.id] - 3) * t.pop; });
  return p;
}

function satTarget() {
  const e = S.econ;
  return clamp(50
    - (e.unemp - 6) * 3
    - (e.infl - 2) * 3.5
    + (e.growth - 1) * 2.5
    - Math.max(0, e.deficitPct - 3) * 2.5
    - Math.max(0, e.debtPct - 90) * 0.3
    + budgetPopularity() + S.satBoost + S.honeymoon, 5, 95);
}

function stepEcon() {
  const e = S.econ, b = S.budget;
  computeEcon();
  const gTarget = 1.1 + (b.infra - 3) * 0.12 + (b.bild - 3) * 0.05
    + TAXES.reduce((a, t) => a + (b[t.id] - 3) * t.growth, 0)
    + S.lawFx.growth + S.shock.growth
    + clamp(e.deficitPct - 3, -3, 3) * 0.05
    - Math.max(0, e.infl - 4) * 0.15 - Math.max(0, e.debtPct - 100) * 0.02;
  e.growth += (gTarget - e.growth) * 0.2 + gauss() * 0.06;
  const uTarget = 7.0 - (e.growth - 1) * 0.7 + S.lawFx.unemp + S.shock.unemp;
  e.unemp = clamp(e.unemp + (uTarget - e.unemp) * 0.1 + gauss() * 0.03, 2, 20);
  const iTarget = 2.2 + Math.max(0, e.deficitPct - 3) * 0.15 + S.lawFx.infl + S.shock.infl;
  e.infl = clamp(e.infl + (iTarget - e.infl) * 0.15 + gauss() * 0.05, -2, 15);
  e.gdp *= 1 + (e.growth + e.infl) / 1200;
  e.debt += e.deficit / 12;
  Object.keys(S.shock).forEach(k => { S.shock[k] *= 0.85; });
  computeEcon();
}

/* ---------- Monatswechsel ---------- */
function endMonth() {
  if (S.phase !== 'play' || S.pendingEvent) return;
  stepEcon();

  // Zufriedenheit
  S.sat += (satTarget() - S.sat) * 0.25;
  S.satBoost *= 0.92;
  S.honeymoon *= 0.9;
  STATES.forEach(st => { S.stateMood[st.id] *= 0.96; });

  // Umfragen je Bundesland
  STATES.forEach(st => {
    const sh = S.support[st.id];
    const satS = clamp(S.sat + S.stateMood[st.id], 0, 100);
    const d = (satS - 45) * 0.012;
    const govShare = S.gov.reduce((a, id) => a + sh[id], 0);
    const opp = ALL_IDS.filter(id => !inGov(id));
    const oppW = opp.reduce((a, id) => a + sh[id] * protestWeight(id), 0);
    if (govShare > 0) {
      S.gov.forEach(id => { sh[id] += d * sh[id] / govShare; });
      opp.forEach(id => { sh[id] -= d * sh[id] * protestWeight(id) / oppW; });
    }
    ALL_IDS.forEach(id => { sh[id] += (S.baseline[st.id][id] - sh[id]) * 0.004 + gauss() * 0.12; });
    normalize(sh);
  });

  // Koalitionsklima
  Object.keys(S.mood).forEach(id => {
    let align = 0;
    Object.entries(PREFS[id]).forEach(([k, v]) => { align += (S.budget[k] - 3) * v; });
    S.mood[id] += align * 0.35 + (60 - S.mood[id]) * 0.01 - (S.sat < 35 ? 0.6 : 0) + gauss() * 0.4;
    S.mood[id] = clamp(S.mood[id], 0, 100);
  });

  S.m++;
  S.monthsInGov++;
  S.monthsChancellor++;
  S.lawThisMonth = false;
  pushHistory();

  // Koalitionsbruch
  for (const id of Object.keys(S.mood)) {
    if (S.mood[id] < 15) {
      S.gov = S.gov.filter(x => x !== id);
      delete S.mood[id];
      addLog(`Koalitionsbruch! ${party(id).name} verlässt die Regierung.`, 'bad');
      if (govSeats() < MAJORITY && S.nextElection > S.m + 3) {
        S.nextElection = S.m + 3;
        addLog(`Ohne Mehrheit im Nationalrat: Neuwahlen im ${dateLabel(S.nextElection)}.`, 'election');
      }
    }
  }

  // Landtagswahlen
  STATES.forEach(st => {
    if (S.ltw[st.id] === S.m) {
      const sh = { ...S.support[st.id] };
      ALL_IDS.forEach(id => { sh[id] += gauss() * 1.5; });
      normalize(sh);
      const w = leader(sh);
      const old = S.lh[st.id];
      S.lh[st.id] = w;
      S.ltw[st.id] += TERM;
      if (w === S.player) S.ltwWins++;
      addLog(`Landtagswahl ${st.name}: ${party(w).name} ${pct(sh[w])}. ` +
        (w === old ? `${party(w).name} hält den Landeshauptmann.` : `Machtwechsel! ${party(w).name} übernimmt von ${party(old).name}.`),
        w === S.player ? 'good' : 'election');
    }
  });

  // Nationalratswahl
  if (S.m >= S.nextElection) {
    runElection(S.early ? 'Vorgezogene Nationalratswahl' : 'Nationalratswahl');
    S.early = false;
    save(); render();
    return;
  }

  if (S.econ.debtPct > 130) { gameOver('Staatsschulden über 130 % des BIP. Die Finanzmärkte verlieren das Vertrauen, die Regierung tritt zurück.'); return; }

  // Ereignis
  if (Math.random() < 0.6) {
    const pool = EVENTS.filter(ev => !S.recentEvents.includes(ev.id) && (!ev.cond || ev.cond(S)));
    if (pool.length) {
      const ev = pool[Math.floor(Math.random() * pool.length)];
      S.pendingEvent = ev.id;
      S.recentEvents.push(ev.id);
      if (S.recentEvents.length > 9) S.recentEvents.shift();
      ui.modal = 'event';
    }
  }
  save(); render();
}

function protestWeight(id) { return id === 'fpoe' ? 1.4 : id === 'sonst' ? 0.6 : 1; }

function pushHistory() {
  S.history.push({ m: S.m, sh: nationalShares(), sat: S.sat });
  if (S.history.length > 240) S.history.shift();
}

function addLog(text, type = 'info') { S.log.unshift({ m: S.m, text, type }); if (S.log.length > 200) S.log.pop(); }

/* ---------- Ereignisse ---------- */
function resolveEvent(i) {
  const ev = EVENTS.find(e => e.id === S.pendingEvent);
  const opt = ev.options[i], fx = opt.fx;
  if (fx.once) S.econ.debt += fx.once;
  if (fx.spendPerm) S.lawFx.spend += fx.spendPerm;
  ['growth', 'unemp', 'infl'].forEach(k => { if (fx[k]) S.shock[k] += fx[k]; });
  if (fx.sat) S.satBoost += fx.sat;
  if (fx.state) S.stateMood[fx.state[0]] += fx.state[1];
  if (fx.coal) Object.entries(fx.coal).forEach(([id, v]) => { if (S.mood[id] != null) S.mood[id] = clamp(S.mood[id] + v, 0, 100); });
  if (fx.sup) STATES.forEach(st => { Object.entries(fx.sup).forEach(([id, v]) => { S.support[st.id][id] += v; }); normalize(S.support[st.id]); });
  addLog(`${ev.title}: ${opt.label}.`, 'event');
  S.pendingEvent = null;
  ui.modal = null;
  computeEcon();
  save(); render();
}

/* ---------- Gesetze ---------- */
function lawVotes(law) {
  const yes = [], no = [];
  PARTY_IDS.forEach(id => {
    if (!S.seats[id]) return;
    const st = law.stance[id];
    const y = id === S.player ? true : inGov(id) ? st >= -1 : st >= 1;
    (y ? yes : no).push(id);
  });
  return { yes, no, yesSeats: yes.reduce((a, id) => a + S.seats[id], 0) };
}

const LAW_COOLDOWN = 6;
function lawBlocked(id) { return S.failedAt[id] != null && S.m - S.failedAt[id] < LAW_COOLDOWN; }

function proposeLaw(id) {
  if (S.lawThisMonth || S.phase !== 'play' || S.pendingEvent || lawBlocked(id)) return;
  const law = LAWS.find(l => l.id === id);
  const v = lawVotes(law);
  S.lawThisMonth = true;
  const moodFx = { 2: 8, 1: 4, 0: 0, '-1': -6, '-2': -15 };
  Object.keys(S.mood).forEach(p => { S.mood[p] = clamp(S.mood[p] + moodFx[law.stance[p]], 0, 100); });
  if (v.yesSeats >= MAJORITY) {
    S.passed.push(id);
    Object.entries(law.fx).forEach(([k, val]) => { S.lawFx[k] += val; });
    S.satBoost += law.pop;
    STATES.forEach(st => { S.stateMood[st.id] += law.urban * (st.urban - 0.4) * 2; });
    STATES.forEach(st => {
      const sh = S.support[st.id];
      PARTY_IDS.forEach(p => {
        const s = law.stance[p];
        if (inGov(p)) sh[p] += s * 0.25;
        else if (s <= -1) sh[p] += 0.3 * -s;
        else if (s >= 1) sh[p] -= 0.15 * s;
      });
      normalize(sh);
    });
    addLog(`Nationalrat beschließt „${law.title}“ mit ${v.yesSeats} von ${SEATS_TOTAL} Stimmen.`, 'good');
  } else {
    S.failedAt[id] = S.m;
    S.satBoost -= 1;
    addLog(`„${law.title}“ scheitert im Nationalrat (${v.yesSeats} Ja-Stimmen, ${MAJORITY} nötig).`, 'bad');
  }
  computeEcon();
  save(); render();
}

function callEarlyElection() {
  S.nextElection = S.m + 3;
  S.early = true;
  addLog(`Der Nationalrat beschließt seine Auflösung. Neuwahl im ${dateLabel(S.nextElection)}.`, 'election');
  ui.modal = null;
  save(); render();
}

/* ---------- Speichern ---------- */
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* Speicher nicht verfügbar */ } }
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return JSON.parse(raw); } catch (e) { /* ignorieren */ }
  return null;
}
function resetGame() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignorieren */ } S = null; ui.modal = 'start'; render(); }

/* ---------- Darstellung ---------- */
function render() {
  document.body.classList.toggle('no-game', !S);
  if (!S) { renderModal(); return; }
  renderHeader();
  renderKpis();
  renderMap();
  renderStateDetail();
  renderTabs();
  renderModal();
}

function renderHeader() {
  const nextIn = S.nextElection - S.m;
  $('#date').textContent = dateLabel(S.m);
  $('#chancellor').innerHTML = S.phase === 'play'
    ? `Bundeskanzler: ${chip(S.player)} <span class="muted">· Regierung ${S.gov.map(id => party(id).name).join('–')}</span>`
    : S.phase === 'coalition' ? 'Regierungsbildung läuft' : 'Opposition';
  $('#next-election').textContent = S.phase === 'play' ? `Nächste NR-Wahl: ${dateLabel(S.nextElection)} (in ${nextIn} Mon.)` : '';
  const btn = $('#end-month');
  btn.disabled = S.phase !== 'play' || !!S.pendingEvent;
  btn.textContent = S.pendingEvent ? 'Ereignis offen' : 'Monat beenden';
}

function kpi(label, value, tone, sub) {
  return `<div class="kpi ${tone || ''}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;
}
function tone(v, good, bad, higherIsBetter = true) {
  if (higherIsBetter) return v >= good ? 'good' : v <= bad ? 'bad' : '';
  return v <= good ? 'good' : v >= bad ? 'bad' : '';
}
function renderKpis() {
  const e = S.econ;
  $('#kpis').innerHTML = [
    kpi('Zufriedenheit', fmt(S.sat, 0) + ' / 100', tone(S.sat, 55, 35), 'mit der Bundesregierung'),
    kpi('Wachstum', pct(e.growth), tone(e.growth, 1.5, 0), 'real, aufs Jahr gerechnet'),
    kpi('Arbeitslosigkeit', pct(e.unemp), tone(e.unemp, 6, 8, false), 'nationale Definition'),
    kpi('Inflation', pct(e.infl), tone(e.infl, 2.5, 4, false), 'VPI, Jahresrate'),
    kpi('Budgetsaldo', (e.deficit > 0 ? '−' : '+') + pct(Math.abs(e.deficitPct)), tone(e.deficitPct, 3, 4.5, false), `${fmt(Math.abs(e.deficit))} Mrd. € pro Jahr`),
    kpi('Staatsschulden', pct(e.debtPct, 0), tone(e.debtPct, 75, 95, false), `${fmtInt(e.debt)} Mrd. €`),
  ].join('');
}

/* Karte */
const proj = ([lon, lat]) => [(lon - 9.4) * 100, (49.1 - lat) * 148];
const pathOf = pts => 'M' + pts.map(p => proj(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';

function renderMap() {
  const shapes = STATES.slice().sort((a, b) => (a.id === 'w') - (b.id === 'w')).map(st => {
    const sh = S.support[st.id], l = leader(sh);
    const d = pathOf(st.poly) + (st.extra ? pathOf(st.extra) : '');
    const [x, y] = proj(st.label);
    const sel = ui.selected === st.id ? ' selected' : '';
    const label = st.id === 'w' ? '' : `<text class="map-label" x="${x}" y="${y - 3}">${st.short}</text>
      <text class="map-value" x="${x}" y="${y + 15}">${party(l).name} ${fmt(sh[l], 0)} %</text>`;
    return `<g class="state${sel}" data-state="${st.id}" tabindex="0" role="button" aria-label="${st.name}: ${party(l).name} führt mit ${fmt(sh[l], 1)} Prozent">
      <path d="${d}" class="fill-${l}"/>${label}</g>`;
  }).join('');
  const [wx, wy] = proj([16.37, 48.21]);
  $('#map').innerHTML = `<svg viewBox="0 0 790 405" role="img" aria-label="Karte der Bundesländer, eingefärbt nach führender Partei">
    ${shapes}
    <g class="wien-callout" pointer-events="none"><line x1="${wx + 12}" y1="${wy - 8}" x2="${wx + 40}" y2="${wy - 40}"/>
    <text class="map-label" x="${wx + 44}" y="${wy - 46}" text-anchor="start">Wien</text>
    <text class="map-value" x="${wx + 44}" y="${wy - 28}" text-anchor="start">${party(leader(S.support.w)).name} ${fmt(S.support.w[leader(S.support.w)], 0)} %</text></g>
  </svg>`;
  $('#map').querySelectorAll('.state').forEach(g => {
    const pick = () => { ui.selected = g.dataset.state; renderMap(); renderStateDetail(); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
}

function bars(sh, seatsMode) {
  const ids = [...PARTY_IDS].sort((a, b) => sh[b] - sh[a]).concat(seatsMode ? [] : ['sonst']);
  const max = Math.max(...ids.map(id => sh[id]));
  return `<div class="bars">${ids.map(id => `<div class="bar-row"><span class="bar-name">${party(id).name}</span>
    <span class="bar-track"><span class="bar fill-${id}" style="width:${(sh[id] / max * 100).toFixed(1)}%"></span></span>
    <span class="bar-val">${seatsMode ? sh[id] : pct(sh[id])}</span></div>`).join('')}</div>`;
}

function renderStateDetail() {
  const st = stateById(ui.selected), sh = S.support[st.id];
  const mood = clamp(S.sat + S.stateMood[st.id], 0, 100);
  const months = S.ltw[st.id] - S.m;
  $('#state-detail').innerHTML = `
    <div class="sd-head"><h3>${st.name}</h3><span class="muted">Landeshauptstadt ${st.capital}</span></div>
    <dl class="facts">
      <div><dt>Einwohner</dt><dd>${fmtInt(st.pop)}</dd></div>
      <div><dt>Anteil</dt><dd>${pct(st.pop / TOTAL_POP * 100)}</dd></div>
      <div><dt>Landeshauptmann</dt><dd>${chip(S.lh[st.id])}</dd></div>
      <div><dt>Landtagswahl</dt><dd>${dateLabel(S.ltw[st.id])}${months >= 0 ? ` <span class="muted">(${months} Mon.)</span>` : ''}</dd></div>
      <div><dt>Stimmung</dt><dd>${fmt(mood, 0)} / 100</dd></div>
    </dl>
    <h4 class="eyebrow">Umfrage im Land</h4>
    ${bars(sh)}`;
}

/* Tabs */
const TABS = [
  ['overview', 'Übersicht'], ['budget', 'Haushalt'], ['laws', 'Gesetze'],
  ['parliament', 'Nationalrat'], ['states', 'Bundesländer'], ['log', 'Chronik'],
];
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label]) =>
    `<button role="tab" id="tab-${id}" aria-selected="${ui.tab === id}" data-tab="${id}">${label}${id === 'laws' && S.phase === 'play' && !S.lawThisMonth ? ' <span class="dot" aria-label="Gesetz möglich"></span>' : ''}</button>`).join('');
  $('#tabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { ui.tab = b.dataset.tab; renderTabs(); }));
  const view = { overview: viewOverview, budget: viewBudget, laws: viewLaws, parliament: viewParliament, states: viewStates, log: viewLog }[ui.tab];
  $('#panel').innerHTML = view();
  bindPanel();
}

function moodLabel(v) { return v >= 70 ? 'harmonisch' : v >= 50 ? 'stabil' : v >= 30 ? 'angespannt' : 'kurz vor dem Bruch'; }

function viewOverview() {
  const nat = nationalShares();
  const gov = S.phase === 'play' ? `
    <section class="block">
      <h3>Bundesregierung</h3>
      <div class="gov-row">${S.gov.map(id => `<div class="gov-party">
        ${chip(id)}<span class="gov-seats">${S.seats[id]} Mandate</span>
        ${id === S.player ? '<span class="muted">Kanzlerpartei</span>' : `<span class="mood"><span class="meter"><span class="meter-fill ${S.mood[id] < 30 ? 'bad' : S.mood[id] < 50 ? 'warn' : 'good'}" style="width:${S.mood[id]}%"></span></span><span class="muted">Koalitionsklima: ${moodLabel(S.mood[id])} (${fmt(S.mood[id], 0)})</span></span>`}
      </div>`).join('')}</div>
      <p class="muted small">${govSeats()} von ${SEATS_TOTAL} Mandaten · ${govSeats() >= MAJORITY ? 'Mehrheit im Nationalrat' : 'Minderheitsregierung'}</p>
      <div class="actions"><button class="btn-ghost" data-action="early">Neuwahl ausrufen</button></div>
    </section>` : '';
  return `${gov}
    <section class="block">
      <div class="block-head"><h3>Sonntagsfrage Österreich</h3><span class="muted small">Hochrechnung aus allen Bundesländern</span></div>
      <div class="legend">${PARTY_IDS.map(id => `<span class="legend-item"><span class="swatch fill-${id}"></span>${party(id).name} <b>${pct(nat[id])}</b></span>`).join('')}</div>
      <div id="poll-chart" class="chart"></div>
    </section>`;
}

function viewBudget() {
  const e = S.econ;
  const prefLine = id => {
    const fans = PARTY_IDS.filter(p => PREFS[p][id] >= 0.5), foes = PARTY_IDS.filter(p => PREFS[p][id] <= -0.5);
    return `<span class="small muted">${fans.length ? 'mehr gewünscht: ' + fans.map(chip).join(' ') : ''} ${foes.length ? ' weniger gewünscht: ' + foes.map(chip).join(' ') : ''}</span>`;
  };
  const seg = (id, val) => `<div class="seg" role="radiogroup" aria-label="Stufe">${[1, 2, 3, 4, 5].map(l =>
    `<button role="radio" aria-checked="${val === l}" data-budget="${id}" data-level="${l}" title="${LEVEL_LABELS[l - 1]}">${['−−', '−', '±0', '+', '++'][l - 1]}</button>`).join('')}</div>`;
  const gr = e.gdp / 500;
  return `<section class="block">
    <div class="budget-sum">
      <div><span class="eyebrow">Einnahmen</span><b>${fmt(e.revenue)} Mrd. €</b></div>
      <div><span class="eyebrow">Ausgaben</span><b>${fmt(e.spending)} Mrd. €</b></div>
      <div><span class="eyebrow">Saldo</span><b class="${e.deficit > 0 ? 'neg' : 'pos'}">${e.deficit > 0 ? '−' : '+'}${fmt(Math.abs(e.deficit))} Mrd. €</b><span class="muted small">${pct(-e.deficitPct)} des BIP · Maastricht-Grenze −3 %</span></div>
    </div>
    <p class="muted small">Änderungen wirken ab dem nächsten Monat auf Wirtschaft, Zufriedenheit und Koalitionsklima.</p>
  </section>
  <section class="block"><h3>Ausgaben</h3>
    ${BUDGET.map(c => `<div class="budget-row"><div class="budget-name"><b>${c.name}</b>
      <span class="small">${fmt(c.base * (1 + (S.budget[c.id] - 3) * 0.08) * gr)} Mrd. € · ${LEVEL_LABELS[S.budget[c.id] - 1]}</span>${prefLine(c.id)}</div>${seg(c.id, S.budget[c.id])}</div>`).join('')}
  </section>
  <section class="block"><h3>Steuern</h3>
    ${TAXES.map(t => `<div class="budget-row"><div class="budget-name"><b>${t.name}</b>
      <span class="small">${LEVEL_LABELS[S.budget[t.id] - 1]}</span>${prefLine(t.id)}</div>${seg(t.id, S.budget[t.id])}</div>`).join('')}
  </section>`;
}

function stanceIcon(s) { return { 2: '▲▲', 1: '▲', 0: '–', '-1': '▼', '-2': '▼▼' }[s]; }
function viewLaws() {
  const open = LAWS.filter(l => !S.passed.includes(l.id));
  const can = S.phase === 'play' && !S.lawThisMonth && !S.pendingEvent;
  const card = l => {
    const v = lawVotes(l);
    const passes = v.yesSeats >= MAJORITY;
    const vetos = Object.keys(S.mood).filter(p => l.stance[p] <= -1);
    const fx = [];
    if (l.fx.rev) fx.push(`Einnahmen ${l.fx.rev > 0 ? '+' : ''}${fmt(l.fx.rev)} Mrd. €`);
    if (l.fx.spend) fx.push(`Ausgaben ${l.fx.spend > 0 ? '+' : ''}${fmt(l.fx.spend)} Mrd. €`);
    if (l.pop >= 3) fx.push('sehr populär'); else if (l.pop > 0) fx.push('eher populär'); else if (l.pop <= -3) fx.push('sehr unpopulär'); else if (l.pop < 0) fx.push('eher unpopulär');
    if (l.urban >= 2) fx.push('kommt in Städten gut an'); if (l.urban <= -2) fx.push('kommt am Land gut an');
    const blocked = lawBlocked(l.id);
    return `<article class="law ${S.failedAt[l.id] != null ? 'failed' : ''}">
      <div class="law-head"><span class="eyebrow">${l.area}</span><h4>${l.title}</h4></div>
      <p>${l.desc}</p>
      <div class="stances">${PARTY_IDS.map(p => `<span class="stance s${l.stance[p]}" title="${party(p).name}: ${['strikt dagegen', 'dagegen', 'neutral', 'dafür', 'Herzensanliegen'][l.stance[p] + 2]}">${party(p).name} ${stanceIcon(l.stance[p])}</span>`).join('')}</div>
      <p class="small muted">${fx.join(' · ')}</p>
      <div class="law-foot">
        <span class="small ${passes ? 'pos' : 'neg'}">Erwartet: ${v.yesSeats} Ja · ${passes ? 'Mehrheit' : 'keine Mehrheit'}</span>
        ${blocked ? `<span class="small muted">Zuletzt gescheitert, wieder möglich ab ${dateLabel(S.failedAt[l.id] + LAW_COOLDOWN)}</span>` : ''}
        ${vetos.length ? `<span class="small neg">Belastet die Koalition mit ${vetos.map(chip).join(' ')}</span>` : ''}
        <button class="btn" data-law="${l.id}" ${can && !blocked ? '' : 'disabled'}>Einbringen</button>
      </div></article>`;
  };
  return `<section class="block"><p class="muted small">${S.lawThisMonth ? 'Diesen Monat wurde bereits ein Gesetz eingebracht. Nächsten Monat geht es weiter.' : 'Pro Monat kann die Regierung ein Gesetz in den Nationalrat einbringen. Für einen Beschluss braucht es 92 von 183 Stimmen.'}</p></section>
    <div class="laws">${open.map(card).join('')}</div>
    ${S.passed.length ? `<section class="block"><h3>Beschlossene Gesetze</h3><ul class="passed">${S.passed.map(id => `<li>${LAWS.find(l => l.id === id).title}</li>`).join('')}</ul></section>` : ''}`;
}

function viewParliament() {
  const r = S.result;
  const seatsSh = Object.fromEntries(PARTY_IDS.map(id => [id, S.seats[id] || 0]));
  return `<section class="block">
    <div class="block-head"><h3>Nationalrat</h3><span class="muted small">${SEATS_TOTAL} Abgeordnete · Mehrheit ab ${MAJORITY}</span></div>
    <div class="hemicycle">${hemicycle()}</div>
    ${bars(seatsSh, true)}
  </section>
  ${r ? `<section class="block"><h3>Wahlergebnis ${dateLabel(r.m)}</h3>
    <p class="muted small">Wahlbeteiligung ${pct(r.turnout)} · 4-%-Hürde · Mandate nach d'Hondt</p>
    ${resultTable(r)}</section>` : ''}`;
}

function resultTable(r) {
  return `<div class="table-wrap"><table><thead><tr><th>Partei</th><th class="num">Stimmen</th><th class="num">±</th><th class="num">Mandate</th></tr></thead><tbody>
    ${[...PARTY_IDS, 'sonst'].sort((a, b) => r.votes[b] - r.votes[a]).map(id => `<tr><td>${chip(id)}</td><td class="num">${pct(r.votes[id])}</td>
    <td class="num">${r.before ? (r.votes[id] - r.before[id] >= 0 ? '+' : '−') + fmt(Math.abs(r.votes[id] - r.before[id])) : '–'}</td>
    <td class="num">${id === 'sonst' ? '–' : r.seats[id]}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function hemicycle() {
  const rows = 8, seats = [];
  const radii = Array.from({ length: rows }, (_, i) => 90 + i * 22);
  const total = radii.reduce((a, r) => a + r, 0);
  let assigned = 0;
  radii.forEach((r, i) => {
    const n = i === rows - 1 ? SEATS_TOTAL - assigned : Math.round(SEATS_TOTAL * r / total);
    assigned += n;
    for (let k = 0; k < n; k++) {
      const a = Math.PI - (Math.PI * k / (n - 1));
      seats.push({ x: 300 + r * Math.cos(a), y: 270 - r * Math.sin(a), a });
    }
  });
  seats.sort((s1, s2) => s2.a - s1.a);
  const order = PARTY_ORDER_SEATS.flatMap(id => Array(S.seats[id] || 0).fill(id));
  return `<svg viewBox="0 0 600 290" role="img" aria-label="Sitzverteilung im Nationalrat">
    ${seats.map((s, i) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="7.5" class="seat fill-${order[i] || 'sonst'} ${inGov(order[i]) ? 'gov' : ''}"/>`).join('')}
    <text x="300" y="255" class="hemi-num">${govSeats() || ''}</text>
    <text x="300" y="278" class="hemi-sub">${S.gov.length ? 'Regierung' : ''}</text>
  </svg>`;
}

function viewStates() {
  return `<section class="block"><div class="table-wrap"><table>
    <thead><tr><th>Bundesland</th><th class="num">Einwohner</th><th>Landeshauptmann</th><th>Umfrage-Erster</th><th class="num">Stimmung</th><th>Nächste Landtagswahl</th></tr></thead>
    <tbody>${STATES.slice().sort((a, b) => b.pop - a.pop).map(st => { const l = leader(S.support[st.id]); return `<tr>
      <td><button class="linkish" data-select="${st.id}">${st.name}</button></td><td class="num">${fmtInt(st.pop)}</td><td>${chip(S.lh[st.id])}</td>
      <td>${chip(l)} ${pct(S.support[st.id][l])}</td><td class="num">${fmt(clamp(S.sat + S.stateMood[st.id], 0, 100), 0)}</td><td>${dateLabel(S.ltw[st.id])}</td></tr>`; }).join('')}
      <tr class="total"><td>Österreich</td><td class="num">${fmtInt(TOTAL_POP)}</td><td colspan="4"></td></tr>
    </tbody></table></div></section>`;
}

function viewLog() {
  return `<section class="block"><ol class="log">${S.log.map(l => `<li class="log-${l.type}"><span class="log-date">${dateLabel(l.m)}</span><span>${esc(l.text)}</span></li>`).join('')}</ol></section>`;
}

function bindPanel() {
  const p = $('#panel');
  p.querySelectorAll('[data-budget]').forEach(b => b.addEventListener('click', () => {
    S.budget[b.dataset.budget] = Number(b.dataset.level); computeEcon(); save(); renderKpis(); renderTabs();
  }));
  p.querySelectorAll('[data-law]').forEach(b => b.addEventListener('click', () => proposeLaw(b.dataset.law)));
  p.querySelectorAll('[data-select]').forEach(b => b.addEventListener('click', () => { ui.selected = b.dataset.select; renderMap(); renderStateDetail(); }));
  const early = p.querySelector('[data-action="early"]');
  if (early) early.addEventListener('click', () => { ui.modal = 'early'; renderModal(); });
  if ($('#poll-chart')) drawPollChart($('#poll-chart'));
}

/* Umfrageverlauf */
function drawPollChart(el) {
  const H = S.history;
  const W = 640, Ht = 240, m = { l: 34, r: 56, t: 10, b: 26 };
  const iw = W - m.l - m.r, ih = Ht - m.t - m.b;
  const maxY = Math.max(40, Math.ceil(Math.max(...H.flatMap(h => PARTY_IDS.map(id => h.sh[id]))) / 10) * 10);
  const n = H.length;
  const x = i => m.l + (n <= 1 ? iw : iw * i / (n - 1));
  const y = v => m.t + ih - ih * v / maxY;
  const ticks = []; for (let v = 0; v <= maxY; v += 10) ticks.push(v);
  const lines = PARTY_IDS.map(id => {
    const d = H.map((h, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(h.sh[id]).toFixed(1)}`).join('');
    return `<path d="${d}" class="line stroke-${id}"/>` + (n === 1 ? `<circle cx="${x(0)}" cy="${y(H[0].sh[id])}" r="4" class="fill-${id}"/>` : '');
  }).join('');
  // Direktbeschriftung am Ende, Überlappungen auflösen
  const ends = PARTY_IDS.map(id => ({ id, v: H[n - 1].sh[id], y: y(H[n - 1].sh[id]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  const labels = ends.map(e => `<circle cx="${x(n - 1)}" cy="${y(e.v)}" r="3.5" class="fill-${e.id} endpoint"/><text x="${x(n - 1) + 8}" y="${e.y + 4}" class="end-label">${party(e.id).name}</text>`).join('');
  const xt = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i && v >= 0);
  el.innerHTML = `<svg viewBox="0 0 ${W} ${Ht}" class="poll-svg" role="img" aria-label="Umfrageverlauf der Parteien">
    ${ticks.map(t => `<line x1="${m.l}" x2="${m.l + iw}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${m.l - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${t}</text>`).join('')}
    ${xt.map(i => `<text x="${x(i)}" y="${Ht - 6}" class="tick" text-anchor="${i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}">${shortDate(H[i].m)}</text>`).join('')}
    ${lines}${labels}
    <line class="crosshair" y1="${m.t}" y2="${m.t + ih}" x1="0" x2="0" visibility="hidden"/>
    <rect x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" class="hit"/>
  </svg><div class="tooltip" hidden></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.tooltip'), ch = el.querySelector('.crosshair');
  const show = evt => {
    const r = svg.getBoundingClientRect();
    const px = (evt.clientX - r.left) * W / r.width;
    const i = clamp(Math.round((px - m.l) / (iw / Math.max(1, n - 1))), 0, n - 1);
    const h = H[i];
    ch.setAttribute('x1', x(i)); ch.setAttribute('x2', x(i)); ch.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${dateLabel(h.m)}</b>${[...PARTY_IDS].sort((a, b) => h.sh[b] - h.sh[a]).map(id => `<div><span class="swatch fill-${id}"></span>${party(id).name}<span>${pct(h.sh[id])}</span></div>`).join('')}`;
    const left = x(i) / W * r.width;
    tip.style.left = (left > r.width / 2 ? left - tip.offsetWidth - 12 : left + 12) + 'px';
  };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', () => { tip.hidden = true; ch.setAttribute('visibility', 'hidden'); });
}
function shortDate(m) { const d = dateOf(m); return `${MONTHS[d.mo].slice(0, 3)} ${d.y}`; }

/* Dialoge */
function renderModal() {
  const box = $('#modal'), body = $('#modal-body');
  if (!ui.modal) { box.hidden = true; return; }
  box.hidden = false;
  const views = { start: modalStart, election: modalElection, event: modalEvent, over: modalOver, early: modalEarly };
  body.innerHTML = views[ui.modal]();
  body.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => { newGame(b.dataset.start); save(); render(); }));
  body.querySelectorAll('[data-coal]').forEach(b => b.addEventListener('click', () => tryCoalition(b.dataset.coal)));
  body.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => resolveEvent(Number(b.dataset.opt))));
  body.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'opposition') goOpposition();
    if (a === 'restart') resetGame();
    if (a === 'close') { ui.modal = null; renderModal(); }
    if (a === 'early-yes') callEarlyElection();
  }));
  const first = body.querySelector('button:not([disabled])');
  if (first) first.focus({ preventScroll: true });
}

function modalStart() {
  const init = {};
  ALL_IDS.forEach(id => { init[id] = 0; });
  STATES.forEach(st => PARTY_IDS.forEach(id => { init[id] += st.base[id] * st.pop / TOTAL_POP; }));
  return `<div class="start">
    <div class="flag" aria-hidden="true"><span></span><span></span><span></span></div>
    <h2>Österreich-Simulator</h2>
    <p>Führen Sie eine Partei durch die Nationalratswahl, schmieden Sie eine Koalition und regieren Sie die Republik: Budget, Gesetze, Krisen und neun Bundesländer mit ihren eigenen Stimmungen.</p>
    <h3 class="eyebrow">Wählen Sie Ihre Partei</h3>
    <div class="party-pick">${PARTIES.map(p => `<button class="pick pick-${p.id}" data-start="${p.id}">
      <span class="pick-name">${p.name}</span><span class="pick-long">${p.long}</span><span class="pick-poll">Ausgangslage ≈ ${pct(init[p.id], 0)}</span></button>`).join('')}</div>
  </div>`;
}

function modalElection() {
  const r = S.result;
  const opts = coalitionOptions();
  const head = `<span class="eyebrow">${dateLabel(r.m)}</span><h2>Nationalratswahl: Ergebnis</h2>${resultTable(r)}`;
  if (S.phase !== 'coalition') return head + `<div class="actions"><button class="btn" data-act="close">Schließen</button></div>`;
  return `${head}
    <h3>Regierungsbildung</h3>
    <p class="muted small">Der Bundespräsident beauftragt Sie mit Sondierungsgesprächen. Jede Variante können Sie zweimal verhandeln. In der zweiten Runde steigen die Chancen, aber der Partner startet misstrauischer.</p>
    <div class="coal-list">${opts.length ? opts.map(o => {
      const n = tries(o.key), tried = n >= MAX_TRIES;
      return `<button class="coal ${tried ? 'tried' : ''}" data-coal="${o.key}" ${tried ? 'disabled' : ''}>
        <span class="coal-parties">${o.parties.map(chip).join('')}</span>
        <span class="coal-seats">${o.seats} Mandate</span>
        <span class="coal-chance">${tried ? 'endgültig gescheitert' : o.parties.length === 1 ? 'Alleinregierung' : `${n ? '2. Runde · ' : ''}Chance ${Math.round(o.chance * 100)} %`}</span></button>`;
    }).join('') : '<p>Mit Ihrer Partei ist keine Mehrheit von 92 Mandaten möglich.</p>'}</div>
    <div class="actions"><button class="btn-ghost" data-act="opposition">In Opposition gehen</button></div>`;
}

function modalEvent() {
  const ev = EVENTS.find(e => e.id === S.pendingEvent);
  return `<span class="eyebrow">Eilmeldung · ${dateLabel(S.m)}</span><h2>${ev.title}</h2><p>${ev.text}</p>
    <div class="opt-list">${ev.options.map((o, i) => `<button class="opt" data-opt="${i}">${o.label}</button>`).join('')}</div>`;
}

function modalEarly() {
  return `<h2>Neuwahl ausrufen?</h2><p>Der Nationalrat wird aufgelöst, in drei Monaten wird gewählt. Danach muss eine neue Regierung gebildet werden. Aktuelle Umfrage: ${chip(S.player)} ${pct(nationalShares()[S.player])}.</p>
    <div class="actions"><button class="btn" data-act="early-yes">Neuwahl beschließen</button><button class="btn-ghost" data-act="close">Abbrechen</button></div>`;
}

function modalOver() {
  return `<span class="eyebrow">Spielende · ${dateLabel(S.m)}</span><h2>Ihre Kanzlerschaft ist vorbei</h2><p>${esc(S.overReason)}</p>
    <dl class="facts score">
      <div><dt>Monate in Regierung</dt><dd>${S.monthsInGov}</dd></div>
      <div><dt>Beschlossene Gesetze</dt><dd>${S.passed.length}</dd></div>
      <div><dt>Gewonnene Landtagswahlen</dt><dd>${S.ltwWins}</dd></div>
      <div><dt>Nationalratswahlen</dt><dd>${S.elections}</dd></div>
    </dl>
    <div class="actions"><button class="btn" data-act="restart">Neues Spiel</button><button class="btn-ghost" data-act="close">Bilanz ansehen</button></div>`;
}

/* ---------- Start ---------- */
function defaultModal() {
  if (!S) return 'start';
  if (S.phase === 'coalition') return 'election';
  if (S.pendingEvent) return 'event';
  return null;
}
function boot(snapshot) {
  S = snapshot && snapshot.S ? snapshot.S : load();
  ui.modal = S && S.phase === 'over' ? 'over' : defaultModal();
  $('#end-month').addEventListener('click', endMonth);
  $('#new-game').addEventListener('click', () => { if (S) confirmNew(); else resetGame(); });
  render();
}
function confirmNew() {
  const box = $('#modal'), body = $('#modal-body');
  box.hidden = false;
  body.innerHTML = `<h2>Neues Spiel beginnen?</h2><p>Der aktuelle Spielstand wird gelöscht.</p>
    <div class="actions"><button class="btn" id="cn-yes">Neues Spiel</button><button class="btn-ghost" id="cn-no">Abbrechen</button></div>`;
  $('#cn-yes').addEventListener('click', resetGame);
  $('#cn-no').addEventListener('click', () => { ui.modal = defaultModal(); render(); });
  $('#cn-yes').focus();
}

window.claude?.hot?.snapshot?.(() => ({ S }));
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? null);
