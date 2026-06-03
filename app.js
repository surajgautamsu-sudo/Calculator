(() => {
  const equationEl = document.getElementById('equation');
  const resultEl = document.getElementById('result');
  const hintEl = document.getElementById('hint');
  const historyTag = document.getElementById('historyTag');
  const statusEl = document.getElementById('status');
  const modePill = document.getElementById('modePill');
  const toggleThemeBtn = document.getElementById('toggleTheme');

  const state = {
    expr: '0',
    cur: '0',
    lastOp: null,
    justEvaluated: false,
  };

  function formatNumberForDisplay(n) {
    if (!Number.isFinite(n)) return 'Error';
    const abs = Math.abs(n);
    if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) {
      return n.toExponential(6).replace(/\.?(0+)(e)/, '$2').replace(/e\+?/, 'e');
    }
    const s = n.toLocaleString(undefined, { maximumFractionDigits: 12 });
    return s;
  }

  function setStatus(text, tone = 'muted') {
    statusEl.textContent = text;
    statusEl.style.color = {
      muted: 'var(--muted2)',
      ok: 'rgba(61,255,181,.95)',
      warn: 'rgba(255,204,102,.95)',
      err: 'rgba(255,92,122,.95)',
    }[tone];
  }

  function refreshDisplay() {
    equationEl.textContent = state.expr === '' ? '0' : state.expr;
    const n = Number(state.cur);
    resultEl.textContent = state.cur === '' ? '0' : (Number.isFinite(n) ? formatNumberForDisplay(n) : 'Error');
  }

  function isOp(ch) { return ['+','-','*','/'].includes(ch); }

  function pushDigit(d) {
    if (state.justEvaluated) {
      
      state.expr = d;
      state.cur = d;
      state.lastOp = null;
      state.justEvaluated = false;
      historyTag.textContent = 'New run';
      setStatus('', 'muted');
      refreshDisplay();
      return;
    }

    if (state.cur === '0') {
      state.cur = d;
    } else {
      state.cur += d;
    }

    if (state.expr === '0' || isOp(lastChar(state.expr))) {
      state.expr = state.expr === '0' ? state.cur : state.expr + state.cur;
    } else {
      state.expr = state.expr.replace(/(-?\d*\.?\d+)$/, state.cur);
      if (!/(-?\d*\.?\d+)$/.test(state.expr)) state.expr += state.cur;
    }

    historyTag.textContent = 'Typing';
    setStatus('', 'muted');
    refreshDisplay();
  }

  function pushDot() {
    if (state.justEvaluated) {
      state.expr = '0.';
      state.cur = '0.';
      state.lastOp = null;
      state.justEvaluated = false;
      refreshDisplay();
      return;
    }
    if (state.cur.includes('.')) return;
    state.cur = state.cur + '.';

    if (state.expr === '0' || isOp(lastChar(state.expr))) {
      state.expr = state.expr === '0' ? state.cur : state.expr + state.cur;
    } else {
      state.expr = state.expr.replace(/(-?\d*\.?\d+)$/, state.cur);
    }

    refreshDisplay();
  }

  function setOperator(op) {
    
    if (state.justEvaluated) {
      state.justEvaluated = false;
      state.expr = state.cur === '' ? '0' : state.cur;
    }

    const n = Number(state.cur);
    if (!Number.isFinite(n)) {
      flashError('Invalid number');
      return;
    }

    if (isOp(lastChar(state.expr))) {
      state.expr = state.expr.slice(0, -1) + op;
    } else {
      state.expr = (state.expr === '0' ? state.cur : state.expr) + op;
    }

    state.lastOp = op;
    state.cur = '0';
    historyTag.textContent = 'Operator';
    setStatus('', 'muted');
    refreshDisplay();
  }

  function lastChar(s) { return s && s.length ? s[s.length - 1] : ''; }

  function backspace() {
    if (state.justEvaluated) {
      state.justEvaluated = false;
      state.expr = state.cur;
    }

    if (state.cur.length <= 1) {
      state.cur = '0';
    } else {
      state.cur = state.cur.slice(0, -1);
      if (state.cur === '-' || state.cur === '') state.cur = '0';
    }

    if (state.expr === '0') {
      state.expr = state.cur;
    } else {
      if (!isOp(lastChar(state.expr))) {
        state.expr = state.expr.replace(/(-?\d*\.?\d+)$/, state.cur);
      } else {
        state.expr = state.expr.slice(0, -1) + state.cur;
      }
    }

    historyTag.textContent = 'Backspace';
    refreshDisplay();
  }

  function clearAll() {
    state.expr = '0';
    state.cur = '0';
    state.lastOp = null;
    state.justEvaluated = false;
    historyTag.textContent = 'Ready';
    hintEl.textContent = 'Try: 12 + 7 × 3';
    setStatus('', 'muted');
    refreshDisplay();
  }

  function percent() {
    const n = Number(state.cur);
    if (!Number.isFinite(n)) {
      flashError('Invalid number');
      return;
    }
    const v = n / 100;
    state.cur = String(v);
    if (state.expr === '0' || !isOp(lastChar(state.expr))) {
      if (state.expr === '0') state.expr = state.cur;
      else state.expr = state.expr.replace(/(-?\d*\.?\d+)$|(^0$)/, state.cur);
    }
    historyTag.textContent = 'Percent';
    setStatus('', 'muted');
    refreshDisplay();
  }

  function signToggle() {
    if (state.justEvaluated) {
      state.justEvaluated = false;
      state.expr = state.cur;
    }
    if (state.cur === '0') return;
    if (state.cur.startsWith('-')) state.cur = state.cur.slice(1);
    else state.cur = '-' + state.cur;

    if (state.expr === '0') state.expr = state.cur;
    else {
      if (!isOp(lastChar(state.expr))) state.expr = state.expr.replace(/(-?\d*\.?\d+)$/, state.cur);
      else state.expr = state.expr.slice(0, -1) + state.cur;
    }

    historyTag.textContent = '±';
    refreshDisplay();
  }

  function evaluate() {
    let e = state.expr;
    if (!e || e.trim() === '') e = '0';
    if (isOp(lastChar(e))) e = e.slice(0, -1);

    if (!/[0-9]/.test(e)) {
      flashError('Enter a number');
      return;
    }

    try {
      if (!/^[0-9+\-*/.\s]+$/.test(e)) {
        flashError('Invalid expression');
        return;
      }
      const result = Function(`"use strict"; return (${e});`)();
      if (!Number.isFinite(result)) {
        flashError('Math error');
        return;
      }

      const rawResult = String(result);
      state.cur = rawResult;
      state.expr = rawResult;
      state.justEvaluated = true;

      historyTag.textContent = 'Done';
      hintEl.textContent = 'Press a number to continue';
      setStatus('OK', 'ok');
      refreshDisplay();
    } catch (err) {
      flashError('Invalid expression');
    }
  }

  function flashError(text) {
    historyTag.textContent = text;
    resultEl.textContent = 'Error';
    equationEl.textContent = state.expr;
    setStatus(text, 'err');
    state.justEvaluated = false;
  }

  document.querySelector('.keys')?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;

    const digit = btn.getAttribute('data-digit');
    const op = btn.getAttribute('data-op');
    const action = btn.getAttribute('data-action');

    if (digit !== null) pushDigit(digit);
    else if (op) setOperator(op);
    else if (action === 'clear') clearAll();
    else if (action === 'backspace') backspace();
    else if (action === 'percent') percent();
    else if (action === 'dot') pushDot();
    else if (action === 'equals') evaluate();
    else if (action === 'sign') signToggle();
  });

  window.addEventListener('keydown', (e) => {
    const key = e.key;

    if (key >= '0' && key <= '9') {
      e.preventDefault();
      pushDigit(key);
      return;
    }
    if (key === '.') {
      e.preventDefault();
      pushDot();
      return;
    }
    if (key === '+' || key === '-' || key === '*' || key === '/') {
      e.preventDefault();
      setOperator(key);
      return;
    }
    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      evaluate();
      return;
    }
    if (key === 'Escape') {
      e.preventDefault();
      clearAll();
      return;
    }
    if (key === 'Backspace') {
      e.preventDefault();
      backspace();
      return;
    }
    if (key === '%') {
      e.preventDefault();
      percent();
      return;
    }
  });

  function setTheme(next) {
    document.documentElement.setAttribute('data-theme', next);
    modePill.textContent = next === 'light' ? 'Light' : 'Standard';
    setStatus(next === 'light' ? 'Light theme' : 'Dark theme', 'ok');
    setTimeout(() => setStatus('', 'muted'), 900);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    setTheme(cur === 'light' ? 'dark' : 'light');
  }

  toggleThemeBtn?.addEventListener('click', toggleTheme);

  clearAll();
})();

