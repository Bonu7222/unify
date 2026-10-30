/* ============================================================
   Unify — Central Store
   State management + persistence + data generators
   ============================================================ */

const STORAGE_KEY = 'unify_app_state_v1';

const DEFAULT_STATE = {
  user: { name: '', grade: '', onboarded: false },
  goal: {
    country: 'Janubiy Koreya',
    university: 'KAIST',
    major: 'Computer Science',
    deadline: '',
    ieltsTarget: 7.5,
    satTarget: 1450
  },
  level: { ielts: 6.0, sat: 1200, gpa: 4.5 },
  tasks: [],
  portfolio: [],
  roadmap: [],
  streak: 0,
  lastActiveDate: null,
  chatHistory: []
};

const Store = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...parsed };
    } catch {
      return structuredClone(DEFAULT_STATE);
    }
  },
  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  update(patch) {
    const s = this.load();
    const next = { ...s, ...patch };
    this.save(next);
    return next;
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },
  exists() {
    return !!localStorage.getItem(STORAGE_KEY);
  }
};

/* ---------- Utilities ---------- */
function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
function todayStr() {
  return new Date().toISOString().split('T')[0];
}
function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const now = new Date(); now.setHours(0,0,0,0);
  const t = new Date(dateStr); t.setHours(0,0,0,0);
  return Math.max(0, Math.ceil((t - now) / 86400000));
}
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

/* ---------- Roadmap generator ---------- */
function generateRoadmap(state) {
  const total = Math.max(daysUntil(state.goal.deadline), 30);
  const templates = [
    { title: 'Poydevor',  icon: '🧱', desc: 'Darajani baholash, kunlik odatni boshlash' },
    { title: "O'sish",     icon: '📈', desc: 'IELTS/SAT intensiv + faoliyat yig\'ish' },
    { title: 'Portfolio', icon: '📁', desc: 'Essay, tavsiyanoma, portfolio yig\'ish' },
    { title: 'Ariza',     icon: '🎯', desc: 'Hujjat topshirish va suhbatga tayyorgarlik' }
  ];
  const phaseDays = Math.ceil(total / 4);
  const start = new Date(); start.setHours(0,0,0,0);

  const milestones = [
    [
      { title: 'Diagnostik test topshirish', done: true },
      { title: `IELTS ${state.level.ielts} → ${state.level.ielts + 0.5}`, done: false },
      { title: "Kunlik o'qish odatini boshlash", done: true }
    ],
    [
      { title: `IELTS ${state.goal.ieltsTarget} ga erishish`, done: false },
      { title: `SAT ${state.goal.satTarget} ga tayyorgarlik`, done: false },
      { title: "2 ta loyiha yoki tanlovda qatnashish", done: false }
    ],
    [
      { title: 'Motivatsion essay qoralamasi', done: false },
      { title: '2 ta tavsiyanoma', done: false },
      { title: "Portfolio to'liq shakllantirish", done: false }
    ],
    [
      { title: 'Barcha hujjatlarni topshirish', done: false },
      { title: 'Suhbatga tayyorgarlik', done: false },
      { title: 'Natijani kutish va zaxira reja', done: false }
    ]
  ];

  return templates.map((t, i) => {
    const pStart = new Date(start.getTime() + i * phaseDays * 86400000);
    const pEnd   = new Date(start.getTime() + Math.min((i + 1) * phaseDays, total) * 86400000);
    return {
      id: uid(),
      title: t.title,
      icon: t.icon,
      description: t.desc,
      startDate: pStart.toISOString().split('T')[0],
      endDate: pEnd.toISOString().split('T')[0],
      milestones: milestones[i]
    };
  });
}

/* ---------- Daily tasks ---------- */
const TASK_POOL = {
  ielts: [
    'IELTS Reading — 1 passage',
    'IELTS Listening — 1 section',
    'IELTS Writing — Task 2 essay',
    'IELTS Speaking — 10 daqiqa',
    "Yangi 10 ta so'z o'rganish"
  ],
  sat: [
    'SAT Math — 10 ta masala',
    'SAT Reading — 1 passage',
    'SAT Writing — grammatika mashqi'
  ],
  portfolio: [
    "Portfolio uchun yutuq qo'shish",
    'Loyiha ustida 30 daqiqa',
    'Volontyorlikni rejalashtirish'
  ],
  general: [
    "Bugungi maqsadni ko'rib chiqish",
    'Universitet talablarini tekshirish',
    'Motivatsion xat ustida ishlash'
  ]
};

function generateDailyTasks(state, dateStr) {
  const date = dateStr || todayStr();
  const existing = state.tasks.filter(t => t.date === date);
  if (existing.length > 0) return existing;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const items = [
    { title: pick(TASK_POOL.ielts), category: 'IELTS' },
    { title: pick(TASK_POOL.sat), category: 'SAT' },
    { title: pick(TASK_POOL.portfolio), category: 'Portfolio' },
    { title: pick(TASK_POOL.general), category: 'Umumiy' }
  ];

  return items.map(p => ({
    id: uid(),
    title: p.title,
    category: p.category,
    date,
    done: false,
    priority: Math.random() > 0.7 ? 'high' : 'normal'
  }));
}

/* ---------- AI assistant (rule-based) ---------- */
function aiRespond(message) {
  const m = message.toLowerCase();
  const s = Store.load();

  if (m.includes('ielts')) {
    return `IELTS bo'yicha maslahat:\n\n• Har kuni 30 daqiqa Reading va Listening\n• Writing — haftada 2 ta essay\n• Speaking — ovozingizni yozib oling\n• Kunlik odat bir martalik zo'r mashqdan yaxshiroq.\n\nMaqsadingiz ${s.goal.ieltsTarget} — erishish mumkin!`;
  }
  if (m.includes('sat')) {
    return `SAT bo'yicha:\n\n• Math — formulalar va mashqlar\n• Reading — kontekst va lug'at\n• Har kuni 10 ta masala = 30 kunda 300 ta\n• Khan Academy bepul resurs\n\nSAT — tayyorgarlik masalasi, iqtidor emas.`;
  }
  if (m.includes('qabul') || m.includes('universitet')) {
    return `Qabulga tayyorgarlik:\n\n1. Universitet talablarini yozib oling\n2. Portfolio yig'ing\n3. Essay uchun 2-3 oy oldin boshlang\n4. Tavsiyanomalarni so'rang\n\nRoadmap bo'limi bosqichma-bosqich yo'l ko'rsatadi.`;
  }
  if (m.includes('portfolio')) {
    return `Portfolio nima uchun muhim?\n\n• Sizni baholaringiz emas, shaxsiyatingiz ham baholanadi\n• Har bir sertifikat, loyiha, volontyorlik — hikoyangiz\n• Portfolio seyfiga yuklang — hech qachon yo'qolmaydi\n\nBugun 1 ta yutuq qo'shishdan boshlang!`;
  }
  if (m.includes('boshlash') || m.includes('nimadan') || m.includes('birinchi')) {
    return `Boshlash uchun eng yaxshi qadam:\n\n1. Maqsadni aniqlang\n2. Bugungi 1 ta vazifani bajaring\n3. Portfolioga bor narsalarni yuklang\n4. Har kuni kiring — streak saqlang\n\nKichik qadamlar katta natijaga olib boradi.`;
  }
  return `Yaxshi savol! Men quyidagilarda yordam beraman:\n\n• IELTS / SAT tayyorgarlik\n• Universitetga qabul\n• Portfolio yig'ish\n• Kunlik reja\n\nQaysi biri haqida gaplashamiz?`;
}

/* ---------- Demo seed ---------- */
function seedDemoIfEmpty() {
  if (Store.exists()) return;
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 8);

  const state = Store.load();
  state.user = { name: 'Aziza', grade: '11-sinf', onboarded: true };
  state.goal = {
    country: 'Janubiy Koreya',
    university: 'KAIST',
    major: 'Computer Science',
    deadline: deadline.toISOString().split('T')[0],
    ieltsTarget: 7.5,
    satTarget: 1450
  };
  state.level = { ielts: 6.5, sat: 1300, gpa: 4.5 };
  state.streak = 7;
  state.lastActiveDate = todayStr();

  state.roadmap = generateRoadmap(state);
  state.tasks = generateDailyTasks(state);
  state.tasks[0].done = true;

  state.portfolio = [
    { id: uid(), title: 'IELTS 6.5 Sertifikati', category: 'academic', date: '2024-11-15', description: 'Birinchi urinishda 6.5' },
    { id: uid(), title: 'Respublika matematika olimpiadasi', category: 'academic', date: '2024-10-02', description: '2-o\'rin, viloyat bosqichi' },
    { id: uid(), title: 'Code Club — rahbar', category: 'leadership', date: '2024-09-10', description: 'Maktabda 15 kishilik klub' },
    { id: uid(), title: 'Ekoturizm loyihasi', category: 'community', date: '2024-08-05', description: 'Mahalliy ekologiya uchun 200+ kishi' },
    { id: uid(), title: 'Veb-sayt loyihasi', category: 'creative', date: '2024-07-20', description: 'React bilan shaxsiy blog' }
  ];

  state.chatHistory = [
    { role: 'assistant', text: "Salom Aziza! Men Unify AI yordamchingizman. Qabul, IELTS, SAT yoki portfolio haqida so'rang." }
  ];

  Store.save(state);
}