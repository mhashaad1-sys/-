// ================== منصة التمارين (باشتراك شهري) ==================
// المحتوى ملفات HTML بترفعها الإدارة. بتتخزن على السيرفر مقسّمة (hwChunks) والسيرفر نفسه
// مش بيدي الملف لولي أمر مش مشترك (إلا لو الملف متعلّم "تجريبي").
// الملف بيشتغل جوه إطار معزول (sandbox) مش شايف بيانات الحضانة، والتقدم بيتحفظ لكل طفل على السيرفر.

const HW_CHUNK = 300000;
const NOOR_KEY = 'baraem_noor_v1';
const hwCache = {}, hwMeta = {};
const hwPrice = () => Number(settings().hwPrice) || 100;
const hwId = (cid, item) => `${cid}__${item}`;
function addMonth(dateStr) { const d = new Date(dateStr); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const hwActiveUntil = (until) => !!until && until >= today();
const kidHwUntil = (k) => (isParent() ? (k.hw || {}).until : (child(k.id || k) || {}).hwUntil) || '';

// ---------- تحميل الملف ----------
async function loadHwHtml(it) {
  if (hwCache[it.id]) return hwCache[it.id];
  const parts = [];
  for (let n = 0; n < (it.chunks || 1); n++) {
    const d = await Cloud.col('hwChunks').doc(`${it.id}_${n}`).get();
    if (!d.exists) throw new Error('الملف ناقص، ارفعه تاني');
    parts.push(d.data().data);
  }
  return (hwCache[it.id] = parts.join(''));
}

// ---------- المشغّل ----------
function hwShim(init) {
  // بيتنفذ جوه الإطار المعزول: تخزين بديل بيبعت التغييرات للتطبيق
  function mk(store, kind) {
    return {
      getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); parent.postMessage({ baraem: 'ls', kind, k, v: String(v) }, '*'); },
      removeItem(k) { delete store[k]; parent.postMessage({ baraem: 'lsdel', kind, k }, '*'); },
      clear() { Object.keys(store).forEach((k) => delete store[k]); },
      key(i) { return Object.keys(store)[i] || null; },
      get length() { return Object.keys(store).length; },
    };
  }
  try { Object.defineProperty(window, 'localStorage', { value: mk(init.ls || {}, 'ls'), configurable: true }); } catch (e) { /* ignore */ }
  try { Object.defineProperty(window, 'sessionStorage', { value: mk({}, 'ss'), configurable: true }); } catch (e) { /* ignore */ }
  window.BARAEM = { kid: init.kid, active: init.active, until: init.until, report(d) { parent.postMessage({ baraem: 'score', d }, '*'); } };
  // النطق: جوه تطبيق الأندرويد بنستخدم محرك النطق بتاع الموبايل
  if (init.tts) {
    const pend = {}; let n = 0;
    function Utt(t) { this.text = t; this.lang = ''; this.rate = 1; this.pitch = 1; this.voice = null; this.onend = null; this.onerror = null; }
    const synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices() { return [{ name: 'Google عربي', lang: 'ar-EG', localService: true, default: true }, { name: 'Google English', lang: 'en-US', localService: true }]; },
      speak(u) { const id = 'u' + (++n); pend[id] = u; parent.postMessage({ baraem: 'tts', id, text: u.text, lang: (u.voice && u.voice.lang) || u.lang || 'ar-EG', rate: u.rate || 1, pitch: u.pitch || 1 }, '*'); },
      cancel() { Object.keys(pend).forEach((k) => delete pend[k]); parent.postMessage({ baraem: 'ttsStop' }, '*'); },
      pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
    };
    try { Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true }); } catch (e) { window.speechSynthesis = synth; }
    try { Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utt, configurable: true }); } catch (e) { window.SpeechSynthesisUtterance = Utt; }
    window.addEventListener('message', (e) => { const id = e.data && e.data.baraemTtsDone; if (id && pend[id]) { const u = pend[id]; delete pend[id]; if (u.onend) u.onend({}); } });
  }
}
function hwPost() {
  // بعد تحميل المنصة: فتحها للمشتركين + إرسال قائمة الدروس للمتابعة
  /* global ACT, go, VIEW, LESSONS */
  var B = window.BARAEM || {};
  try { if (B.active && typeof ACT !== 'undefined') { ACT = { ok: true, exp: B.until || 0 }; if (typeof go === 'function') go(typeof VIEW !== 'undefined' ? VIEW : 'home'); } } catch (e) { /* ignore */ }
  try { if (typeof LESSONS !== 'undefined') parent.postMessage({ baraem: 'meta', lessons: LESSONS.map(function (l) { return { id: l.id, s: l.subject, n: l.name }; }) }, '*'); } catch (e) { /* ignore */ }
}
function noorSeed(kid, pin) {
  return { v: 1, savedAt: 0, pin, recover: { q: '', a: '' }, settings: { sound: 1, voice: 1, rate: 0.8, unlockAll: 0 }, order: [kid.id], current: kid.id,
    kids: { [kid.id]: { id: kid.id, profile: { name: kid.name, gender: kid.gender === 'بنت' ? 'g' : 'b', avatar: kid.gender === 'بنت' ? '🌸' : '🐣', photo: kid.photo || '', created: Date.now() },
      xp: 0, stars: 0, spent: 0, lessons: {}, cstat: {}, reviews: {}, days: {}, log: [], stickers: [], certs: {}, daily: {}, traced: {}, time: 0, badges: [] } } };
}
function buildSrcdoc(html, init, seed) {
  const js = (fn, arg) => `<script>(${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg).replace(/</g, '\\u003c')});<\/script>`;
  let out = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + js(hwShim, init)) : js(hwShim, init) + html;
  if (seed) out = out.replace(/(<script[^>]*id="seed"[^>]*>)[\s\S]*?(<\/script>)/i, (m, a, b) => a + JSON.stringify(seed).replace(/</g, '\\u003c') + b);
  const post = js(hwPost);
  const i = out.toLowerCase().lastIndexOf('</body>');
  return i >= 0 ? out.slice(0, i) + post + out.slice(i) : out + post;
}

let hwSession = null;
async function openHomework(itemId) {
  const it = D.homework.find((x) => x.id === itemId); if (!it) return;
  const k = isParent() ? curKid() : null;
  const until = k ? kidHwUntil(k) : '';
  const active = !k || hwActiveUntil(until);
  if (k && !active && !it.free) { toast('🔒 التمرين ده للمشتركين'); return; }
  toast('جاري التحميل...');
  let html;
  try { html = await loadHwHtml(it); } catch (e) { toast(authMsg(e)); return; }
  let ls = {};
  if (k) {
    try { ls = JSON.parse(LS.get('hwls_' + hwId(k.id, it.id)) || 'null') || null; } catch (e) { ls = null; }
    if (!ls) { try { const d = await Cloud.col('hwState').doc(hwId(k.id, it.id)).get(); ls = d.exists ? JSON.parse(d.data().ls || '{}') : {}; } catch (e) { ls = {}; } }
  }
  const kid = k ? { id: k.id, name: k.name, gender: k.gender, photo: k.photo } : { id: 'preview', name: 'تجربة', gender: 'ولد' };
  const pin = k ? (toDigits(Cloud.email.split('@')[0]).slice(-4) || '0000') : '0000';
  const seed = html.includes(NOOR_KEY) && !ls[NOOR_KEY] ? noorSeed(kid, pin) : null;
  const doc = buildSrcdoc(html, { ls, kid, active, tts: !!(window.Android && window.Android.speak), until: until ? new Date(until + 'T23:59:59').getTime() : 0 }, seed);
  hwSession = { it, k, ls, dirty: false, saveT: null, cloudT: null, frame: null, started: Date.now() };
  const ov = document.createElement('div');
  ov.className = 'hw-player';
  ov.innerHTML = `<div class="hw-bar"><button class="btn small" data-action="closeHw">✕ رجوع</button><b>${esc(it.title)}</b>${k ? `<span class="sub">رمز لوحة ولي الأمر: ${esc(pin)}</span>` : '<span class="badge orange">معاينة</span>'}</div>
    <iframe sandbox="allow-scripts allow-modals allow-forms allow-popups" allow="autoplay"></iframe>`;
  document.body.appendChild(ov);
  const fr = ov.querySelector('iframe'); hwSession.frame = fr;
  fr.srcdoc = doc;
  history.pushState({ hw: 1 }, '');
}
window.__ttsDone = (id) => { try { hwSession && hwSession.frame.contentWindow.postMessage({ baraemTtsDone: id }, '*'); } catch (e) { /* ignore */ } };
function closeHomework(fromPop) {
  if (!hwSession) return false;
  try { if (window.Android && window.Android.stopSpeak) window.Android.stopSpeak(); } catch (e) { /* ignore */ }
  const s = hwSession;
  try { s.frame.srcdoc = '<p></p>'; } catch (e) { /* ignore */ }
  setTimeout(() => { flushHw(s, true); const ov = document.querySelector('.hw-player'); if (ov) ov.remove(); }, 400);
  hwSession = null;
  if (!fromPop) history.back();
  render();
  return true;
}
window.addEventListener('message', (e) => {
  const s = hwSession, m = e.data;
  if (!s || !m || !m.baraem || e.source !== (s.frame && s.frame.contentWindow)) return;
  if (m.baraem === 'meta') { hwMeta[s.it.id] = m.lessons; return; }
  if (m.baraem === 'tts') { try { window.Android.speak(m.id, String(m.text || ''), String(m.lang || 'ar-EG'), Number(m.rate) || 1, Number(m.pitch) || 1); } catch (x) { /* ignore */ } return; }
  if (m.baraem === 'ttsStop') { try { window.Android.stopSpeak(); } catch (x) { /* ignore */ } return; }
  if (!s.k) return; // المعاينة مش بتتحفظ
  if (m.baraem === 'ls' && m.kind === 'ls') { s.ls[m.k] = m.v; s.dirty = true; }
  else if (m.baraem === 'lsdel' && m.kind === 'ls') { delete s.ls[m.k]; s.dirty = true; }
  else if (m.baraem === 'score') { (s.scores = s.scores || []).push({ ...m.d, at: new Date().toISOString() }); s.dirty = true; }
  else return;
  clearTimeout(s.saveT); s.saveT = setTimeout(() => flushHw(s, false), 1000);
  if (!s.cloudT) s.cloudT = setTimeout(() => { s.cloudT = null; flushHw(s, true); }, 20000);
});
function hwSummary(s) {
  const out = { title: s.it.title, last: new Date().toISOString() };
  try {
    const st = JSON.parse(s.ls[NOOR_KEY] || 'null');
    const kid = st && (st.kids[st.current] || Object.values(st.kids)[0]);
    if (kid) {
      const meta = hwMeta[s.it.id] || [];
      const L = kid.lessons || {};
      const subj = {};
      meta.forEach((l) => { const x = subj[l.s] = subj[l.s] || { done: 0, total: 0, acc: [] }; x.total++; const st2 = L[l.id]; if (st2 && st2.status === 'done') { x.done++; x.acc.push(st2.acc || 0); } });
      Object.values(subj).forEach((x) => { x.acc = x.acc.length ? Math.round(x.acc.reduce((a, b) => a + b, 0) / x.acc.length) : 0; });
      const doneList = Object.entries(L).filter(([, v]) => v.status === 'done').sort((a, b) => (b[1].last || 0) - (a[1].last || 0));
      Object.assign(out, {
        xp: kid.xp || 0, stars: kid.stars || 0, minutes: Math.round((kid.time || 0) / 60000), days: Object.keys(kid.days || {}).length,
        done: doneList.length, total: meta.length, subj,
        recent: doneList.slice(0, 6).map(([id, v]) => ({ n: (meta.find((l) => l.id === id) || {}).n || id, stars: v.best || 0, acc: v.acc || 0 })),
        lastDay: Object.keys(kid.days || {}).sort().pop() || '',
      });
    }
  } catch (e) { /* ignore */ }
  if (s.scores) out.scores = s.scores.slice(-30);
  return out;
}
function flushHw(s, cloud) {
  if (!s || !s.k) return;
  const id = hwId(s.k.id, s.it.id);
  LS.set('hwls_' + id, JSON.stringify(s.ls));
  if (cloud && s.dirty && Cloud.role === 'parent') {
    s.dirty = false;
    const sum1 = hwSummary(s);
    Cloud.hwProg[id] = { ...sum1, childId: s.k.id, itemId: s.it.id };
    Cloud.col('hwState').doc(id).set({ id, childId: s.k.id, itemId: s.it.id, ls: JSON.stringify(s.ls), u: Cloud.ts() }).catch((e) => console.warn(e));
    Cloud.col('hwProg').doc(id).set({ id, childId: s.k.id, itemId: s.it.id, childName: s.k.name || '', ...sum1, u: Cloud.ts() }).catch((e) => console.warn(e));
  }
}

// ---------- شاشة ولي الأمر ----------
function viewPHw() {
  const k = curKid(), until = kidHwUntil(k), active = hwActiveUntil(until);
  const items = [...D.homework].sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
  const pendingSub = (Cloud.req[k.id] || []).some((r) => r.type === 'hwsub' && r.status === 'pending');
  return `${kidSwitcher()}
  ${active ? `<div class="card hw-sub ok"><b>✅ ${esc(k.name || '')} مشترك في منصة التمارين</b><div class="sub">لحد ${dateLabel(until)}</div></div>`
    : `<div class="card hw-sub"><h3>📚 منصة تمارين براعم</h3><p>تمارين تفاعلية في نور البيان والإنجليزي والحساب، بالصوت والألعاب، والحضانة بتتابع تقدم ${esc(k.name || 'طفلك')}.</p>
      <div class="price">${money(hwPrice())} <small>في الشهر</small></div>
      ${items.some((x) => x.free) ? '<div class="sub">🎁 فيه تجربة مجانية — افتح التمرين اللي عليه "مجاني" تحت.</div>' : ''}
      ${instaCard(k.name || '', hwPrice(), 'اشتراك منصة التمارين')}
      ${pendingSub ? '<div class="alert">⏳ طلب الاشتراك وصل للحضانة وهيتفعل بعد مراجعة التحويل</div>' : `<button class="btn primary block" style="margin-top:10px" data-action="hwSubscribe">✔ حوّلت — فعّلوا الاشتراك</button>`}</div>`}
  <div class="section-title"><h3>التمارين</h3></div>
  <div class="list">${items.map((it) => {
    const open = active || it.free, p = Cloud.hwProg[hwId(k.id, it.id)];
    return `<div class="item ${open ? 'clickable' : ''}" data-action="${open ? 'openHw' : 'hwLocked'}" data-id="${it.id}"><div class="avatar">${open ? '📖' : '🔒'}</div>
      <div class="main"><div class="title">${esc(it.title)} ${it.free && !active ? '<span class="badge green">مجاني للتجربة</span>' : ''}</div>
      <div class="sub">${esc(it.desc || '')}</div>
      ${p && p.total ? `<div class="bar-track" style="margin-top:6px"><div class="bar-fill green" style="width:${Math.round((p.done || 0) / p.total * 100)}%"></div></div>
        <div class="sub">خلّص ${num(p.done)} من ${num(p.total)} درس · ⭐ ${num(p.xp || 0)} نقطة · ${num(p.minutes || 0)} دقيقة</div>` : ''}</div>
      <span class="btn small ${open ? 'primary' : ''}">${open ? 'افتح' : '🔒'}</span></div>`;
  }).join('') || '<div class="empty">لسه مفيش تمارين</div>'}</div>`;
}

// ---------- شاشة الإدارة ----------
function viewHomework() {
  const tab = state.hwTab || 'items';
  let body = '';
  if (tab === 'items') {
    const items = [...D.homework].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    body = `${can('manage') ? `<div class="card"><h3>رفع تمرين جديد</h3><p class="sub">ملف HTML (زي منصة نور البيان). أول ملف تعلّم عليه "مجاني للتجربة" يقدر أي ولي أمر يجربه.</p>
      <button class="btn primary" data-action="hwUpload">📂 اختيار ملف HTML</button>
      <div class="sub" style="margin-top:6px">سعر الاشتراك الشهري: <b>${money(hwPrice())}</b> (من الإعدادات)</div></div>` : ''}
      <div class="list">${items.map((it) => `<div class="item"><div class="avatar">📖</div><div class="main"><div class="title">${esc(it.title)} ${it.free ? '<span class="badge green">مجاني للتجربة</span>' : '<span class="badge purple">للمشتركين</span>'}</div>
        <div class="sub">${esc(it.desc || '')} · ${num(Math.round((it.size || 0) / 1024))} ك.ب</div></div>
        <div class="btn-row"><button class="btn small" data-action="openHw" data-id="${it.id}">👁 معاينة</button>${can('manage') ? `<button class="btn small" data-action="hwEdit" data-id="${it.id}">✏️</button>` : ''}</div></div>`).join('') || '<div class="empty">لسه مفيش تمارين</div>'}</div>`;
  } else if (tab === 'subs') {
    const kids = activeChildren().filter((c) => c.parentLogin);
    const act = kids.filter((c) => hwActiveUntil(c.hwUntil));
    body = `<div class="stats"><div class="stat green"><div class="label">مشتركين</div><div class="value">${num(act.length)}</div></div>
      <div class="stat purple"><div class="label">دخل الاشتراكات الشهري</div><div class="value">${money(act.length * hwPrice())}</div></div></div>
      <p class="sub" style="color:var(--muted)">الأطفال اللي أولياء أمورهم عندهم حساب في التطبيق بس. ${activeChildren().length - kids.length ? `(${num(activeChildren().length - kids.length)} طفل لسه مالهمش حساب)` : ''}</p>
      <div class="list">${kids.map((c) => `<div class="item">${avatar(c)}<div class="main"><div class="title">${esc(c.name)}</div>
        <div class="sub">${hwActiveUntil(c.hwUntil) ? `✅ مشترك لحد ${dateLabel(c.hwUntil)}` : c.hwUntil ? `انتهى ${dateLabel(c.hwUntil)}` : 'مش مشترك'}</div></div>
        ${can('manage') ? `<button class="btn small ${hwActiveUntil(c.hwUntil) ? '' : 'primary'}" data-action="hwActivate" data-id="${c.id}">${hwActiveUntil(c.hwUntil) ? '+ شهر' : 'تفعيل'}</button>` : ''}</div>`).join('') || '<div class="empty">اعمل حسابات لأولياء الأمور الأول</div>'}</div>`;
  } else {
    const prog = D.hwProg.filter((p) => child(p.childId)).sort((a, b) => (b.last || '').localeCompare(a.last || ''));
    body = `<div class="list">${prog.map((p) => `<div class="item clickable" data-action="hwProgDetail" data-id="${p.id}">${avatar(child(p.childId))}
      <div class="main"><div class="title">${esc((child(p.childId) || {}).name || p.childName)}</div><div class="sub">${esc(p.title || '')}</div>
      ${p.total ? `<div class="bar-track" style="margin-top:4px"><div class="bar-fill green" style="width:${Math.round((p.done || 0) / p.total * 100)}%"></div></div>` : ''}
      <div class="sub">${num(p.done || 0)} / ${num(p.total || 0)} درس · ⭐ ${num(p.xp || 0)} · ${num(p.minutes || 0)} دقيقة · آخر مرة ${p.last ? new Date(p.last).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }) : '—'}</div></div></div>`).join('') || '<div class="empty">لسه محدش حل تمارين</div>'}</div>`;
  }
  return {
    title: 'منصة التمارين',
    html: `<div class="tabs"><button class="${tab === 'items' ? 'active' : ''}" data-action="hwTab" data-t="items">التمارين</button>
      <button class="${tab === 'subs' ? 'active' : ''}" data-action="hwTab" data-t="subs">الاشتراكات</button>
      <button class="${tab === 'prog' ? 'active' : ''}" data-action="hwTab" data-t="prog">المتابعة</button></div>${body}`,
  };
}
function hwProgDetail(p) {
  const SUBJ = { noor: 'نور البيان', en: 'English', math: 'الحساب' };
  openModal(`📊 ${(child(p.childId) || {}).name || ''}`, `<div class="stats"><div class="stat green"><div class="label">دروس خلصها</div><div class="value">${num(p.done || 0)} / ${num(p.total || 0)}</div></div>
    <div class="stat purple"><div class="label">النقاط</div><div class="value">⭐ ${num(p.xp || 0)}</div></div>
    <div class="stat blue"><div class="label">وقت التدريب</div><div class="value">${num(p.minutes || 0)} د</div></div>
    <div class="stat"><div class="label">أيام التدريب</div><div class="value">${num(p.days || 0)}</div></div></div>
    ${Object.entries(p.subj || {}).map(([s, x]) => `<div class="bar-row"><div class="bar-label"><span>${SUBJ[s] || s}</span><b>${num(x.done)} / ${num(x.total)}${x.acc ? ' · دقة ' + num(x.acc) + '٪' : ''}</b></div>
      <div class="bar-track"><div class="bar-fill green" style="width:${x.total ? x.done / x.total * 100 : 0}%"></div></div></div>`).join('')}
    ${(p.recent || []).length ? `<h3>آخر الدروس</h3><div class="list">${p.recent.map((r) => `<div class="item"><div class="main"><div class="title">${esc(r.n)}</div></div><span>${'⭐'.repeat(r.stars || 0)} ${num(r.acc)}٪</span></div>`).join('')}</div>` : ''}
    ${(p.scores || []).length ? `<h3>النتايج</h3><div class="list">${p.scores.slice(-10).reverse().map((r) => `<div class="item"><div class="main"><div class="title">${esc(r.title || 'تمرين')}</div><div class="sub">${new Date(r.at).toLocaleDateString('ar-EG')}</div></div><b>${num(r.score)}${r.total ? ' / ' + num(r.total) : ''}</b></div>`).join('')}</div>` : ''}`);
}
async function hwUploadFile(file) {
  const text = await file.text();
  if (!/<html|<body|<script/i.test(text)) { toast('ده مش ملف HTML'); return; }
  const title = (text.match(/<title>([^<]*)<\/title>/i) || [])[1] || file.name.replace(/\.html?$/i, '');
  openForm({
    title: 'رفع تمرين', data: { title: title.trim(), desc: '', free: !D.homework.some((x) => x.free) },
    fields: [
      { name: 'title', label: 'اسم التمرين', required: true, full: true },
      { name: 'desc', label: 'وصف قصير', full: true, placeholder: 'مثال: نور البيان والإنجليزي والحساب' },
      { name: 'free', label: '🎁 مجاني للتجربة (يقدر أي ولي أمر يفتحه)', type: 'checkbox', full: true },
    ],
    onSave: async (v) => {
      const id = uid(), chunks = Math.ceil(text.length / HW_CHUNK);
      try {
        for (let n = 0; n < chunks; n++) {
          await Cloud.col('hwChunks').doc(`${id}_${n}`).set({ id: `${id}_${n}`, itemId: id, n, free: !!v.free, data: text.slice(n * HW_CHUNK, (n + 1) * HW_CHUNK) });
          toast(`جاري الرفع ${num(n + 1)} / ${num(chunks)}`);
        }
      } catch (e) { toast(authMsg(e)); return false; }
      hwCache[id] = text;
      await save('homework', { id, title: v.title, desc: v.desc, free: !!v.free, chunks, size: text.length, createdAt: new Date().toISOString() });
      toast('تم رفع التمرين ✅');
    },
  });
}
function hwEditForm(it) {
  openForm({
    title: it.title, data: it,
    fields: [
      { name: 'title', label: 'اسم التمرين', required: true, full: true },
      { name: 'desc', label: 'وصف قصير', full: true },
      { name: 'free', label: '🎁 مجاني للتجربة', type: 'checkbox', full: true },
    ],
    onSave: async (v) => {
      if (!!v.free !== !!it.free) {
        try { for (let n = 0; n < (it.chunks || 1); n++) await Cloud.col('hwChunks').doc(`${it.id}_${n}`).update({ free: !!v.free }); }
        catch (e) { toast(authMsg(e)); return false; }
      }
      await save('homework', { ...it, ...v, free: !!v.free });
    },
    onDelete: async () => {
      for (let n = 0; n < (it.chunks || 1); n++) await Cloud.col('hwChunks').doc(`${it.id}_${n}`).delete().catch(() => {});
      await remove('homework', it.id);
    },
  });
}
async function hwActivate(cid, ask = true) {
  const c = child(cid); if (!c) return;
  const base = hwActiveUntil(c.hwUntil) ? c.hwUntil : today();
  const until = addMonth(base);
  if (ask && !confirm(`تفعيل منصة التمارين لـ ${c.name} لحد ${dateLabel(until)}؟\nهيتسجل ${money(hwPrice())} في المقبوضات.`)) return false;
  await save('children', { ...c, hwUntil: until });
  await save('payments', { id: uid(), childId: cid, type: 'homework', month: thisMonth(), amount: hwPrice(), date: today(), method: 'إنستاباي', receiptNo: Math.max(0, ...D.payments.map((x) => x.receiptNo || 0)) + 1, note: `منصة التمارين لحد ${until}` });
  // صلاحية السيرفر: أبعد تاريخ اشتراك لأي طفل على نفس حساب ولي الأمر
  if (c.parentLogin) {
    const sibs = D.children.filter((x) => x.parentLogin === c.parentLogin);
    const max = sibs.map((x) => (x.id === cid ? until : x.hwUntil || '')).sort().pop();
    try { await Cloud.col('members').doc(parentEmail(c.parentLogin)).update({ hwUntil: new Date(max + 'T23:59:59').getTime() }); } catch (e) { toast(authMsg(e)); }
  }
  publishFamily(cid);
  toast(`✅ اتفعل لحد ${dateLabel(until)}`);
  render();
  return true;
}
