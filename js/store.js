import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const TABLES = ['expenses', 'tasks', 'stock_items'];
const DEMO_KEY = 'adois-demo-v3';
const DEMO_USER_KEY = 'adois-demo-user';

export const state = {
  mode: SUPABASE_URL && SUPABASE_ANON_KEY ? 'cloud' : 'demo',
  user: null,
  profiles: [],
  expenses: [],
  tasks: [],
  stock_items: [],
};

let sb = null;
let channel = null;
const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

export const me = () => state.profiles.find((p) => p.id === state.user?.id) || null;
export const other = () => state.profiles.find((p) => p.id !== state.user?.id) || null;
export const profileName = (id) => state.profiles.find((p) => p.id === id)?.name || 'Alguém';

/* ---------- arranque ---------- */

export async function init() {
  if (state.mode === 'demo') {
    Object.assign(state, demoLoad());
    let id = null;
    try { id = localStorage.getItem(DEMO_USER_KEY); } catch {}
    if (id && state.profiles.some((p) => p.id === id)) state.user = { id };
    return;
  }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  if (data.session) {
    state.user = { id: data.session.user.id, email: data.session.user.email };
    await loadAll();
  }
}

async function loadAll() {
  const results = await Promise.all(['profiles', ...TABLES].map((t) => sb.from(t).select('*')));
  ['profiles', ...TABLES].forEach((t, i) => {
    if (results[i].error) throw new Error(explain(results[i].error));
    state[t] = results[i].data;
  });
  if (!channel) {
    channel = sb
      .channel('casa')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => reload(payload.table))
      .subscribe();
  }
}

const pending = {};
function reload(table) {
  if (!(table in state)) return;
  clearTimeout(pending[table]);
  pending[table] = setTimeout(async () => {
    const { data, error } = await sb.from(table).select('*');
    if (!error) { state[table] = data; emit(); }
  }, 250);
}

function explain(error) {
  const msg = error?.message || String(error);
  if (/Invalid login credentials/i.test(msg)) return 'Email ou palavra-passe errados.';
  if (/should be different/i.test(msg)) return 'A nova palavra-passe tem de ser diferente da atual.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem ligação à base de dados. Verifica a internet e tenta outra vez.';
  if (/row-level security|permission denied/i.test(msg)) return 'Esta conta não tem acesso. Confirma que o email está na tabela "members".';
  return msg;
}

/* ---------- sessão ---------- */

export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(explain(error));
  state.user = { id: data.user.id, email: data.user.email };
  await loadAll();
  emit();
}

export function signInDemo(id) {
  state.user = { id };
  try { localStorage.setItem(DEMO_USER_KEY, id); } catch {}
  emit();
}

export async function signOut() {
  if (state.mode === 'cloud') {
    await sb.auth.signOut();
    if (channel) { sb.removeChannel(channel); channel = null; }
    state.profiles = []; TABLES.forEach((t) => (state[t] = []));
  } else {
    try { localStorage.removeItem(DEMO_USER_KEY); } catch {}
  }
  state.user = null;
  emit();
}

export async function saveProfile({ name, theme }) {
  const row = { id: state.user.id, name, theme };
  if (state.mode === 'cloud') {
    const { error } = await sb.from('profiles').upsert(row);
    if (error) throw new Error(explain(error));
  }
  const i = state.profiles.findIndex((p) => p.id === row.id);
  if (i >= 0) state.profiles[i] = { ...state.profiles[i], name, theme };
  else state.profiles.push(row);
  demoSave();
  emit();
}

export async function changePassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(explain(error));
}

/* ---------- dados ---------- */

export async function add(table, row) {
  let saved;
  if (state.mode === 'cloud') {
    const { data, error } = await sb.from(table).insert(row).select().single();
    if (error) throw new Error(explain(error));
    saved = data;
  } else {
    saved = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row };
  }
  if (!state[table].some((r) => r.id === saved.id)) state[table].push(saved);
  demoSave();
  emit();
  return saved;
}

export async function update(table, id, patch) {
  if (state.mode === 'cloud') {
    const { error } = await sb.from(table).update(patch).eq('id', id);
    if (error) throw new Error(explain(error));
  }
  const i = state[table].findIndex((r) => r.id === id);
  if (i >= 0) state[table][i] = { ...state[table][i], ...patch };
  demoSave();
  emit();
}

export async function remove(table, id) {
  if (state.mode === 'cloud') {
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) throw new Error(explain(error));
  }
  state[table] = state[table].filter((r) => r.id !== id);
  demoSave();
  emit();
}

/* ---------- modo de demonstração ---------- */

function demoLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY));
    if (saved?.profiles) return saved;
  } catch {}
  return seed();
}

function demoSave() {
  if (state.mode !== 'demo') return;
  const { profiles, expenses, tasks, stock_items } = state;
  try { localStorage.setItem(DEMO_KEY, JSON.stringify({ profiles, expenses, tasks, stock_items })); } catch {}
}

export function resetDemo() {
  try { localStorage.removeItem(DEMO_KEY); } catch {}
  Object.assign(state, seed());
  emit();
}

function seed() {
  const J = 'demo-jose', C = 'demo-carolina';
  const day = (offset) => {
    const d = new Date(); d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const id = () => crypto.randomUUID();
  const exp = (date, description, amount, category, paid_by, share_payer = 0.5) =>
    ({ id: id(), date, description, amount, category, paid_by, share_payer, kind: 'expense' });
  const task = (title, assignee, due, repeat = 'none') =>
    ({ id: id(), title, assignee, due, repeat, done: false, done_at: null });
  const item = (name, category, quantity, unit, min_quantity) =>
    ({ id: id(), name, category, quantity, unit, min_quantity });
  return {
    profiles: [{ id: J, name: 'José', theme: 'ocean' }, { id: C, name: 'Carolina', theme: 'rose' }],
    expenses: [
      exp(day(0), 'Compras da semana', 64.3, 'Compras', J),
      exp(day(-1), 'Jantar no tasco', 38, 'Restaurantes', C),
      exp(day(-3), 'Luz e gás', 71.85, 'Contas', C),
      exp(day(-5), 'Internet', 34.99, 'Contas', J),
      exp(day(-6), 'Detergentes e papel', 18.4, 'Casa', J),
      exp(day(-8), 'Cinema', 15, 'Lazer', C),
    ],
    tasks: [
      task('Levar o lixo', null, day(0), 'daily'),
      task('Marcar revisão do carro', J, day(2)),
      task('Aspirar a casa', C, day(1), 'weekly'),
      task('Pagar a renda', J, day(-1), 'monthly'),
    ],
    stock_items: [
      item('Leite', 'Alimentos', 1, 'L', 2),
      item('Ovos', 'Alimentos', 8, 'un', 6),
      item('Arroz', 'Alimentos', 2, 'kg', 1),
      item('Café', 'Alimentos', 0, 'pac', 1),
      item('Papel higiénico', 'Casa', 3, 'rolos', 4),
      item('Detergente da loiça', 'Casa', 1, 'un', 1),
      item('Pasta de dentes', 'Higiene', 2, 'un', 1),
    ],
  };
}
