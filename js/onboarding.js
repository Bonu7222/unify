/* ============================================================
   Unify — Onboarding flow
   ============================================================ */

(function () {
  let step = 1;
  const TOTAL = 4;

  const steps = document.querySelectorAll('.onboard-step');
  const progressBar = document.getElementById('progress-bar');
  const stepLabel = document.getElementById('step-label');
  const btnBack = document.getElementById('btn-back');
  const btnNext = document.getElementById('btn-next');

  function render() {
    steps.forEach(s => s.classList.toggle('active', +s.dataset.step === step));
    progressBar.style.width = (step / TOTAL) * 100 + '%';
    stepLabel.textContent = `${step}-qadam / ${TOTAL}`;
    btnBack.disabled = step === 1;
    btnNext.textContent = step === TOTAL ? 'Yakunlash ✓' : 'Davom etish →';
  }

  function showToast(msg) {
    let el = document.getElementById('onboard-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'onboard-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2400);
  }

  btnBack.addEventListener('click', () => {
    if (step > 1) { step--; render(); }
  });

  btnNext.addEventListener('click', () => {
    if (step === 1) {
      const name = document.getElementById('in-name').value.trim();
      const grade = document.getElementById('in-grade').value;
      if (!name) return showToast('Ismingizni kiriting');
      if (!grade) return showToast('Sinfni tanlang');
    }
    if (step === 2) {
      const deadline = document.getElementById('in-deadline').value;
      if (!deadline) return showToast('Deadline sanasini tanlang');
    }
    if (step < TOTAL) {
      step++;
      render();
    } else {
      finish();
    }
  });

  function finish() {
    const state = Store.load();
    state.user = {
      name: document.getElementById('in-name').value.trim() || 'O\'quvchi',
      grade: document.getElementById('in-grade').value || '11-sinf',
      onboarded: true
    };
    state.goal = {
      country: document.getElementById('in-country').value,
      university: document.getElementById('in-university').value.trim() || 'Aniqlanmagan',
      major: document.getElementById('in-major').value.trim() || 'Aniqlanmagan',
      deadline: document.getElementById('in-deadline').value,
      ieltsTarget: +document.getElementById('in-ielts-target').value || 7,
      satTarget: +document.getElementById('in-sat-target').value || 1400
    };
    state.level = {
      ielts: +document.getElementById('in-ielts').value || 6,
      sat: +document.getElementById('in-sat').value || 1200,
      gpa: +document.getElementById('in-gpa').value || 4.5
    };
    state.roadmap = generateRoadmap(state);
    state.tasks = generateDailyTasks(state);
    state.streak = 1;
    state.lastActiveDate = todayStr();
    state.chatHistory = [{
      role: 'assistant',
      text: `Salom ${state.user.name}! Men Unify AI yordamchingizman. Qabul, IELTS, SAT yoki portfolio haqida so'rang.`
    }];
    Store.save(state);

    showToast('Tayyor! Dashboardga o\'tilmoqda...');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  }

  render();
})();