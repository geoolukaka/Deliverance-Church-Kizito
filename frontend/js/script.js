/* =========================================================
   Deliverance Church International, Kizito — Frontend Logic
   Currency: Kenya Shillings (KES). Payment: M-Pesa (Daraja).
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG — update API_BASE_URL after you deploy the backend
   (see /backend/README.md). Example:
   'https://dic-kizito-api.onrender.com/api'
   --------------------------------------------------------- */
const CONFIG = {
  // Set `apiBase` in js/content.js once your backend is deployed. On localhost it defaults to :4000.
  API_BASE_URL: (window.DIC_API_BASE_URL || (window.DIC_CONTENT && window.DIC_CONTENT.apiBase)
    || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:4000/api' : '')),
};

const KES = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
});

/* ---------------------------------------------------------
   Small helpers
   --------------------------------------------------------- */
function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

function showToast(message, type) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = 'toast is-visible' + (type ? ' ' + type : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 4200);
}

function setAlert(id, message, type) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!message) { el.classList.add('is-hidden'); el.textContent = ''; return; }
  el.textContent = message;
  el.className = 'alert ' + (type || 'info');
}

async function apiRequest(path, options) {
  options = options || {};
  if (!CONFIG.API_BASE_URL) {
    throw new Error('Online services (login, giving and forms) are being set up. Please contact us on WhatsApp in the meantime.');
  }
  // Human-check token for protected POSTs (see extras.js -> DICCaptcha)
  const CAPTCHA_FORMS = { '/auth/login': 'login-form', '/auth/register': 'register-form', '/contact': 'contact-form', '/donations/mpesa/stkpush': 'donation-form' };
  if (options.body && CAPTCHA_FORMS[path] && window.DICCaptcha) {
    const withToken = JSON.parse(options.body);
    withToken.captcha = window.DICCaptcha.consume(CAPTCHA_FORMS[path]);
    options = Object.assign({}, options, { body: JSON.stringify(withToken) });
  }
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let res;
  try { res = await fetch(CONFIG.API_BASE_URL + path, Object.assign({}, options, { headers })); }
  catch (netErr) { throw new Error('We could not reach the server. Please check your connection and try again.'); }
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || 'Something went wrong. Please try again.';
    throw new Error(message);
  }
  return data;
}

/* ---------------------------------------------------------
   Auth (JWT stored client-side)
   --------------------------------------------------------- */
function getToken() { return localStorage.getItem('dic_token'); }
function setToken(t) { localStorage.setItem('dic_token', t); }
function clearToken() { localStorage.removeItem('dic_token'); localStorage.removeItem('dic_user'); }
function isLoggedIn() { return !!getToken(); }
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('dic_user') || 'null'); } catch (e) { return null; }
}
function setStoredUser(u) { localStorage.setItem('dic_user', JSON.stringify(u)); }

function updateAuthUI() {
  const loggedIn = isLoggedIn();
  $all('.auth-guest').forEach(el => el.classList.toggle('is-hidden', loggedIn));
  $all('.auth-member').forEach(el => el.classList.toggle('is-hidden', !loggedIn));
}

/* ---------------------------------------------------------
   Router — single-file SPA using hash navigation
   --------------------------------------------------------- */
const PROTECTED_PAGES = ['dashboard'];

function navigateTo(hash) {
  if (!hash) hash = '#home';
  if (location.hash !== hash) {
    location.hash = hash;
  } else {
    renderPage();
  }
}

function renderPage() {
  let pageId = (location.hash || '#home').replace('#', '');
  if (PROTECTED_PAGES.includes(pageId) && !isLoggedIn()) {
    pageId = 'login';
    history.replaceState(null, '', '#login');
  }
  if (isLoggedIn() && (pageId === 'login' || pageId === 'register')) {
    pageId = 'dashboard';
    history.replaceState(null, '', '#dashboard');
  }

  const target = document.getElementById('page-' + pageId) ? pageId : 'home';
  $all('.page').forEach(p => p.classList.remove('is-active'));
  const activeSection = document.getElementById('page-' + target);
  if (activeSection) activeSection.classList.add('is-active');

  $all('.primary-nav a, .mobile-nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + target);
  });

  const titleEl = activeSection ? activeSection.dataset.title : 'Home';
  document.title = titleEl ? `${titleEl} | Deliverance Church International, Kizito` : 'Deliverance Church International, Kizito';

  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  closeMobileMenu();

  if (target === 'dashboard') loadDashboard();
}

window.addEventListener('hashchange', renderPage);

/* Delegate all [data-link] clicks (both <a href="#x"> and <button data-target="#x">) */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-link]');
  if (!el) return;
  const target = el.dataset.target || el.getAttribute('href');
  if (!target || !target.startsWith('#')) return;
  e.preventDefault();
  navigateTo(target);
});

/* ---------------------------------------------------------
   Mobile nav
   --------------------------------------------------------- */
function openMobileMenu() {
  $('#mobile-nav').classList.add('is-open');
  $('#mobile-nav-overlay').classList.add('is-open');
  $('#mobile-menu-btn').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
  $('#mobile-nav').classList.remove('is-open');
  $('#mobile-nav-overlay').classList.remove('is-open');
  $('#mobile-menu-btn').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
document.getElementById('mobile-menu-btn').addEventListener('click', openMobileMenu);
document.getElementById('close-mobile-nav').addEventListener('click', closeMobileMenu);
document.getElementById('mobile-nav-overlay').addEventListener('click', closeMobileMenu);

/* ---------------------------------------------------------
   Logout
   --------------------------------------------------------- */
function doLogout() {
  clearToken();
  updateAuthUI();
  showToast('You have been logged out.', 'success');
  navigateTo('#home');
}
document.getElementById('logout-btn').addEventListener('click', doLogout);
document.getElementById('logout-btn-mobile').addEventListener('click', doLogout);

/* ---------------------------------------------------------
   GIVE — Fund / Amount / Method chips + M-Pesa donation
   --------------------------------------------------------- */
let selectedFund = 'tithe';
let selectedAmount = 2500;
let selectedMethod = 'mpesa';

function initChipGroup(groupId, dataAttr, onSelect) {
  const group = document.getElementById(groupId);
  if (!group) return;
  $all('.chip', group).forEach(chip => {
    chip.addEventListener('click', () => {
      $all('.chip', group).forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      onSelect(chip.dataset[dataAttr]);
    });
  });
}

function updateDonateButtonLabel() {
  const label = document.getElementById('donate-btn-label');
  if (!label) return;
  const amt = getEffectiveAmount();
  label.textContent = amt ? `Give ${KES.format(amt)} Now` : 'Give Now';
}

function getEffectiveAmount() {
  if (selectedAmount === 'other') {
    const v = parseInt(document.getElementById('custom-amount').value, 10);
    return isNaN(v) || v <= 0 ? 0 : v;
  }
  return selectedAmount;
}

initChipGroup('fund-group', 'fund', (val) => { selectedFund = val; });
initChipGroup('amount-group', 'amount', (val) => {
  const customWrap = document.getElementById('custom-amount-wrap');
  if (val === 'other') {
    selectedAmount = 'other';
    customWrap.style.display = 'block';
    document.getElementById('custom-amount').focus();
  } else {
    selectedAmount = parseInt(val, 10);
    customWrap.style.display = 'none';
  }
  updateDonateButtonLabel();
});
initChipGroup('method-group', 'method', (val) => {
  selectedMethod = val;
  document.getElementById('mpesa-phone-wrap').style.display = (val === 'mpesa') ? 'block' : 'none';
});

const customAmountInput = document.getElementById('custom-amount');
if (customAmountInput) customAmountInput.addEventListener('input', updateDonateButtonLabel);
updateDonateButtonLabel();

function normalizeKenyanPhone(raw) {
  let p = (raw || '').replace(/\s|-/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (p.startsWith('7') || p.startsWith('1')) p = '254' + p;
  return p;
}
function isValidKenyanPhone(p) {
  return /^254(7|1)\d{8}$/.test(p);
}

/* Poll the server while the donor is at their phone (server confirms via Safaricom's callback / STK query). */
async function waitForMpesa(checkoutRequestId, maxSeconds) {
  if (!checkoutRequestId) return { status: 'timeout' };
  const deadline = Date.now() + (maxSeconds || 120) * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const st = await apiRequest('/donations/mpesa/status/' + encodeURIComponent(checkoutRequestId));
      if (st && st.status && st.status !== 'pending') return st;
    } catch (e) { /* temporary network blip — keep polling */ }
  }
  return { status: 'timeout' };
}

const donationForm = document.getElementById('donation-form');
donationForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('give-alert', null);

  const amount = getEffectiveAmount();
  const name = document.getElementById('donor-name').value.trim();
  const email = document.getElementById('donor-email').value.trim();
  const phoneRaw = document.getElementById('mpesa-phone').value.trim();
  const phone = normalizeKenyanPhone(phoneRaw);

  if (!amount || amount < 1) {
    setAlert('give-alert', 'Please select or enter a valid amount in KES.', 'error');
    return;
  }
  if (!name || !email) {
    setAlert('give-alert', 'Please fill in your name and email.', 'error');
    return;
  }
  if (selectedMethod === 'mpesa' && !isValidKenyanPhone(phone)) {
    setAlert('give-alert', 'Please enter a valid Kenyan M-Pesa number, e.g. 07XXXXXXXX.', 'error');
    return;
  }

  const btn = document.getElementById('donate-submit-btn');
  const originalLabel = document.getElementById('donate-btn-label').textContent;
  btn.disabled = true;
  document.getElementById('donate-btn-label').innerHTML = '<span class="spinner"></span> Processing...';

  try {
    if (selectedMethod === 'mpesa') {
      // The "I'm not a robot" check is verified by the server BEFORE any M-Pesa prompt is sent.
      const result = await apiRequest('/donations/mpesa/stkpush', {
        method: 'POST',
        body: JSON.stringify({
          amount, fund: selectedFund, donorName: name, donorEmail: email, phone,
        }),
      });
      setAlert('give-alert',
        `An M-Pesa prompt has been sent to ${phoneRaw}. Enter your M-Pesa PIN on your phone to complete your ${KES.format(amount)} gift…`,
        'info');
      showToast('M-Pesa prompt sent — check your phone.', 'success');
      document.getElementById('donate-btn-label').innerHTML = '<span class="spinner"></span> Waiting for payment...';

      const outcome = await waitForMpesa(result && result.checkoutRequestId);
      if (outcome.status === 'completed') {
        setAlert('give-alert',
          `${outcome.message || 'Payment received. Thank you for giving!'}${outcome.receipt ? ' M-Pesa receipt: ' + outcome.receipt : ''}`,
          'success');
        showToast('Thank you for your gift!', 'success');
        donationForm.reset();
        selectedAmount = 2500; selectedFund = 'tithe'; selectedMethod = 'mpesa';
        document.getElementById('custom-amount-wrap').style.display = 'none';
        document.getElementById('mpesa-phone-wrap').style.display = 'block';
      } else if (outcome.status === 'timeout') {
        setAlert('give-alert',
          'We have not received confirmation yet. If you entered your PIN, you will get an M-Pesa SMS and the church office will confirm your gift. Please do not pay twice.',
          'info');
      } else {
        // failed / cancelled — keep the form filled in so the donor can simply try again
        setAlert('give-alert', outcome.message || 'The payment did not go through. No money was taken.', 'error');
      }
    } else {
      const result = await apiRequest('/donations/card/initiate', {
        method: 'POST',
        body: JSON.stringify({ amount, fund: selectedFund, donorName: name, donorEmail: email }),
      });
      if (result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        setAlert('give-alert', 'Card payments are being finalized. Please use M-Pesa for now, or contact us to give by card.', 'info');
      }
    }
  } catch (err) {
    setAlert('give-alert', err.message || 'We could not process your gift. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    document.getElementById('donate-btn-label').textContent = originalLabel;
    updateDonateButtonLabel();
  }
});

/* ---------------------------------------------------------
   CONTACT form
   --------------------------------------------------------- */
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('contact-alert', null);
  const payload = {
    name: document.getElementById('contact-name').value.trim(),
    email: document.getElementById('contact-email').value.trim(),
    phone: document.getElementById('contact-phone').value.trim(),
    subject: document.getElementById('contact-subject').value.trim(),
    message: document.getElementById('contact-message').value.trim(),
  };
  if (!payload.name || !payload.email || !payload.subject || !payload.message) {
    setAlert('contact-alert', 'Please fill in all required fields.', 'error');
    return;
  }
  const btn = document.getElementById('contact-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Sending...';
  try {
    await apiRequest('/contact', { method: 'POST', body: JSON.stringify(payload) });
    setAlert('contact-alert', 'Thank you! Your message has been sent — we will respond soon.', 'success');
    document.getElementById('contact-form').reset();
  } catch (err) {
    setAlert('contact-alert', err.message || 'We could not send your message. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Message';
  }
});

/* ---------------------------------------------------------
   LOGIN / REGISTER
   --------------------------------------------------------- */
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('login-alert', null);
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';
  try {
    const result = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(result.token);
    setStoredUser(result.member);
    updateAuthUI();
    showToast('Welcome back!', 'success');
    document.getElementById('login-form').reset();
    navigateTo('#dashboard');
  } catch (err) {
    setAlert('login-alert', err.message || 'Invalid email or password.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Log In';
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAlert('register-alert', null);
  const payload = {
    firstName: document.getElementById('reg-first-name').value.trim(),
    lastName: document.getElementById('reg-last-name').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    phone: normalizeKenyanPhone(document.getElementById('reg-phone').value.trim()),
    password: document.getElementById('reg-password').value,
  };
  if (payload.password.length < 8) {
    setAlert('register-alert', 'Password must be at least 8 characters.', 'error');
    return;
  }
  const btn = document.getElementById('register-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';
  try {
    const result = await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setToken(result.token);
    setStoredUser(result.member);
    updateAuthUI();
    showToast('Account created — welcome to DCI Kizito!', 'success');
    document.getElementById('register-form').reset();
    navigateTo('#dashboard');
  } catch (err) {
    setAlert('register-alert', err.message || 'We could not create your account.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

/* ---------------------------------------------------------
   DASHBOARD data (member portal)
   --------------------------------------------------------- */
async function loadDashboard() {
  const user = getStoredUser();
  document.getElementById('dashboard-welcome').textContent = user && user.firstName
    ? `Welcome Back, ${user.firstName}` : 'Welcome Back';

  try {
    const data = await apiRequest('/members/me/dashboard');

    document.getElementById('dashboard-ytd').textContent = KES.format(data.yearToDateGiving || 0);

    const groupsWrap = document.getElementById('dashboard-groups');
    if (Array.isArray(data.groups) && data.groups.length) {
      groupsWrap.innerHTML = data.groups.map(g => `
        <div class="mini-card">
          <span class="material-symbols-outlined">groups</span>
          <div><h3>${escapeHtml(g.name)}</h3><p class="muted">${escapeHtml(g.schedule || '')}</p></div>
        </div>`).join('');
    }

    const eventsBody = document.getElementById('dashboard-events-table');
    if (Array.isArray(data.upcomingEvents) && data.upcomingEvents.length) {
      eventsBody.innerHTML = data.upcomingEvents.map(ev => `
        <tr>
          <td><strong>${escapeHtml(ev.date)}</strong><br/><span class="muted">${escapeHtml(ev.time || '')}</span></td>
          <td>${escapeHtml(ev.title)}</td>
          <td>${escapeHtml(ev.location || '')}</td>
          <td>${escapeHtml(ev.role || 'Attendee')}</td>
          <td class="right"><button class="link-btn" type="button">Details</button></td>
        </tr>`).join('');
    }

    const givingBody = document.getElementById('dashboard-giving-table');
    if (Array.isArray(data.givingHistory) && data.givingHistory.length) {
      givingBody.innerHTML = data.givingHistory.map(d => `
        <tr>
          <td>${escapeHtml(d.date)}</td>
          <td>${escapeHtml(d.fund)}</td>
          <td>${escapeHtml(d.method)}</td>
          <td class="right">${KES.format(d.amount)}</td>
        </tr>`).join('');
    }
  } catch (err) {
    // Backend not reachable yet — keep the static placeholder content visible.
    console.warn('Dashboard data unavailable:', err.message);
  }
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* ---------------------------------------------------------
   Sermons: simple demo handlers for Watch / Download buttons
   --------------------------------------------------------- */
const watchBtn = document.getElementById('watch-sermon-btn');
if (watchBtn) watchBtn.addEventListener('click', () => showToast('Streaming will open in the church media player.', 'info'));
const notesBtn = document.getElementById('download-notes-btn');
if (notesBtn) notesBtn.addEventListener('click', () => showToast('Sermon notes download started.', 'info'));

/* ---------------------------------------------------------
   Footer year + legal page dates
   --------------------------------------------------------- */
const yearNow = new Date().getFullYear();
document.getElementById('footer-year').textContent = yearNow;
const dateStr = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
document.getElementById('terms-date').textContent = dateStr;
document.getElementById('privacy-date').textContent = dateStr;

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
updateAuthUI();
renderPage();
