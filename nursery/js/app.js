// ================== إدارة الحضانة ==================
// كل البيانات محفوظة على الجهاز (IndexedDB) وتُحمَّل في الذاكرة عند بدء التشغيل.

const D = { settings: [], classes: [], children: [], attendance: [], payments: [], expenses: [], staff: [], notes: [] };

const EXPENSE_CATEGORIES = ['إيجار', 'رواتب', 'أكل ووجبات', 'كهرباء ومياه وغاز', 'أدوات وألعاب', 'أدوات نظافة', 'صيانة', 'مواصلات', 'إنترنت وتليفون', 'أخرى'];
const PAYMENT_TYPES = { monthly: 'اشتراك شهري', registration: 'رسوم تسجيل', uniform: 'زي وأدوات', bus: 'باص', activity: 'رحلة / نشاط', other: 'أخرى' };
const PAYMENT_METHODS = ['نقدي', 'فودافون كاش', 'إنستاباي', 'تحويل بنكي', 'أخرى'];
const NOTE_KINDS = ['عام', 'صحة', 'وجبات', 'نوم', 'سلوك', 'تعليم', 'حادثة / إصابة'];
const STAFF_ROLES = ['مديرة', 'مُعلِّمة', 'مُساعِدة', 'دادة', 'سائق', 'عامل/ة نظافة', 'محاسب', 'أخرى'];

const state = { tab: 'home', stack: [], attDate: today(), attClass: '', month: thisMonth(), finTab: 'payments', childSearch: '', childClass: '', childStatus: 'active', duesClass: '' };

// ---------- أدوات مساعدة ----------
function pad(n) { return String(n).padStart(2, '0'); }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function thisMonth() { return today().slice(0, 7); }
function nowTime() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function num(n) { return Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 }); }
function money(n) { return `${num(n)} ${settings().currency || 'ج.م'}`; }
function settings() { return D.settings.find((s) => s.id === 'main') || { id: 'main', name: 'الحضانة', currency: 'ج.م' }; }
function monthLabel(m) { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }); }
function shortMonth(m) { const [y, mo] = m.split('-'); return new Date(+y, +mo - 1, 1).toLocaleDateString('ar-EG', { month: 'short' }); }
function dateLabel(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return new Date(+y, +m - 1, +dd).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); }
function addMonths(m, k) { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function monthDiff(a, b) { const [y1, m1] = a.split('-').map(Number); const [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); }
function sum(arr, f = (x) => x) { return arr.reduce((s, x) => s + (Number(f(x)) || 0), 0); }
function initials(name) { return (name || '?').trim().charAt(0); }
function $(sel, root = document) { return root.querySelector(sel); }

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
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2200);
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

// ---------- البيانات ----------
async function loadAll() { for (const s of DB.STORES) D[s] = await DB.getAll(s); }
async function save(store, obj) {
  await DB.put(store, obj);
  const i = D[store].findIndex((x) => x.id === obj.id);
  if (i >= 0) D[store][i] = obj; else D[store].push(obj);
}
async function remove(store, id) { await DB.del(store, id); D[store] = D[store].filter((x) => x.id !== id); }

const child = (id) => D.children.find((c) => c.id === id);
const cls = (id) => D.classes.find((c) => c.id === id);
const className = (id) => (cls(id) || {}).name || 'بدون فصل';
const activeChildren = () => D.children.filter((c) => c.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

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

// ---------- التنقل ----------
const TITLES = { home: 'الرئيسية', children: 'الأطفال', attendance: 'الحضور والغياب', finance: 'الحسابات', more: 'المزيد' };

function go(tab) { state.tab = tab; state.stack = []; render(); window.scrollTo(0, 0); }
function push(view, params = {}) { state.stack.push({ view, ...params }); history.pushState({ d: state.stack.length }, ''); render(); window.scrollTo(0, 0); }
function back() { if (!$('#modal').classList.contains('hidden')) { closeModal(); return; } if (state.stack.length) history.back(); }
window.addEventListener('popstate', () => {
  if (!$('#modal').classList.contains('hidden')) { closeModal(); history.pushState({ d: state.stack.length }, ''); return; }
  if (state.stack.length) { state.stack.pop(); render(); }
});

function render() {
  const top = state.stack[state.stack.length - 1];
  document.querySelectorAll('.bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  $('#backBtn').classList.toggle('hidden', !top);
  $('#nurseryName').textContent = settings().name || 'الحضانة';
  let html = '', title = TITLES[state.tab];
  if (top) {
    const v = VIEWS[top.view](top); html = v.html; title = v.title;
  } else {
    html = ({ home: viewHome, children: viewChildren, attendance: viewAttendance, finance: viewFinance, more: viewMore })[state.tab]();
  }
  $('#pageTitle').textContent = title;
  $('#view').innerHTML = html;
}

// ================== الشاشات ==================
function viewHome() {
  const kids = activeChildren(), m = thisMonth(), t = today();
  const present = kids.filter((c) => { const a = attOf(t, c.id); return a && a.status !== 'absent'; }).length;
  const marked = kids.filter((c) => attOf(t, c.id)).length;
  const inc = incomeIn(m), exp = expensesIn(m);
  const unpaid = kids.filter((c) => ['unpaid', 'partial'].includes(monthStatus(c, m).key));
  const totalDue = sum(kids, childBalance);
  const bdays = kids.filter((c) => c.birthDate && c.birthDate.slice(5, 7) === m.slice(5, 7)).sort((a, b) => a.birthDate.slice(8).localeCompare(b.birthDate.slice(8)));
  const recentNotes = [...D.notes].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 3);

  return `
  <div class="quick">
    <button data-action="goAttendance"><span>✅</span>الحضور</button>
    <button data-action="addPayment"><span>💵</span>تحصيل</button>
    <button data-action="addExpense"><span>🧾</span>مصروف</button>
    <button data-action="addChild"><span>➕</span>طفل جديد</button>
  </div>
  <div class="stats">
    <div class="stat purple"><div class="label">الأطفال المسجلين</div><div class="value">${num(kids.length)}</div></div>
    <div class="stat blue"><div class="label">حضور اليوم</div><div class="value">${num(present)} / ${num(kids.length)}</div>${marked < kids.length && kids.length ? `<div class="label">لم يُسجَّل: ${num(kids.length - marked)}</div>` : ''}</div>
    <div class="stat green"><div class="label">إيرادات ${monthLabel(m)}</div><div class="value">${money(inc)}</div></div>
    <div class="stat red"><div class="label">مصروفات ${monthLabel(m)}</div><div class="value">${money(exp)}</div></div>
    <div class="stat ${inc - exp >= 0 ? 'green' : 'red'}"><div class="label">صافي الربح هذا الشهر</div><div class="value">${money(inc - exp)}</div></div>
    <div class="stat red"><div class="label">إجمالي المتأخرات</div><div class="value">${money(totalDue)}</div></div>
  </div>

  <div class="section-title"><h3>لم يدفعوا اشتراك ${monthLabel(m)} (${num(unpaid.length)})</h3>${unpaid.length ? '<button class="btn small" data-action="goDues">عرض الكل</button>' : ''}</div>
  <div class="list">${unpaid.slice(0, 5).map((c) => childRow(c, `<span class="badge ${monthStatus(c, m).cls}">${monthStatus(c, m).label} · ${money(monthStatus(c, m).remaining)}</span>`)).join('') || '<div class="empty">كل الأطفال دفعوا اشتراك الشهر 🎉</div>'}</div>

  ${bdays.length ? `<div class="section-title"><h3>🎂 أعياد ميلاد هذا الشهر</h3></div>
  <div class="list">${bdays.map((c) => childRow(c, `<span class="badge blue">${num(+c.birthDate.slice(8))} ${shortMonth(m)}</span>`)).join('')}</div>` : ''}

  ${recentNotes.length ? `<div class="section-title"><h3>📝 آخر الملاحظات</h3></div>
  <div class="list">${recentNotes.map(noteRow).join('')}</div>` : ''}

  ${!D.children.length ? `<div class="card"><h3>أهلاً بك 👋</h3><p>ابدأ بإضافة الفصول من <b>المزيد ← الفصول</b>، ثم أضف الأطفال، وبعدها سجّل الحضور والمدفوعات والمصروفات يوميًا.</p>
  <div class="btn-row"><button class="btn primary" data-action="addChild">إضافة أول طفل</button><button class="btn" data-action="addClass">إضافة فصل</button></div></div>` : ''}`;
}

function childRow(c, extra = '') {
  return `<div class="item clickable" data-action="openChild" data-id="${c.id}">
    ${avatar(c)}
    <div class="main"><div class="title">${esc(c.name)}</div><div class="sub">${esc(className(c.classId))}${c.birthDate ? ' · ' + age(c.birthDate) : ''}</div></div>
    ${extra}</div>`;
}

function noteRow(n) {
  const c = child(n.childId);
  return `<div class="item clickable" data-action="editNote" data-id="${n.id}">
    <div class="main"><div class="title">${c ? esc(c.name) : ''} <span class="badge ${n.kind === 'حادثة / إصابة' || n.kind === 'صحة' ? 'red' : 'blue'}">${esc(n.kind)}</span></div>
    <div class="sub">${dateLabel(n.date)}</div><div style="margin-top:4px;white-space:pre-wrap">${esc(n.text)}</div></div></div>`;
}

function viewChildren() {
  const q = state.childSearch.trim();
  let list = D.children.filter((c) => (state.childStatus === 'active' ? c.active !== false : c.active === false));
  if (state.childClass) list = list.filter((c) => c.classId === state.childClass);
  if (q) list = list.filter((c) => [c.name, c.guardianName, c.phone].join(' ').includes(q));
  list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const m = thisMonth();
  return `
  <div class="toolbar">
    <input type="search" id="childSearch" placeholder="🔍 بحث بالاسم أو ولي الأمر أو التليفون" value="${esc(state.childSearch)}">
  </div>
  <div class="toolbar">
    <select id="childClass"><option value="">كل الفصول</option>${D.classes.map((k) => `<option value="${k.id}" ${state.childClass === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>
    <select id="childStatus"><option value="active" ${state.childStatus === 'active' ? 'selected' : ''}>المسجلين حاليًا</option><option value="left" ${state.childStatus === 'left' ? 'selected' : ''}>تركوا الحضانة</option></select>
    <button class="btn primary" data-action="addChild">+ طفل</button>
  </div>
  <div class="list" id="childList">${list.map((c) => { const s = monthStatus(c, m); return childRow(c, c.active === false ? '<span class="badge gray">غير مسجل</span>' : `<span class="badge ${s.cls}">${s.label}</span>`); }).join('') || '<div class="empty">لا يوجد أطفال</div>'}</div>
  <p class="sub" style="text-align:center;color:var(--muted);font-size:12px">العدد: ${num(list.length)}</p>`;
}

function viewChildProfile({ id }) {
  const c = child(id);
  if (!c) return { title: 'طفل', html: '<div class="empty">غير موجود</div>' };
  const m = thisMonth(), s = monthStatus(c, m), bal = childBalance(c);
  const pays = D.payments.filter((p) => p.childId === id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const att = D.attendance.filter((a) => a.childId === id && a.date.startsWith(m));
  const notes = D.notes.filter((n) => n.childId === id).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const reminder = `السلام عليكم ولي أمر ${c.name}،\nنذكّر حضرتك بمستحقات الحضانة: ${money(bal || s.remaining)}.\nشكرًا لحضرتك 🌸\n${settings().name || ''}`;
  return {
    title: c.name,
    html: `
    <div class="card">
      <div class="profile-head">${avatar(c, true)}<div>
        <h2>${esc(c.name)}</h2>
        <div class="sub">${esc(className(c.classId))} · ${esc(c.gender || '')}${c.birthDate ? ' · ' + age(c.birthDate) : ''}</div>
        <div style="margin-top:6px">${c.active === false ? '<span class="badge gray">ترك الحضانة</span>' : `<span class="badge ${s.cls}">اشتراك الشهر: ${s.label}</span>`} ${bal ? `<span class="badge red">متأخرات: ${money(bal)}</span>` : ''}</div>
      </div></div>
      ${c.medical ? `<div class="alert">⚠️ ملاحظات صحية / حساسية: ${esc(c.medical)}</div>` : ''}
      <div class="btn-row" style="margin-top:12px">
        <button class="btn primary small" data-action="addPayment" data-child="${c.id}">💵 تحصيل</button>
        <button class="btn small" data-action="addNote" data-child="${c.id}">📝 ملاحظة</button>
        ${c.phone ? `<a class="btn small green" href="tel:${esc(c.phone)}">📞 اتصال</a>
        <a class="btn small green" target="_blank" href="${waLink(c.phone, `السلام عليكم ولي أمر ${c.name}، `)}">💬 واتساب</a>` : ''}
        ${c.phone && (bal || s.remaining) ? `<a class="btn small danger" target="_blank" href="${waLink(c.phone, reminder)}">🔔 تذكير بالمصاريف</a>` : ''}
        <button class="btn small" data-action="editChild" data-id="${c.id}">✏️ تعديل</button>
      </div>
    </div>

    <div class="card"><h3>البيانات</h3><dl class="kv">
      ${kv('تاريخ الميلاد', c.birthDate ? dateLabel(c.birthDate) : '')}
      ${kv('ولي الأمر', [c.guardianName, c.guardianRelation && `(${c.guardianRelation})`].filter(Boolean).join(' '))}
      ${kv('التليفون', c.phone)}${kv('تليفون آخر', c.phone2)}${kv('العنوان', c.address)}
      ${kv('تاريخ الالتحاق', c.enrollDate ? dateLabel(c.enrollDate) : '')}
      ${kv('الاشتراك الشهري', c.monthlyFee ? money(c.monthlyFee) : '')}
      ${kv('المسموح لهم بالاستلام', c.pickup)}${kv('ملاحظات', c.notes)}
      ${c.active === false ? kv('تاريخ الترك', c.leaveDate ? dateLabel(c.leaveDate) : '') : ''}
    </dl></div>

    <div class="card"><h3>حضور ${monthLabel(m)}</h3>
      <div class="btn-row"><span class="badge green">حاضر: ${num(att.filter((a) => a.status === 'present').length)}</span>
      <span class="badge orange">متأخر: ${num(att.filter((a) => a.status === 'late').length)}</span>
      <span class="badge red">غائب: ${num(att.filter((a) => a.status === 'absent').length)}</span></div>
    </div>

    <div class="section-title"><h3>المدفوعات (${num(pays.length)}) · الإجمالي ${money(sum(pays, (p) => p.amount))}</h3></div>
    <div class="list">${pays.map(paymentRow).join('') || '<div class="empty">لا توجد مدفوعات</div>'}</div>

    <div class="section-title"><h3>سجل الملاحظات اليومية</h3><button class="btn small" data-action="addNote" data-child="${c.id}">+ ملاحظة</button></div>
    <div class="list">${notes.map(noteRow).join('') || '<div class="empty">لا توجد ملاحظات</div>'}</div>`,
  };
}
function kv(k, v) { return v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : ''; }

function viewAttendance() {
  const d = state.attDate;
  let kids = activeChildren();
  if (state.attClass) kids = kids.filter((c) => c.classId === state.attClass);
  const counts = { present: 0, late: 0, absent: 0, none: 0 };
  kids.forEach((c) => { const a = attOf(d, c.id); counts[a ? a.status : 'none']++; });
  return `
  <div class="toolbar">
    <input type="date" id="attDate" value="${d}">
    <select id="attClass"><option value="">كل الفصول</option>${D.classes.map((k) => `<option value="${k.id}" ${state.attClass === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select>
  </div>
  <div class="card" style="padding:10px 12px">
    <div style="font-weight:600;margin-bottom:6px">${dateLabel(d)}</div>
    <div class="btn-row"><span class="badge green">حاضر ${num(counts.present)}</span><span class="badge orange">متأخر ${num(counts.late)}</span>
    <span class="badge red">غائب ${num(counts.absent)}</span><span class="badge gray">لم يُسجَّل ${num(counts.none)}</span></div>
    <div class="btn-row" style="margin-top:10px"><button class="btn small green" data-action="allPresent">✔ الكل حاضر</button>
    <button class="btn small" data-action="shareAttendance">📤 مشاركة كشف اليوم</button></div>
  </div>
  <div class="list">${kids.map((c) => {
    const a = attOf(d, c.id), st = a ? a.status : '';
    return `<div class="item">${avatar(c)}
      <div class="main"><div class="title">${esc(c.name)}</div>
      <div class="sub">${a && a.checkIn ? `دخول ${a.checkIn}` : esc(className(c.classId))}${a && a.checkOut ? ` · خروج ${a.checkOut}` : ''}</div></div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
      <div class="att-toggle">
        <button class="present ${st === 'present' ? 'on' : ''}" data-action="mark" data-id="${c.id}" data-st="present">حاضر</button>
        <button class="late ${st === 'late' ? 'on' : ''}" data-action="mark" data-id="${c.id}" data-st="late">متأخر</button>
        <button class="absent ${st === 'absent' ? 'on' : ''}" data-action="mark" data-id="${c.id}" data-st="absent">غائب</button>
      </div>
      ${a && a.status !== 'absent' && !a.checkOut ? `<button class="btn small" data-action="checkout" data-id="${c.id}">🚪 تسجيل خروج</button>` : ''}
      </div></div>`;
  }).join('') || '<div class="empty">لا يوجد أطفال مسجلين</div>'}</div>`;
}

function paymentRow(p) {
  const c = child(p.childId);
  return `<div class="item clickable" data-action="editPayment" data-id="${p.id}">
    <div class="main"><div class="title">${c ? esc(c.name) : 'طفل محذوف'}</div>
    <div class="sub">${PAYMENT_TYPES[p.type] || ''}${p.type === 'monthly' && p.month ? ' · ' + monthLabel(p.month) : ''} · ${dateLabel(p.date)} · ${esc(p.method || '')}${p.receiptNo ? ' · إيصال #' + num(p.receiptNo) : ''}</div></div>
    <div class="amount in">${money(p.amount)}</div></div>`;
}
function expenseRow(e) {
  const st = e.staffId ? D.staff.find((s) => s.id === e.staffId) : null;
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
      <div class="toolbar" style="margin:10px 0 0"><select id="duesClass"><option value="">كل الفصول</option>${D.classes.map((k) => `<option value="${k.id}" ${state.duesClass === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></div></div>
      <div class="list">${rows.map(({ c, s, bal }) => `<div class="item">${avatar(c)}
        <div class="main clickable" data-action="openChild" data-id="${c.id}"><div class="title">${esc(c.name)}</div>
        <div class="sub">الاشتراك ${money(c.monthlyFee)} · مدفوع ${money(s.paid)}${bal ? ` · <b style="color:var(--red)">إجمالي المتأخر ${money(bal)}</b>` : ''}</div></div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><span class="badge ${s.cls}">${s.label}</span>
        ${s.key !== 'paid' ? `<div class="btn-row"><button class="btn small primary" data-action="addPayment" data-child="${c.id}" data-month="${m}">تحصيل</button>
        ${c.phone ? `<a class="btn small green" target="_blank" href="${waLink(c.phone, `السلام عليكم ولي أمر ${c.name}،\nنذكّر حضرتك باشتراك ${monthLabel(m)}: ${money(s.remaining)}${bal > s.remaining ? `\nإجمالي المستحق: ${money(bal)}` : ''}\nشكرًا لحضرتك 🌸\n${settings().name || ''}`)}">🔔</a>` : ''}</div>` : ''}
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
  </div>${body}`;
}

function viewMore() {
  const items = [
    ['🏫', 'الفصول / المجموعات', `${num(D.classes.length)} فصل`, 'goClasses'],
    ['👩‍🏫', 'العاملين والرواتب', `${num(D.staff.filter((s) => s.active !== false).length)} موظف`, 'goStaff'],
    ['📊', 'التقارير', 'الإيرادات والمصروفات والحضور', 'goReports'],
    ['📝', 'الملاحظات اليومية', `${num(D.notes.length)} ملاحظة`, 'goNotes'],
    ['⚙️', 'الإعدادات', 'اسم الحضانة والعملة', 'goSettings'],
    ['⬇️', 'تصدير نسخة احتياطية', 'احفظ ملف البيانات في مكان آمن', 'exportData'],
    ['⬆️', 'استيراد نسخة احتياطية', 'استرجاع البيانات من ملف', 'importData'],
  ];
  return `<div class="list menu-list">${items.map(([ico, t, s, a]) => `<div class="item clickable" data-action="${a}"><div class="ico">${ico}</div><div class="main"><div class="title">${t}</div><div class="sub">${s}</div></div><span>‹</span></div>`).join('')}</div>
  <p style="text-align:center;color:var(--muted);font-size:12px;margin-top:20px">كل البيانات محفوظة على هذا الجهاز فقط.<br>اعمل نسخة احتياطية بانتظام 🔒</p>`;
}

function viewClasses() {
  return {
    title: 'الفصول',
    html: `<div class="section-title"><h3>الفصول (${num(D.classes.length)})</h3><button class="btn primary small" data-action="addClass">+ فصل</button></div>
    <div class="list">${D.classes.map((k) => {
      const n = activeChildren().filter((c) => c.classId === k.id).length;
      const t = k.teacherId ? D.staff.find((s) => s.id === k.teacherId) : null;
      return `<div class="item clickable" data-action="editClass" data-id="${k.id}"><div class="avatar">🏫</div><div class="main"><div class="title">${esc(k.name)}</div>
      <div class="sub">${t ? 'المعلمة: ' + esc(t.name) + ' · ' : ''}${k.ageRange ? esc(k.ageRange) + ' · ' : ''}${k.capacity ? `${num(n)} / ${num(k.capacity)} طفل` : `${num(n)} طفل`}</div></div></div>`;
    }).join('') || '<div class="empty">لا توجد فصول. أضف فصلًا مثل: بيبي، KG1، KG2</div>'}</div>`,
  };
}

function viewStaff() {
  const m = thisMonth();
  const staff = [...D.staff].sort((a, b) => (a.active === false) - (b.active === false) || a.name.localeCompare(b.name, 'ar'));
  return {
    title: 'العاملين',
    html: `<div class="section-title"><h3>العاملين</h3><button class="btn primary small" data-action="addStaff">+ موظف</button></div>
    <div class="list">${staff.map((s) => {
      const paid = sum(D.expenses.filter((e) => e.staffId === s.id && e.month === m), (e) => e.amount);
      const badge = s.active === false ? '<span class="badge gray">غير نشط</span>' : !s.salary ? '' : paid >= s.salary ? '<span class="badge green">قبض الراتب</span>' : `<button class="btn small primary" data-action="paySalary" data-id="${s.id}">صرف الراتب</button>`;
      return `<div class="item"><div class="avatar">${esc(initials(s.name))}</div>
      <div class="main clickable" data-action="editStaff" data-id="${s.id}"><div class="title">${esc(s.name)}</div><div class="sub">${esc(s.role || '')}${s.salary ? ' · الراتب ' + money(s.salary) : ''}${s.phone ? ' · ' + esc(s.phone) : ''}</div></div>${badge}</div>`;
    }).join('') || '<div class="empty">لا يوجد عاملين</div>'}</div>
    <p style="color:var(--muted);font-size:12px">صرف الراتب يُسجَّل تلقائيًا كمصروف في بند "رواتب" لشهر ${monthLabel(m)}.</p>`,
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
    <div class="card"><h3>الإيرادات حسب النوع</h3>${bars(r.byType, 'green')}</div>
    <div class="card"><h3>المصروفات حسب البند</h3>${bars(r.byCat, 'red')}</div>
    <button class="btn primary block" data-action="printReport">🖨️ طباعة تقرير ${monthLabel(m)}</button>`,
  };
}

function viewSettings() {
  const s = settings();
  return {
    title: 'الإعدادات',
    html: `<div class="card"><div class="form">
      <label class="full">اسم الحضانة<input id="sName" value="${esc(s.name || '')}"></label>
      <label>التليفون<input id="sPhone" type="tel" value="${esc(s.phone || '')}"></label>
      <label>العملة<input id="sCurrency" value="${esc(s.currency || 'ج.م')}"></label>
      <label class="full">العنوان<input id="sAddress" value="${esc(s.address || '')}"></label>
      <label class="full">رسوم التسجيل الافتراضية<input id="sRegFee" type="number" value="${esc(s.regFee || '')}"></label>
      <div class="actions"><button class="btn primary" data-action="saveSettings">حفظ</button></div>
    </div></div>
    <div class="card"><h3>البيانات</h3>
      <div class="btn-row"><button class="btn" data-action="exportData">⬇️ تصدير نسخة احتياطية</button><button class="btn" data-action="importData">⬆️ استيراد</button>
      <button class="btn danger" data-action="wipeData">🗑️ مسح كل البيانات</button></div></div>`,
  };
}

const VIEWS = { child: viewChildProfile, classes: viewClasses, staff: viewStaff, reports: viewReports, settings: viewSettings, notes: viewNotes };

// ================== النماذج ==================
let modalSave = null;
function openModal(title, html) { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; modalSave = null; }

function field(f, v) {
  const val = v ?? f.value ?? '';
  const full = f.full ? ' full' : '';
  const req = f.required ? ' required' : '';
  if (f.type === 'select') {
    return `<label class="${full}">${f.label}<select name="${f.name}">${f.options.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  }
  if (f.type === 'textarea') return `<label class="${full}">${f.label}<textarea name="${f.name}" rows="${f.rows || 2}">${esc(val)}</textarea></label>`;
  if (f.type === 'photo') {
    return `<label class="full">${f.label}<div class="photo-pick"><div class="avatar big" id="photoPreview">${val ? `<img src="${val}">` : '📷'}</div>
      <input type="file" accept="image/*" id="photoInput"><input type="hidden" name="${f.name}" value="${esc(val)}"></div></label>`;
  }
  if (f.type === 'checkbox') return `<label class="${full}" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="${f.name}" style="width:auto" ${val ? 'checked' : ''}>${f.label}</label>`;
  return `<label class="${full}">${f.label}<input type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}"${req}${f.step ? ` step="${f.step}"` : ''}></label>`;
}

function openForm({ title, fields, data = {}, onSave, onDelete, deleteLabel = 'حذف' }) {
  openModal(title, `<form class="form" id="mform">${fields.map((f) => field(f, data[f.name])).join('')}
    <div class="actions"><button type="submit" class="btn primary">حفظ</button>${onDelete ? `<button type="button" class="btn danger" id="mdelete">${deleteLabel}</button>` : ''}</div></form>`);
  const form = $('#mform');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = {};
    fields.forEach((f) => {
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
  c = c || { enrollDate: today(), gender: 'ولد', active: true, classId: state.childClass || '' };
  openForm({
    title: isNew ? 'طفل جديد' : 'تعديل بيانات الطفل',
    data: { ...c, active: c.active !== false },
    fields: [
      { name: 'photo', label: 'صورة الطفل', type: 'photo' },
      { name: 'name', label: 'اسم الطفل', required: true, full: true },
      { name: 'birthDate', label: 'تاريخ الميلاد', type: 'date' },
      { name: 'gender', label: 'النوع', type: 'select', options: [['ولد', 'ولد'], ['بنت', 'بنت']] },
      { name: 'classId', label: 'الفصل', type: 'select', options: classOptions() },
      { name: 'enrollDate', label: 'تاريخ الالتحاق', type: 'date' },
      { name: 'monthlyFee', label: 'الاشتراك الشهري', type: 'number' },
      { name: 'guardianRelation', label: 'صلة ولي الأمر', type: 'select', options: [['الأب', 'الأب'], ['الأم', 'الأم'], ['الجد/الجدة', 'الجد/الجدة'], ['أخرى', 'أخرى']] },
      { name: 'guardianName', label: 'اسم ولي الأمر', full: true },
      { name: 'phone', label: 'تليفون ولي الأمر', type: 'tel' },
      { name: 'phone2', label: 'تليفون آخر', type: 'tel' },
      { name: 'address', label: 'العنوان', full: true },
      { name: 'medical', label: 'ملاحظات صحية / حساسية / أدوية', type: 'textarea', full: true },
      { name: 'pickup', label: 'الأشخاص المسموح لهم باستلام الطفل', type: 'textarea', full: true },
      { name: 'notes', label: 'ملاحظات أخرى', type: 'textarea', full: true },
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
      if (isNew && confirm('طباعة / مشاركة إيصال؟')) setTimeout(() => receipt(obj), 50);
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

function receipt(p) {
  const c = child(p.childId) || { name: '' }, s = settings();
  const html = `<div class="receipt"><h2>${esc(s.name || 'الحضانة')}</h2>
    <div class="center">${esc(s.address || '')} ${s.phone ? ' · ' + esc(s.phone) : ''}</div>
    <div class="center" style="margin-top:8px"><b>إيصال استلام نقدية رقم ${num(p.receiptNo)}</b></div>
    <table><tr><td>التاريخ</td><td>${dateLabel(p.date)}</td></tr><tr><td>اسم الطفل</td><td>${esc(c.name)}</td></tr>
    <tr><td>البيان</td><td>${PAYMENT_TYPES[p.type] || ''}${p.type === 'monthly' ? ' - ' + monthLabel(p.month) : ''}${p.note ? ' - ' + esc(p.note) : ''}</td></tr>
    <tr><td>طريقة الدفع</td><td>${esc(p.method || '')}</td></tr><tr class="total"><td>المبلغ</td><td>${money(p.amount)}</td></tr></table>
    <p style="margin-top:30px">توقيع المستلم: ....................</p></div>`;
  const text = `${s.name || 'الحضانة'}\nإيصال رقم ${p.receiptNo}\nالتاريخ: ${dateLabel(p.date)}\nالطفل: ${c.name}\nالبيان: ${PAYMENT_TYPES[p.type]}${p.type === 'monthly' ? ' - ' + monthLabel(p.month) : ''}\nالمبلغ: ${money(p.amount)}\nشكرًا لحضرتك 🌸`;
  openModal('إيصال', `${html}<div class="btn-row" style="margin-top:14px"><button class="btn primary" data-action="doPrint">🖨️ طباعة</button>
    ${c.phone ? `<a class="btn green" target="_blank" href="${waLink(c.phone, text)}">💬 إرسال واتساب</a>` : ''}</div>`);
  $('#printArea').innerHTML = html;
}

function doPrint() {
  if (window.Android && window.Android.print) window.Android.print(); else window.print();
}

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
    onDelete: isNew ? null : async () => { await remove('expenses', e.id); },
  });
}

function classForm(k) {
  const isNew = !k; k = k || {};
  openForm({
    title: isNew ? 'فصل جديد' : 'تعديل فصل', data: k,
    fields: [
      { name: 'name', label: 'اسم الفصل', required: true, full: true },
      { name: 'ageRange', label: 'الفئة العمرية', value: '' },
      { name: 'capacity', label: 'السعة (عدد الأطفال)', type: 'number' },
      { name: 'teacherId', label: 'المعلمة المسؤولة', type: 'select', options: [['', '—'], ...D.staff.filter((s) => s.active !== false).map((s) => [s.id, s.name])], full: true },
    ],
    onSave: async (v) => { await save('classes', { ...k, ...v, id: k.id || uid() }); toast('تم الحفظ ✅'); },
    onDelete: isNew ? null : async () => {
      for (const c of D.children.filter((x) => x.classId === k.id)) await save('children', { ...c, classId: '' });
      await remove('classes', k.id);
    },
  });
}

function staffForm(s) {
  const isNew = !s; s = s || { hireDate: today(), role: STAFF_ROLES[1], active: true };
  openForm({
    title: isNew ? 'موظف جديد' : 'تعديل موظف', data: { ...s, active: s.active !== false },
    fields: [
      { name: 'name', label: 'الاسم', required: true, full: true },
      { name: 'role', label: 'الوظيفة', type: 'select', options: STAFF_ROLES.map((x) => [x, x]) },
      { name: 'salary', label: 'الراتب الشهري', type: 'number' },
      { name: 'phone', label: 'التليفون', type: 'tel' },
      { name: 'hireDate', label: 'تاريخ التعيين', type: 'date' },
      { name: 'nationalId', label: 'الرقم القومي', full: true },
      { name: 'notes', label: 'ملاحظات', type: 'textarea', full: true },
      ...(isNew ? [] : [{ name: 'active', label: 'يعمل حاليًا', type: 'checkbox', full: true }]),
    ],
    onSave: async (v) => { await save('staff', { ...s, ...v, id: s.id || uid(), active: isNew ? true : v.active }); toast('تم الحفظ ✅'); },
    onDelete: isNew ? null : async () => { await remove('staff', s.id); },
  });
}

function noteForm(n, preset = {}) {
  const isNew = !n;
  if (isNew && !childOptions().length) { toast('أضف طفلًا أولاً'); return; }
  const base = n || { date: today(), kind: 'عام', ...preset };
  openForm({
    title: isNew ? 'ملاحظة يومية' : 'تعديل ملاحظة', data: base,
    fields: [
      { name: 'childId', label: 'الطفل', type: 'select', options: childOptions(), full: true },
      { name: 'kind', label: 'النوع', type: 'select', options: NOTE_KINDS.map((x) => [x, x]) },
      { name: 'date', label: 'التاريخ', type: 'date' },
      { name: 'text', label: 'الملاحظة', type: 'textarea', rows: 4, required: true, full: true },
    ],
    onSave: async (v) => { await save('notes', { ...base, ...v, id: base.id || uid() }); toast('تم الحفظ ✅'); },
    onDelete: isNew ? null : async () => { await remove('notes', n.id); },
  });
}

// ================== النسخ الاحتياطي ==================
async function exportData() {
  const data = JSON.stringify(await DB.exportAll());
  const name = `nursery-backup-${today()}.json`;
  if (window.Android && window.Android.saveFile) { window.Android.saveFile(name, data); return; }
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('تم تصدير النسخة الاحتياطية');
}

async function importFile(file) {
  try {
    const json = JSON.parse(await file.text());
    if (!confirm('سيتم استبدال كل البيانات الحالية بالبيانات الموجودة في الملف. متابعة؟')) return;
    await DB.importAll(json); await loadAll(); go('home'); toast('تم استيراد البيانات ✅');
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

const ACTIONS = {
  closeModal, doPrint,
  goAttendance: () => go('attendance'),
  goDues: () => { state.finTab = 'dues'; state.month = thisMonth(); go('finance'); },
  goClasses: () => push('classes'), goStaff: () => push('staff'), goReports: () => push('reports'),
  goSettings: () => push('settings'), goNotes: () => push('notes'),
  openChild: (el) => push('child', { id: el.dataset.id }),
  addChild: () => childForm(null), editChild: (el) => childForm(child(el.dataset.id)),
  addPayment: (el) => paymentForm(null, { ...(el.dataset.child ? { childId: el.dataset.child } : {}), ...(el.dataset.month ? { month: el.dataset.month } : {}) }),
  editPayment: (el) => { const p = D.payments.find((x) => x.id === el.dataset.id); paymentForm(p); $('#mform .actions').insertAdjacentHTML('beforeend', '<button type="button" class="btn" id="mreceipt">🧾 إيصال</button>'); $('#mreceipt').onclick = () => receipt(p); },
  addExpense: () => expenseForm(null), editExpense: (el) => expenseForm(D.expenses.find((x) => x.id === el.dataset.id)),
  addClass: () => classForm(null), editClass: (el) => classForm(cls(el.dataset.id)),
  addStaff: () => staffForm(null), editStaff: (el) => staffForm(D.staff.find((x) => x.id === el.dataset.id)),
  addNote: (el) => noteForm(null, el.dataset.child ? { childId: el.dataset.child } : {}),
  editNote: (el) => noteForm(D.notes.find((x) => x.id === el.dataset.id)),
  paySalary: async (el) => {
    const s = D.staff.find((x) => x.id === el.dataset.id), m = thisMonth();
    const paid = sum(D.expenses.filter((e) => e.staffId === s.id && e.month === m), (e) => e.amount);
    const amount = prompt(`صرف راتب ${s.name} عن ${monthLabel(m)}\nالمبلغ:`, Number(s.salary) - paid);
    if (amount === null || !(Number(amount) > 0)) return;
    await save('expenses', { id: uid(), category: 'رواتب', amount: Number(amount), date: today(), month: m, staffId: s.id, note: `راتب ${monthLabel(m)}` });
    toast('تم صرف الراتب وتسجيله في المصروفات ✅'); render();
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
    const text = `كشف حضور ${dateLabel(state.attDate)}\n${settings().name || ''}\n\n${lines.join('\n')}`;
    if (window.Android && window.Android.share) window.Android.share(text);
    else if (navigator.share) navigator.share({ text }).catch(() => {}); else window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  },
  finTab: (el) => { state.finTab = el.dataset.t; render(); },
  monthNav: (el) => { state.month = addMonths(state.month, Number(el.dataset.k)); render(); },
  saveSettings: async () => {
    await save('settings', { ...settings(), id: 'main', name: $('#sName').value.trim() || 'الحضانة', phone: $('#sPhone').value.trim(), currency: $('#sCurrency').value.trim() || 'ج.م', address: $('#sAddress').value.trim(), regFee: Number($('#sRegFee').value) || '' });
    toast('تم حفظ الإعدادات ✅'); render();
  },
  exportData, importData: () => $('#importFile').click(),
  wipeData: async () => {
    if (!confirm('سيتم مسح كل البيانات نهائيًا! هل عملت نسخة احتياطية؟')) return;
    if (prompt('اكتب كلمة "مسح" للتأكيد') !== 'مسح') return;
    for (const s of DB.STORES) await DB.clear(s);
    await loadAll(); go('home'); toast('تم مسح البيانات');
  },
  printReport: () => {
    const m = state.month, r = reportData(m), s = settings();
    const rows = (o) => Object.entries(o).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${money(v)}</td></tr>`).join('') || '<tr><td colspan="2">—</td></tr>';
    $('#printArea').innerHTML = `<div class="report-print"><h2>${esc(s.name || 'الحضانة')} - تقرير ${monthLabel(m)}</h2>
      <table><tr><th>الإيرادات</th><td>${money(r.inc)}</td></tr><tr><th>المصروفات</th><td>${money(r.exp)}</td></tr><tr><th>الصافي</th><td>${money(r.inc - r.exp)}</td></tr>
      <tr><th>عدد الأطفال</th><td>${num(activeChildren().length)}</td></tr><tr><th>نسبة الحضور</th><td>${r.presentRate === null ? '—' : num(r.presentRate) + '٪'}</td></tr></table>
      <h3>الإيرادات حسب النوع</h3><table>${rows(r.byType)}</table><h3>المصروفات حسب البند</h3><table>${rows(r.byCat)}</table></div>`;
    doPrint();
  },
};

document.addEventListener('click', (e) => {
  const nav = e.target.closest('.bottom-nav button');
  if (nav) { if (!$('#modal').classList.contains('hidden')) closeModal(); go(nav.dataset.tab); return; }
  const el = e.target.closest('[data-action]');
  if (el && ACTIONS[el.dataset.action]) { e.preventDefault(); ACTIONS[el.dataset.action](el); return; }
  if (e.target.id === 'modal') closeModal();
});

document.addEventListener('input', (e) => {
  if (e.target.id === 'childSearch') {
    state.childSearch = e.target.value;
    const pos = e.target.selectionStart; render();
    const s = $('#childSearch'); s.focus(); s.setSelectionRange(pos, pos);
  }
});
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'childClass') { state.childClass = e.target.value; render(); }
  else if (id === 'childStatus') { state.childStatus = e.target.value; render(); }
  else if (id === 'attDate') { state.attDate = e.target.value || today(); render(); }
  else if (id === 'attClass') { state.attClass = e.target.value; render(); }
  else if (id === 'duesClass') { state.duesClass = e.target.value; render(); }
  else if (id === 'monthPick') { state.month = e.target.value || thisMonth(); render(); }
  else if (id === 'importFile' && e.target.files[0]) { importFile(e.target.files[0]); e.target.value = ''; }
});
$('#backBtn').addEventListener('click', back);
window.addEventListener('afterprint', () => { $('#printArea').innerHTML = ''; });
// يستدعيه تطبيق الأندرويد عند الضغط على زر الرجوع؛ يرجع false لو مفيش حاجة نرجع لها
window.nurseryBack = () => {
  if (!$('#modal').classList.contains('hidden')) { closeModal(); return true; }
  if (state.stack.length) { history.back(); return true; }
  if (state.tab !== 'home') { go('home'); return true; }
  return false;
};

(async function init() {
  await loadAll();
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.Android) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
