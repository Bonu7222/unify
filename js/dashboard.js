/* ============================================================
   Unify — Dashboard controller
   ============================================================ */

(function () {
  // Auto-seed demo if no state
  seedDemoIfEmpty();

  let state = Store.load();
  let currentView = 'overview';
  let currentPortfolioCat = 'all';

  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  /* ---------- Toast ---------- */
  function showToast(msg, type = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ---------- Nav ---------- */
  const VIEW_META = {
    overview:  { title: 'Umumiy',        sub: 'Bugun nima muhim' },
    roadmap:   { title: "Yo'l xaritasi", sub: 'Sizning yo\'lingiz' },
    tasks:     { title: 'Kunlik reja',   sub: 'Kichik qadamlar' },
    portfolio: { title: 'Portfolio',     sub: 'Yutuqlaringiz' },
    practice:  { title: 'Mashqlar',      sub: 'IELTS va SAT' },
    ai:        { title: 'AI yordamchi',  sub: 'Savollaringizga javob' },
    profile:   { title: 'Profil',        sub: 'Sozlamalar' }
  };

  function setView(view) {
    currentView = view;
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    const meta = VIEW_META[view];
    $('#topbar-title').textContent = meta.title;
    $('#topbar-sub').textContent = meta.sub;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'overview') renderOverview();
    if (view === 'roadmap') renderRoadmap();
    if (view === 'tasks') renderTasks();
    if (view === 'portfolio') renderPortfolio();
    if (view === 'profile') renderProfile();
    if (view === 'ai') renderChat();
  }

  $$('.nav-item').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#go-tasks')?.addEventListener('click', () => setView('tasks'));
  $('#go-roadmap')?.addEventListener('click', () => setView('roadmap'));

  /* ---------- Streak ---------- */
  function updateStreak() {
    const today = todayStr();
    if (state.lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      state.streak = state.lastActiveDate === yStr ? (state.streak || 0) + 1 : 1;
      state.lastActiveDate = today;
      Store.save(state);
    }
  }

  /* ---------- Render: Top ---------- */
  function renderTop() {
    $('#topbar-countdown').textContent = daysUntil(state.goal.deadline);
    $('#topbar-avatar').textContent = (state.user.name || 'U').charAt(0).toUpperCase();
    $('#sidebar-streak').textContent = state.streak || 0;
  }

  /* ---------- Render: Overview ---------- */
  function renderOverview() {
    const now = new Date();
    $('#welcome-greeting').textContent = greeting();
    $('#welcome-name').textContent = state.user.name || "Do'stim";
    $('#welcome-sub').textContent = state.goal.university
      ? `${state.goal.university} uchun tayyorgarlik davom etmoqda.`
      : 'Bugun kichik qadam — ertaga katta natija.';

    $('#welcome-goal').textContent = state.goal.university
      ? `${state.goal.university} · ${state.goal.major}`
      : 'Maqsad aniqlanmagan';
    $('#welcome-goal-meta').textContent = state.goal.deadline
      ? `${state.goal.country} · ${formatDate(state.goal.deadline)}`
      : 'Deadline tanlanmagan';

    // Stats
    const todayTasks = state.tasks.filter(t => t.date === todayStr());
    const doneTasks = state.tasks.filter(t => t.done);
    $('#stat-countdown').textContent = daysUntil(state.goal.deadline);
    $('#stat-streak').textContent = state.streak || 0;
    $('#stat-tasks').textContent = `${doneTasks.length}/${state.tasks.length}`;
    $('#stat-portfolio').textContent = state.portfolio.length;

    // Progress ring
    const total = state.tasks.length;
    const done = doneTasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const circumference = 2 * Math.PI * 52;
    const offset = circumference - (pct / 100) * circumference;
    $('#ring-fill').style.strokeDasharray = circumference;
    $('#ring-fill').style.strokeDashoffset = offset;
    $('#progress-percent').textContent = pct + '%';

    const milestoneTotal = state.roadmap.reduce((s, p) => s + p.milestones.length, 0);
    const milestoneDone = state.roadmap.reduce((s, p) => s + p.milestones.filter(m => m.done).length, 0);
    $('#progress-detail').innerHTML = `
      <b>${done}</b> / ${total} vazifa<br/>
      <b>${milestoneDone}</b> / ${milestoneTotal} bosqich<br/>
      <b>${state.portfolio.length}</b> portfolio yozuvi
    `;

    // Today's tasks (top 3)
    const list = $('#overview-tasks');
    if (todayTasks.length === 0) {
      list.innerHTML = '<div class="empty-hint">Bugun uchun vazifa yo\'q. Kunlik reja bo\'limida qo\'shing.</div>';
    } else {
      list.innerHTML = todayTasks.slice(0, 4).map(t => taskRow(t)).join('');
      bindTaskRows(list);
    }

    // Next phase
    const phase = state.roadmap[0];
    if (phase) {
      const pending = phase.milestones.find(m => !m.done) || phase.milestones[0];
      $('#next-phase').innerHTML = `
        <div class="phase-head" style="margin-bottom:0">
          <div class="phase-icon">${phase.icon}</div>
          <div class="phase-info">
            <h3>${phase.title}</h3>
            <p>${pending ? pending.title : phase.description}</p>
            <div class="phase-dates">${formatDate(phase.startDate)} — ${formatDate(phase.endDate)}</div>
          </div>
        </div>
      `;
    }
  }

  /* ---------- Task row helper ---------- */
  function taskRow(t) {
    return `
      <div class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}">
        <div class="task-check ${t.done ? 'checked' : ''}" data-action="toggle">
          ${t.done ? '<i data-lucide="check"></i>' : ''}
        </div>
        <div class="task-body">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">
            <span class="task-cat ${t.category}">${t.category}</span>
          </div>
        </div>
        <button class="task-del" data-action="delete" title="O'chirish">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;
  }

  function bindTaskRows(container) {
    container.querySelectorAll('.task-item').forEach(item => {
      const id = item.dataset.id;
      item.querySelector('[data-action="toggle"]').addEventListener('click', () => toggleTask(id));
      item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteTask(id));
    });
    if (window.lucide) lucide.createIcons();
  }

  function toggleTask(id) {
    state.tasks = state.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    Store.save(state);
    if (currentView === 'overview') renderOverview();
    if (currentView === 'tasks') renderTasks();
  }
  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    Store.save(state);
    if (currentView === 'overview') renderOverview();
    if (currentView === 'tasks') renderTasks();
    showToast("Vazifa o'chirildi");
  }

  /* ---------- Render: Roadmap ---------- */
  function renderRoadmap() {
    const list = $('#roadmap-list');
    list.innerHTML = state.roadmap.map((p, i) => `
      <div class="phase-card glass">
        <div class="phase-head">
          <div class="phase-icon">${p.icon}</div>
          <div class="phase-info">
            <h3>${i + 1}. ${p.title}</h3>
            <p>${p.description}</p>
            <div class="phase-dates">${formatDate(p.startDate)} — ${formatDate(p.endDate)}</div>
          </div>
        </div>
        <div class="phase-milestones">
          ${p.milestones.map(m => `
            <div class="milestone ${m.done ? 'done' : ''}">
              <span class="milestone-dot"></span>
              <span>${escapeHtml(m.title)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  /* ---------- Render: Tasks ---------- */
  function renderTasks() {
    const todayTasks = state.tasks.filter(t => t.date === todayStr());
    $('#tasks-date').textContent = formatDate(todayStr());
    const done = todayTasks.filter(t => t.done).length;
    $('#tasks-count').textContent = `${done} / ${todayTasks.length}`;
    const list = $('#tasks-list');
    if (todayTasks.length === 0) {
      list.innerHTML = '<div class="empty-hint">Bugun hali vazifa yo\'q. Yuqoridagi formadan qo\'shing.</div>';
      return;
    }
    list.innerHTML = todayTasks.map(t => taskRow(t)).join('');
    bindTaskRows(list);
  }

  // Add task
  $('#add-task-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#new-task-title').value.trim();
    const category = $('#new-task-cat').value;
    if (!title) return;
    state.tasks.push({
      id: uid(),
      title,
      category,
      date: todayStr(),
      done: false,
      priority: 'normal'
    });
    Store.save(state);
    $('#new-task-title').value = '';
    renderTasks();
    showToast("Vazifa qo'shildi", 'success');
  });

  /* ---------- Render: Portfolio ---------- */
  const CAT_LABELS = {
    academic: '🎓 Akademik',
    creative: '🎨 Ijodiy',
    leadership: '👑 Liderlik',
    community: '🤝 Jamoat'
  };

  function renderPortfolio() {
    const grid = $('#portfolio-grid');
    const items = state.portfolio
      .filter(p => currentPortfolioCat === 'all' || p.category === currentPortfolioCat)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (items.length === 0) {
      grid.innerHTML = '<div class="portfolio-empty">Hali yozuvlar yo\'q. Yuqoridagi "+ Qo\'shish" tugmasidan boshlang.</div>';
      return;
    }
    grid.innerHTML = items.map(p => `
      <div class="portfolio-card glass" data-id="${p.id}">
        <button class="portfolio-card-del" data-action="delete" title="O'chirish">
          <i data-lucide="x"></i>
        </button>
        <span class="portfolio-card-cat ${p.category}">${CAT_LABELS[p.category] || p.category}</span>
        <h4>${escapeHtml(p.title)}</h4>
        ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ''}
        <div class="portfolio-card-date">${formatDate(p.date)}</div>
      </div>
    `).join('');

    grid.querySelectorAll('.portfolio-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-action="delete"]').addEventListener('click', () => {
        if (!confirm("Bu yozuvni o'chirmoqchimisiz?")) return;
        state.portfolio = state.portfolio.filter(p => p.id !== id);
        Store.save(state);
        renderPortfolio();
        showToast("Yozuv o'chirildi");
      });
    });
    if (window.lucide) lucide.createIcons();
  }

  // Portfolio tabs
  $('#portfolio-tabs')?.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $('#portfolio-tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentPortfolioCat = tab.dataset.cat;
      renderPortfolio();
    });
  });

  // Add portfolio modal
  const modal = $('#portfolio-modal');
  $('#btn-add-portfolio')?.addEventListener('click', () => modal.classList.add('open'));
  $('#pf-cancel')?.addEventListener('click', () => modal.classList.remove('open'));
  modal?.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  $('#portfolio-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#pf-title').value.trim();
    if (!title) return;
    state.portfolio.push({
      id: uid(),
      title,
      category: $('#pf-category').value,
      date: $('#pf-date').value || todayStr(),
      description: $('#pf-desc').value.trim()
    });
    Store.save(state);
    e.target.reset();
    modal.classList.remove('open');
    renderPortfolio();
    showToast("Portfolio yozuvi qo'shildi", 'success');
  });

  /* ---------- Render: Profile ---------- */
  function renderProfile() {
    $('#p-name').value = state.user.name || '';
    $('#p-grade').value = state.user.grade || '';
    $('#p-country').value = state.goal.country || '';
    $('#p-university').value = state.goal.university || '';
    $('#p-major').value = state.goal.major || '';
    $('#p-deadline').value = state.goal.deadline || '';
    $('#p-ielts').value = state.level.ielts ?? '';
    $('#p-sat').value = state.level.sat ?? '';
    $('#p-gpa').value = state.level.gpa ?? '';
  }

  $('#btn-save-profile')?.addEventListener('click', () => {
    state.user.name = $('#p-name').value.trim() || state.user.name;
    state.user.grade = $('#p-grade').value.trim();
    state.goal.country = $('#p-country').value.trim();
    state.goal.university = $('#p-university').value.trim();
    state.goal.major = $('#p-major').value.trim();
    state.goal.deadline = $('#p-deadline').value;
    state.level.ielts = +$('#p-ielts').value || state.level.ielts;
    state.level.sat = +$('#p-sat').value || state.level.sat;
    state.level.gpa = +$('#p-gpa').value || state.level.gpa;
    Store.save(state);
    renderTop();
    renderOverview();
    showToast("Saqlandi ✓", 'success');
  });

  $('#btn-reset')?.addEventListener('click', () => {
    if (!confirm("Barcha ma'lumotlar o'chiriladi. Davom etasizmi?")) return;
    Store.reset();
    window.location.href = 'index.html';
  });

  /* ---------- Render: AI chat ---------- */
  function renderChat() {
    const box = $('#chat-messages');
    if (!state.chatHistory) state.chatHistory = [];
    if (state.chatHistory.length === 0) {
      state.chatHistory.push({
        role: 'assistant',
        text: `Salom ${state.user.name || 'do\'stim'}! Men Unify AI yordamchisiman. Qanday yordam bera olaman?`
      });
      Store.save(state);
    }
    box.innerHTML = state.chatHistory.map(m =>
      `<div class="chat-msg ${m.role}">${escapeHtml(m.text)}</div>`
    ).join('');
    box.scrollTop = box.scrollHeight;
  }

  $('#chat-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text) return;
    state.chatHistory.push({ role: 'user', text });
    input.value = '';
    Store.save(state);
    renderChat();

    setTimeout(() => {
      const reply = aiRespond(text);
      state.chatHistory.push({ role: 'assistant', text: reply });
      Store.save(state);
      renderChat();
    }, 500);
  });

  $$('.suggestion').forEach(s => {
    s.addEventListener('click', () => {
      $('#chat-input').value = s.textContent;
      $('#chat-form').dispatchEvent(new Event('submit'));
    });
  });

  /* ---------- Utility ---------- */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- Init ---------- */
  updateStreak();
  renderTop();
  renderOverview();
  renderChat();
  setView('overview');

  // Re-init lucide icons after everything
  if (window.lucide) lucide.createIcons();

  // Mobile menu opens overview (fallback — bottom nav already serves)
  $('#mobile-menu-btn')?.addEventListener('click', () => setView('overview'));
})();