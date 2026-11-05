// ================== حضانة براعم - إدارة الحضانة ==================
// كل البيانات محفوظة على الجهاز (IndexedDB) وتُحمَّل في الذاكرة عند بدء التشغيل.

const D = {};
DB.STORES.forEach((s) => { D[s] = []; });

const EXPENSE_CATEGORIES = ['إيجار', 'رواتب', 'سلف العاملين', 'أكل ووجبات', 'كهرباء ومياه وغاز', 'أدوات وألعاب', 'أدوات تعليمية وكتب', 'أدوات نظافة', 'صيانة', 'مواصلات', 'إنترنت وتليفون', 'دعاية وإعلان', 'أخرى'];
const PAYMENT_TYPES = { monthly: 'اشتراك شهري', registration: 'رسوم تسجيل', uniform: 'زي وأدوات', books: 'كتب', bus: 'باص', activity: 'رحلة / نشاط / حفلة', homework: 'اشتراك التطبيق / التمارين', other: 'أخرى' };
const PAYMENT_METHODS = ['نقدي', 'فودافون كاش', 'إنستاباي', 'تحويل بنكي', 'أخرى'];
const NOTE_KINDS = ['عام', 'صحة', 'وجبات', 'نوم', 'سلوك', 'تعليم', 'حادثة / إصابة'];
const STAFF_ROLES = ['مديرة', 'مُعلِّمة', 'مُساعِدة', 'دادة', 'سائق', 'مشرفة باص', 'عامل/ة نظافة', 'طباخ/ة', 'محاسب', 'أخرى'];
const STAFF_DOCS = ['صورة البطاقة', 'شهادة المؤهل', 'فيش جنائي', 'شهادة صحية', 'صور شخصية', 'عقد العمل'];
const STAFF_TX = { advance: ['سلفة', 'orange'], deduction: ['خصم', 'red'], bonus: ['مكافأة', 'green'], note: ['ملاحظة / تقييم', 'blue'] };
const ATT_LABEL = { present: 'حاضر', late: 'متأخر', absent: 'غائب', leave: 'إجازة' };

const state = {
  tab: 'home', stack: [], attDate: today(), attClass: '', month: thisMonth(), finTab: 'payments',
  childSearch: '', childClass: '', childStatus: 'active', duesClass: '',
  staffTab: 'list', staffAttDate: today(), repDate: today(), repClass: '', schedClass: 'general', schedDay: DAY_INDEX[new Date().getDay()] ?? 0,
  msgTpl: 0, msgText: '', msgTarget: 'all', msgSent: {},
  imp: { type: 'children', sheets: null, sheetIdx: 0, map: {}, fileName: '', result: null },
};

// ---------- أدوات مساعدة ----------
function pad(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function thisMonth() { return today().slice(0, 7); }
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function num(n) { return Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 }); }
function money(n) { return `${num(n)} ${settings().currency || 'ج.م'}`; }
function settings() { return { ...DEFAULT_SETTINGS, ...(D.settings.find((s) => s.id === 'main') || {}) }; }
function monthLabel(m) { if (!m) return ''; const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }); }
function shortMonth(m) { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('ar-EG', { month: 'short' }); }
function dateLabel(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return new Date(+y, +m - 1, +dd).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function addMonths(m, k) { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function monthDiff(a, b) { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); }
function sum(arr, f = (x) => x) { return arr.reduce((s, x) => s + (Number(f(x)) || 0), 0); }
function initials(name) { return (name || '?').trim().charAt(0); }
function $(sel, root = document) { return root.querySelector(sel); }
function toNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d.\-]/g, '');
  return s === '' ? '' : Number(s);
}

function age(birth) {
  if (!birth) return '';
  const b = new Date(birth), n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months--;
  if (months < 0) return '';
  const y = Math.floor(months / 12), m = months % 12;
  const parts = [];
  if (y) parts.push(y === 1 ? 'سنة' : y === 2 ? 'سنتين' : `${num(y)} ${y <= 10 ? 'سنوات' : 'سنة'}`);
  if (m) parts.push(m === 1 ? 'شهر' : m === 2 ? 'شهرين' : `${num(m)} ${m <= 10 ? 'شهور' : 'شهر'}`);
  return parts.join(' و') || 'أقل من شهر';
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2400);
}

function avatar(c, big) {
  return `<div class="avatar${big ? ' big' : ''}">${c.photo ? `<img src="${c.photo}" alt="">` : esc(initials(c.name))}</div>`;
}

function waLink(phone, text) {
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  else if (p.startsWith('00')) p = p.slice(2);
  else if (p.startsWith('0')) p = '2' + p; // أرقام مصر: 01xxxxxxxxx ← 201xxxxxxxxx
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}
function openUrl(url) { if (window.Android && window.Android.openUrl) window.Android.openUrl(url); else window.open(url, '_blank'); }
function shareText(text) {
  if (window.Android && window.Android.share) window.Android.share(text);
  else if (navigator.share) navigator.share({ text }).catch(() => {});
  else openUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
}

// ---------- البيانات ----------
async function loadAll() { for (const s of DB.STORES) D[s] = await DB.getAll(s); }
async function save(store, obj) {
  await DB.put(store, obj);
  const i = D[store].findIndex((x) => x.id === obj.id);
  if (i >= 0) D[store][i] = obj; else D[store].push(obj);
  Cloud.write(store, obj);
  famHook(store, obj);
}
async function remove(store, id) {
  const old = D[store].find((x) => x.id === id);
  await DB.del(store, id); D[store] = D[store].filter((x) => x.id !== id); Cloud.del(store, id);
  if (old) famHook(store, old);
}
function famHook(store, obj) {
  if (store === 'children') queueFamily(obj.id);
  else if (['attendance', 'payments', 'notes', 'reports', 'evals', 'awards'].includes(store)) queueFamily(obj.childId);
}

// الصلاحيات: finance (الفلوس)، staff (العاملين)، editChildren، manage (الإعدادات والمستخدمين)
function can(p) {
  const r = Cloud.effRole();
  if (!r || r === 'admin') return true;
  return ({ accountant: ['finance', 'staff', 'editChildren'], teacher: [] }[r] || []).includes(p);
}
let pendingRender = false;
function softRender() {
  const busy = !$('#modal').classList.contains('hidden') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.id !== '');
  if (busy) { pendingRender = true; return; }
  pendingRender = false; render();
}
async function saveSettings(patch) { await save('settings', { ...settings(), ...patch, id: 'main' }); }

const child = (id) => D.children.find((c) => c.id === id);
const cls = (id) => D.classes.find((c) => c.id === id);
const staffById = (id) => D.staff.find((s) => s.id === id);
const className = (id) => (cls(id) || {}).name || 'بدون فصل';
const byName = (a, b) => a.name.localeCompare(b.name, 'ar');
const activeChildren = () => D.children.filter((c) => c.active !== false).sort(byName);
const activeStaff = () => D.staff.filter((s) => s.active !== false).sort(byName);
const classOpts = (sel, all = 'كل الفصول') => `<option value="">${all}</option>${D.classes.map((k) => `<option value="${k.id}" ${sel === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}`;

function monthPaid(c, m) { return sum(D.payments.filter((p) => p.childId === c.id && p.type === 'monthly' && p.month === m), (p) => p.amount); }
function monthStatus(c, m) {
  const fee = Number(c.monthlyFee) || 0, paid = monthPaid(c, m);
  if (!fee) return { key: 'none', label: 'بدون اشتراك', cls: 'gray', paid, remaining: 0 };
  if (paid >= fee) return { key: 'paid', label: 'مدفوع', cls: 'green', paid, remaining: 0 };
  if (paid > 0) return { key: 'partial', label: 'جزئي', cls: 'orange', paid, remaining: fee - paid };
  return { key: 'unpaid', label: 'غير مدفوع', cls: 'red', paid, remaining: fee };
}
// إجمالي المتأخرات من شهر الالتحاق حتى الشهر الحالي (على أساس الاشتراك الشهري الحالي)
function childBalance(c) {
  const fee = Number(c.monthlyFee) || 0;
  if (!fee) return 0;
  const start = (c.enrollDate || (c.createdAt || today())).slice(0, 7);
  const end = c.active === false && c.leaveDate ? c.leaveDate.slice(0, 7) : thisMonth();
  const months = Math.max(0, monthDiff(start, end) + 1);
  const paid = sum(D.payments.filter((p) => p.childId === c.id && p.type === 'monthly' && p.month >= start && p.month <= end), (p) => p.amount);
  return Math.max(0, months * fee - paid);
}
const incomeIn = (m) => sum(D.payments.filter((p) => (p.date || '').startsWith(m)), (p) => p.amount);
const expensesIn = (m) => sum(D.expenses.filter((e) => (e.date || '').startsWith(m)), (e) => e.amount);
const attOf = (date, childId) => D.attendance.find((a) => a.id === `${date}_${childId}`);
const staffAttOf = (date, staffId) => D.staffAtt.find((a) => a.id === `${date}_${staffId}`);

function staffMonth(s, m) {
  const tx = D.staffTx.filter((t) => t.staffId === s.id && t.month === m);
  const t = (k) => sum(tx.filter((x) => x.type === k), (x) => x.amount);
  const base = Number(s.salary) || 0, bonus = t('bonus'), deduction = t('deduction'), advance = t('advance');
  const net = base + bonus - deduction - advance;
  const paid = sum(D.expenses.filter((e) => e.staffId === s.id && e.category === 'رواتب' && e.month === m), (e) => e.amount);
  const att = D.staffAtt.filter((a) => a.staffId === s.id && a.date.startsWith(m));
  const c = (k) => att.filter((a) => a.status === k).length;
  return { base, bonus, deduction, advance, net, paid, remaining: Math.max(0, net - paid), present: c('present'), late: c('late'), absent: c('absent'), leave: c('leave') };
}
function leaveUsed(s, year = today().slice(0, 4)) { return D.staffAtt.filter((a) => a.staffId === s.id && a.status === 'leave' && a.date.startsWith(year)).length; }

function getSchedule(id) { return D.schedule.find((s) => s.id === id) || { id, theme: '', themeIdeas: '', slots: [] }; }
function slotStart(t) { const m = String(t).match(/(\d{1,2})[:.](\d{2})/); if (!m) return 99; let h = +m[1]; if (h < 7) h += 12; return h + m[2] / 60; }

// ---------- التنقل ----------
const TITLES = { home: 'الرئيسية', children: 'الأطفال', attendance: 'الحضور والغياب', finance: 'الحسابات', staff: 'العاملين', more: 'المزيد' };

function go(tab) { state.tab = tab; state.stack = []; render(); window.scrollTo(0, 0); }
function push(view, params = {}) { state.stack.push({ view, ...params }); history.pushState({ d: state.stack.length }, ''); render(); window.scrollTo(0, 0); }
function back() { if (!$('#modal').classList.contains('hidden')) { closeModal(); return; } if (state.stack.length) history.back(); }
window.addEventListener('popstate', () => {
  if (LRN) { closeLearn(true); return; }
  if (hwSession) { closeHomework(true); return; }
  if (!$('#modal').classList.contains('hidden')) { closeModal(); history.pushState({ d: state.stack.length }, ''); return; }
  if (state.stack.length) { state.stack.pop(); render(); }
});

function render() {
  const top = state.stack[state.stack.length - 1];
  const parent = isParent();
  const navTabs = parent ? PARENT_TABS : [['home', '🏠', 'الرئيسية'], ['children', '👶', 'الأطفال'], ['attendance', '✅', 'الحضور'], ['finance', '💰', 'الحسابات'], ['staff', '👩‍🏫', 'العاملين'], ['more', '☰', 'المزيد']]
    .filter(([t]) => !((t === 'finance' && !can('finance')) || (t === 'staff' && !can('staff'))));
  if (!navTabs.some(([t]) => t === state.tab)) { state.tab = navTabs[0][0]; state.stack = []; }
  if (parent && state.tab === 'pReq' && !top) markSeen('req');
  const badges = parent ? parentBadges() : { home: Cloud.role ? pendingRequests().length : 0 };
  $('.bottom-nav').innerHTML = navTabs.map(([t, ico, label]) => `<button data-tab="${t}" class="${t === state.tab ? 'active' : ''}"><span>${ico}</span>${label}${badges[t] ? `<b class="nav-badge">${num(badges[t])}</b>` : ''}</button>`).join('');
  renderSync(); renderGate();
  $('#backBtn').classList.toggle('hidden', !top);
  $('#nurseryName').textContent = settings().name;
  let html, title = parent ? (PARENT_TABS.find((x) => x[0] === state.tab) || [])[2] : TITLES[state.tab];
  if (top) { const v = VIEWS[top.view](top); html = v.html; title = v.title; }
  else if (parent && parentLocked() && state.tab !== 'pMore') html = viewPLocked();
  else html = (parent ? PARENT_VIEWS : TABS)[state.tab]();
  $('#pageTitle').textContent = title;
  $('#view').innerHTML = html;
  syncReminders();
}

// ================== الرئيسية ==================
function todaySchedule() {
  const di = DAY_INDEX[new Date().getDay()];
  const sch = [getSchedule('general'), ...D.classes.map((k) => getSchedule(k.id))].find((s) => s.slots.length);
  if (!sch) return `<div class="card"><div class="section-title" style="margin:0"><h3>📅 الجدول الأسبوعي</h3><button class="btn small primary" data-action="goSchedule">جداول مقترحة</button></div></div>`;
  const label = sch.id === 'general' ? 'الجدول العام' : className(sch.id);
  const body = di === undefined ? '<div class="empty">النهارده إجازة 🌴</div>'
    : sch.slots.filter((s) => s.cells[di]).map((s) => `<div class="sched-mini"><span>${esc(s.time)}</span><b>${esc(s.cells[di])}</b></div>`).join('');
  return `<div class="card"><div class="section-title" style="margin:0 0 8px"><h3>📅 جدول النهارده (${esc(label)})</h3><button class="btn small" data-action="goSchedule">الجدول</button></div>
    ${sch.theme ? `<div class="badge purple" style="margin-bottom:8px">موضوع الأسبوع: ${esc(sch.theme)}</div>` : ''}${body}</div>`;
}

function viewHome() {
  const kids = activeChildren(), m = thisMonth(), t = today(), s = settings();
  const present = kids.filter((c) => { const a = attOf(t, c.id); return a && a.status !== 'absent'; }).length;
  const marked = kids.filter((c) => attOf(t, c.id)).length;
  const staff = activeStaff(), staffPresent = staff.filter((x) => { const a = staffAttOf(t, x.id); return a && ['present', 'late'].includes(a.status); }).length;
  const inc = incomeIn(m), exp = expensesIn(m);
  const unpaid = kids.filter((c) => ['unpaid', 'partial'].includes(monthStatus(c, m).key));
  const totalDue = sum(kids, childBalance);
  const bdays = kids.filter((c) => c.birthDate && c.birthDate.slice(5, 7) === m.slice(5, 7)).sort((a, b) => a.birthDate.slice(8).localeCompare(b.birthDate.slice(8)));
  const recentNotes = [...D.notes].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 3);
  const h = new Date().getHours();

  return `
  ${iosBanner()}
  <div class="brand-card">
    <img src="img/logo-192.png" alt="">
    <div><div class="greet">${h < 12 ? 'صباح الخير' : 'مساء الخير'} 🌸</div><div class="slogan">${esc(s.slogan)}</div><div class="sub">${dateLabel(t)}</div></div>
  </div>
  <div class="quick">
    <button data-action="goAttendance"><span>✅</span>الحضور</button>
    ${can('finance') ? `<button data-action="addPayment"><span>💵</span>تحصيل</button>
    <button data-action="addExpense"><span>🧾</span>مصروف</button>` : `<button data-action="addNote"><span>📝</span>ملاحظة</button>
    <button data-action="goDaily"><span>📋</span>التقرير</button>`}
    <button data-action="goMessages"><span>💬</span>رسائل</button>
  </div>
  <div class="stats">
    <div class="stat purple"><div class="label">الأطفال المسجلين</div><div class="value">${num(kids.length)}</div></div>
    <div class="stat blue"><div class="label">حضور الأطفال اليوم</div><div class="value">${num(present)} / ${num(kids.length)}</div>${marked < kids.length && kids.length ? `<div class="label">لم يُسجَّل: ${num(kids.length - marked)}</div>` : ''}</div>
    ${can('finance') ? `<div class="stat green"><div class="label">إيرادات ${monthLabel(m)}</div><div class="value">${money(inc)}</div></div>
    <div class="stat red"><div class="label">مصروفات ${monthLabel(m)}</div><div class="value">${money(exp)}</div></div>
    <div class="stat ${inc - exp >= 0 ? 'green' : 'red'}"><div class="label">صافي الربح هذا الشهر</div><div class="value">${money(inc - exp)}</div></div>
    <div class="stat red"><div class="label">إجمالي المتأخرات</div><div class="value">${money(totalDue)}</div></div>` : ''}
    ${staff.length ? `<div class="stat blue"><div class="label">العاملين الحاضرين</div><div class="value">${num(staffPresent)} / ${num(staff.length)}</div></div>` : ''}
    ${can('finance') ? `<div class="stat green"><div class="label">المتوقع تحصيله شهريًا</div><div class="value">${money(sum(kids, (c) => c.monthlyFee))}</div></div>` : ''}
  </div>

  ${Cloud.role && pendingRequests().length ? `<div class="card req-alert clickable" data-action="goRequests"><b>📨 ${num(pendingRequests().length)} طلب جديد من أولياء الأمور</b><div class="sub">${pendingRequests().slice(0, 3).map((r) => esc(`${(child(r.childId) || {}).name || r.childName || ''}: ${(REQUEST_TYPES[r.type] || {}).label || ''}`)).join(' · ')}</div></div>` : ''}
  ${(() => { const meds = activeChildren().filter((c) => activeMeds(c.id).length); return meds.length ? `<div class="alert">💊 أدوية النهارده: ${meds.map((c) => esc(c.name + ' (' + activeMeds(c.id).map((r) => r.medName + ' ' + (r.time || '')).join('، ') + ')')).join(' · ')}</div>` : ''; })()}
  ${obligationsCard()}
  ${todaySchedule()}

  ${can('finance') ? `<div class="section-title"><h3>لم يدفعوا اشتراك ${monthLabel(m)} (${num(unpaid.length)})</h3>${unpaid.length ? '<button class="btn small" data-action="goDues">عرض الكل</button>' : ''}</div>
  <div class="list">${unpaid.slice(0, 5).map((c) => childRow(c, `<span class="badge ${monthStatus(c, m).cls}">${money(monthStatus(c, m).remaining)}</span>`)).join('') || '<div class="empty">كل الأطفال دفعوا اشتراك الشهر 🎉</div>'}</div>` : ''}

  ${bdays.length ? `<div class="section-title"><h3>🎂 أعياد ميلاد هذا الشهر</h3></div>
  <div class="list">${bdays.map((c) => childRow(c, `<span class="badge blue">${num(+c.birthDate.slice(8))} ${shortMonth(m)}</span>`)).join('')}</div>` : ''}

  ${recentNotes.length ? `<div class="section-title"><h3>📝 آخر الملاحظات</h3></div>
  <div class="list">${recentNotes.map(noteRow).join('')}</div>` : ''}

  ${!D.children.length && can('manage') ? `<div class="card"><h3>أهلاً بك 👋</h3><p>ابدأ بإضافة الفصول من <b>المزيد ← الفصول</b>، ثم أضف الأطفال أو استوردهم من ملف إكسيل.</p>
  <div class="btn-row"><button class="btn primary" data-action="addChild">إضافة طفل</button><button class="btn" data-action="goImport">استيراد من إكسيل</button></div></div>` : ''}`;
}

function childRow(c, extra = '') {
  return `<div class="item clickable" data-action="openChild" data-id="${c.id}">
    ${avatar(c)}
    <div class="main"><div class="title">${esc(c.name)}</div><div class="sub">${esc(className(c.classId))}${c.birthDate ? ' · ' + age(c.birthDate) : ''}</div></div>
    ${extra}</div>`;
}

function noteRow(n) {
  const c = child(n.childId);
  const report = c && c.phone ? `<a class="btn small green" target="_blank" href="${waLink(c.phone, `السلام عليكم ولي أمر ${c.name} 🌸\nملاحظة ${n.kind} - ${dateLabel(n.date)}:\n${n.text}\n${settings().name}`)}">💬</a>` : '';
  return `<div class="item clickable" data-action="editNote" data-id="${n.id}">
    <div class="main"><div class="title">${c ? esc(c.name) : ''} <span class="badge ${n.kind === 'حادثة / إصابة' || n.kind === 'صحة' ? 'red' : 'blue'}">${esc(n.kind)}</span></div>
    <div class="sub">${dateLabel(n.date)}</div><div style="margin-top:4px;white-space:pre-wrap">${esc(n.text)}</div></div>${report}</div>`;
}

// ================== الأطفال ==================
function viewChildren() {
  const q = state.childSearch.trim();
  let list = D.children.filter((c) => (state.childStatus === 'active' ? c.active !== false : c.active === false));
  if (state.childClass) list = list.filter((c) => c.classId === state.childClass);
  if (q) list = list.filter((c) => [c.name, c.guardianName, c.phone].join(' ').includes(q));
  list.sort(byName);
  const m = thisMonth();
  return `
  <div class="toolbar">
    <input type="search" id="childSearch" placeholder="🔍 بحث بالاسم أو ولي الأمر أو التليفون" value="${esc(state.childSearch)}">
  </div>
  <div class="toolbar">
    <select id="childClass">${classOpts(state.childClass)}</select>
    <select id="childStatus"><option value="active" ${state.childStatus === 'active' ? 'selected' : ''}>المسجلين حاليًا</option><option value="left" ${state.childStatus === 'left' ? 'selected' : ''}>تركوا الحضانة</option></select>
    ${can('editChildren') ? '<button class="btn primary" data-action="addChild">+ طفل</button>' : ''}
  </div>
  <div class="list" id="childList">${list.map((c) => { const s = monthStatus(c, m); return childRow(c, c.active === false ? '<span class="badge gray">غير مسجل</span>' : can('finance') ? `<span class="badge ${s.cls}">${s.label}</span>` : ''); }).join('') || '<div class="empty">لا يوجد أطفال</div>'}</div>
  <p class="sub" style="text-align:center;color:var(--muted);font-size:12px">العدد: ${num(list.length)}${can('manage') ? ' · <a href="#" data-action="goImport">استيراد من إكسيل</a>' : ''}</p>`;
}

function viewChildProfile({ id }) {
  const c = child(id);
  if (!c) return { title: 'طفل', html: '<div class="empty">غير موجود</div>' };
  const m = thisMonth(), s = monthStatus(c, m), bal = childBalance(c);
  const pays = D.payments.filter((p) => p.childId === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const att = D.attendance.filter((a) => a.childId === id && a.date.startsWith(m));
  const notes = D.notes.filter((n) => n.childId === id).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const reminder = MESSAGE_TEMPLATES[0][1].replaceAll('{name}', c.name).replaceAll('{amount}', money(bal || s.remaining)).replaceAll('{nursery}', settings().name);
  return {
    title: c.name,
    html: `
    <div class="card">
      <div class="profile-head">${avatar(c, true)}<div>
        <h2>${esc(c.name)}</h2>
        <div class="sub">${esc(className(c.classId))}${c.gender ? ' · ' + esc(c.gender) : ''}${c.birthDate ? ' · ' + age(c.birthDate) : ''}</div>
        <div style="margin-top:6px">${c.active === false ? '<span class="badge gray">ترك الحضانة</span>' : can('finance') ? `<span class="badge ${s.cls}">اشتراك الشهر: ${s.label}</span>` : ''} ${bal && can('finance') ? `<span class="badge red">متأخرات: ${money(bal)}</span>` : ''}</div>
      </div></div>
      ${c.medical ? `<div class="alert">⚠️ ملاحظات صحية / حساسية: ${esc(c.medical)}</div>` : ''}
      ${!c.phone && can('editChildren') ? `<div class="alert">📞 مفيش رقم تليفون لولي الأمر — اضغط تعديل وضيفه عشان تقدر تبعت رسايل واتساب.</div>` : ''}
      <div class="btn-row" style="margin-top:12px">
        ${can('finance') ? `<button class="btn primary small" data-action="addPayment" data-child="${c.id}">💵 تحصيل</button>` : ''}
        <button class="btn small" data-action="addNote" data-child="${c.id}">📝 ملاحظة</button>
        <button class="btn small" data-action="awardNew" data-id="${c.id}">🏆 شهادة</button>
        ${c.phone ? `<a class="btn small green" href="tel:${esc(c.phone)}">📞 اتصال</a>
        <a class="btn small green" target="_blank" href="${waLink(c.phone, `السلام عليكم ولي أمر ${c.name}، `)}">💬 واتساب</a>` : ''}
        ${c.phone && (bal || s.remaining) && can('finance') ? `<a class="btn small danger" target="_blank" href="${waLink(c.phone, reminder)}">🔔 تذكير بالمصاريف</a>` : ''}
        ${can('editChildren') ? `<button class="btn small" data-action="editChild" data-id="${c.id}">✏️ تعديل</button>` : ''}
      </div>
    </div>
    ${parentSection(c)}
    ${evalOf(thisMonth(), c.id) || evalOf(addMonths(thisMonth(), -1), c.id) ? `<div class="card">${evalCardHTML(evalOf(thisMonth(), c.id) || evalOf(addMonths(thisMonth(), -1), c.id), c.name)}</div>` : ''}

    <div class="card"><h3>البيانات</h3><dl class="kv">
      ${kv('تاريخ الميلاد', c.birthDate ? dateLabel(c.birthDate) : '')}
      ${kv('ولي الأمر', [c.guardianName, c.guardianRelation && c.guardianName && `(${c.guardianRelation})`].filter(Boolean).join(' '))}
      ${kv('التليفون', c.phone)}${kv('تليفون آخر', c.phone2)}${kv('العنوان', c.address)}
      ${kv('تاريخ الالتحاق', c.enrollDate ? dateLabel(c.enrollDate) : '')}
      ${can('finance') ? kv('الاشتراك الشهري', c.monthlyFee ? money(c.monthlyFee) : '') : ''}
      ${kv('المسموح لهم بالاستلام', c.pickup)}${kv('ملاحظات', c.notes)}
      ${c.active === false ? kv('تاريخ الترك', c.leaveDate ? dateLabel(c.leaveDate) : '') : ''}
    </dl></div>

    <div class="card"><h3>حضور ${monthLabel(m)}</h3>
      <div class="btn-row"><span class="badge green">حاضر: ${num(att.filter((a) => a.status === 'present').length)}</span>
      <span class="badge orange">متأخر: ${num(att.filter((a) => a.status === 'late').length)}</span>
      <span class="badge red">غائب: ${num(att.filter((a) => a.status === 'absent').length)}</span></div>
    </div>

    ${can('finance') ? `<div class="section-title"><h3>المدفوعات (${num(pays.length)}) · الإجمالي ${money(sum(pays, (p) => p.amount))}</h3></div>
    <div class="list">${pays.map(paymentRow).join('') || '<div class="empty">لا توجد مدفوعات</div>'}</div>` : ''}

    <div class="section-title"><h3>سجل الملاحظات اليومية</h3><button class="btn small" data-action="addNote" data-child="${c.id}">+ ملاحظة</button></div>
    <div class="list">${notes.map(noteRow).join('') || '<div class="empty">لا توجد ملاحظات</div>'}</div>`,
  };
}
function kv(k, v) { return v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : ''; }

// ================== الحضور ==================
function attToggle(st, id, action, options) {
  return `<div class="att-toggle">${options.map((k) => `<button class="${k} ${st === k ? 'on' : ''}" data-action="${action}" data-id="${id}" data-st="${k}">${ATT_LABEL[k]}</button>`).join('')}</div>`;
}

function viewAttendance() {
  const d = state.attDate;
  let kids = activeChildren();
  if (state.attClass) kids = kids.filter((c) => c.classId === state.attClass);
  const counts = { present: 0, late: 0, absent: 0, none: 0 };
  kids.forEach((c) => { const a = attOf(d, c.id); counts[a ? a.status : 'none']++; });
  return `
  <div class="toolbar">
    <input type="date" id="attDate" value="${d}">
    <select id="attClass">${classOpts(state.attClass)}</select>
  </div>
  <div class="card" style="padding:10px 12px">
    <div style="font-weight:600;margin-bottom:6px">${dateLabel(d)}</div>
    <div class="btn-row"><span class="badge green">حاضر ${num(counts.present)}</span><span class="badge orange">متأخر ${num(counts.late)}</span>
    <span class="badge red">غائب ${num(counts.absent)}</span><span class="badge gray">لم يُسجَّل ${num(counts.none)}</span></div>
    <div class="btn-row" style="margin-top:10px"><button class="btn small green" data-action="allPresent">✔ الكل حاضر</button>
    <button class="btn small" data-action="shareAttendance">📤 مشاركة كشف اليوم</button>
    <button class="btn small primary" data-action="goDaily">📋 التقرير اليومي</button></div>
  </div>
  <div class="list">${kids.map((c) => {
    const a = attOf(d, c.id), st = a ? a.status : '';
    return `<div class="item">${avatar(c)}
      <div class="main"><div class="title">${esc(c.name)}${activeMeds(c.id, d).length ? ' 💊' : ''}${dayRequests(c.id, d).length ? ' 🧍' : ''}</div>
      <div class="sub">${a && a.checkIn ? `دخول ${a.checkIn}` : esc(className(c.classId))}${a && a.checkOut ? ` · خروج ${a.checkOut}` : ''}${a && a.excuse ? ` · بإذن: ${esc(a.excuse)}` : ''}</div>
      ${activeMeds(c.id, d).map((r) => `<div class="sub" style="color:var(--primary-dark)">💊 ${esc(r.medName)} ${esc(r.dose || '')} ${esc(r.time || '')}</div>`).join('')}
      ${dayRequests(c.id, d).map((r) => `<div class="sub" style="color:var(--purple)">${REQUEST_TYPES[r.type].icon} ${esc(r.type === 'pickup' ? 'هيستلمه: ' + r.person : 'خروج بدري ' + (r.time || ''))}</div>`).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
      ${attToggle(st, c.id, 'mark', ['present', 'late', 'absent'])}
      ${a && a.status !== 'absent' && !a.checkOut ? `<button class="btn small" data-action="checkout" data-id="${c.id}">🚪 تسجيل خروج</button>` : ''}
      </div></div>`;
  }).join('') || '<div class="empty">لا يوجد أطفال مسجلين</div>'}</div>`;
}

// ================== الحسابات ==================
function paymentRow(p) {
  const c = child(p.childId);
  return `<div class="item clickable" data-action="editPayment" data-id="${p.id}">
    <div class="main"><div class="title">${c ? esc(c.name) : 'طفل محذوف'}</div>
    <div class="sub">${PAYMENT_TYPES[p.type] || ''}${p.type === 'monthly' && p.month ? ' · ' + monthLabel(p.month) : ''} · ${dateLabel(p.date)} · ${esc(p.method || '')}${p.receiptNo ? ' · إيصال #' + num(p.receiptNo) : ''}</div></div>
    <div class="amount in">${money(p.amount)}</div></div>`;
}
function expenseRow(e) {
  const st = e.staffId ? staffById(e.staffId) : null;
  return `<div class="item clickable" data-action="editExpense" data-id="${e.id}">
    <div class="main"><div class="title">${esc(e.category)}${st ? ' - ' + esc(st.name) : ''}</div>
    <div class="sub">${dateLabel(e.date)}${e.note ? ' · ' + esc(e.note) : ''}</div></div>
    <div class="amount out">${money(e.amount)}</div></div>`;
}

function monthPicker() {
  return `<div class="toolbar" style="align-items:center">
    <button class="btn small" data-action="monthNav" data-k="-1">‹ السابق</button>
    <input type="month" id="monthPick" value="${state.month}" style="text-align:center">
    <button class="btn small" data-action="monthNav" data-k="1">التالي ›</button></div>`;
}

function viewFinance() {
  const m = state.month, t = state.finTab;
  const inc = incomeIn(m), exp = expensesIn(m);
  let body = '';
  if (t === 'payments') {
    const list = D.payments.filter((p) => (p.date || '').startsWith(m)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    body = `<div class="section-title"><h3>المقبوضات (${num(list.length)})</h3><button class="btn primary small" data-action="addPayment">+ تحصيل</button></div>
      <div class="list">${list.map(paymentRow).join('') || '<div class="empty">لا توجد مقبوضات في هذا الشهر</div>'}</div>`;
  } else if (t === 'expenses') {
    const list = D.expenses.filter((e) => (e.date || '').startsWith(m)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    body = `<div class="section-title"><h3>المصروفات (${num(list.length)})</h3><button class="btn primary small" data-action="addExpense">+ مصروف</button></div>
      <div class="list">${list.map(expenseRow).join('') || '<div class="empty">لا توجد مصروفات في هذا الشهر</div>'}</div>`;
  } else {
    let kids = activeChildren().filter((c) => Number(c.monthlyFee));
    if (state.duesClass) kids = kids.filter((c) => c.classId === state.duesClass);
    const rows = kids.map((c) => ({ c, s: monthStatus(c, m), bal: childBalance(c) }));
    const order = { unpaid: 0, partial: 1, paid: 2 };
    rows.sort((a, b) => order[a.s.key] - order[b.s.key] || b.bal - a.bal);
    const expected = sum(kids, (c) => c.monthlyFee), collected = sum(rows, (r) => Math.min(r.s.paid, Number(r.c.monthlyFee)));
    body = `<div class="card">
      <div class="bar-row"><div class="bar-label"><span>تم تحصيل ${money(collected)} من ${money(expected)}</span><b>${expected ? num(Math.round(collected / expected * 100)) : 0}٪</b></div>
      <div class="bar-track"><div class="bar-fill green" style="width:${expected ? Math.min(100, collected / expected * 100) : 0}%"></div></div></div>
      <div class="toolbar" style="margin:10px 0 0"><select id="duesClass">${classOpts(state.duesClass)}</select><button class="btn small" data-action="goMessages" data-target="unpaid">🔔 تذكير الكل</button></div></div>
      <div class="list">${rows.map(({ c, s, bal }) => `<div class="item">${avatar(c)}
        <div class="main clickable" data-action="openChild" data-id="${c.id}"><div class="title">${esc(c.name)}</div>
        <div class="sub">الاشتراك ${money(c.monthlyFee)} · مدفوع ${money(s.paid)}${bal ? ` · <b style="color:var(--red)">إجمالي المتأخر ${money(bal)}</b>` : ''}</div></div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="badge ${s.cls}">${s.label}</span>
        ${s.key !== 'paid' ? `<div class="btn-row"><button class="btn small primary" data-action="addPayment" data-child="${c.id}" data-month="${m}">تحصيل</button>
        ${c.phone ? `<a class="btn small green" target="_blank" href="${waLink(c.phone, `السلام عليكم ولي أمر ${c.name} 🌸\nنذكّر حضرتك باشتراك ${monthLabel(m)}: ${money(s.remaining)}${bal > s.remaining ? `\nإجمالي المستحق: ${money(bal)}` : ''}\nشكرًا لحضرتك\n${settings().name}`)}">🔔</a>` : ''}</div>` : ''}
        </div></div>`).join('') || '<div class="empty">لا يوجد أطفال باشتراك شهري</div>'}</div>`;
  }
  return `${monthPicker()}
  <div class="stats">
    <div class="stat green"><div class="label">الإيرادات</div><div class="value">${money(inc)}</div></div>
    <div class="stat red"><div class="label">المصروفات</div><div class="value">${money(exp)}</div></div>
    <div class="stat ${inc - exp >= 0 ? 'green' : 'red'}"><div class="label">الصافي</div><div class="value">${money(inc - exp)}</div></div>
  </div>
  <div class="tabs">
    <button class="${t === 'payments' ? 'active' : ''}" data-action="finTab" data-t="payments">المقبوضات</button>
    <button class="${t === 'expenses' ? 'active' : ''}" data-action="finTab" data-t="expenses">المصروفات</button>
    <button class="${t === 'dues' ? 'active' : ''}" data-action="finTab" data-t="dues">المستحقات</button>
  </div><div class="btn-row" style="margin-bottom:8px"><button class="btn small" data-action="goCash">🧮 ملخص خزنة النهارده</button></div>${body}`;
}

// ================== العاملين ==================
function viewStaffTab() {
  const t = state.staffTab;
  let body = '';
  if (t === 'list') {
    const staff = [...D.staff].sort((a, b) => (a.active === false) - (b.active === false) || byName(a, b));
    const totalSalaries = sum(activeStaff(), (s) => s.salary);
    body = `<div class="stats"><div class="stat purple"><div class="label">عدد العاملين</div><div class="value">${num(activeStaff().length)}</div></div>
      <div class="stat red"><div class="label">إجمالي الرواتب الشهرية</div><div class="value">${money(totalSalaries)}</div></div></div>
      <div class="section-title"><h3>فريق العمل</h3><button class="btn primary small" data-action="addStaff">+ موظف</button></div>
      <div class="list">${staff.map((s) => {
        const a = staffAttOf(today(), s.id);
        return `<div class="item clickable" data-action="openStaff" data-id="${s.id}">${avatar(s)}
          <div class="main"><div class="title">${esc(s.name)}</div><div class="sub">${esc(s.role || '')}${s.classId ? ' · ' + esc(className(s.classId)) : ''}${s.phone ? ' · ' + esc(s.phone) : ''}</div></div>
          ${s.active === false ? '<span class="badge gray">لا يعمل</span>' : a ? `<span class="badge ${{ present: 'green', late: 'orange', absent: 'red', leave: 'blue' }[a.status]}">${ATT_LABEL[a.status]}</span>` : ''}</div>`;
      }).join('') || '<div class="empty">لا يوجد عاملين. اضغط "+ موظف" للإضافة، أو استوردهم من إكسيل (المزيد ← استيراد)</div>'}</div>`;
  } else if (t === 'att') {
    const d = state.staffAttDate, staff = activeStaff();
    body = `<div class="toolbar"><input type="date" id="staffAttDate" value="${d}"><button class="btn small green" data-action="staffAllPresent">✔ الكل حاضر</button></div>
      <div class="list">${staff.map((s) => {
        const a = staffAttOf(d, s.id), st = a ? a.status : '';
        return `<div class="item">${avatar(s)}<div class="main"><div class="title">${esc(s.name)}</div>
          <div class="sub">${a && a.checkIn ? 'حضور ' + a.checkIn : esc(s.role || '')}${a && a.checkOut ? ' · انصراف ' + a.checkOut : ''}</div></div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">${attToggle(st, s.id, 'staffMark', ['present', 'late', 'absent', 'leave'])}
          ${a && ['present', 'late'].includes(a.status) && !a.checkOut ? `<button class="btn small" data-action="staffCheckout" data-id="${s.id}">🚪 انصراف</button>` : ''}</div></div>`;
      }).join('') || '<div class="empty">لا يوجد عاملين</div>'}</div>`;
  } else {
    const m = state.month, staff = activeStaff();
    const rows = staff.map((s) => ({ s, r: staffMonth(s, m) }));
    body = `${monthPicker()}
      <div class="stats"><div class="stat"><div class="label">صافي الرواتب</div><div class="value">${money(sum(rows, (x) => x.r.net))}</div></div>
      <div class="stat green"><div class="label">تم صرفه</div><div class="value">${money(sum(rows, (x) => x.r.paid))}</div></div>
      <div class="stat red"><div class="label">المتبقي</div><div class="value">${money(sum(rows, (x) => x.r.remaining))}</div></div></div>
      <div class="list">${rows.map(({ s, r }) => `<div class="item">${avatar(s)}
        <div class="main clickable" data-action="openStaff" data-id="${s.id}"><div class="title">${esc(s.name)}</div>
        <div class="sub">أساسي ${money(r.base)}${r.bonus ? ' + مكافآت ' + money(r.bonus) : ''}${r.deduction ? ' − خصم ' + money(r.deduction) : ''}${r.advance ? ' − سلف ' + money(r.advance) : ''} = <b>${money(r.net)}</b></div>
        <div class="sub">غياب ${num(r.absent)} · تأخير ${num(r.late)} · إجازة ${num(r.leave)}</div></div>
        ${r.remaining > 0 ? `<button class="btn small primary" data-action="paySalary" data-id="${s.id}" data-month="${m}">صرف ${money(r.remaining)}</button>` : r.net ? '<span class="badge green">تم الصرف</span>' : ''}</div>`).join('') || '<div class="empty">لا يوجد عاملين</div>'}</div>
      ${rows.length ? `<button class="btn block" style="margin-top:12px" data-action="printPayroll">🖨️ طباعة كشف رواتب ${monthLabel(m)}</button>` : ''}`;
  }
  return `<div class="tabs">
    <button class="${t === 'list' ? 'active' : ''}" data-action="staffTab" data-t="list">الفريق</button>
    <button class="${t === 'att' ? 'active' : ''}" data-action="staffTab" data-t="att">الحضور</button>
    <button class="${t === 'pay' ? 'active' : ''}" data-action="staffTab" data-t="pay">الرواتب</button>
  </div>${body}`;
}

function viewStaffProfile({ id }) {
  const s = staffById(id);
  if (!s) return { title: 'موظف', html: '<div class="empty">غير موجود</div>' };
  const m = state.month, r = staffMonth(s, m);
  const tx = D.staffTx.filter((t) => t.staffId === id).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const salaries = D.expenses.filter((e) => e.staffId === id && e.category === 'رواتب').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const docs = s.docs || [];
  const used = leaveUsed(s), annual = Number(s.annualLeave) || 0;
  const daily = r.base / 30;
  const autoAbs = D.staffTx.find((t) => t.staffId === id && t.month === m && t.auto === 'absence');
  return {
    title: s.name,
    html: `
    <div class="card">
      <div class="profile-head">${avatar(s, true)}<div>
        <h2>${esc(s.name)}</h2>
        <div class="sub">${esc(s.role || '')}${s.classId ? ' · ' + esc(className(s.classId)) : ''}</div>
        <div style="margin-top:6px">${s.active === false ? '<span class="badge gray">لا يعمل حاليًا</span>' : '<span class="badge green">يعمل</span>'}
        ${s.hireDate ? `<span class="badge blue">من ${dateLabel(s.hireDate)}</span>` : ''}</div>
      </div></div>
      <div class="btn-row" style="margin-top:12px">
        ${s.phone ? `<a class="btn small green" href="tel:${esc(s.phone)}">📞 اتصال</a><a class="btn small green" target="_blank" href="${waLink(s.phone, `السلام عليكم ${s.name}، `)}">💬 واتساب</a>` : ''}
        <button class="btn small" data-action="staffTx" data-id="${s.id}" data-type="advance">💸 سلفة</button>
        <button class="btn small" data-action="staffTx" data-id="${s.id}" data-type="bonus">🎁 مكافأة</button>
        <button class="btn small" data-action="staffTx" data-id="${s.id}" data-type="deduction">➖ خصم</button>
        <button class="btn small" data-action="staffTx" data-id="${s.id}" data-type="note">📝 ملاحظة / تقييم</button>
        <button class="btn small" data-action="editStaff" data-id="${s.id}">✏️ تعديل</button>
      </div>
    </div>

    ${monthPicker()}
    <div class="card"><h3>راتب ${monthLabel(m)}</h3>
      <dl class="kv"><dt>الراتب الأساسي</dt><dd>${money(r.base)}</dd><dt>مكافآت</dt><dd style="color:var(--green)">+ ${money(r.bonus)}</dd>
      <dt>خصومات</dt><dd style="color:var(--red)">− ${money(r.deduction)}</dd><dt>سلف</dt><dd style="color:var(--orange)">− ${money(r.advance)}</dd>
      <dt><b>الصافي</b></dt><dd><b>${money(r.net)}</b></dd><dt>تم صرفه</dt><dd>${money(r.paid)}</dd><dt>المتبقي</dt><dd><b style="color:var(--red)">${money(r.remaining)}</b></dd></dl>
      <div class="btn-row" style="margin-top:10px">
        <span class="badge green">حضور ${num(r.present)}</span><span class="badge orange">تأخير ${num(r.late)}</span>
        <span class="badge red">غياب ${num(r.absent)}</span><span class="badge blue">إجازة ${num(r.leave)}</span></div>
      <div class="btn-row" style="margin-top:10px">
        ${r.remaining > 0 ? `<button class="btn primary small" data-action="paySalary" data-id="${s.id}" data-month="${m}">💵 صرف ${money(r.remaining)}</button>` : ''}
        ${r.absent && r.base && !autoAbs ? `<button class="btn small danger" data-action="absenceDeduct" data-id="${s.id}">خصم ${num(r.absent)} يوم غياب (${money(Math.round(daily * r.absent))})</button>` : ''}
        <button class="btn small" data-action="salarySlip" data-id="${s.id}">🧾 كشف الراتب</button>
      </div>
    </div>

    <div class="card"><h3>الإجازات ${today().slice(0, 4)}</h3>
      ${annual ? `<div class="bar-row"><div class="bar-label"><span>استخدم ${num(used)} من ${num(annual)} يوم</span><b>المتبقي ${num(Math.max(0, annual - used))}</b></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, used / annual * 100)}%"></div></div></div>` : `<div class="sub">إجازات السنة: ${num(used)} يوم · حدد رصيد الإجازات السنوي من "تعديل"</div>`}
    </div>

    <div class="card"><h3>البيانات</h3><dl class="kv">
      ${kv('التليفون', s.phone)}${kv('تليفون للطوارئ', s.emergency)}${kv('الرقم القومي', s.nationalId)}
      ${kv('تاريخ الميلاد', s.birthDate ? dateLabel(s.birthDate) + ' (' + age(s.birthDate) + ')' : '')}${kv('العنوان', s.address)}
      ${kv('المؤهل', s.qualification)}${kv('مواعيد العمل', s.workHours)}${kv('الراتب', s.salary ? money(s.salary) : '')}${kv('ملاحظات', s.notes)}
    </dl>
      <h3 style="margin-top:12px">الأوراق المسلَّمة</h3>
      <div class="btn-row">${STAFF_DOCS.map((d) => `<span class="badge ${docs.includes(d) ? 'green' : 'gray'}">${docs.includes(d) ? '✔' : '✗'} ${d}</span>`).join('')}</div>
    </div>

    <div class="section-title"><h3>السلف والخصومات والمكافآت</h3></div>
    <div class="list">${tx.map((t) => `<div class="item clickable" data-action="editStaffTx" data-id="${t.id}">
      <div class="main"><div class="title"><span class="badge ${STAFF_TX[t.type][1]}">${STAFF_TX[t.type][0]}</span> ${esc(t.note || '')}</div>
      <div class="sub">${dateLabel(t.date)}${t.type !== 'note' ? ' · يُحسب على راتب ' + monthLabel(t.month) : ''}</div></div>
      ${t.type !== 'note' ? `<div class="amount ${t.type === 'bonus' ? 'in' : 'out'}">${money(t.amount)}</div>` : ''}</div>`).join('') || '<div class="empty">لا يوجد</div>'}</div>

    <div class="section-title"><h3>الرواتب المصروفة</h3></div>
    <div class="list">${salaries.map(expenseRow).join('') || '<div class="empty">لا يوجد</div>'}</div>`,
  };
}

// ================== الجدول الأسبوعي ==================
function viewSchedule() {
  const sch = getSchedule(state.schedClass), di = state.schedDay;
  const slots = sch.slots;
  return {
    title: 'الجدول الأسبوعي',
    html: `
    <div class="toolbar"><select id="schedClass"><option value="general" ${state.schedClass === 'general' ? 'selected' : ''}>الجدول العام (كل الفصول)</option>
      ${D.classes.map((k) => `<option value="${k.id}" ${state.schedClass === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></div>
    <div class="card">
      <div class="section-title" style="margin:0 0 6px"><h3>🌱 موضوع الأسبوع</h3><button class="btn small" data-action="goThemes">💡 مقترحات</button></div>
      <input id="schedTheme" placeholder="مثال: الألوان / قيمة التعاون" value="${esc(sch.theme || '')}">
      ${sch.themeIdeas ? `<div class="sub" style="margin-top:6px">💡 أفكار: ${esc(sch.themeIdeas)}</div>` : ''}
    </div>
    <div class="day-tabs">${DAYS.map((d, i) => `<button class="${i === di ? 'active' : ''}" data-action="schedDay" data-i="${i}">${d}</button>`).join('')}</div>
    <div class="list">${slots.map((s, i) => `<div class="item clickable sched-row" data-action="editSlot" data-i="${i}">
      <div class="time">${esc(s.time)}</div><div class="main"><div class="title">${esc(s.cells[di] || '—')}</div></div><span>✏️</span></div>`).join('')
      || `<div class="card empty">الجدول فاضي.<br>ابدأ بجدول جاهز من المقترحات وعدّل عليه براحتك 👇</div>`}</div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn primary" data-action="schedTemplates">📋 جداول مقترحة</button>
      <button class="btn" data-action="addSlot">+ فترة</button>
      ${slots.length ? `<button class="btn" data-action="weekTable">📅 الأسبوع كامل</button>
      <button class="btn" data-action="printSchedule">🖨️ طباعة</button>
      <button class="btn green" data-action="shareSchedule">💬 مشاركة جدول اليوم</button>` : ''}
    </div>`,
  };
}

function weekTableHTML(sch, title) {
  return `<div class="week-wrap"><h3 style="text-align:center">${esc(title)}</h3>${sch.theme ? `<p style="text-align:center">موضوع الأسبوع: <b>${esc(sch.theme)}</b></p>` : ''}
    <table class="week"><tr><th>الوقت</th>${DAYS.map((d) => `<th>${d}</th>`).join('')}</tr>
    ${sch.slots.map((s) => `<tr><td class="t">${esc(s.time)}</td>${DAYS.map((_, i) => `<td>${esc(s.cells[i] || '')}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

function viewThemes() {
  return {
    title: 'مواضيع مقترحة للأسابيع',
    html: `<p class="sub" style="color:var(--muted)">كل أسبوع اختار موضوع، واربط بيه الأنشطة والقصص والأناشيد. اضغط على الموضوع لتطبيقه على الجدول.</p>
    <div class="list">${WEEK_THEMES.map(([t, ideas], i) => `<div class="item clickable" data-action="pickTheme" data-i="${i}"><div class="main"><div class="title">${t}</div><div class="sub">${ideas}</div></div><span class="btn small">اختيار</span></div>`).join('')}</div>`,
  };
}

// ================== رسائل أولياء الأمور ==================
function msgRecipients() {
  let kids = activeChildren();
  if (state.msgTarget === 'unpaid') kids = kids.filter((c) => childBalance(c) > 0 || ['unpaid', 'partial'].includes(monthStatus(c, thisMonth()).key));
  else if (state.msgTarget !== 'all') kids = kids.filter((c) => c.classId === state.msgTarget);
  return kids;
}
function msgFor(c) {
  const amount = childBalance(c) || monthStatus(c, thisMonth()).remaining;
  return state.msgText.replaceAll('{name}', c.name).replaceAll('{amount}', money(amount)).replaceAll('{nursery}', settings().name);
}
function viewMessages() {
  if (!state.msgText) state.msgText = MESSAGE_TEMPLATES[state.msgTpl][1];
  const kids = msgRecipients(), withPhone = kids.filter((c) => c.phone), noPhone = kids.length - withPhone.length;
  return {
    title: 'رسائل أولياء الأمور',
    html: `<div class="card"><div class="form">
      <label class="full">نوع الرسالة<select id="msgTpl">${MESSAGE_TEMPLATES.map(([t], i) => `<option value="${i}" ${i === state.msgTpl ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label class="full">نص الرسالة (اكتب {name} مكان اسم الطفل و {amount} مكان المبلغ)<textarea id="msgText" rows="6">${esc(state.msgText)}</textarea></label>
      <label class="full">إرسال إلى<select id="msgTarget"><option value="all" ${state.msgTarget === 'all' ? 'selected' : ''}>كل أولياء الأمور</option>
        ${can('finance') ? `<option value="unpaid" ${state.msgTarget === 'unpaid' ? 'selected' : ''}>اللي عليهم مصاريف</option>` : ''}
        ${D.classes.map((k) => `<option value="${k.id}" ${state.msgTarget === k.id ? 'selected' : ''}>فصل ${esc(k.name)}</option>`).join('')}</select></label>
    </div></div>
    <p class="sub" style="color:var(--muted)">اضغط "إرسال" جنب كل اسم، هيفتح الواتساب والرسالة جاهزة باسم الطفل. ${noPhone ? `<b style="color:var(--red)">${num(noPhone)} طفل بدون رقم تليفون</b> — ضيف الأرقام من صفحة كل طفل، أو مرة واحدة من ملف إكسيل فيه عمود "اسم الطالب" وعمود "التليفون" (المزيد ← استيراد من إكسيل).` : ''}</p>
    <div class="list">${withPhone.map((c) => `<div class="item">${avatar(c)}<div class="main"><div class="title">${esc(c.name)}</div><div class="sub">${esc(c.guardianName || '')} ${esc(c.phone)}</div></div>
      <button class="btn small ${state.msgSent[c.id] ? '' : 'green'}" data-action="sendMsg" data-id="${c.id}">${state.msgSent[c.id] ? '✔ اتبعت' : '💬 إرسال'}</button></div>`).join('') || '<div class="empty">لا يوجد أولياء أمور بأرقام تليفون في هذه القائمة</div>'}</div>
    <button class="btn block" style="margin-top:10px" data-action="copyMsg">📋 مشاركة الرسالة العامة (لجروب الواتساب)</button>`,
  };
}

// ================== استيراد إكسيل ==================
const IMPORT_TYPES = {
  children: { label: 'الأطفال', fields: [
    ['guardianName', 'اسم ولي الأمر', ['ولي', 'والد', 'الأب', 'الام', 'الأم']], ['birthDate', 'تاريخ الميلاد', ['ميلاد']], ['enrollDate', 'تاريخ الالتحاق', ['التحاق', 'الالتحاق']],
    ['className', 'الفصل', ['فصل', 'مجموعة', 'class', 'مستوى']], ['phone2', 'تليفون آخر', ['آخر', 'اخر']], ['phone', 'التليفون', ['تليفون', 'موبايل', 'هاتف', 'رقم', 'phone', 'تلفون']],
    ['monthlyFee', 'المصاريف الشهرية', ['مصاريف', 'اشتراك', 'رسوم', 'شهري', 'المبلغ', 'مبلغ']], ['name', 'اسم الطفل *', ['اسم', 'الطالب', 'الطفل', 'name']],
    ['gender', 'النوع', ['نوع', 'جنس', 'gender']], ['address', 'العنوان', ['عنوان', 'سكن']], ['medical', 'ملاحظات صحية', ['صحي', 'حساسية', 'مرض']], ['notes', 'ملاحظات', ['ملاحظ']],
  ] },
  staff: { label: 'العاملين', fields: [
    ['hireDate', 'تاريخ التعيين', ['تعيين']], ['nationalId', 'الرقم القومي', ['قومي', 'بطاقة']], ['phone', 'التليفون', ['تليفون', 'موبايل', 'هاتف', 'رقم']],
    ['salary', 'الراتب', ['راتب', 'مرتب', 'أجر']], ['role', 'الوظيفة', ['وظيفة', 'مسمى', 'الوظيفه']], ['qualification', 'المؤهل', ['مؤهل']],
    ['name', 'الاسم *', ['اسم', 'name']], ['address', 'العنوان', ['عنوان']],
  ] },
  expenses: { label: 'المصروفات', fields: [
    ['date', 'التاريخ', ['تاريخ', 'date']], ['category', 'البند', ['بند', 'نوع', 'صنف']], ['amount', 'المبلغ *', ['مبلغ', 'قيمة', 'المبلغ']], ['note', 'البيان', ['بيان', 'ملاحظ', 'وصف', 'تفاصيل']],
  ] },
  payments: { label: 'مدفوعات الأطفال', fields: [
    ['name', 'اسم الطفل *', ['اسم', 'الطالب', 'الطفل']], ['amount', 'المبلغ *', ['مبلغ', 'مدفوع', 'قيمة', 'مصاريف']], ['date', 'تاريخ الدفع', ['تاريخ']],
    ['month', 'عن شهر', ['شهر']], ['method', 'طريقة الدفع', ['طريقة']],
  ] },
};

function impSheet() { const im = state.imp; return im.sheets ? im.sheets[im.sheetIdx] : null; }
function impHeaderRow(sheet) { const i = sheet.rows.findIndex((r) => r && r.some((x) => x !== null && x !== '')); return Math.max(0, i); }
function autoMap() {
  const sheet = impSheet(); if (!sheet) return;
  const hdr = (sheet.rows[impHeaderRow(sheet)] || []).map((h) => String(h ?? '').trim().toLowerCase());
  const used = new Set(), map = {};
  for (const [key, , kws] of IMPORT_TYPES[state.imp.type].fields) {
    const idx = hdr.findIndex((h, i) => h && !used.has(i) && kws.some((k) => h.includes(k.toLowerCase())));
    if (idx >= 0) { map[key] = idx; used.add(idx); }
  }
  // لو مفيش عمود اسم واضح، أول عمود فاضل
  if (map.name === undefined && IMPORT_TYPES[state.imp.type].fields.some((f) => f[0] === 'name')) {
    const i = hdr.findIndex((h, k) => h && !used.has(k)); if (i >= 0) map.name = i;
  }
  state.imp.map = map;
}
function impDataRows() {
  const sheet = impSheet(); if (!sheet) return [];
  const hi = impHeaderRow(sheet);
  return sheet.rows.slice(hi + 1).filter((r) => r && r.some((x) => x !== null && x !== ''));
}
const SKIP_ROW = /إجمالي|الاجمالي|المجموع|total/i;

function viewImport() {
  const im = state.imp, def = IMPORT_TYPES[im.type], sheet = impSheet();
  let body = '';
  if (sheet) {
    const hdr = sheet.rows[impHeaderRow(sheet)] || [];
    const colOpts = (sel) => `<option value="">— مش موجود —</option>${hdr.map((h, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${esc(h ?? 'عمود ' + (i + 1))}</option>`).join('')}`;
    const rows = impDataRows();
    const shown = def.fields.filter(([k]) => im.map[k] !== undefined);
    body = `
    ${im.sheets.length > 1 ? `<div class="toolbar"><select id="impSheet">${im.sheets.map((s, i) => `<option value="${i}" ${i === im.sheetIdx ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>` : ''}
    <div class="card"><h3>ربط الأعمدة (${num(rows.length)} صف في الملف)</h3>
      <p class="sub" style="color:var(--muted)">التطبيق اختار الأعمدة تلقائيًا، راجعها وعدّل لو لازم.</p>
      <div class="form">${def.fields.map(([k, label]) => `<label>${label}<select data-map="${k}">${colOpts(im.map[k])}</select></label>`).join('')}</div>
    </div>
    <div class="card"><h3>معاينة أول ٥ صفوف</h3><div style="overflow-x:auto"><table class="week"><tr>${shown.map(([, l]) => `<th>${l}</th>`).join('')}</tr>
      ${rows.slice(0, 5).map((r) => `<tr>${shown.map(([k]) => `<td>${esc(r[im.map[k]] ?? '')}</td>`).join('')}</tr>`).join('')}</table></div></div>
    <button class="btn primary block" data-action="runImport">⬆️ استيراد ${def.label} الآن</button>`;
  }
  return {
    title: 'استيراد من إكسيل',
    html: `<div class="card"><div class="form">
      <label class="full">نوع البيانات<select id="impType">${Object.entries(IMPORT_TYPES).map(([k, v]) => `<option value="${k}" ${k === im.type ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
      <div class="actions"><button class="btn primary" data-action="pickExcel">📂 اختيار ملف إكسيل</button><button class="btn" data-action="excelTemplate">⬇️ نموذج فاضي</button></div>
    </div>
    ${im.fileName ? `<div class="sub" style="margin-top:8px">الملف: <b>${esc(im.fileName)}</b></div>` : '<p class="sub" style="color:var(--muted)">يقبل ملفات ‎.xlsx‎ و ‎.csv‎. أول صف في الشيت لازم يكون عناوين الأعمدة (زي: اسم الطالب، المصاريف، التليفون...). الطفل أو الموظف اللي اسمه موجود بالفعل بيتحدّث بدل ما يتكرر.</p>'}
    </div>
    ${im.result ? `<div class="card" style="border:2px solid var(--green)"><h3>✅ تم الاستيراد</h3>${im.result}</div>` : ''}
    ${body}`,
  };
}

async function runImport() {
  const im = state.imp, rows = impDataRows(), map = im.map;
  const get = (r, k) => (map[k] === undefined ? '' : r[map[k]]);
  const str = (v) => (v === null || v === undefined ? '' : String(v).trim());
  const phone = (v) => { let p = str(v).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s/g, ''); if (/^1\d{9}$/.test(p)) p = '0' + p; return p; };
  let added = 0, updated = 0, skipped = 0;
  const notFound = [];
  if (['children', 'staff', 'payments'].includes(im.type) && map.name === undefined) { toast('اختار عمود الاسم'); return; }
  if (['expenses', 'payments'].includes(im.type) && map.amount === undefined) { toast('اختار عمود المبلغ'); return; }

  for (const r of rows) {
    const name = str(get(r, 'name'));
    const patch = {};
    const setIf = (k, v) => { if (v !== '' && v !== null && v !== undefined) patch[k] = v; };
    if (im.type === 'children') {
      if (!name || SKIP_ROW.test(name)) { skipped++; continue; }
      const old = D.children.find((c) => c.name.trim() === name);
      setIf('monthlyFee', toNum(get(r, 'monthlyFee')));
      setIf('phone', phone(get(r, 'phone'))); setIf('phone2', phone(get(r, 'phone2')));
      setIf('guardianName', str(get(r, 'guardianName'))); setIf('address', str(get(r, 'address')));
      setIf('medical', str(get(r, 'medical'))); setIf('notes', str(get(r, 'notes')));
      setIf('birthDate', XLSX.excelDate(get(r, 'birthDate'))); setIf('enrollDate', XLSX.excelDate(get(r, 'enrollDate')));
      const g = str(get(r, 'gender')); if (/ذكر|ولد|^m/i.test(g)) patch.gender = 'ولد'; else if (/أنثى|انثى|بنت|^f/i.test(g)) patch.gender = 'بنت';
      const cn = str(get(r, 'className'));
      if (cn) { let k = D.classes.find((x) => x.name.trim() === cn); if (!k) { k = { id: uid(), name: cn }; await save('classes', k); } patch.classId = k.id; }
      if (old) { await save('children', { ...old, ...patch }); updated++; }
      else { await save('children', { id: uid(), name, active: true, createdAt: today(), enrollDate: `${thisMonth()}-01`, classId: '', ...patch }); added++; }
    } else if (im.type === 'staff') {
      if (!name || SKIP_ROW.test(name)) { skipped++; continue; }
      const old = D.staff.find((s) => s.name.trim() === name);
      setIf('salary', toNum(get(r, 'salary'))); setIf('phone', phone(get(r, 'phone'))); setIf('role', str(get(r, 'role')));
      setIf('nationalId', str(get(r, 'nationalId'))); setIf('qualification', str(get(r, 'qualification'))); setIf('address', str(get(r, 'address')));
      setIf('hireDate', XLSX.excelDate(get(r, 'hireDate')));
      if (old) { await save('staff', { ...old, ...patch }); updated++; } else { await save('staff', { id: uid(), name, active: true, annualLeave: 21, ...patch }); added++; }
    } else if (im.type === 'expenses') {
      const amount = toNum(get(r, 'amount')), note = str(get(r, 'note')), cat = str(get(r, 'category'));
      if (!(amount > 0) || SKIP_ROW.test(note + cat + str(get(r, 'date')))) { skipped++; continue; }
      await save('expenses', { id: uid(), date: XLSX.excelDate(get(r, 'date')) || today(), category: EXPENSE_CATEGORIES.find((c) => cat && (c.includes(cat) || cat.includes(c))) || cat || 'أخرى', amount, note });
      added++;
    } else if (im.type === 'payments') {
      const amount = toNum(get(r, 'amount'));
      if (!name || SKIP_ROW.test(name) || !(amount > 0)) { skipped++; continue; }
      const c = D.children.find((x) => x.name.trim() === name);
      if (!c) { notFound.push(name); continue; }
      const date = XLSX.excelDate(get(r, 'date')) || today();
      const mv = str(get(r, 'month'));
      const month = /^\d{4}-\d{2}$/.test(mv) ? mv : (XLSX.excelDate(get(r, 'month')) || date).slice(0, 7);
      const receiptNo = Math.max(0, ...D.payments.map((x) => x.receiptNo || 0)) + 1;
      await save('payments', { id: uid(), childId: c.id, type: 'monthly', month, amount, date, method: str(get(r, 'method')) || 'نقدي', receiptNo });
      added++;
    }
  }
  im.result = `<p>تمت إضافة <b>${num(added)}</b>${updated ? ` وتحديث <b>${num(updated)}</b>` : ''}${skipped ? ` · تم تجاهل ${num(skipped)} صف (فاضي أو إجمالي)` : ''}.</p>
    ${notFound.length ? `<p style="color:var(--red)">أسماء غير موجودة في الأطفال (${num(notFound.length)}): ${esc(notFound.slice(0, 10).join('، '))}</p>` : ''}`;
  im.sheets = null; im.fileName = '';
  toast('تم الاستيراد ✅'); render(); window.scrollTo(0, 0);
}

async function readExcelFile(file) {
  try {
    const isCSV = /\.csv$/i.test(file.name) || file.type === 'text/csv';
    const book = isCSV ? XLSX.readCSV(await file.text()) : await XLSX.read(await file.arrayBuffer());
    if (!book.sheets.length) throw new Error('الملف فاضي');
    Object.assign(state.imp, { sheets: book.sheets, sheetIdx: 0, fileName: file.name, result: null });
    autoMap(); render();
  } catch (e) { alert('تعذر قراءة الملف: ' + (e.message || e)); }
}

// ---------- تصدير إكسيل ----------
function saveBlob(name, blob) {
  if (window.Android && window.Android.saveBase64) {
    const r = new FileReader();
    r.onload = () => window.Android.saveBase64(name, blob.type || 'application/octet-stream', String(r.result).split(',')[1]);
    r.readAsDataURL(blob);
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('تم تحميل الملف ✅');
}

function exportExcel() {
  const m = thisMonth(), kids = [...D.children].sort(byName);
  const dues = activeChildren().map((c) => { const s = monthStatus(c, m); return [c.name, className(c.classId), Number(c.monthlyFee) || 0, s.paid, s.remaining, childBalance(c), s.label]; });
  const sheets = [
    { name: 'الأطفال', rows: [['الاسم', 'الفصل', 'النوع', 'تاريخ الميلاد', 'السن', 'ولي الأمر', 'التليفون', 'تليفون آخر', 'العنوان', 'المصاريف الشهرية', 'تاريخ الالتحاق', 'الحالة', 'ملاحظات صحية'],
      ...kids.map((c) => [c.name, className(c.classId), c.gender || '', c.birthDate || '', age(c.birthDate), c.guardianName || '', c.phone || '', c.phone2 || '', c.address || '', Number(c.monthlyFee) || 0, c.enrollDate || '', c.active === false ? 'ترك' : 'مسجل', c.medical || ''])] },
    { name: `مستحقات ${m}`, rows: [['الاسم', 'الفصل', 'الاشتراك', 'المدفوع هذا الشهر', 'المتبقي هذا الشهر', 'إجمالي المتأخرات', 'الحالة'], ...dues,
      ['الإجمالي', '', sum(dues, (r) => r[2]), sum(dues, (r) => r[3]), sum(dues, (r) => r[4]), sum(dues, (r) => r[5]), '']] },
    { name: 'المدفوعات', rows: [['رقم الإيصال', 'التاريخ', 'الطفل', 'النوع', 'عن شهر', 'المبلغ', 'طريقة الدفع', 'ملاحظة'],
      ...[...D.payments].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((p) => [p.receiptNo || '', p.date, (child(p.childId) || {}).name || '', PAYMENT_TYPES[p.type] || '', p.type === 'monthly' ? p.month : '', Number(p.amount), p.method || '', p.note || ''])] },
    { name: 'المصروفات', rows: [['التاريخ', 'البند', 'المبلغ', 'الموظف', 'البيان'],
      ...[...D.expenses].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((e) => [e.date, e.category, Number(e.amount), (staffById(e.staffId) || {}).name || '', e.note || ''])] },
    { name: 'العاملين', rows: [['الاسم', 'الوظيفة', 'التليفون', 'الراتب', 'تاريخ التعيين', 'الرقم القومي', 'المؤهل', 'العنوان', 'الحالة'],
      ...[...D.staff].sort(byName).map((s) => [s.name, s.role || '', s.phone || '', Number(s.salary) || 0, s.hireDate || '', s.nationalId || '', s.qualification || '', s.address || '', s.active === false ? 'لا يعمل' : 'يعمل'])] },
    { name: `رواتب ${m}`, rows: [['الاسم', 'الأساسي', 'مكافآت', 'خصومات', 'سلف', 'الصافي', 'تم صرفه', 'المتبقي', 'أيام الغياب', 'أيام التأخير', 'الإجازات'],
      ...activeStaff().map((s) => { const r = staffMonth(s, m); return [s.name, r.base, r.bonus, r.deduction, r.advance, r.net, r.paid, r.remaining, r.absent, r.late, r.leave]; })] },
    { name: `حضور ${m}`, rows: [['الطفل', 'الفصل', 'حاضر', 'متأخر', 'غائب'],
      ...activeChildren().map((c) => { const a = D.attendance.filter((x) => x.childId === c.id && x.date.startsWith(m)); return [c.name, className(c.classId), a.filter((x) => x.status === 'present').length, a.filter((x) => x.status === 'late').length, a.filter((x) => x.status === 'absent').length]; })] },
  ];
  saveBlob(`baraem-${today()}.xlsx`, XLSX.write(sheets));
}

// ================== شاشات أخرى ==================
function accountCard() {
  if (!Cloud.ready) return '';
  if (!Cloud.user) {
    return `<div class="card sync-card"><h3>☁️ المزامنة بين الموبايلات</h3><p class="sub">سجّل دخول عشان البيانات تتحفظ على السيرفر وتشتغلوا كلكم على نفس البيانات من أكتر من موبايل.</p>
      <button class="btn primary" data-action="showLogin">🔑 تسجيل الدخول</button></div>`;
  }
  return `<div class="card sync-card"><div class="profile-head"><div class="avatar">👤</div><div><div class="title"><b>${esc(Cloud.name || Cloud.email)}</b></div>
    <div class="sub">${esc(Cloud.email)} · ${esc(ROLES[Cloud.role] || '')}</div><div class="sub">${syncLabel()}</div></div></div>
    <div class="btn-row" style="margin-top:10px">${can('manage') && Cloud.role ? '<button class="btn small primary" data-action="goMembers">👥 المستخدمين والصلاحيات</button>' : ''}
    ${notifyButton()}<button class="btn small" data-action="logout">🚪 تسجيل خروج</button></div></div>`;
}

function viewMore() {
  const items = [
    ['📋', 'التقرير اليومي', 'أكل، نوم، مزاج، نشاط — بيوصل لولي الأمر', 'goDaily'],
    ['📊', 'التقييم الشهري', 'تقييم كل طفل بالنجوم + كلمة المعلمة', 'goEvals'],
    ['🏆', 'الشهادات ونجم الأسبوع', 'شهادات تقدير بتوصل لولي الأمر صورة', 'goAwards'],
    ['🧮', 'ملخص الخزنة اليومي', 'مقبوضات اليوم بطريقة الدفع والمصروفات', 'goCash'],
    ['📚', 'منصة التمارين', 'التمارين والاشتراكات ومتابعة الأطفال', 'goHomework'],
    ['📅', 'الجدول الأسبوعي', 'جدول اليوم والأسبوع + مقترحات جاهزة', 'goSchedule'],
    ['📌', 'الالتزامات الشهرية', 'الإيجار والمرتبات والمرافق + تنبيهات', 'goObligations'],
    ['🏫', 'الفصول / المجموعات', `${num(D.classes.length)} فصل`, 'goClasses'],
    ['📨', 'طلبات أولياء الأمور', `${num(pendingRequests().length)} طلب جديد`, 'goRequests'],
    ['📢', 'إعلانات لأولياء الأمور', 'تظهر في تطبيق الأهالي مع إشعار', 'goAnn'],
    ['👨‍👩‍👧', 'حسابات أولياء الأمور', 'عمل حسابات لكل الأهالي مرة واحدة', 'bulkParents'],
    ['💬', 'رسائل أولياء الأمور (واتساب)', 'تذكير، إجازة، رحلة، اجتماع...', 'goMessages'],
    ['📊', 'التقارير', 'الإيرادات والمصروفات والحضور', 'goReports'],
    ['📝', 'الملاحظات اليومية', `${num(D.notes.length)} ملاحظة`, 'goNotes'],
    ['📥', 'استيراد من إكسيل', 'أطفال، عاملين، مصروفات، مدفوعات', 'goImport'],
    ['📤', 'تصدير إكسيل', 'كل البيانات في ملف إكسيل منظم', 'exportExcel'],
    ['🏠', 'عن الحضانة', 'بيانات الحضانة ومشاركتها', 'goAbout'],
    ['⚙️', 'الإعدادات', 'اسم الحضانة والتليفون والعنوان', 'goSettings'],
    ['⬇️', 'تصدير نسخة احتياطية', 'احفظ ملف البيانات في مكان آمن', 'exportData'],
    ['⬆️', 'استيراد نسخة احتياطية', 'استرجاع البيانات من ملف', 'importData'],
  ];
  const allowed = {
    goReports: can('finance'), goImport: can('manage'), exportExcel: can('finance'), goSettings: can('manage'),
    exportData: can('manage'), importData: can('manage'), goRequests: !!Cloud.role, goAnn: !!Cloud.role, goCash: can('finance'), goHomework: !!Cloud.role, goObligations: can('manage') || can('finance'), bulkParents: !!Cloud.role && can('manage'), goClasses: can('manage') || Cloud.role === 'teacher' || Cloud.role === 'accountant',
  };
  const shown = items.filter(([, , , a]) => allowed[a] !== false);
  return `${accountCard()}<div class="list menu-list">${shown.map(([ico, t, s, a]) => `<div class="item clickable" data-action="${a}"><div class="ico">${ico}</div><div class="main"><div class="title">${t}</div><div class="sub">${s}</div></div><span>‹</span></div>`).join('')}</div>
  <p style="text-align:center;color:var(--muted);font-size:12px;margin-top:20px">${Cloud.role ? 'البيانات محفوظة على الموبايل وعلى السيرفر ☁️' : 'كل البيانات محفوظة على هذا الجهاز فقط.<br>اعمل نسخة احتياطية بانتظام 🔒'}</p>`;
}

function viewClasses() {
  return {
    title: 'الفصول',
    html: `<div class="section-title"><h3>الفصول (${num(D.classes.length)})</h3>${can('manage') ? '<button class="btn primary small" data-action="addClass">+ فصل</button>' : ''}</div>
    <div class="list">${D.classes.map((k) => {
      const n = activeChildren().filter((c) => c.classId === k.id).length;
      const t = k.teacherId ? staffById(k.teacherId) : null;
      return `<div class="item ${can('manage') ? 'clickable' : ''}" data-action="${can('manage') ? 'editClass' : ''}" data-id="${k.id}"><div class="avatar">🏫</div><div class="main"><div class="title">${esc(k.name)}</div>
      <div class="sub">${t ? 'المعلمة: ' + esc(t.name) + ' · ' : ''}${k.ageRange ? esc(k.ageRange) + ' · ' : ''}${k.capacity ? `${num(n)} / ${num(k.capacity)} طفل` : `${num(n)} طفل`}</div></div></div>`;
    }).join('') || '<div class="empty">لا توجد فصول. أضف فصلًا مثل: بيبي كلاس، Pre-KG، KG1، KG2</div>'}</div>
    ${D.classes.length && can('editChildren') ? `<button class="btn block" style="margin-top:12px" data-action="assignClasses">👶 توزيع الأطفال على الفصول</button>` : ''}`,
  };
}

function viewAssign() {
  const kids = activeChildren();
  return {
    title: 'توزيع الأطفال على الفصول',
    html: `<p class="sub" style="color:var(--muted)">اختار فصل كل طفل، والحفظ تلقائي.</p>
    <div class="list">${kids.map((c) => `<div class="item">${avatar(c)}<div class="main"><div class="title">${esc(c.name)}</div></div>
      <select data-assign="${c.id}" style="width:auto;min-width:120px">${classOpts(c.classId, 'بدون فصل')}</select></div>`).join('')}</div>`,
  };
}

function viewNotes() {
  const notes = [...D.notes].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  return { title: 'الملاحظات اليومية', html: `<div class="section-title"><h3>الملاحظات (${num(notes.length)})</h3><button class="btn primary small" data-action="addNote">+ ملاحظة</button></div><div class="list">${notes.map(noteRow).join('') || '<div class="empty">لا توجد ملاحظات</div>'}</div>` };
}

function reportData(m) {
  const inc = incomeIn(m), exp = expensesIn(m);
  const byCat = {};
  D.expenses.filter((e) => (e.date || '').startsWith(m)).forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0); });
  const byType = {};
  D.payments.filter((p) => (p.date || '').startsWith(m)).forEach((p) => { const k = PAYMENT_TYPES[p.type] || 'أخرى'; byType[k] = (byType[k] || 0) + Number(p.amount || 0); });
  const att = D.attendance.filter((a) => a.date.startsWith(m));
  const presentRate = att.length ? Math.round(att.filter((a) => a.status !== 'absent').length / att.length * 100) : null;
  const newKids = D.children.filter((c) => (c.enrollDate || '').startsWith(m)).length;
  const leftKids = D.children.filter((c) => c.active === false && (c.leaveDate || '').startsWith(m)).length;
  return { inc, exp, byCat, byType, presentRate, newKids, leftKids };
}

function bars(obj, color) {
  const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return entries.length ? `<div class="bars">${entries.map(([k, v]) => `<div class="bar-row"><div class="bar-label"><span>${esc(k)}</span><b>${money(v)}</b></div><div class="bar-track"><div class="bar-fill ${color}" style="width:${v / max * 100}%"></div></div></div>`).join('')}</div>` : '<div class="empty">لا توجد بيانات</div>';
}

function viewReports() {
  const m = state.month, r = reportData(m);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5));
  const series = months.map((mm) => ({ m: mm, inc: incomeIn(mm), exp: expensesIn(mm) }));
  const max = Math.max(1, ...series.flatMap((s) => [s.inc, s.exp]));
  return {
    title: 'التقارير',
    html: `${monthPicker()}
    <div class="stats">
      <div class="stat green"><div class="label">الإيرادات</div><div class="value">${money(r.inc)}</div></div>
      <div class="stat red"><div class="label">المصروفات</div><div class="value">${money(r.exp)}</div></div>
      <div class="stat ${r.inc - r.exp >= 0 ? 'green' : 'red'}"><div class="label">صافي الربح</div><div class="value">${money(r.inc - r.exp)}</div></div>
      <div class="stat blue"><div class="label">نسبة الحضور</div><div class="value">${r.presentRate === null ? '—' : num(r.presentRate) + '٪'}</div></div>
      <div class="stat purple"><div class="label">أطفال جدد</div><div class="value">${num(r.newKids)}</div></div>
      <div class="stat"><div class="label">تركوا الحضانة</div><div class="value">${num(r.leftKids)}</div></div>
    </div>
    <div class="card"><h3>آخر ٦ شهور</h3>
      <div class="chart">${series.map((s) => `<div class="col"><div class="pair"><div style="height:${s.inc / max * 100}%;background:var(--green)" title="${money(s.inc)}"></div><div style="height:${s.exp / max * 100}%;background:var(--red)" title="${money(s.exp)}"></div></div><div class="lbl">${shortMonth(s.m)}</div></div>`).join('')}</div>
      <div class="legend"><span><i style="background:var(--green)"></i>إيرادات</span><span><i style="background:var(--red)"></i>مصروفات</span></div>
    </div>
    ${referralsCard()}
    <div class="card"><h3>الإيرادات حسب النوع</h3>${bars(r.byType, 'green')}</div>
    <div class="card"><h3>المصروفات حسب البند</h3>${bars(r.byCat, 'red')}</div>
    <div class="btn-row"><button class="btn primary" data-action="printReport">🖨️ طباعة تقرير ${monthLabel(m)}</button><button class="btn" data-action="exportExcel">📤 تصدير إكسيل</button></div>`,
  };
}

function aboutText() {
  const s = settings();
  return `🌱 ${s.name}\n${s.slogan}\n\n👶 نستقبل الأطفال ${s.minAge}\n❤️ تربية واهتمام\n📖 تعليم متميز\n🎨 أنشطة فنية ويدوية\n🏡 بيئة آمنة ومحفزة\n🌿 غرس القيم والأخلاق\n\n📍 ${s.address}\n📞 ${s.phone}`;
}
function viewAbout() {
  const s = settings();
  return {
    title: 'عن الحضانة',
    html: `<img src="img/banner.jpg" alt="" class="banner">
    <div class="card" style="text-align:center"><img src="img/logo-192.png" alt="" style="width:110px">
      <h2 style="margin:6px 0">${esc(s.name)}</h2><div class="slogan">${esc(s.slogan)}</div>
      <p>📍 ${esc(s.address)}</p><p>📞 <a href="tel:${esc(s.phone)}">${esc(s.phone)}</a> · 👶 ${esc(s.minAge)}</p>
      <div class="btn-row" style="justify-content:center"><button class="btn green" data-action="shareAbout">💬 مشاركة بيانات الحضانة</button><button class="btn" data-action="goSettings">✏️ تعديل</button></div>
    </div>`,
  };
}

function viewSettings() {
  const s = settings();
  return {
    title: 'الإعدادات',
    html: `<div class="card"><div class="form">
      <label class="full">اسم الحضانة<input id="sName" value="${esc(s.name)}"></label>
      <label class="full">الشعار<input id="sSlogan" value="${esc(s.slogan)}"></label>
      <label>التليفون<input id="sPhone" type="tel" value="${esc(s.phone)}"></label>
      <label>العملة<input id="sCurrency" value="${esc(s.currency)}"></label>
      <label class="full">العنوان<input id="sAddress" value="${esc(s.address)}"></label>
      <label>السن المقبول<input id="sMinAge" value="${esc(s.minAge)}"></label>
      <label>رسوم التسجيل الافتراضية<input id="sRegFee" type="number" value="${esc(s.regFee)}"></label>
      <label>رقم إنستاباي<input id="sInsta" type="tel" dir="ltr" value="${esc(s.instapay || '')}"></label>
      <label>باقات الاشتراك<button type="button" class="btn small" data-action="goPlans">🎟️ ${esc(plans().map((p) => p.name + ' ' + num(p.price)).join(' · '))}</button></label>
      <label class="full">طرق دفع تانية (تظهر لأولياء الأمور)<textarea id="sPayInfo" rows="2" placeholder="مثال: فودافون كاش 010xxxxxxx · إنستاباي ...">${esc(s.payInfo || '')}</textarea></label>
      <div class="actions"><button class="btn primary" data-action="saveSettings">حفظ</button></div>
    </div></div>
    <div class="card"><h3>🔔 الإشعارات</h3><button class="btn" data-action="testNotify">جرّب إشعار على الموبايل ده</button></div>
    <div class="card"><h3>البيانات</h3>
      <div class="btn-row"><button class="btn" data-action="exportData">⬇️ تصدير نسخة احتياطية</button><button class="btn" data-action="importData">⬆️ استيراد</button>
      <button class="btn" data-action="exportExcel">📤 تصدير إكسيل</button>
      ${Cloud.role ? '' : '<button class="btn danger" data-action="wipeData">🗑️ مسح كل البيانات</button>'}</div></div>`,
  };
}

function viewMembers() {
  const ms = state.members;
  return {
    title: 'المستخدمين والصلاحيات',
    html: `<div class="card"><h3>الصلاحيات</h3><dl class="kv">
      <dt>👑 ${ROLES.owner} / ${ROLES.admin}</dt><dd>كل حاجة</dd>
      <dt>💰 ${ROLES.accountant}</dt><dd>الأطفال، الحسابات، العاملين والرواتب، الحضور</dd>
      <dt>👩‍🏫 ${ROLES.teacher}</dt><dd>الحضور، الملاحظات اليومية، الجدول، الرسائل — من غير الفلوس</dd></dl></div>
    <div class="section-title"><h3>المستخدمين</h3><button class="btn primary small" data-action="addMember">+ مستخدم</button></div>
    <div class="list"><div class="item"><div class="avatar">👑</div><div class="main"><div class="title">${esc(Cloud.role === 'owner' ? Cloud.email : 'صاحبة الحضانة')}</div><div class="sub">${ROLES.owner}</div></div></div>
    ${!ms ? '<div class="empty">جاري التحميل...</div>' : ms.filter((m) => m.role !== 'parent').map((m) => `<div class="item clickable" data-action="editMember" data-email="${esc(m.email)}"><div class="avatar">${esc(initials(m.name || m.email))}</div>
      <div class="main"><div class="title">${esc(m.name || m.email)}</div><div class="sub">${esc(m.email)} · ${esc(ROLES[m.role] || m.role)}</div></div><span>✏️</span></div>`).join('') || '<div class="empty">لسه مفيش مستخدمين. ضيف المعلمات والمحاسب عشان يدخلوا من موبايلاتهم.</div>'}</div>
    ${ms && ms.some((m) => m.role === 'parent') ? `<div class="section-title"><h3>👨‍👩‍👧 أولياء الأمور (${num(ms.filter((m) => m.role === 'parent').length)})</h3></div>
    <div class="list">${ms.filter((m) => m.role === 'parent').map((m) => `<div class="item"><div class="avatar">👨‍👩‍👧</div><div class="main"><div class="title">${esc(m.name || '')}</div>
      <div class="sub">${esc(m.phone || '')} · ${esc((m.childIds || []).map((id) => (child(id) || {}).name || '').filter(Boolean).join('، '))}</div></div></div>`).join('')}</div>` : ''}`,
  };
}
async function loadMembers() {
  state.members = null; render();
  try { state.members = await Cloud.listMembers(); } catch (e) { state.members = []; toast(authMsg(e)); }
  render();
}
function memberForm(m) {
  const isNew = !m; m = m || { role: 'teacher' };
  openForm({
    title: isNew ? 'مستخدم جديد' : 'تعديل مستخدم', data: m,
    intro: isNew ? '<p class="sub" style="color:var(--muted)">هيتعمل حساب بالإيميل والباسورد دول. ابعتهم للشخص ده عشان يسجل دخول من موبايله.</p>' : '',
    fields: [
      { name: 'name', label: 'الاسم', required: true, full: true },
      ...(isNew ? [{ name: 'email', label: 'الإيميل', type: 'email', required: true, full: true }, { name: 'password', label: 'الباسورد (٦ حروف أو أرقام على الأقل)', full: true }] : []),
      { name: 'role', label: 'الصلاحية', type: 'select', options: [['teacher', ROLES.teacher], ['accountant', ROLES.accountant], ['admin', ROLES.admin]], full: true },
    ],
    onSave: async (v) => {
      if (isNew && v.password && v.password.length < 6) { toast('الباسورد لازم ٦ حروف أو أرقام على الأقل'); return false; }
      try { await Cloud.addMember({ ...m, ...v, email: v.email || m.email, password: isNew ? v.password : '' }); }
      catch (e) { toast(authMsg(e)); return false; }
      toast('تم الحفظ ✅'); loadMembers();
    },
    onDelete: isNew ? null : async () => { await Cloud.removeMember(m.email); loadMembers(); },
    deleteLabel: 'إلغاء الحساب',
  });
}

// ---------- شاشة الدخول ----------
function syncLabel() {
  return { synced: '✅ متزامن مع السيرفر', pending: '⏳ في تغييرات هتترفع حالًا', offline: '📴 مفيش إنترنت — التغييرات هتترفع لما النت يرجع', connecting: '🔄 جاري الاتصال...', error: '⚠️ ' + esc(Cloud.error), local: '' }[Cloud.status] || '';
}
function renderSync() {
  const dot = $('#syncDot'); if (!dot) return;
  const map = { synced: ['☁️', 'متزامن'], pending: ['⏳', 'جاري الرفع'], offline: ['📴', 'بدون إنترنت'], connecting: ['🔄', 'جاري الاتصال'], error: ['⚠️', 'خطأ'] };
  const v = Cloud.role || Cloud.status === 'connecting' || Cloud.status === 'error' ? map[Cloud.status] : null;
  dot.classList.toggle('hidden', !v);
  if (v) { dot.textContent = v[0]; dot.title = v[1]; }
}
function renderGate() {
  const g = $('#gate');
  const skip = LS.get('skipLogin') === '1' && !state.forceLogin;
  let html = '';
  if (Cloud.ready && Cloud.status === 'noaccess') {
    html = `<h2>⛔ الحساب لسه ما اتضافش</h2><p>حسابك (${esc(Cloud.email)}) مش متضاف في قائمة المستخدمين.<br>اطلب من المديرة تضيفك من: المزيد ← المستخدمين والصلاحيات.</p>
      <button class="btn primary block" data-action="logout">تسجيل خروج</button>`;
  } else if (Cloud.ready && Cloud.status === 'connecting' && Cloud.user && !Cloud.role) {
    html = `<h2>🔄 جاري الاتصال بالسيرفر</h2><p>${esc(Cloud.error || 'لحظة واحدة...')}</p>`;
  } else if (Cloud.ready && !Cloud.user && !skip && Cloud.status !== 'connecting') {
    html = `${IS_IOS && !IS_STANDALONE ? iosInstallHTML() : ''}<form id="loginForm" class="form" style="grid-template-columns:1fr">
      <label>الإيميل أو رقم الموبايل (لأولياء الأمور)<input type="text" id="lEmail" autocomplete="username" inputmode="email" dir="ltr" required></label>
      <label>الباسورد<input type="password" id="lPass" autocomplete="current-password" required></label>
      <div id="lErr" class="alert hidden"></div>
      <button class="btn primary block" type="submit">دخول</button>
      <button class="btn block" type="button" data-action="forgotPass">نسيت الباسورد</button>
      <button class="btn block" type="button" data-action="skipLogin" style="background:#f3f3f3;color:#666">استخدام بدون حساب (على الموبايل ده بس)</button></form>`;
  } else if (Cloud.status === 'error' && Cloud.user && !Cloud.role) {
    html = `<h2>⚠️ مشكلة في الاتصال</h2><p>${esc(Cloud.error)}</p><button class="btn primary block" data-action="retry">حاول تاني</button><button class="btn block" data-action="logout">تسجيل خروج</button>`;
  }
  g.classList.toggle('hidden', !html);
  if (html && g.dataset.html !== html) {
    g.dataset.html = html;
    g.querySelector('.gate-body').innerHTML = html;
    const f = $('#loginForm');
    if (f) f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#lErr'); err.classList.add('hidden');
      try { await Cloud.login($('#lEmail').value, $('#lPass').value); state.forceLogin = false; LS.del('skipLogin'); }
      catch (x) { err.textContent = authMsg(x); err.classList.remove('hidden'); }
    });
  }
  if (!html) g.dataset.html = '';
}

const TABS = { home: viewHome, children: viewChildren, attendance: viewAttendance, finance: viewFinance, staff: viewStaffTab, more: viewMore };
const VIEWS = { child: viewChildProfile, staffProfile: viewStaffProfile, classes: viewClasses, assign: viewAssign, reports: viewReports, settings: viewSettings, notes: viewNotes, schedule: viewSchedule, themes: viewThemes, messages: viewMessages, import: viewImport, about: viewAbout, members: viewMembers, requests: viewRequests, announcements: viewAnnouncements, bulkParents: viewBulkParents, daily: viewDaily, homework: viewHomework, obligations: viewObligations, plans: viewPlans, evals: viewEvals, awards: viewAwards, cashday: viewCashDay };

// ================== النماذج ==================
function openModal(title, html) { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; if (pendingRender) { pendingRender = false; render(); } }

function field(f, v) {
  const val = v ?? f.value ?? '';
  const full = f.full ? ' full' : '';
  if (f.type === 'select') {
    return `<label class="${full}">${f.label}<select name="${f.name}">${f.options.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'textarea') return `<label class="${full}">${f.label}<textarea name="${f.name}" rows="${f.rows || 2}">${esc(val)}</textarea></label>`;
  if (f.type === 'photo') {
    return `<label class="full">${f.label}<div class="photo-pick"><div class="avatar big" id="photoPreview">${val ? `<img src="${val}">` : '📷'}</div>
      <input type="file" accept="image/*" id="photoInput"><input type="hidden" name="${f.name}" value="${esc(val)}"></div></label>`;
  }
  if (f.type === 'checkbox') return `<label class="${full}" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="${f.name}" style="width:auto" ${val ? 'checked' : ''}>${f.label}</label>`;
  if (f.type === 'checks') {
    const arr = Array.isArray(val) ? val : [];
    return `<div class="full checks"><div class="lbl">${f.label}</div>${f.options.map((o) => `<label><input type="checkbox" name="${f.name}" value="${esc(o)}" ${arr.includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>`;
  }
  const list = f.list ? ` list="dl_${f.name}"` : '';
  return `<label class="${full}">${f.label}<input type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}"${list}${f.step ? ` step="${f.step}"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}>${f.list ? `<datalist id="dl_${f.name}">${f.list.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}</label>`;
}

function openForm({ title, fields, data = {}, onSave, onDelete, deleteLabel = 'حذف', intro = '' }) {
  openModal(title, `${intro}<form class="form" id="mform">${fields.map((f) => field(f, data[f.name])).join('')}
    <div class="actions"><button type="submit" class="btn primary">حفظ</button>${onDelete ? `<button type="button" class="btn danger" id="mdelete">${deleteLabel}</button>` : ''}</div></form>`);
  const form = $('#mform');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = {};
    fields.forEach((f) => {
      if (f.type === 'checks') { out[f.name] = Array.from(form.querySelectorAll(`input[name="${f.name}"]:checked`)).map((x) => x.value); return; }
      const el = form.elements[f.name];
      if (!el) return;
      out[f.name] = f.type === 'checkbox' ? el.checked : f.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value.trim();
    });
    for (const f of fields) if (f.required && (out[f.name] === '' || out[f.name] == null)) { toast(`من فضلك أدخل: ${f.label}`); return; }
    const ok = await onSave(out);
    if (ok !== false) { closeModal(); render(); }
  });
  if (onDelete) $('#mdelete').addEventListener('click', async () => { if (confirm('تأكيد الحذف؟')) { await onDelete(); closeModal(); render(); } });
  const pi = $('#photoInput');
  if (pi) pi.addEventListener('change', () => resizeImage(pi.files[0]).then((url) => { form.elements.photo.value = url; $('#photoPreview').innerHTML = `<img src="${url}">`; }));
}

function resizeImage(file, max = 360) {
  return new Promise((resolve, reject) => {
    if (!file) return reject();
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject; img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

const classOptions = () => [['', 'بدون فصل'], ...D.classes.map((k) => [k.id, k.name])];
const childOptions = () => activeChildren().map((c) => [c.id, c.name]);

function childForm(c) {
  const isNew = !c;
  c = c || { enrollDate: today(), gender: '', active: true, classId: state.childClass || '' };
  openForm({
    title: isNew ? 'طفل جديد' : 'تعديل بيانات الطفل',
    data: { ...c, active: c.active !== false },
    fields: [
      { name: 'photo', label: 'صورة الطفل', type: 'photo' },
      { name: 'name', label: 'اسم الطفل', required: true, full: true },
      { name: 'birthDate', label: 'تاريخ الميلاد', type: 'date' },
      { name: 'gender', label: 'النوع', type: 'select', options: [['', '—'], ['ولد', 'ولد'], ['بنت', 'بنت']] },
      { name: 'classId', label: 'الفصل', type: 'select', options: classOptions() },
      { name: 'enrollDate', label: 'تاريخ الالتحاق', type: 'date' },
      { name: 'monthlyFee', label: 'المصاريف الشهرية', type: 'number' },
      { name: 'guardianRelation', label: 'صلة ولي الأمر', type: 'select', options: [['الأب', 'الأب'], ['الأم', 'الأم'], ['الجد/الجدة', 'الجد/الجدة'], ['أخرى', 'أخرى']] },
      { name: 'guardianName', label: 'اسم ولي الأمر', full: true },
      { name: 'phone', label: 'تليفون ولي الأمر (واتساب)', type: 'tel' },
      { name: 'phone2', label: 'تليفون آخر', type: 'tel' },
      { name: 'address', label: 'العنوان', full: true },
      { name: 'medical', label: 'ملاحظات صحية / حساسية / أدوية', type: 'textarea', full: true },
      { name: 'pickup', label: 'الأشخاص المسموح لهم باستلام الطفل', type: 'textarea', full: true },
      { name: 'notes', label: 'ملاحظات أخرى', type: 'textarea', full: true },
      { name: 'referredBy', label: '🎁 جاي بترشيح من ولي أمر (اختياري)', type: 'select', options: [['', '—'], ...activeChildren().filter((x) => x.id !== c.id).map((x) => [x.id, x.name])], full: true },
      ...(isNew ? [] : [{ name: 'active', label: 'مسجل حاليًا في الحضانة', type: 'checkbox', full: true }, { name: 'leaveDate', label: 'تاريخ الترك (لو ترك)', type: 'date', full: true }]),
    ],
    onSave: async (v) => {
      const obj = { ...c, ...v, id: c.id || uid(), createdAt: c.createdAt || today() };
      if (isNew) obj.active = true;
      if (obj.active === false && !obj.leaveDate) obj.leaveDate = today();
      if (obj.active) obj.leaveDate = '';
      await save('children', obj);
      toast('تم الحفظ ✅');
      if (isNew && settings().regFee && confirm(`تسجيل رسوم التسجيل (${money(settings().regFee)}) الآن؟`)) {
        setTimeout(() => paymentForm(null, { childId: obj.id, type: 'registration', amount: settings().regFee }), 50);
      }
    },
    onDelete: isNew ? null : async () => {
      await remove('children', c.id);
      for (const a of D.attendance.filter((x) => x.childId === c.id)) await remove('attendance', a.id);
      for (const n of D.notes.filter((x) => x.childId === c.id)) await remove('notes', n.id);
      state.stack = state.stack.filter((s) => !(s.view === 'child' && s.id === c.id));
      toast('تم حذف الطفل (المدفوعات السابقة محفوظة في الحسابات)');
    },
  });
}

function paymentForm(p, preset = {}) {
  const isNew = !p;
  if (!childOptions().length && isNew) { toast('أضف طفلًا أولاً'); return; }
  const base = p || { date: today(), type: 'monthly', month: thisMonth(), method: 'نقدي', ...preset };
  if (isNew && base.childId && base.type === 'monthly' && preset.amount == null) {
    const c = child(base.childId); const st = monthStatus(c, base.month); base.amount = st.remaining || c.monthlyFee || '';
  }
  const opts = childOptions();
  if (p && !opts.find(([id]) => id === p.childId) && child(p.childId)) opts.push([p.childId, child(p.childId).name]);
  openForm({
    title: isNew ? 'تحصيل مبلغ' : 'تعديل دفعة',
    data: base,
    fields: [
      { name: 'childId', label: 'الطفل', type: 'select', options: opts, full: true },
      { name: 'type', label: 'نوع الدفعة', type: 'select', options: Object.entries(PAYMENT_TYPES) },
      { name: 'month', label: 'عن شهر', type: 'month' },
      { name: 'amount', label: 'المبلغ', type: 'number', required: true, step: 'any' },
      { name: 'date', label: 'تاريخ الدفع', type: 'date', required: true },
      { name: 'method', label: 'طريقة الدفع', type: 'select', options: PAYMENT_METHODS.map((x) => [x, x]), full: true },
      { name: 'note', label: 'ملاحظة', full: true },
    ],
    onSave: async (v) => {
      if (!(v.amount > 0)) { toast('أدخل مبلغًا صحيحًا'); return false; }
      const receiptNo = p?.receiptNo || (Math.max(0, ...D.payments.map((x) => x.receiptNo || 0)) + 1);
      const obj = { ...base, ...v, id: base.id || uid(), receiptNo };
      await save('payments', obj);
      toast('تم تسجيل الدفعة ✅');
      if (isNew && confirm('طباعة / إرسال إيصال؟')) setTimeout(() => receipt(obj), 50);
    },
    onDelete: isNew ? null : async () => { await remove('payments', p.id); },
  });
  // ملء المبلغ تلقائيًا عند تغيير الطفل أو الشهر
  const form = $('#mform');
  const auto = () => {
    if (!isNew || form.elements.type.value !== 'monthly') return;
    const c = child(form.elements.childId.value); if (!c) return;
    const st = monthStatus(c, form.elements.month.value || thisMonth()); form.elements.amount.value = st.remaining || c.monthlyFee || '';
  };
  form.elements.childId.addEventListener('change', auto);
  form.elements.month.addEventListener('change', auto);
  if (isNew && !base.childId) auto();
}

function printHeader() {
  const s = settings();
  return `<div class="print-head"><img src="img/logo-192.png" alt=""><div><h2>${esc(s.name)}</h2><div>${esc(s.slogan)}</div><div class="small">${esc(s.address)} · ${esc(s.phone)}</div></div></div>`;
}

function receipt(p) {
  const c = child(p.childId) || { name: '' }, s = settings();
  const html = `<div class="receipt">${printHeader()}
    <div class="center" style="margin-top:8px"><b>إيصال استلام نقدية رقم ${num(p.receiptNo)}</b></div>
    <table><tr><td>التاريخ</td><td>${dateLabel(p.date)}</td></tr><tr><td>اسم الطفل</td><td>${esc(c.name)}</td></tr>
    <tr><td>البيان</td><td>${PAYMENT_TYPES[p.type] || ''}${p.type === 'monthly' ? ' - ' + monthLabel(p.month) : ''}${p.note ? ' - ' + esc(p.note) : ''}</td></tr>
    <tr><td>طريقة الدفع</td><td>${esc(p.method || '')}</td></tr><tr class="total"><td>المبلغ</td><td>${money(p.amount)}</td></tr></table>
    <p style="margin-top:30px">توقيع المستلم: ....................</p></div>`;
  const text = `🌱 ${s.name}\nإيصال رقم ${p.receiptNo}\nالتاريخ: ${dateLabel(p.date)}\nالطفل: ${c.name}\nالبيان: ${PAYMENT_TYPES[p.type]}${p.type === 'monthly' ? ' - ' + monthLabel(p.month) : ''}\nالمبلغ: ${money(p.amount)}\nشكرًا لحضرتك 🌸`;
  openModal('إيصال', `${html}<div class="btn-row" style="margin-top:14px"><button class="btn primary" data-action="doPrint">🖨️ طباعة</button>
    ${c.phone ? `<a class="btn green" target="_blank" href="${waLink(c.phone, text)}">💬 إرسال واتساب</a>` : ''}</div>`);
  $('#printArea').innerHTML = html;
}

function doPrint() {
  if (window.Android && window.Android.print) window.Android.print(); else window.print();
}
function printHTML(html) { $('#printArea').innerHTML = html; doPrint(); }

function expenseForm(e, preset = {}) {
  const isNew = !e;
  const base = e || { date: today(), category: EXPENSE_CATEGORIES[0], ...preset };
  openForm({
    title: isNew ? 'إضافة مصروف' : 'تعديل مصروف',
    data: base,
    fields: [
      { name: 'category', label: 'البند', type: 'select', options: EXPENSE_CATEGORIES.map((x) => [x, x]) },
      { name: 'amount', label: 'المبلغ', type: 'number', required: true, step: 'any' },
      { name: 'date', label: 'التاريخ', type: 'date', required: true },
      { name: 'note', label: 'البيان / ملاحظة', full: true },
    ],
    onSave: async (v) => {
      if (!(v.amount > 0)) { toast('أدخل مبلغًا صحيحًا'); return false; }
      await save('expenses', { ...base, ...v, id: base.id || uid() }); toast('تم الحفظ ✅');
    },
    onDelete: isNew ? null : async () => {
      if (base.txId) await remove('staffTx', base.txId);
      await remove('expenses', e.id);
    },
  });
}

function classForm(k) {
  const isNew = !k; k = k || {};
  openForm({
    title: isNew ? 'فصل جديد' : 'تعديل فصل', data: k,
    fields: [
      { name: 'name', label: 'اسم الفصل', required: true, full: true, list: ['بيبي كلاس', 'Pre-KG', 'KG1', 'KG2'] },
      { name: 'ageRange', label: 'الفئة العمرية', list: ['من ٢ لـ ٣ سنين', 'من ٣ لـ ٤ سنين', 'من ٤ لـ ٥ سنين', 'من ٥ لـ ٦ سنين'] },
      { name: 'capacity', label: 'السعة (عدد الأطفال)', type: 'number' },
      { name: 'teacherId', label: 'المعلمة المسؤولة', type: 'select', options: [['', '—'], ...activeStaff().map((s) => [s.id, s.name])], full: true },
    ],
    onSave: async (v) => { await save('classes', { ...k, ...v, id: k.id || uid() }); toast('تم الحفظ ✅'); },
    onDelete: isNew ? null : async () => {
      for (const c of D.children.filter((x) => x.classId === k.id)) await save('children', { ...c, classId: '' });
      await remove('classes', k.id);
    },
  });
}

function staffForm(s) {
  const isNew = !s; s = s || { hireDate: today(), role: STAFF_ROLES[1], active: true, annualLeave: 21 };
  openForm({
    title: isNew ? 'موظف جديد' : 'تعديل بيانات الموظف', data: { ...s, active: s.active !== false },
    fields: [
      { name: 'photo', label: 'الصورة', type: 'photo' },
      { name: 'name', label: 'الاسم', required: true, full: true },
      { name: 'role', label: 'الوظيفة', type: 'select', options: STAFF_ROLES.map((x) => [x, x]) },
      { name: 'classId', label: 'الفصل المسؤول عنه', type: 'select', options: classOptions() },
      { name: 'salary', label: 'الراتب الشهري', type: 'number' },
      { name: 'hireDate', label: 'تاريخ التعيين', type: 'date' },
      { name: 'phone', label: 'التليفون', type: 'tel' },
      { name: 'emergency', label: 'تليفون للطوارئ', type: 'tel' },
      { name: 'nationalId', label: 'الرقم القومي' },
      { name: 'birthDate', label: 'تاريخ الميلاد', type: 'date' },
      { name: 'qualification', label: 'المؤهل', full: true, list: ['بكالوريوس تربية', 'بكالوريوس رياض أطفال', 'ليسانس آداب', 'دبلوم', 'مؤهل متوسط', 'بدون'] },
      { name: 'address', label: 'العنوان', full: true },
      { name: 'workHours', label: 'مواعيد العمل', placeholder: 'مثال: من ٨ص لـ ٢ظ' },
      { name: 'annualLeave', label: 'رصيد الإجازات السنوي (يوم)', type: 'number' },
      { name: 'docs', label: 'الأوراق المسلَّمة', type: 'checks', options: STAFF_DOCS },
      { name: 'notes', label: 'ملاحظات', type: 'textarea', full: true },
      ...(isNew ? [] : [{ name: 'active', label: 'يعمل حاليًا', type: 'checkbox', full: true }]),
    ],
    onSave: async (v) => { await save('staff', { ...s, ...v, id: s.id || uid(), active: isNew ? true : v.active }); toast('تم الحفظ ✅'); },
    onDelete: isNew ? null : async () => { await remove('staff', s.id); state.stack = state.stack.filter((x) => !(x.view === 'staffProfile' && x.id === s.id)); },
  });
}

function staffTxForm(t, preset = {}) {
  const isNew = !t;
  const base = t || { date: today(), month: state.month, ...preset };
  const s = staffById(base.staffId);
  const isNote = base.type === 'note';
  openForm({
    title: `${STAFF_TX[base.type][0]} - ${s ? s.name : ''}`, data: base,
    intro: base.type === 'advance' && isNew ? '<p class="sub" style="color:var(--muted)">السلفة بتتسجل كمصروف دلوقتي، وبتتخصم من راتب الشهر اللي تختاره.</p>' : '',
    fields: [
      ...(isNote ? [] : [{ name: 'amount', label: 'المبلغ', type: 'number', required: true, step: 'any' }, { name: 'month', label: base.type === 'bonus' ? 'تُضاف على راتب شهر' : 'تُخصم من راتب شهر', type: 'month' }]),
      { name: 'date', label: 'التاريخ', type: 'date' },
      { name: 'note', label: isNote ? 'الملاحظة / التقييم' : 'السبب / ملاحظة', type: isNote ? 'textarea' : 'text', rows: 4, full: true, required: isNote },
    ],
    onSave: async (v) => {
      if (!isNote && !(v.amount > 0)) { toast('أدخل مبلغًا صحيحًا'); return false; }
      const obj = { ...base, ...v, id: base.id || uid() };
      if (isNote) obj.month = (obj.date || today()).slice(0, 7);
      await save('staffTx', obj);
      if (obj.type === 'advance') {
        const ex = D.expenses.find((e) => e.txId === obj.id);
        await save('expenses', { ...(ex || {}), id: ex ? ex.id : uid(), txId: obj.id, staffId: obj.staffId, category: 'سلف العاملين', amount: obj.amount, date: obj.date, note: `سلفة ${s ? s.name : ''}${obj.note ? ' - ' + obj.note : ''}` });
      }
      toast('تم الحفظ ✅');
    },
    onDelete: isNew ? null : async () => {
      const ex = D.expenses.find((e) => e.txId === t.id); if (ex) await remove('expenses', ex.id);
      await remove('staffTx', t.id);
    },
  });
}

function slotForm(i) {
  const sch = getSchedule(state.schedClass), di = state.schedDay, isNew = i === undefined;
  const slot = isNew ? { time: '', cells: DAYS.map(() => '') } : sch.slots[i];
  openForm({
    title: isNew ? 'فترة جديدة' : `${DAYS[di]} · ${slot.time}`,
    data: { time: slot.time, activity: slot.cells[di] || '', all: isNew },
    fields: [
      { name: 'time', label: 'الوقت', required: true, full: true, placeholder: 'مثال: 9:00 - 9:45' },
      { name: 'activity', label: `النشاط يوم ${DAYS[di]}`, full: true, list: ACTIVITY_BANK },
      { name: 'all', label: 'نفس النشاط في كل أيام الأسبوع', type: 'checkbox', full: true },
    ],
    onSave: async (v) => {
      const cells = [...slot.cells];
      if (v.all) cells.fill(v.activity); else cells[di] = v.activity;
      const slots = [...sch.slots];
      if (isNew) slots.push({ time: v.time, cells }); else slots[i] = { time: v.time, cells };
      slots.sort((a, b) => slotStart(a.time) - slotStart(b.time));
      await save('schedule', { ...sch, slots });
    },
    onDelete: isNew ? null : async () => { await save('schedule', { ...sch, slots: sch.slots.filter((_, k) => k !== i) }); },
    deleteLabel: 'حذف الفترة',
  });
}

function noteForm(n, preset = {}) {
  const isNew = !n;
  if (isNew && !childOptions().length) { toast('أضف طفلًا أولاً'); return; }
  const base = n || { date: today(), kind: 'عام', share: true, ...preset };
  openForm({
    title: isNew ? 'ملاحظة يومية' : 'تعديل ملاحظة', data: base,
    fields: [
      { name: 'childId', label: 'الطفل', type: 'select', options: childOptions(), full: true },
      { name: 'kind', label: 'النوع', type: 'select', options: NOTE_KINDS.map((x) => [x, x]) },
      { name: 'date', label: 'التاريخ', type: 'date' },
      { name: 'text', label: 'الملاحظة', type: 'textarea', rows: 4, required: true, full: true },
      { name: 'share', label: 'تظهر لولي الأمر في التطبيق', type: 'checkbox', full: true },
    ],
    onSave: async (v) => { await save('notes', { ...base, ...v, id: base.id || uid() }); toast('تم الحفظ ✅'); },
    onDelete: isNew ? null : async () => { await remove('notes', n.id); },
  });
}

// ================== النسخ الاحتياطي ==================
async function exportData() {
  const data = JSON.stringify(await DB.exportAll());
  const name = `baraem-backup-${today()}.json`;
  if (window.Android && window.Android.saveFile) { window.Android.saveFile(name, data); return; }
  saveBlob(name, new Blob([data], { type: 'application/json' }));
}

async function importFile(file) {
  try {
    const json = JSON.parse(await file.text());
    if (!confirm('سيتم استبدال كل البيانات الحالية بالبيانات الموجودة في الملف. متابعة؟')) return;
    await DB.importAll(json); await loadAll();
    if (Cloud.role) { toast('جاري رفع البيانات للسيرفر...'); await Cloud.uploadAll(); }
    go('home'); toast('تم استيراد البيانات ✅');
  } catch (e) { alert('تعذر قراءة الملف: ' + (e.message || e)); }
}

// ================== الأحداث ==================
async function mark(childId, status) {
  const d = state.attDate, id = `${d}_${childId}`, old = attOf(d, childId);
  if (old && old.status === status) { await remove('attendance', id); render(); return; }
  const obj = { ...(old || {}), id, date: d, childId, status };
  if (status === 'absent') { obj.checkIn = ''; obj.checkOut = ''; } else if (!obj.checkIn && d === today()) obj.checkIn = nowTime();
  await save('attendance', obj); render();
}
async function staffMark(staffId, status) {
  const d = state.staffAttDate, id = `${d}_${staffId}`, old = staffAttOf(d, staffId);
  if (old && old.status === status) { await remove('staffAtt', id); render(); return; }
  const obj = { ...(old || {}), id, date: d, staffId, status };
  if (['absent', 'leave'].includes(status)) { obj.checkIn = ''; obj.checkOut = ''; } else if (!obj.checkIn && d === today()) obj.checkIn = nowTime();
  await save('staffAtt', obj); render();
}

const ACTIONS = {
  showLogin: () => { state.forceLogin = true; render(); },
  skipLogin: () => { LS.set('skipLogin', '1'); state.forceLogin = false; render(); },
  forgotPass: async () => {
    const email = ($('#lEmail') || {}).value || prompt('اكتب الإيميل:');
    if (!email) return;
    if (!email.includes('@')) { alert('لو انت ولي أمر: كلم الحضانة وهي تعملك باسورد جديد.'); return; }
    try { await Cloud.resetPassword(email); alert('تم إرسال رابط تغيير الباسورد على الإيميل 📧'); } catch (e) { alert(authMsg(e)); }
  },
  logout: async () => { if (confirm('تسجيل خروج من الموبايل ده؟\nالبيانات محفوظة على السيرفر وهترجع لما تسجل دخول تاني.')) await Cloud.logout(); },
  retry: () => location.reload(),
  pickKid: (el) => { state.kid = el.dataset.id; render(); },
  pickPlan: (el) => { state.subPlan = el.dataset.id; render(); },
  goPlans: () => push('plans'),
  planEdit: (el) => planForm(plans().find((p) => p.id === el.dataset.id)),
  subStop: async (el) => { const c = child(el.dataset.id); if (confirm(`إيقاف اشتراك ${c.name}؟`)) await subStop(c.id); },
  goDaily: () => { state.repDate = today(); push('daily'); },
  repSet: (el) => setReport(el.dataset.id, el.dataset.f, el.dataset.v),
  repTemplate: () => repTemplateForm(),
  copy: (el) => copyText(el.dataset.t),
  addCal: (el) => addToCalendar(el.dataset.kind),
  iosHintOff: () => { LS.set('iosHint', '1'); render(); },
  askNotify: async () => { try { const r = await Notification.requestPermission(); toast(r === 'granted' ? 'تم تفعيل الإشعارات ✅' : 'الإشعارات مقفولة'); } catch (e) { toast('الموبايل ده مش بيدعم الإشعارات'); } render(); },
  openInsta,
  goObligations: () => push('obligations'),
  payObligation: (el) => payObligation(el.dataset.id),
  editObligation: (el) => obligationForm(obligations().find((o) => o.id === el.dataset.id)),
  goHomework: () => { state.hwTab = 'items'; push('homework'); },
  hwTab: (el) => { state.hwTab = el.dataset.t; render(); },
  openHw: (el) => openHomework(el.dataset.id),
  hwLocked: () => toast('🔒 اشترك عشان تفتح كل التمارين'),
  closeHw: () => closeHomework(false),
  hwUpload: () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.html,.htm,text/html'; i.onchange = () => i.files[0] && hwUploadFile(i.files[0]); i.click(); },
  hwEdit: (el) => hwEditForm(D.homework.find((x) => x.id === el.dataset.id)),
  hwActivate: (el) => hwActivate(el.dataset.id, true),
  hwProgDetail: (el) => hwProgDetail(D.hwProg.find((x) => x.id === el.dataset.id)),
  hwSubscribe: async () => {
    const k = curKid().id ? curKid() : { id: (Cloud.childIds || [])[0], name: '' }, p = planById(state.subPlan);
    if (!confirm(`تأكيد إنك حوّلت ${money(p.price)} على إنستاباي — ${subWhat()} (${p.name})${k.name ? ' لـ ' + k.name : ''}؟`)) return;
    try { await Cloud.sendRequest({ type: 'hwsub', childId: k.id, childName: k.name || '', planId: p.id, reason: `حوّلت ${money(p.price)} على إنستاباي — باقة ${p.name}` }); toast('تم إرسال الطلب ✅ هيتفعل بعد المراجعة'); }
    catch (e) { toast(authMsg(e)); }
  },
  pTab: (el) => go(el.dataset.t),
  newReq: (el) => requestForm(el.dataset.type),
  cancelReq: async (el) => {
    const r = (Cloud.req[el.dataset.child] || []).find((x) => x.id === el.dataset.id);
    if (r && confirm('إلغاء الطلب؟')) { try { await Cloud.cancelRequest(r); toast('تم الإلغاء'); } catch (e) { toast(authMsg(e)); } }
  },
  goRequests: () => { state.reqTab = 'pending'; push('requests'); },
  reqTab: (el) => { state.reqTab = el.dataset.t; render(); },
  decideReq: (el) => decideForm(D.requests.find((x) => x.id === el.dataset.id)),
  reqDecision: (el) => reqDecision(el.dataset.id, el.dataset.st),
  goAnn: () => push('announcements'),
  addAnn: () => annForm(null),
  editAnn: (el) => annForm(D.announcements.find((x) => x.id === el.dataset.id)),
  makeParent: (el) => { const c = child(el.dataset.id); if (!c.phone) { toast('ضيف رقم تليفون ولي الأمر الأول (تعديل)'); return; } parentForm(c); },
  republishFam: (el) => { publishFamily(el.dataset.id); toast('تم التحديث ✅'); },
  unlinkParent: async (el) => {
    const c = child(el.dataset.id);
    if (!confirm(`إلغاء ربط حساب ولي الأمر بـ ${c.name}؟`)) return;
    await Cloud.removeParentChild(parentEmail(c.parentLogin), c.id);
    const upd = { ...c }; delete upd.parentLogin; await save('children', upd); render();
  },
  bulkParents,
  phonesTemplate: () => {
    const rows = [['اسم الطالب', 'التليفون', 'اسم ولي الأمر'], ...activeChildren().map((c) => [c.name, c.phone || '', c.guardianName || ''])];
    saveBlob('ارقام-اولياء-الامور.xlsx', XLSX.write([{ name: 'أرقام أولياء الأمور', rows }]));
    closeModal();
    setTimeout(() => { state.imp.type = 'children'; state.imp.result = null; push('import'); toast('بعد ما تكتب الأرقام ارفع الملف من هنا 👇'); }, 400);
  },
  goMembers: () => { state.members = null; push('members'); loadMembers(); },
  addMember: () => memberForm(null),
  editMember: (el) => memberForm((state.members || []).find((m) => m.email === el.dataset.email)),
  closeModal: (el) => { closeModal(); if (el && el.dataset && el.dataset.then) go(el.dataset.then); },
  doPrint, exportExcel, exportData, runImport,
  goAttendance: () => go('attendance'),
  goDues: () => { state.finTab = 'dues'; state.month = thisMonth(); go('finance'); },
  goClasses: () => push('classes'), goReports: () => push('reports'), goSettings: () => push('settings'), goNotes: () => push('notes'),
  goSchedule: () => push('schedule'), goThemes: () => push('themes'), goAbout: () => push('about'), assignClasses: () => push('assign'),
  goImport: () => { state.imp.result = null; push('import'); },
  goMessages: (el) => { if (el.dataset.target) { state.msgTarget = el.dataset.target; state.msgTpl = 0; state.msgText = ''; } push('messages'); },
  openChild: (el) => push('child', { id: el.dataset.id }),
  openStaff: (el) => push('staffProfile', { id: el.dataset.id }),
  addChild: () => childForm(null), editChild: (el) => childForm(child(el.dataset.id)),
  addPayment: (el) => paymentForm(null, { ...(el.dataset.child ? { childId: el.dataset.child } : {}), ...(el.dataset.month ? { month: el.dataset.month } : {}) }),
  editPayment: (el) => { const p = D.payments.find((x) => x.id === el.dataset.id); paymentForm(p); $('#mform .actions').insertAdjacentHTML('beforeend', '<button type="button" class="btn" id="mreceipt">🧾 إيصال</button>'); $('#mreceipt').onclick = () => receipt(p); },
  addExpense: () => expenseForm(null), editExpense: (el) => expenseForm(D.expenses.find((x) => x.id === el.dataset.id)),
  addClass: () => classForm(null), editClass: (el) => classForm(cls(el.dataset.id)),
  addStaff: () => staffForm(null), editStaff: (el) => staffForm(staffById(el.dataset.id)),
  staffTx: (el) => staffTxForm(null, { staffId: el.dataset.id, type: el.dataset.type }),
  editStaffTx: (el) => staffTxForm(D.staffTx.find((x) => x.id === el.dataset.id)),
  addNote: (el) => noteForm(null, el.dataset.child ? { childId: el.dataset.child } : {}),
  editNote: (el) => noteForm(D.notes.find((x) => x.id === el.dataset.id)),
  staffTab: (el) => { state.staffTab = el.dataset.t; render(); },
  staffMark: (el) => staffMark(el.dataset.id, el.dataset.st),
  staffCheckout: async (el) => { const a = staffAttOf(state.staffAttDate, el.dataset.id); await save('staffAtt', { ...a, checkOut: nowTime() }); render(); },
  staffAllPresent: async () => {
    for (const s of activeStaff()) if (!staffAttOf(state.staffAttDate, s.id)) await save('staffAtt', { id: `${state.staffAttDate}_${s.id}`, date: state.staffAttDate, staffId: s.id, status: 'present', checkIn: state.staffAttDate === today() ? nowTime() : '' });
    render(); toast('تم تسجيل حضور الجميع');
  },
  paySalary: async (el) => {
    const s = staffById(el.dataset.id), m = el.dataset.month || state.month, r = staffMonth(s, m);
    const amount = prompt(`صرف راتب ${s.name} عن ${monthLabel(m)}\nالصافي ${r.net} - المصروف ${r.paid}\nالمبلغ:`, r.remaining);
    if (amount === null || !(Number(toNum(amount)) > 0)) return;
    await save('expenses', { id: uid(), category: 'رواتب', amount: Number(toNum(amount)), date: today(), month: m, staffId: s.id, note: `راتب ${monthLabel(m)}` });
    toast('تم صرف الراتب وتسجيله في المصروفات ✅'); render();
  },
  absenceDeduct: async (el) => {
    const s = staffById(el.dataset.id), m = state.month, r = staffMonth(s, m);
    const amount = Math.round(r.base / 30 * r.absent);
    if (!confirm(`خصم ${r.absent} يوم غياب = ${money(amount)} من راتب ${monthLabel(m)}؟`)) return;
    await save('staffTx', { id: uid(), staffId: s.id, type: 'deduction', amount, month: m, date: today(), note: `غياب ${r.absent} يوم`, auto: 'absence' });
    render();
  },
  salarySlip: (el) => {
    const s = staffById(el.dataset.id), m = state.month, r = staffMonth(s, m);
    printHTML(`<div class="receipt">${printHeader()}<div class="center" style="margin-top:8px"><b>كشف راتب ${monthLabel(m)}</b></div>
      <table><tr><td>الاسم</td><td>${esc(s.name)}</td></tr><tr><td>الوظيفة</td><td>${esc(s.role || '')}</td></tr>
      <tr><td>الراتب الأساسي</td><td>${money(r.base)}</td></tr><tr><td>مكافآت</td><td>${money(r.bonus)}</td></tr>
      <tr><td>خصومات</td><td>${money(r.deduction)}</td></tr><tr><td>سلف</td><td>${money(r.advance)}</td></tr>
      <tr class="total"><td>الصافي</td><td>${money(r.net)}</td></tr><tr><td>تم صرفه</td><td>${money(r.paid)}</td></tr>
      <tr><td>أيام الحضور / الغياب / الإجازة</td><td>${r.present + r.late} / ${r.absent} / ${r.leave}</td></tr></table>
      <p style="margin-top:30px">توقيع الموظف: ....................</p></div>`);
  },
  printPayroll: () => {
    const m = state.month, rows = activeStaff().map((s) => ({ s, r: staffMonth(s, m) }));
    printHTML(`<div class="report-print">${printHeader()}<h3>كشف رواتب ${monthLabel(m)}</h3><table><tr><th>الاسم</th><th>الوظيفة</th><th>الأساسي</th><th>مكافآت</th><th>خصومات</th><th>سلف</th><th>الصافي</th><th>التوقيع</th></tr>
      ${rows.map(({ s, r }) => `<tr><td>${esc(s.name)}</td><td>${esc(s.role || '')}</td><td>${num(r.base)}</td><td>${num(r.bonus)}</td><td>${num(r.deduction)}</td><td>${num(r.advance)}</td><td><b>${num(r.net)}</b></td><td></td></tr>`).join('')}
      <tr><th colspan="6">الإجمالي</th><th>${num(sum(rows, (x) => x.r.net))}</th><th></th></tr></table></div>`);
  },
  mark: (el) => mark(el.dataset.id, el.dataset.st),
  checkout: async (el) => { const a = attOf(state.attDate, el.dataset.id); await save('attendance', { ...a, checkOut: nowTime() }); render(); },
  allPresent: async () => {
    let kids = activeChildren(); if (state.attClass) kids = kids.filter((c) => c.classId === state.attClass);
    for (const c of kids) if (!attOf(state.attDate, c.id)) await save('attendance', { id: `${state.attDate}_${c.id}`, date: state.attDate, childId: c.id, status: 'present', checkIn: state.attDate === today() ? nowTime() : '' });
    render(); toast('تم تسجيل حضور الجميع');
  },
  shareAttendance: () => {
    let kids = activeChildren(); if (state.attClass) kids = kids.filter((c) => c.classId === state.attClass);
    const label = { present: '✅', late: '⏰', absent: '❌' };
    const lines = kids.map((c) => { const a = attOf(state.attDate, c.id); return `${a ? label[a.status] : '➖'} ${c.name}`; });
    shareText(`كشف حضور ${dateLabel(state.attDate)}\n${settings().name}\n\n${lines.join('\n')}`);
  },
  finTab: (el) => { state.finTab = el.dataset.t; render(); },
  monthNav: (el) => { state.month = addMonths(state.month, Number(el.dataset.k)); render(); },
  // الجدول
  schedDay: (el) => { state.schedDay = Number(el.dataset.i); render(); },
  editSlot: (el) => slotForm(Number(el.dataset.i)), addSlot: () => slotForm(undefined),
  schedTemplates: () => openModal('جداول مقترحة', `<p class="sub" style="color:var(--muted)">اختار جدول جاهز وبعدين عدّل أي فترة بالضغط عليها.</p>
    <div class="list">${SCHEDULE_TEMPLATES.map((t, i) => `<div class="item"><div class="main"><div class="title">${t.title}</div><div class="sub">${t.desc}</div></div><button class="btn small primary" data-action="applyTemplate" data-i="${i}">استخدام</button></div>`).join('')}</div>`),
  applyTemplate: async (el) => {
    const t = SCHEDULE_TEMPLATES[Number(el.dataset.i)], sch = getSchedule(state.schedClass);
    if (sch.slots.length && !confirm('هيتم استبدال الجدول الحالي بالجدول المقترح. متابعة؟')) return;
    await save('schedule', { ...sch, slots: t.slots.map(([time, a]) => ({ time, cells: DAYS.map((_, i) => (Array.isArray(a) ? a[i] : a)) })) });
    closeModal(); render(); toast('تم تطبيق الجدول ✅');
  },
  pickTheme: async (el) => {
    const [t, ideas] = WEEK_THEMES[Number(el.dataset.i)], sch = getSchedule(state.schedClass);
    await save('schedule', { ...sch, theme: t.replace(/^\S+\s/, ''), themeIdeas: ideas });
    history.back(); toast('تم اختيار موضوع الأسبوع ✅');
  },
  weekTable: () => { const sch = getSchedule(state.schedClass); openModal('جدول الأسبوع', `<div style="overflow-x:auto">${weekTableHTML(sch, state.schedClass === 'general' ? 'الجدول العام' : className(state.schedClass))}</div>`); },
  printSchedule: () => { const sch = getSchedule(state.schedClass); printHTML(`<div class="report-print">${printHeader()}${weekTableHTML(sch, 'الجدول الأسبوعي - ' + (state.schedClass === 'general' ? 'كل الفصول' : className(state.schedClass)))}</div>`); },
  shareSchedule: () => {
    const sch = getSchedule(state.schedClass), di = state.schedDay;
    shareText(`🌱 ${settings().name}\nجدول يوم ${DAYS[di]}${sch.theme ? `\nموضوع الأسبوع: ${sch.theme}` : ''}\n\n${sch.slots.filter((s) => s.cells[di]).map((s) => `⏰ ${s.time}: ${s.cells[di]}`).join('\n')}`);
  },
  // الرسائل
  sendMsg: (el) => { const c = child(el.dataset.id); openUrl(waLink(c.phone, msgFor(c))); state.msgSent[c.id] = true; render(); },
  copyMsg: () => shareText(state.msgText.replaceAll('ولي أمر {name}', 'أولياء الأمور الكرام').replaceAll('{name}', 'أطفالنا').replaceAll('{amount}', '').replaceAll('{nursery}', settings().name)),
  // الإكسيل
  pickExcel: () => $('#excelFile').click(),
  excelTemplate: () => {
    const def = IMPORT_TYPES[state.imp.type];
    const fields = [...def.fields].sort((a, b) => (a[0] === 'name' ? -1 : b[0] === 'name' ? 1 : 0));
    saveBlob(`template-${state.imp.type}.xlsx`, XLSX.write([{ name: def.label, rows: [fields.map(([, l]) => l.replace(' *', ''))] }]));
  },
  shareAbout: () => shareText(aboutText()),
  saveSettings: async () => {
    await saveSettings({ name: $('#sName').value.trim() || DEFAULT_SETTINGS.name, slogan: $('#sSlogan').value.trim(), phone: $('#sPhone').value.trim(), currency: $('#sCurrency').value.trim() || 'ج.م', address: $('#sAddress').value.trim(), minAge: $('#sMinAge').value.trim(), regFee: Number($('#sRegFee').value) || '', payInfo: $('#sPayInfo').value.trim(), instapay: $('#sInsta').value.trim() });
    toast('تم حفظ الإعدادات ✅'); render();
  },
  importData: () => $('#importFile').click(),
  wipeData: async () => {
    if (!confirm('سيتم مسح كل البيانات نهائيًا! هل عملت نسخة احتياطية؟')) return;
    if (prompt('اكتب كلمة "مسح" للتأكيد') !== 'مسح') return;
    for (const s of DB.STORES) await DB.clear(s);
    await loadAll(); await saveSettings({ brandV2: true, seededBaraem: true }); go('home'); toast('تم مسح البيانات');
  },
  printReport: () => {
    const m = state.month, r = reportData(m);
    const rows = (o) => Object.entries(o).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${money(v)}</td></tr>`).join('') || '<tr><td colspan="2">—</td></tr>';
    printHTML(`<div class="report-print">${printHeader()}<h3>تقرير ${monthLabel(m)}</h3>
      <table><tr><th>الإيرادات</th><td>${money(r.inc)}</td></tr><tr><th>المصروفات</th><td>${money(r.exp)}</td></tr><tr><th>الصافي</th><td>${money(r.inc - r.exp)}</td></tr>
      <tr><th>عدد الأطفال</th><td>${num(activeChildren().length)}</td></tr><tr><th>نسبة الحضور</th><td>${r.presentRate === null ? '—' : num(r.presentRate) + '٪'}</td></tr></table>
      <h3>الإيرادات حسب النوع</h3><table>${rows(r.byType)}</table><h3>المصروفات حسب البند</h3><table>${rows(r.byCat)}</table></div>`);
  },
};

Object.assign(ACTIONS, ACTIONS_EXTRA);

document.addEventListener('click', (e) => {
  const nav = e.target.closest('.bottom-nav button');
  if (nav) { if (!$('#modal').classList.contains('hidden')) closeModal(); go(nav.dataset.tab); return; }
  const link = e.target.closest('a[href]');
  if (link && !link.dataset.action) {
    if (window.Android && window.Android.openUrl && /^(https?|tel):/.test(link.getAttribute('href'))) { e.preventDefault(); window.Android.openUrl(link.href); }
    return;
  }
  const el = e.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) { e.preventDefault(); ACTIONS[el.dataset.action](el); return; }
  if (e.target.id === 'modal') closeModal();
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'childSearch') {
    state.childSearch = e.target.value;
    const pos = e.target.selectionStart; render();
    const s = $('#childSearch'); s.focus(); s.setSelectionRange(pos, pos);
  } else if (id === 'msgText') state.msgText = e.target.value;
  else if (id === 'cashCount') {
    const d = state.cashDate || today(), cash = sum(D.payments.filter((p) => p.date === d && (p.method || 'نقدي') === 'نقدي'), (p) => p.amount) - sum(D.expenses.filter((x) => x.date === d), (x) => x.amount);
    const diff = (Number(e.target.value) || 0) - cash;
    $('#cashDiff').innerHTML = e.target.value === '' ? '' : diff === 0 ? '<b style="color:var(--green)">✅ الخزنة مظبوطة</b>' : `<b style="color:var(--red)">${diff > 0 ? 'زيادة' : 'عجز'} ${money(Math.abs(diff))}</b>`;
  }
});
document.addEventListener('change', async (e) => {
  const t = e.target, id = t.id;
  if (id === 'childClass') { state.childClass = t.value; render(); }
  else if (id === 'childStatus') { state.childStatus = t.value; render(); }
  else if (id === 'attDate') { state.attDate = t.value || today(); render(); }
  else if (id === 'attClass') { state.attClass = t.value; render(); }
  else if (id === 'staffAttDate') { state.staffAttDate = t.value || today(); render(); }
  else if (t.name === 'subMode') { await saveSettings({ subMode: t.value }); toast(t.value === 'app' ? 'الاشتراك بقى للتطبيق كله ✅' : 'الاشتراك بقى للتمارين والمنهج ✅'); render(); }
  else if (id === 'evalClass') { state.evalClass = t.value; render(); }
  else if (id === 'cashDate') { state.cashDate = t.value || today(); render(); }
  else if (id === 'repDate') { state.repDate = t.value || today(); render(); }
  else if (id === 'repClass') { state.repClass = t.value; render(); }
  else if (t.dataset.rep) { const d = state.repDate, cid = t.dataset.rep, old = repOf(d, cid) || { id: `${d}_${cid}`, date: d, childId: cid }; await save('reports', { ...old, [t.dataset.f]: t.value.trim() }); }
  else if (id === 'duesClass') { state.duesClass = t.value; render(); }
  else if (id === 'monthPick') { state.month = t.value || thisMonth(); render(); }
  else if (id === 'schedClass') { state.schedClass = t.value; render(); }
  else if (id === 'schedTheme') { const sch = getSchedule(state.schedClass); await save('schedule', { ...sch, theme: t.value.trim(), themeIdeas: t.value.trim() === sch.theme ? sch.themeIdeas : '' }); render(); }
  else if (id === 'msgTpl') { state.msgTpl = Number(t.value); state.msgText = MESSAGE_TEMPLATES[state.msgTpl][1]; state.msgSent = {}; render(); }
  else if (id === 'msgTarget') { state.msgTarget = t.value; render(); }
  else if (id === 'impType') { state.imp.type = t.value; state.imp.result = null; autoMap(); render(); }
  else if (id === 'impSheet') { state.imp.sheetIdx = Number(t.value); autoMap(); render(); }
  else if (t.dataset.map) { if (t.value === '') delete state.imp.map[t.dataset.map]; else state.imp.map[t.dataset.map] = Number(t.value); render(); }
  else if (t.dataset.assign) { const c = child(t.dataset.assign); await save('children', { ...c, classId: t.value }); toast('تم ✅'); }
  else if (id === 'importFile' && t.files[0]) { importFile(t.files[0]); t.value = ''; }
  else if (id === 'excelFile' && t.files[0]) { readExcelFile(t.files[0]); t.value = ''; }
});
$('#backBtn').addEventListener('click', back);
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });
// يستدعيه تطبيق الأندرويد عند الضغط على زر الرجوع؛ يرجع false لو مفيش حاجة نرجع لها
window.nurseryBack = () => {
  if (LRN) { ACTIONS.learnBack(); return true; }
  if (hwSession) { closeHomework(false); return true; }
  if (!$('#modal').classList.contains('hidden')) { closeModal(); return true; }
  if (state.stack.length) { history.back(); return true; }
  if (state.tab !== 'home') { go('home'); return true; }
  return false;
};

// ---------- أول تشغيل: بيانات حضانة براعم ----------
async function firstRun() {
  const s = D.settings.find((x) => x.id === 'main') || {};
  if (!s.brandV2) {
    await saveSettings({ name: DEFAULT_SETTINGS.name, slogan: DEFAULT_SETTINGS.slogan, phone: DEFAULT_SETTINGS.phone, address: DEFAULT_SETTINGS.address, minAge: DEFAULT_SETTINGS.minAge, brandV2: true });
  }
  if (!s.seededBaraem) {
    const start = `${thisMonth()}-01`;
    for (const [name, fee, gender] of BARAEM_CHILDREN) {
      if (D.children.some((c) => c.name.trim() === name)) continue;
      await save('children', { id: uid(), name, monthlyFee: fee, gender, active: true, classId: '', enrollDate: start, createdAt: today() });
    }
    await saveSettings({ seededBaraem: true });
  }
}

(async function init() {
  await loadAll();
  if (!LS.get('linked')) await firstRun();
  render();
  Cloud.init(async (what) => {
    if (what === 'reload') { await loadAll(); render(); }
    else if (what === 'data') softRender();
    else render();
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Android) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
