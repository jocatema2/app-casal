import {
  state, init, onChange, me, other, profileName,
  signIn, signInDemo, signOut, saveProfile, changePassword, add, update, remove, resetDemo,
} from './store.js';

/* ---------- utilitários ---------- */

const $ = (s, root = document) => root.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eurFmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const eur = (n) => eurFmt.format(n);
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shift = (s, days) => { const d = parse(s); d.setDate(d.getDate() + days); return iso(d); };
const shortDate = (s) => parse(s).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
const longDate = (s) => parse(s).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
const dayLabel = (s) => s === today() ? 'Hoje' : s === shift(today(), -1) ? 'Ontem' : s === shift(today(), 1) ? 'Amanhã' : longDate(s);
const monthLabel = (ym) => parse(ym + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
const num = (v) => Number(String(v).replace(',', '.'));
const qty = (n) => Number(n).toLocaleString('pt-PT', { maximumFractionDigits: 2 });
const em = (e) => `<span class="emoji" aria-hidden="true">${e}</span>`;

/* ---------- temas, categorias e ícones ---------- */

const THEMES = {
  ocean: { name: 'Oceano', p: '#2f6bff', p2: '#1ba5d8', soft: '#e6eeff' },
  rose: { name: 'Rosa', p: '#e9488f', p2: '#ff7e8a', soft: '#ffe6f0' },
  lilac: { name: 'Lilás', p: '#8257e6', p2: '#b57bff', soft: '#efe8ff' },
  forest: { name: 'Floresta', p: '#17885b', p2: '#4fc487', soft: '#e1f6ec' },
  sunset: { name: 'Pôr do sol', p: '#ee5f2a', p2: '#ff9a3d', soft: '#ffeedd' },
};
const themeOf = (id) => THEMES[state.profiles.find((p) => p.id === id)?.theme] || THEMES.lilac;

function applyTheme() {
  const t = state.user && me() ? themeOf(state.user.id) : THEMES.lilac;
  const s = document.documentElement.style;
  s.setProperty('--p', t.p); s.setProperty('--p2', t.p2); s.setProperty('--p-soft', t.soft);
}

const CATS = {
  Compras: ['🛒', '#34c38f'], Casa: ['🏠', '#5b8def'], Contas: ['💡', '#f7b731'], Restaurantes: ['🍽️', '#ff7a59'],
  Transportes: ['🚗', '#7c6cf2'], Lazer: ['🎬', '#ec6abf'], Saúde: ['💊', '#2cc5c5'], Outros: ['📦', '#9aa0b4'],
  Acerto: ['🤝', '#9aa0b4'],
};
const EXPENSE_CATS = Object.keys(CATS).filter((c) => c !== 'Acerto');
const cat = (c) => CATS[c] || CATS.Outros;

const STOCK_CATS = { Alimentos: '🥫', Casa: '🧽', Higiene: '🧴', Outros: '📦' };
const PRODUCT_EMOJI = [
  ['leite', '🥛'], ['ovo', '🥚'], ['arroz', '🍚'], ['caf', '☕'], ['chá', '🍵'], ['pão', '🍞'], ['pao', '🍞'], ['queijo', '🧀'],
  ['manteiga', '🧈'], ['massa', '🍝'], ['esparguete', '🍝'], ['carne', '🥩'], ['frango', '🍗'], ['peixe', '🐟'], ['atum', '🐟'],
  ['maçã', '🍎'], ['fruta', '🍎'], ['banana', '🍌'], ['laranja', '🍊'], ['limão', '🍋'], ['tomate', '🍅'], ['batata', '🥔'],
  ['cebola', '🧅'], ['alho', '🧄'], ['cenoura', '🥕'], ['alface', '🥬'], ['azeite', '🫒'], ['água', '💧'], ['agua', '💧'],
  ['vinho', '🍷'], ['cerveja', '🍺'], ['sumo', '🧃'], ['iogurte', '🥣'], ['cereais', '🥣'], ['gelado', '🍨'], ['chocolate', '🍫'],
  ['bolacha', '🍪'], ['açúcar', '🍬'], ['mel', '🍯'], ['papel', '🧻'], ['guardanapo', '🧻'], ['lixo', '🗑️'], ['esponja', '🧽'],
  ['pasta de dentes', '🪥'], ['escova', '🪥'], ['sabonete', '🧼'], ['sabão', '🧼'], ['detergente', '🧴'], ['champô', '🧴'],
  ['shampoo', '🧴'], ['gel', '🧴'], ['lâmpada', '💡'], ['pilha', '🔋'], ['vela', '🕯️'],
];
const productEmoji = (i) => {
  const n = i.name.toLowerCase();
  return PRODUCT_EMOJI.find(([k]) => n.includes(k))?.[1] || STOCK_CATS[i.category] || '📦';
};

const REPEATS = { none: 'Não repetir', daily: 'Todos os dias', weekly: 'Todas as semanas', monthly: 'Todos os meses' };
const ui = { tab: 'home', month: today().slice(0, 7), taskFilter: 'all', showDone: false, stockView: 'home', stockCat: 'Tudo' };

const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
  expenses: '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10.5h18M15.5 15h2"/>',
  tasks: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  stock: '<path d="m4 8 8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"/>',
};
const CHECK = '<svg viewBox="0 0 16 16"><path d="m3 8.5 3.2 3L13 4.5"/></svg>';

const avatar = (id, cls = '') => {
  const t = themeOf(id);
  return `<span class="avatar ${cls}" style="--a:${t.p};--a2:${t.p2}" aria-hidden="true">${esc(profileName(id)[0].toUpperCase())}</span>`;
};

const HOUSE = `<svg viewBox="0 0 360 230" role="img" aria-label="Uma casa com um coração">
  <g fill="#fff" opacity=".28"><ellipse cx="70" cy="58" rx="40" ry="14"/><ellipse cx="96" cy="48" rx="26" ry="13"/><ellipse cx="292" cy="84" rx="36" ry="12"/><ellipse cx="270" cy="75" rx="22" ry="11"/></g>
  <ellipse cx="180" cy="262" rx="270" ry="82" fill="#fff" opacity=".22"/>
  <rect x="84" y="176" width="7" height="30" rx="3" fill="#fff" opacity=".85"/><circle cx="88" cy="160" r="28" fill="#7be0b0"/><circle cx="72" cy="172" r="16" fill="#62d3a0"/>
  <circle cx="282" cy="192" r="18" fill="#7be0b0"/><circle cx="300" cy="198" r="13" fill="#62d3a0"/>
  <rect x="212" y="70" width="16" height="34" rx="3" fill="#fff"/>
  <rect x="118" y="112" width="124" height="94" rx="12" fill="#fff"/>
  <path d="M104 122 180 62l76 60z" fill="#ffd166" stroke="#ffd166" stroke-width="12" stroke-linejoin="round"/>
  <rect x="166" y="154" width="28" height="52" rx="8" fill="#ff7fa5"/><circle cx="187" cy="181" r="2.5" fill="#fff"/>
  <rect x="132" y="134" width="24" height="24" rx="6" fill="#bfd4ff"/><rect x="204" y="134" width="24" height="24" rx="6" fill="#bfd4ff"/>
  <g fill="#fff"><path transform="translate(220 46) scale(1.5)" d="M0 6C-10-2-6-10 0-5 6-10 10-2 0 6z"/><path transform="translate(244 24)" opacity=".8" d="M0 6C-10-2-6-10 0-5 6-10 10-2 0 6z"/><path transform="translate(206 20) scale(.7)" opacity=".6" d="M0 6C-10-2-6-10 0-5 6-10 10-2 0 6z"/></g>
</svg>`;

/* ---------- cálculos ---------- */

// positivo: a outra pessoa deve-me; negativo: devo eu
function balance() {
  let cents = 0;
  for (const e of state.expenses) {
    const owed = Math.round(e.amount * 100 * (1 - e.share_payer));
    cents += e.paid_by === state.user.id ? owed : -owed;
  }
  return cents / 100;
}
const isLow = (i) => Number(i.quantity) <= Number(i.min_quantity);
const pendingTasks = () => state.tasks.filter((t) => !t.done).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
const byDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.created_at || '').localeCompare(a.created_at || '');
const monthSpend = (ym) => state.expenses.filter((e) => e.kind !== 'settlement' && e.date.startsWith(ym));

/* ---------- ecrãs ---------- */

function render() {
  applyTheme();
  const app = $('#app');
  if (!state.user) app.innerHTML = loginView();
  else if (!me()) app.innerHTML = profileView();
  else app.innerHTML = shell(VIEWS[ui.tab]());
}

function loginView() {
  const body = state.mode === 'demo'
    ? `<p>A vossa casa, organizada a dois.</p>
       <p class="note">Modo de demonstração: ainda sem palavra-passe, e os dados ficam só neste browser. Ao ligar a base de dados, cada um entra com o seu email e palavra-passe.</p>
       <div class="who">${state.profiles.map((p) => `<button data-act="demoLogin" data-id="${p.id}">${avatar(p.id, 'xl')}Entrar como ${esc(p.name)}</button>`).join('')}</div>`
    : `<p>A vossa casa, organizada a dois.</p>
       <form data-form="login">
         <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" inputmode="email" required></label>
         <label class="field"><span>Palavra-passe</span><input name="password" type="password" autocomplete="current-password" required>
           <button type="button" class="pw-toggle" data-act="togglePw">Mostrar</button></label>
         <p class="error" role="alert"></p>
         <button class="btn block">Entrar</button>
       </form>`;
  return `<main class="login"><div class="login-art">${HOUSE}</div><div class="login-body"><h1>A Dois</h1>${body}</div></main>`;
}

const themePicker = (current) => `<fieldset class="field"><legend>As tuas cores</legend><div class="themes">
  ${Object.entries(THEMES).map(([id, t]) => `<label><input type="radio" name="theme" value="${id}" ${id === current ? 'checked' : ''}><i style="--a:${t.p};--a2:${t.p2}"></i>${t.name}</label>`).join('')}
</div></fieldset>`;

function profileView() {
  return `<main class="login"><div class="login-art">${HOUSE}</div><div class="login-body">
    <h1>Olá!</h1><p>É a tua primeira vez aqui. Diz-nos quem és.</p>
    <form data-form="profile">
      <label class="field"><span>Nome</span><input name="name" required maxlength="30" autocomplete="given-name"></label>
      ${themePicker(state.profiles.some((p) => p.theme === 'ocean') ? 'rose' : 'ocean')}
      <p class="error" role="alert"></p>
      <button class="btn block">Guardar perfil</button>
    </form></div></main>`;
}

function shell(content) {
  const tab = (id, label) => `<button class="nav-tab" data-act="tab" data-id="${id}" ${ui.tab === id ? 'aria-current="page"' : ''}>
    <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg>${label}</button>`;
  return `<div class="shell">${content}</div>
  <nav class="nav" aria-label="Secções">
    ${tab('home', 'Início')}${tab('expenses', 'Despesas')}
    <button class="fab" data-act="fab" aria-label="Adicionar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
    ${tab('tasks', 'Tarefas')}${tab('stock', 'Stock')}
  </nav>`;
}

const header = (title, sub) => `<header class="top"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
  <button class="avatar lg" data-act="account" aria-label="A tua conta" style="--a:${themeOf(state.user.id).p};--a2:${themeOf(state.user.id).p2}">${esc(me().name[0].toUpperCase())}</button></header>`;

function balanceHero() {
  const o = other();
  if (!o) {
    return `<section class="hero"><p class="hero-label">Saldo entre vocês</p>
      <p class="hero-line" style="margin-top:10px">Falta a tua cara-metade entrar pela primeira vez. Depois disso, o saldo aparece aqui.</p></section>`;
  }
  const b = balance();
  const even = Math.abs(b) < 0.005;
  return `<section class="hero" aria-label="Saldo entre vocês">
    <div class="hero-top"><span class="hero-label">Saldo entre vocês</span>
      <span class="pair">${avatar(state.user.id)}<span class="heart emoji" aria-hidden="true">❤️</span>${avatar(o.id)}</span></div>
    <p class="hero-amount">${eur(Math.abs(b))}</p>
    <p class="hero-line">${even ? 'Contas certas 🎉' : b > 0 ? `${esc(o.name)} deve-te este valor` : `Deves este valor a ${esc(o.name)}`}</p>
    ${even ? '' : '<button class="btn sm" data-act="settle">Acertar contas</button>'}
  </section>`;
}

function taskRow(t) {
  const late = !t.done && t.due && t.due < today();
  const when = t.done ? `<span class="pill">Feita ${t.done_at ? shortDate(t.done_at.slice(0, 10)) : ''}</span>`
    : !t.due ? '<span class="pill">Sem data</span>'
    : late ? `<span class="pill late">Atrasada desde ${shortDate(t.due)}</span>`
    : `<span class="pill ${t.due === today() ? 'today' : ''}">${t.due <= shift(today(), 1) ? dayLabel(t.due) : shortDate(t.due)}</span>`;
  return `<li class="row ${t.done ? 'done' : ''}">
    <button class="check" role="checkbox" aria-checked="${t.done}" aria-label="${t.done ? 'Reabrir' : 'Concluir'}: ${esc(t.title)}" data-act="toggleTask" data-id="${t.id}">${CHECK}</button>
    <button class="row-main" data-act="editTask" data-id="${t.id}">
      <span class="row-text"><span class="row-title">${esc(t.title)}</span>
      <span class="row-sub">${when}${t.repeat && t.repeat !== 'none' ? `<span>${em('🔁')} ${REPEATS[t.repeat].toLowerCase()}</span>` : ''}</span></span>
      ${t.assignee ? avatar(t.assignee) : ''}
    </button></li>`;
}

function expenseRow(e) {
  const [icon, color] = cat(e.kind === 'settlement' ? 'Acerto' : e.category);
  const payer = esc(profileName(e.paid_by));
  const sub = e.kind === 'settlement' ? `${payer} pagou a dívida`
    : e.share_payer === 0.5 ? `${payer}, a meias`
    : e.share_payer === 1 ? `${payer}, não dividida`
    : `${payer}, tudo de ${esc(state.profiles.find((p) => p.id !== e.paid_by)?.name || 'outra pessoa')}`;
  return `<li class="row"><button class="row-main" data-act="editExpense" data-id="${e.id}">
      <span class="tile emoji" style="background:${color}26" aria-hidden="true">${icon}</span>
      <span class="row-text"><span class="row-title">${esc(e.description)}</span>
      <span class="row-sub one">${avatar(e.paid_by)}<span>${sub}</span></span></span>
      <span class="row-amount">${eur(e.amount)}</span></button></li>`;
}

function stockRow(i, shopping) {
  const state_ = Number(i.quantity) <= 0 ? '<span class="pill out">Acabou</span>' : isLow(i) ? '<span class="pill low">A acabar</span>' : '';
  const right = shopping
    ? `<button class="btn soft sm" data-act="bought" data-id="${i.id}">Comprei</button>`
    : `<div class="stepper">
        <button data-act="dec" data-id="${i.id}" aria-label="Tirar um: ${esc(i.name)}">−</button>
        <output aria-label="${qty(i.quantity)} ${esc(i.unit)}">${qty(i.quantity)}<small>${esc(i.unit)}</small></output>
        <button data-act="inc" data-id="${i.id}" aria-label="Juntar um: ${esc(i.name)}">+</button></div>`;
  return `<li class="row"><button class="row-main" data-act="editStock" data-id="${i.id}">
      <span class="tile emoji" aria-hidden="true">${productEmoji(i)}</span>
      <span class="row-text"><span class="row-title">${esc(i.name)}</span>
      <span class="row-sub">${shopping ? `Há ${qty(i.quantity)} ${esc(i.unit)}, mínimo ${qty(i.min_quantity)}` : state_ || esc(i.category)}</span></span></button>${right}</li>`;
}

const empty = (emoji, title, text) => `<div class="empty"><div class="blob emoji" aria-hidden="true">${emoji}</div><strong>${title}</strong>${text}</div>`;
const card = (rows) => `<ul class="list card">${rows}</ul>`;

const VIEWS = {
  home() {
    const mineOrAny = pendingTasks().filter((t) => !t.assignee || t.assignee === state.user.id);
    const low = state.stock_items.filter(isLow);
    const recent = [...state.expenses].sort(byDateDesc).slice(0, 3);
    const spent = monthSpend(today().slice(0, 7)).reduce((s, e) => s + Number(e.amount), 0);
    return `${header(`Olá, ${esc(me().name)} ${em('👋')}`, longDate(today()))}
      ${balanceHero()}
      <div class="stats">
        <button class="stat" data-act="tab" data-id="expenses"><span class="tile emoji" style="background:#e1f6ec">💶</span><strong>${eurFmt.format(spent).replace(/,\d\d/, '')}</strong><span>gastos este mês</span></button>
        <button class="stat" data-act="tab" data-id="tasks"><span class="tile emoji" style="background:#e6eeff">✅</span><strong>${mineOrAny.length}</strong><span>${mineOrAny.length === 1 ? 'tarefa tua' : 'tarefas tuas'}</span></button>
        <button class="stat" data-act="shopping"><span class="tile emoji" style="background:#fff1d6">🛒</span><strong>${low.length}</strong><span>a comprar</span></button>
      </div>
      <section class="section"><div class="section-head"><h2>Por fazer</h2><button class="link" data-act="tab" data-id="tasks">Ver todas</button></div>
        ${mineOrAny.length ? card(mineOrAny.slice(0, 4).map(taskRow).join('')) : `<div class="card">${empty('🌿', 'Nada pendente', 'Aproveita o descanso.')}</div>`}</section>
      ${low.length ? `<section class="section"><div class="section-head"><h2>A comprar</h2><button class="link" data-act="shopping">Ver lista</button></div>
        <div class="chips">${low.map((i) => `<button class="chip" data-act="shopping">${em(productEmoji(i))} ${esc(i.name)}</button>`).join('')}</div></section>` : ''}
      <section class="section" ${low.length ? 'style="margin-top:14px"' : ''}><div class="section-head"><h2>Últimas despesas</h2><button class="link" data-act="tab" data-id="expenses">Ver todas</button></div>
        ${recent.length ? card(recent.map(expenseRow).join('')) : `<div class="card">${empty('🧾', 'Ainda sem despesas', 'Toca no + para registar a primeira.')}</div>`}</section>`;
  },

  expenses() {
    const inMonth = state.expenses.filter((e) => e.date.startsWith(ui.month)).sort(byDateDesc);
    const spend = inMonth.filter((e) => e.kind !== 'settlement');
    const total = spend.reduce((s, e) => s + Number(e.amount), 0);
    const cats = Object.entries(spend.reduce((m, e) => ((m[e.category] = (m[e.category] || 0) + Number(e.amount)), m), {})).sort((a, b) => b[1] - a[1]);
    const days = [];
    for (const e of inMonth) {
      if (days.at(-1)?.date !== e.date) days.push({ date: e.date, rows: [] });
      days.at(-1).rows.push(expenseRow(e));
    }
    return `${header('Despesas')}
      ${balanceHero()}
      <div class="month">
        <button data-act="month" data-id="-1" aria-label="Mês anterior">‹</button>
        <h2>${esc(monthLabel(ui.month))}</h2>
        <button data-act="month" data-id="1" aria-label="Mês seguinte">›</button>
      </div>
      ${spend.length ? `<div class="card summary"><p class="muted small">Gastaram os dois</p><p class="total">${eur(total)}</p>
        <div class="stack-bar" aria-hidden="true">${cats.map(([c, v]) => `<i style="flex:${v};background:${cat(c)[1]}"></i>`).join('')}</div>
        <div class="legend">${cats.map(([c, v]) => `<div><i style="background:${cat(c)[1]}"></i><span>${esc(c)}</span><b>${eur(v)}</b></div>`).join('')}</div></div>` : ''}
      ${days.length ? days.map((d) => `<p class="day">${esc(dayLabel(d.date))}</p>${card(d.rows.join(''))}`).join('')
        : empty('🧾', 'Sem despesas neste mês', 'Toca no + para registar uma.')}`;
  },

  tasks() {
    const o = other();
    const filters = [['all', 'Todas'], ['mine', 'Minhas'], ...(o ? [['theirs', `De ${o.name}`]] : [])];
    const match = (t) => ui.taskFilter === 'all' ? true
      : ui.taskFilter === 'mine' ? (!t.assignee || t.assignee === state.user.id) : (!t.assignee || t.assignee === o?.id);
    const open = pendingTasks().filter(match);
    const done = state.tasks.filter((t) => t.done && match(t)).sort((a, b) => (b.done_at || '').localeCompare(a.done_at || '')).slice(0, 20);
    return `${header('Tarefas', open.length ? `${open.length} por fazer` : 'Tudo em dia')}
      <div class="chips">${filters.map(([id, l]) => `<button class="chip" aria-pressed="${ui.taskFilter === id}" data-act="taskFilter" data-id="${id}">${esc(l)}</button>`).join('')}</div>
      ${open.length ? card(open.map(taskRow).join('')) : empty('🎉', 'Tudo feito', 'Não há tarefas por fazer aqui.')}
      ${done.length ? `<section class="section"><button class="link" data-act="toggleDone" aria-expanded="${ui.showDone}">${ui.showDone ? 'Esconder' : 'Mostrar'} concluídas (${done.length})</button>
        ${ui.showDone ? card(done.map(taskRow).join('')) : ''}</section>` : ''}`;
  },

  stock() {
    const shopping = ui.stockView === 'shopping';
    const low = state.stock_items.filter(isLow);
    const items = (shopping ? low : state.stock_items)
      .filter((i) => ui.stockCat === 'Tudo' || i.category === ui.stockCat)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    return `${header('Stock', `${state.stock_items.length} produtos em casa`)}
      <div class="seg" role="group" aria-label="Vista">
        <button aria-pressed="${!shopping}" data-act="stockView" data-id="home">Em casa</button>
        <button aria-pressed="${shopping}" data-act="stockView" data-id="shopping">A comprar (${low.length})</button>
      </div>
      <div class="chips" style="margin-top:14px">${[['Tudo', '✨'], ...Object.entries(STOCK_CATS)].map(([c, e]) => `<button class="chip" aria-pressed="${ui.stockCat === c}" data-act="stockCat" data-id="${c}">${em(e)} ${c}</button>`).join('')}</div>
      ${items.length ? card(items.map((i) => stockRow(i, shopping)).join(''))
        : shopping ? empty('🧺', 'Nada a comprar', 'Os produtos aparecem aqui quando chegam ao mínimo.')
        : empty('📦', 'Sem produtos', 'Toca no + para juntar o primeiro.')}`;
  },
};

/* ---------- folhas e formulários ---------- */

const dlg = $('#dlg');
let formHandlers = null;

function fieldHtml(f) {
  const radios = (cls, inner) => `<fieldset class="field"><legend>${esc(f.label)}</legend><div class="${cls}">
    ${f.options.map(([v, l, extra]) => `<label><input type="radio" name="${f.name}" value="${esc(v)}" ${String(f.value) === String(v) ? 'checked' : ''}>${inner(l, extra)}</label>`).join('')}</div></fieldset>`;
  if (f.type === 'seg') return radios('seg', (l) => esc(l));
  if (f.type === 'cats') return radios('cats', (l, e) => `<b class="emoji" aria-hidden="true">${e}</b>${esc(l)}`);
  if (f.type === 'select') {
    return `<label class="field"><span>${esc(f.label)}</span><select name="${f.name}">
      ${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(f.value) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  }
  const decimal = f.type === 'decimal' || f.type === 'amount';
  const attrs = decimal ? 'type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" autocomplete="off"' : `type="${f.type || 'text'}"`;
  return `<label class="field ${f.type === 'amount' ? 'amount' : ''}"><span>${esc(f.label)}</span>
    <input name="${f.name}" ${attrs} value="${esc(f.value ?? '')}" ${f.required ? 'required' : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} maxlength="80"></label>`;
}

function openForm({ title, fields, submit, onSubmit, onDelete }) {
  formHandlers = { onSubmit, onDelete };
  const html = fields.map((f) => Array.isArray(f) ? `<div class="field-pair">${f.map(fieldHtml).join('')}</div>` : fieldHtml(f)).join('');
  dlg.innerHTML = `<form class="sheet" data-form="sheet">
    <h2>${esc(title)}</h2>${html}
    <p class="error" role="alert"></p>
    <div class="sheet-actions">
      ${onDelete ? '<button type="button" class="btn danger" data-act="sheetDelete">Apagar</button>' : ''}
      <button type="button" class="btn quiet" data-act="closeSheet">Cancelar</button>
      <button class="btn grow">${esc(submit)}</button>
    </div></form>`;
  dlg.showModal();
}

function addSheet() {
  const opt = (act, emoji, bg, title, text) => `<button class="option" data-act="${act}"><span class="tile emoji" style="background:${bg}" aria-hidden="true">${emoji}</span><span><strong>${title}</strong><span>${text}</span></span></button>`;
  dlg.innerHTML = `<div class="sheet"><h2>O que queres juntar?</h2><div class="stack" style="margin-top:0">
    ${opt('addExpense', '💶', '#e1f6ec', 'Despesa', 'Compras, contas, jantares')}
    ${opt('addTask', '✅', '#e6eeff', 'Tarefa', 'Algo para fazer em casa')}
    ${opt('addStock', '🥫', '#fff1d6', 'Produto', 'Alimentos e coisas da casa')}
    <button class="btn quiet block" data-act="closeSheet">Cancelar</button></div></div>`;
  if (!dlg.open) dlg.showModal();
}

function expenseForm(e) {
  const o = other();
  const people = state.profiles.map((p) => [p.id, p.name]);
  const settle = e?.kind === 'settlement';
  openForm({
    title: settle ? 'Acerto de contas' : e ? 'Editar despesa' : 'Nova despesa',
    submit: e ? 'Guardar alterações' : 'Guardar despesa',
    fields: [
      { name: 'amount', label: 'Valor em euros', type: 'amount', value: e ? Number(e.amount).toFixed(2).replace('.', ',') : '', required: true, placeholder: '0,00' },
      ...(settle ? [] : [
        { name: 'description', label: 'O que foi', value: e?.description, required: true, placeholder: 'Compras da semana' },
        { name: 'category', label: 'Categoria', type: 'cats', value: e?.category || EXPENSE_CATS[0], options: EXPENSE_CATS.map((c) => [c, c, CATS[c][0]]) },
      ]),
      { name: 'paid_by', label: 'Quem pagou', type: 'seg', value: e?.paid_by || state.user.id, options: people },
      ...(settle || !o ? [] : [{ name: 'share_payer', label: 'Como se divide', type: 'seg', value: e?.share_payer ?? 0.5,
        options: [[0.5, 'A meias'], [0, 'É só da outra pessoa'], [1, 'Não dividir']] }]),
      { name: 'date', label: 'Data', type: 'date', value: e?.date || today(), required: true },
    ],
    async onSubmit(v) {
      const amount = num(v.amount);
      if (!(amount > 0)) throw new Error('Escreve um valor maior que zero, por exemplo 12,50.');
      const row = settle
        ? { amount, date: v.date, paid_by: v.paid_by }
        : { description: v.description.trim(), amount, date: v.date, category: v.category, paid_by: v.paid_by,
            share_payer: o ? Number(v.share_payer) : 1, kind: 'expense' };
      if (e) await update('expenses', e.id, row); else await add('expenses', row);
      ui.month = v.date.slice(0, 7);
    },
    onDelete: e ? () => remove('expenses', e.id) : null,
  });
}

function settleForm() {
  const b = balance(); const o = other();
  const debtor = b > 0 ? o : me(); const creditor = b > 0 ? me() : o;
  openForm({
    title: `${debtor.name} paga a ${creditor.name}`,
    submit: 'Registar pagamento',
    fields: [{ name: 'amount', label: 'Valor pago em euros', type: 'amount', value: Math.abs(b).toFixed(2).replace('.', ','), required: true }],
    async onSubmit(v) {
      const amount = num(v.amount);
      if (!(amount > 0)) throw new Error('Escreve um valor maior que zero.');
      await add('expenses', { description: 'Acerto de contas', amount, date: today(), category: 'Acerto', paid_by: debtor.id, share_payer: 0, kind: 'settlement' });
    },
  });
}

function taskForm(t) {
  openForm({
    title: t ? 'Editar tarefa' : 'Nova tarefa',
    submit: t ? 'Guardar alterações' : 'Guardar tarefa',
    fields: [
      { name: 'title', label: 'O que há a fazer', value: t?.title, required: true, placeholder: 'Levar o lixo' },
      { name: 'assignee', label: 'Para quem', type: 'seg', value: t?.assignee || '', options: [['', 'Qualquer um'], ...state.profiles.map((p) => [p.id, p.name])] },
      [{ name: 'due', label: 'Até quando', type: 'date', value: t?.due || '' },
       { name: 'repeat', label: 'Repetição', type: 'select', value: t?.repeat || 'none', options: Object.entries(REPEATS) }],
    ],
    async onSubmit(v) {
      if (v.repeat !== 'none' && !v.due) throw new Error('Uma tarefa que se repete precisa de data.');
      const row = { title: v.title.trim(), assignee: v.assignee || null, due: v.due || null, repeat: v.repeat };
      if (t) await update('tasks', t.id, row); else await add('tasks', { ...row, done: false, done_at: null });
    },
    onDelete: t ? () => remove('tasks', t.id) : null,
  });
}

function stockForm(i) {
  const cats = Object.keys(STOCK_CATS);
  openForm({
    title: i ? 'Editar produto' : 'Novo produto',
    submit: i ? 'Guardar alterações' : 'Guardar produto',
    fields: [
      { name: 'name', label: 'Produto', value: i?.name, required: true, placeholder: 'Leite' },
      { name: 'category', label: 'Tipo', type: 'cats', value: i?.category || (ui.stockCat !== 'Tudo' ? ui.stockCat : cats[0]), options: cats.map((c) => [c, c, STOCK_CATS[c]]) },
      [{ name: 'quantity', label: 'Quantidade em casa', type: 'decimal', value: i ? String(i.quantity).replace('.', ',') : '1', required: true },
       { name: 'unit', label: 'Unidade', value: i?.unit ?? 'un', placeholder: 'un, kg, L' }],
      { name: 'min_quantity', label: 'Avisar quando chegar a', type: 'decimal', value: i ? String(i.min_quantity).replace('.', ',') : '0', required: true },
    ],
    async onSubmit(v) {
      const quantity = num(v.quantity), min_quantity = num(v.min_quantity);
      if (!(quantity >= 0) || !(min_quantity >= 0)) throw new Error('As quantidades têm de ser números, por exemplo 2 ou 0,5.');
      const row = { name: v.name.trim(), category: v.category, quantity, unit: v.unit.trim(), min_quantity };
      if (i) await update('stock_items', i.id, row); else await add('stock_items', row);
    },
    onDelete: i ? () => remove('stock_items', i.id) : null,
  });
}

function boughtForm(i) {
  openForm({
    title: `Comprei ${i.name}`,
    submit: 'Guardar quantidade',
    fields: [{ name: 'quantity', label: `Quanto há agora em casa (${i.unit || 'un'})`, type: 'amount', value: qty(Number(i.min_quantity) + 1), required: true }],
    async onSubmit(v) {
      const quantity = num(v.quantity);
      if (!(quantity >= 0)) throw new Error('Escreve um número, por exemplo 3.');
      await update('stock_items', i.id, { quantity });
    },
  });
}

function accountSheet() {
  const o = other();
  dlg.innerHTML = `<div class="sheet">
    <div class="me">${avatar(state.user.id, 'xl')}<div><strong>${esc(me().name)}</strong><span class="muted small">${esc(state.user.email || 'Modo de demonstração')}</span></div></div>
    <form data-form="profile">
      <label class="field"><span>Nome</span><input name="name" value="${esc(me().name)}" required maxlength="30"></label>
      ${themePicker(me().theme || 'lilac')}
      <p class="error" role="alert"></p>
      <button class="btn block">Guardar perfil</button>
    </form>
    ${state.mode === 'cloud' ? `<form data-form="password">
      <h3>Mudar palavra-passe</h3>
      <label class="field"><span>Nova palavra-passe (mínimo 8 caracteres)</span><input name="password" type="password" minlength="8" autocomplete="new-password" required>
        <button type="button" class="pw-toggle" data-act="togglePw">Mostrar</button></label>
      <p class="error" role="alert"></p><p class="ok" role="status"></p>
      <button class="btn soft block">Mudar palavra-passe</button>
    </form>` : ''}
    <div class="stack">
      ${state.mode === 'demo' ? `
        ${o ? `<button class="btn quiet block" data-act="demoLogin" data-id="${o.id}">Entrar como ${esc(o.name)}</button>` : ''}
        <button class="btn quiet block" data-act="resetDemo">Repor dados de exemplo</button>` : ''}
      <button class="btn quiet block" data-act="signOut">Terminar sessão</button>
    </div></div>`;
  dlg.showModal();
}

/* ---------- ações ---------- */

const find = (table, id) => state[table].find((r) => r.id === id);
const go = (tab) => { ui.tab = tab; render(); window.scrollTo(0, 0); };

async function toggleTask(id) {
  const t = find('tasks', id);
  if (!t) return;
  if (t.done) return update('tasks', id, { done: false, done_at: null });
  await update('tasks', id, { done: true, done_at: new Date().toISOString() });
  if (t.repeat && t.repeat !== 'none') {
    // avança a partir da data original até cair no futuro, para manter o dia certo
    const base = parse(t.due || today());
    do {
      if (t.repeat === 'daily') base.setDate(base.getDate() + 1);
      if (t.repeat === 'weekly') base.setDate(base.getDate() + 7);
      if (t.repeat === 'monthly') base.setMonth(base.getMonth() + 1);
    } while (iso(base) <= today());
    await add('tasks', { title: t.title, assignee: t.assignee, due: iso(base), repeat: t.repeat, done: false, done_at: null });
  }
}

const ACTIONS = {
  tab: go,
  shopping: () => { ui.stockView = 'shopping'; ui.stockCat = 'Tudo'; go('stock'); },
  fab: () => ({ expenses: expenseForm, tasks: taskForm, stock: stockForm }[ui.tab] || addSheet)(null),
  account: accountSheet,
  closeSheet: () => dlg.close(),
  togglePw: (_, el) => {
    const input = el.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.textContent = show ? 'Esconder' : 'Mostrar';
  },
  demoLogin: (id) => { dlg.close(); ui.tab = 'home'; signInDemo(id); window.scrollTo(0, 0); },
  resetDemo: () => { dlg.close(); resetDemo(); },
  signOut: async () => { dlg.close(); ui.tab = 'home'; await signOut(); },
  sheetDelete: async () => { await formHandlers.onDelete(); dlg.close(); },

  addExpense: () => expenseForm(null),
  editExpense: (id) => expenseForm(find('expenses', id)),
  settle: settleForm,
  month: (dir) => { const d = parse(ui.month + '-01'); d.setMonth(d.getMonth() + Number(dir)); ui.month = iso(d).slice(0, 7); render(); },

  addTask: () => taskForm(null),
  editTask: (id) => taskForm(find('tasks', id)),
  toggleTask,
  taskFilter: (id) => { ui.taskFilter = id; render(); },
  toggleDone: () => { ui.showDone = !ui.showDone; render(); },

  addStock: () => stockForm(null),
  editStock: (id) => stockForm(find('stock_items', id)),
  bought: (id) => boughtForm(find('stock_items', id)),
  inc: (id) => update('stock_items', id, { quantity: Number(find('stock_items', id).quantity) + 1 }),
  dec: (id) => update('stock_items', id, { quantity: Math.max(0, Number(find('stock_items', id).quantity) - 1) }),
  stockView: (id) => { ui.stockView = id; render(); },
  stockCat: (id) => { ui.stockCat = id; render(); },
};

function fail(err, form) {
  const box = form && $('.error', form);
  if (box) box.textContent = err.message; else alert(err.message);
}

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  try { await ACTIONS[el.dataset.act]?.(el.dataset.id, el); }
  catch (err) { fail(err, el.closest('form')); }
});

document.addEventListener('submit', async (ev) => {
  const form = ev.target.closest('[data-form]');
  if (!form) return;
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  const btn = form.querySelector('button:not([type="button"])');
  $('.error', form).textContent = '';
  btn.disabled = true;
  try {
    const kind = form.dataset.form;
    if (kind === 'login') await signIn(v.email.trim(), v.password);
    else if (kind === 'profile') { await saveProfile({ name: v.name.trim(), theme: v.theme || 'lilac' }); if (dlg.open) dlg.close(); }
    else if (kind === 'password') { await changePassword(v.password); form.reset(); $('.ok', form).textContent = 'Palavra-passe mudada.'; }
    else { await formHandlers.onSubmit(v); dlg.close(); render(); }
  } catch (err) { fail(err, form); }
  finally { btn.disabled = false; }
});

// fechar ao tocar fora da folha
dlg.addEventListener('click', (ev) => { if (ev.target === dlg) dlg.close(); });

/* ---------- arranque ---------- */

onChange(render);
init().then(render).catch((err) => {
  $('#app').innerHTML = `<p class="boot">Não foi possível abrir a app: ${esc(err.message)}</p>`;
});
