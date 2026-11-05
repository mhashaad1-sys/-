// ================== التقرير اليومي + الالتزامات + إنستاباي + التنبيهات الشهرية ==================

// ---------- التقرير اليومي ----------
const REPORT_FIELDS = {
  breakfast: { label: 'الفطار', icon: '🥪', opts: [['all', 'كله'], ['half', 'نصه'], ['little', 'شوية'], ['none', 'ما أكلش']] },
  lunch: { label: 'الغدا', icon: '🍲', opts: [['all', 'كله'], ['half', 'نصه'], ['little', 'شوية'], ['none', 'ما أكلش']] },
  nap: { label: 'النوم', icon: '😴', opts: [['none', 'ما نامش'], ['30', 'نص ساعة'], ['60', 'ساعة'], ['90', 'ساعة ونص'], ['120', 'ساعتين']] },
  mood: { label: 'المزاج', icon: '🙂', opts: [['happy', '😄 مبسوط'], ['calm', '🙂 هادي'], ['sad', '😢 زعلان'], ['tired', '😪 تعبان'], ['sick', '🤒 عيان']] },
  toilet: { label: 'الحمام', icon: '🚽', opts: [['ok', 'طبيعي'], ['diaper', 'غيرنا البامبرز'], ['accident', 'حصلت حادثة']] },
};
const repOf = (date, cid) => D.reports.find((r) => r.id === `${date}_${cid}`);
const optLabel = (f, v) => ((REPORT_FIELDS[f].opts.find((o) => o[0] === v) || [])[1] || '');
function reportText(rep, name) {
  if (!rep) return '';
  const lines = Object.keys(REPORT_FIELDS).filter((f) => rep[f]).map((f) => `${REPORT_FIELDS[f].icon} ${REPORT_FIELDS[f].label}: ${optLabel(f, rep[f])}`);
  if (rep.activity) lines.push(`🎨 النشاط: ${rep.activity}`);
  if (rep.note) lines.push(`📝 ${rep.note}`);
  return `📋 تقرير ${name || ''} - ${dateLabel(rep.date)}\n${lines.join('\n')}`;
}
async function setReport(cid, field, value) {
  const d = state.repDate, old = repOf(d, cid) || { id: `${d}_${cid}`, date: d, childId: cid };
  const rep = { ...old, [field]: old[field] === value ? '' : value, by: Cloud.name || '' };
  await save('reports', rep);
}
function viewDaily() {
  const d = state.repDate;
  let kids = activeChildren();
  if (state.repClass) kids = kids.filter((c) => c.classId === state.repClass);
  const present = kids.filter((c) => { const a = attOf(d, c.id); return !a || a.status !== 'absent'; });
  const done = present.filter((c) => repOf(d, c.id)).length;
  return {
    title: 'التقرير اليومي',
    html: `<div class="toolbar"><input type="date" id="repDate" value="${d}"><select id="repClass">${classOpts(state.repClass)}</select></div>
    <div class="card" style="padding:10px 12px"><div class="between"><b>${dateLabel(d)}</b><span class="badge ${done === present.length ? 'green' : 'orange'}">${num(done)} / ${num(present.length)}</span></div>
      <div class="btn-row" style="margin-top:8px"><button class="btn small green" data-action="repTemplate">⚡ نفس التقرير للكل</button></div>
      <div class="sub" style="margin-top:6px">اضغط على الاختيار عشان تسجله، واضغط تاني عشان تشيله. التقرير بيوصل لولي الأمر في التطبيق لوحده.</div></div>
    <div class="list">${present.map((c) => {
      const r = repOf(d, c.id) || {};
      return `<div class="card rep-card"><div class="between"><div class="row">${avatar(c)}<b>${esc(c.name)}</b></div>
        ${r.id && c.phone && !c.parentLogin ? `<a class="btn small green" target="_blank" href="${waLink(c.phone, reportText(r, c.name) + '\n' + settings().name)}">💬</a>` : ''}</div>
        ${Object.entries(REPORT_FIELDS).map(([f, def]) => `<div class="rep-row"><span>${def.icon} ${def.label}</span><div class="chips">${def.opts.map(([v, l]) => `<button class="chip ${r[f] === v ? 'on' : ''}" data-action="repSet" data-id="${c.id}" data-f="${f}" data-v="${v}">${l}</button>`).join('')}</div></div>`).join('')}
        <div class="rep-row"><span>🎨 النشاط</span><input class="rep-in" data-rep="${c.id}" data-f="activity" value="${esc(r.activity || '')}" placeholder="مثال: لون شجرة"></div>
        <div class="rep-row"><span>📝 ملاحظة</span><input class="rep-in" data-rep="${c.id}" data-f="note" value="${esc(r.note || '')}" placeholder="اختياري"></div></div>`;
    }).join('') || '<div class="empty">مفيش أطفال حاضرين</div>'}</div>`,
  };
}
function repTemplateForm() {
  openForm({
    title: '⚡ نفس التقرير لكل الأطفال اللي لسه ماتسجلش لهم',
    data: { breakfast: 'all', lunch: 'all', nap: '60', mood: 'happy', toilet: 'ok' },
    fields: [
      ...Object.entries(REPORT_FIELDS).map(([f, def]) => ({ name: f, label: `${def.icon} ${def.label}`, type: 'select', options: [['', '—'], ...def.opts] })),
      { name: 'activity', label: '🎨 نشاط اليوم', full: true, list: ACTIVITY_BANK },
    ],
    onSave: async (v) => {
      const d = state.repDate;
      let kids = activeChildren(); if (state.repClass) kids = kids.filter((c) => c.classId === state.repClass);
      let n = 0;
      for (const c of kids) {
        const a = attOf(d, c.id); if (a && a.status === 'absent') continue;
        const old = repOf(d, c.id);
        if (old && Object.keys(REPORT_FIELDS).some((f) => old[f])) continue;
        await save('reports', { ...(old || {}), id: `${d}_${c.id}`, date: d, childId: c.id, ...v, by: Cloud.name || '' }); n++;
      }
      toast(`تم تسجيل ${num(n)} تقرير ✅ — عدّل المختلف بس`);
    },
  });
}

// ---------- إنستاباي ----------
function copyText(t) {
  if (window.Android && window.Android.copy) { window.Android.copy(t); toast('تم النسخ ✅'); return; }
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('تم النسخ ✅'), () => prompt('انسخ الرقم:', t));
}
function instaCard(childName, amount, purpose = 'اشتراك الحضانة') {
  const s = settings(); const num1 = s.instapay || '';
  if (!num1) return '';
  const who = childName || (typeof Cloud !== 'undefined' && Cloud.name) || '';
  const note = purpose === 'اشتراك الحضانة' ? who : `${/تطبيق/.test(purpose) ? 'اشتراك' : 'تمارين'} ${who}`;
  return `<div class="insta">
    <div class="insta-head"><span class="insta-logo">⚡ InstaPay</span><span>${esc(purpose)}${amount ? ' · <b>' + money(amount) + '</b>' : ''}</span></div>
    <div class="insta-num" dir="ltr">${esc(num1)}</div>
    <div class="btn-row" style="justify-content:center"><button class="btn small" data-action="copy" data-t="${esc(num1)}">📋 نسخ الرقم</button>
      ${typeof IS_IOS !== 'undefined' && IS_IOS ? '' : '<button class="btn small primary" data-action="openInsta">فتح إنستاباي</button>'}</div>
    <div class="insta-note">✍️ اكتب في ملاحظات التحويل: <b>${esc(note)}</b> <button class="link" data-action="copy" data-t="${esc(note)}">نسخ</button></div>
    ${s.phone ? `<a class="btn small green block" style="margin-top:8px;text-align:center" target="_blank" href="${waLink(s.phone, `السلام عليكم، حوّلت ${amount ? money(amount) : ''} على إنستاباي — ${purpose} — ${childName}`)}">💬 ابعت صورة التحويل للحضانة</a>` : ''}
  </div>`;
}
function openInsta() {
  if (window.Android && window.Android.openApp) window.Android.openApp('com.egyptianbanks.instapay');
  else openUrl('https://play.google.com/store/apps/details?id=com.egyptianbanks.instapay');
}

// ---------- الالتزامات الشهرية (للإدارة) ----------
const DEFAULT_OBLIGATIONS = [
  { id: 'rent', name: 'الإيجار', amount: 9000, from: 1, to: 5, category: 'إيجار' },
  { id: 'salaries', name: 'المرتبات', amount: '', from: 1, to: 5, category: 'رواتب', auto: 'salaries' },
  { id: 'elec', name: 'الكهرباء', amount: '', from: 1, to: 10, category: 'كهرباء ومياه وغاز' },
  { id: 'water', name: 'المياه', amount: '', from: 1, to: 10, category: 'كهرباء ومياه وغاز' },
  { id: 'net', name: 'الإنترنت والتليفون', amount: '', from: 1, to: 10, category: 'إنترنت وتليفون' },
];
const obligations = () => settings().obligations || DEFAULT_OBLIGATIONS;
function obligationAmount(o) { return o.auto === 'salaries' ? sum(activeStaff(), (s) => s.salary) : Number(o.amount) || 0; }
function obligationStatus(o, m = thisMonth()) {
  let paid;
  if (o.auto === 'salaries') { const st = activeStaff().filter((s) => Number(s.salary)); paid = st.length > 0 && st.every((s) => staffMonth(s, m).remaining <= 0); }
  else paid = D.expenses.some((e) => e.obligationId === o.id && e.month === m);
  const day = new Date().getDate(), cur = m === thisMonth();
  if (paid) return { key: 'paid', label: '✅ اتدفع', cls: 'green' };
  if (cur && day > o.to) return { key: 'late', label: '⚠️ متأخر', cls: 'red' };
  if (cur && day >= o.from) return { key: 'due', label: `مستحق لحد ${num(o.to)}`, cls: 'orange' };
  return { key: 'soon', label: `من ${num(o.from)} لـ ${num(o.to)}`, cls: 'gray' };
}
function obligationsCard() {
  if (!can('manage') && !can('finance')) return '';
  const list = obligations().map((o) => ({ o, s: obligationStatus(o) }));
  const open = list.filter((x) => x.s.key !== 'paid');
  if (!list.length) return '';
  return `<div class="card"><div class="section-title" style="margin:0 0 8px"><h3>📌 التزامات ${monthLabel(thisMonth())}</h3><button class="btn small" data-action="goObligations">تعديل</button></div>
    ${list.map(({ o, s }) => `<div class="ob-row"><div><b>${esc(o.name)}</b> <span class="sub">${obligationAmount(o) ? money(obligationAmount(o)) : 'المبلغ متغير'}</span></div>
      <div class="row"><span class="badge ${s.cls}">${s.label}</span>${s.key !== 'paid' ? `<button class="btn small primary" data-action="payObligation" data-id="${o.id}">اتدفع</button>` : ''}</div></div>`).join('')}
    ${open.length ? '' : '<div class="sub" style="margin-top:6px">كل التزامات الشهر اتدفعت 👏</div>'}</div>`;
}
async function payObligation(id) {
  const o = obligations().find((x) => x.id === id); if (!o) return;
  if (o.auto === 'salaries') { state.staffTab = 'pay'; state.month = thisMonth(); go('staff'); return; }
  const v = prompt(`المبلغ المدفوع لـ ${o.name} (${monthLabel(thisMonth())}):`, obligationAmount(o) || '');
  if (v === null || !(Number(toNum(v)) > 0)) return;
  await save('expenses', { id: uid(), date: today(), month: thisMonth(), category: o.category || 'أخرى', amount: Number(toNum(v)), note: `${o.name} - ${monthLabel(thisMonth())}`, obligationId: o.id });
  toast('تم التسجيل في المصروفات ✅'); render();
}
function viewObligations() {
  return {
    title: 'الالتزامات الشهرية',
    html: `<p class="sub" style="color:var(--muted)">بيوصلك تنبيه على الموبايل أول يوم الاستحقاق وآخر يوم لو لسه مادفعتش.</p>
    <div class="list">${obligations().map((o) => `<div class="item clickable" data-action="editObligation" data-id="${o.id}"><div class="avatar">📌</div>
      <div class="main"><div class="title">${esc(o.name)}</div><div class="sub">${o.auto === 'salaries' ? 'إجمالي المرتبات تلقائي: ' + money(obligationAmount(o)) : o.amount ? money(o.amount) : 'المبلغ متغير'} · من يوم ${num(o.from)} لـ ${num(o.to)}</div></div><span>✏️</span></div>`).join('')}</div>
    <button class="btn primary block" style="margin-top:10px" data-action="editObligation">+ التزام جديد</button>
    <div class="btn-row" style="margin-top:10px">${calendarButton('admin')}</div>`,
  };
}
function obligationForm(o) {
  const isNew = !o; o = o || { id: uid(), from: 1, to: 5, category: 'أخرى' };
  openForm({
    title: isNew ? 'التزام جديد' : o.name, data: o,
    fields: [
      { name: 'name', label: 'الاسم', required: true, full: true, list: ['الإيجار', 'الكهرباء', 'المياه', 'الغاز', 'الإنترنت', 'الأمن', 'النظافة', 'قسط'] },
      ...(o.auto ? [] : [{ name: 'amount', label: 'المبلغ (فاضي لو متغير)', type: 'number' }]),
      { name: 'from', label: 'من يوم', type: 'number' }, { name: 'to', label: 'لحد يوم', type: 'number' },
      ...(o.auto ? [] : [{ name: 'category', label: 'بند المصروفات', type: 'select', options: EXPENSE_CATEGORIES.map((x) => [x, x]) }]),
    ],
    onSave: async (v) => {
      const from = Math.min(28, Math.max(1, Number(v.from) || 1)), to = Math.min(31, Math.max(from, Number(v.to) || from));
      const list = obligations().filter((x) => x.id !== o.id);
      const i = obligations().findIndex((x) => x.id === o.id);
      list.splice(i < 0 ? list.length : i, 0, { ...o, ...v, from, to });
      await saveSettings({ obligations: list });
    },
    onDelete: isNew || o.auto ? null : async () => { await saveSettings({ obligations: obligations().filter((x) => x.id !== o.id) }); },
  });
}

// ---------- التنبيهات الشهرية على الموبايل (بتشتغل حتى لو التطبيق مقفول) ----------
let lastReminders = '';
function reminderList(kind) {
  const list = [], m = thisMonth(), s = settings();
  if (kind === 'parent') {
    for (const k of famKids()) {
      const fb = famBalance(k); if (!fb || !fb.fee) continue;
      const skip = fb.thisRemaining <= 0 ? m : '';
      const pay = s.instapay ? `حوّل على إنستاباي ${s.instapay} واكتب اسم ${k.name} في ملاحظات التحويل` : 'برجاء السداد للحضانة';
      list.push({ id: `fee1_${k.id}`, day: 1, hour: 10, minute: 0, skipMonth: skip, title: `🌸 اشتراك الشهر الجديد - ${k.name}`, body: `${money(fb.fee)} · ${pay}` });
      list.push({ id: `fee5_${k.id}`, day: 5, hour: 18, minute: 0, skipMonth: skip, title: `⏰ تذكير باشتراك ${k.name}`, body: `${money(fb.thisRemaining || fb.fee)} لو لسه ما اتدفعش · ${pay}` });
    }
  } else {
    for (const o of obligations()) {
      const st = obligationStatus(o), skip = st.key === 'paid' ? m : '';
      const amt = obligationAmount(o) ? money(obligationAmount(o)) : '';
      list.push({ id: `ob1_${o.id}`, day: o.from, hour: 10, minute: 0, skipMonth: skip, title: `📌 ${o.name} مستحق`, body: `${amt} · من يوم ${o.from} لـ ${o.to}` });
      if (o.to !== o.from) list.push({ id: `ob2_${o.id}`, day: o.to, hour: 10, minute: 0, skipMonth: skip, title: `⚠️ النهارده آخر يوم: ${o.name}`, body: `${amt} لو لسه ما اتدفعش` });
    }
  }
  return list;
}
function syncReminders() {
  if (!window.Android || !window.Android.setReminders) return;
  const kind = isParent() ? 'parent' : (Cloud.role ? can('manage') || can('finance') : true) ? 'admin' : '';
  const list = kind ? reminderList(kind) : [];
  const json = JSON.stringify(list);
  if (json !== lastReminders) { lastReminders = json; try { window.Android.setReminders(json); } catch (e) { /* ignore */ } }
}

// ================== الآيفون (تطبيق ويب على الشاشة الرئيسية) ==================
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function iosInstallHTML() {
  return `<div class="ios-install"><b>📲 ثبّت براعم على الآيفون</b>
    <ol><li>افتح الرابط ده من <b>Safari</b></li><li>اضغط زرار المشاركة <span class="ios-share">⬆︎</span> تحت</li>
    <li>اختار <b>«إضافة إلى الشاشة الرئيسية»</b> ثم «إضافة»</li></ol>
    <div class="sub">هيظهر لوجو براعم على الشاشة ويفتح زي أي تطبيق.</div></div>`;
}
function iosBanner() {
  if (!IS_IOS || IS_STANDALONE || LS.get('iosHint') === '1') return '';
  return `<div class="card ios-banner">${iosInstallHTML()}<button class="btn small" data-action="iosHintOff">تمام، فهمت</button></div>`;
}

// ---------- تذكير في التقويم (للآيفون ولأي موبايل من غير تطبيق الأندرويد) ----------
function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;'); }
function icsMonthly(events) {
  const now = new Date(), st = (d) => { const x = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > d ? 1 : 0), d); return `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`; };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Baraem//Nursery//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...events.flatMap((e, i) => ['BEGIN:VEVENT', `UID:baraem-${e.id || i}-${Date.now()}@baraem`, `DTSTAMP:${stamp}`,
      `DTSTART:${st(e.day)}T${pad(e.hour)}${pad(e.minute || 0)}00`, `DTEND:${st(e.day)}T${pad(e.hour)}${pad((e.minute || 0) + 15)}00`,
      `RRULE:FREQ=MONTHLY;BYMONTHDAY=${e.day}`, `SUMMARY:${icsEsc(e.title)}`, `DESCRIPTION:${icsEsc(e.body)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(e.title)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT']),
    'END:VCALENDAR'].join('\r\n');
}
function addToCalendar(kind) {
  const evs = reminderList(kind);
  if (!evs.length) { toast('مفيش تذكيرات'); return; }
  const ics = icsMonthly(evs), name = kind === 'parent' ? 'baraem-fees.ics' : 'baraem-obligations.ics';
  if (IS_IOS) { location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics); return; }
  saveBlob(name, new Blob([ics], { type: 'text/calendar' }));
  toast('افتح الملف وهيتضاف للتقويم 📅');
}
function calendarButton(kind) {
  if (window.Android && window.Android.setReminders) return ''; // الأندرويد عنده تنبيهات تلقائية
  return `<button class="btn small" data-action="addCal" data-kind="${kind}">📅 ${kind === 'parent' ? 'ذكّرني بالاشتراك كل شهر' : 'ضيف الالتزامات لتقويم الموبايل'}</button>`;
}
function notifyButton() {
  if ((window.Android && window.Android.notify) || !('Notification' in window) || Notification.permission === 'granted') return '';
  if (IS_IOS && !IS_STANDALONE) return '';
  return `<button class="btn small" data-action="askNotify">🔔 تفعيل الإشعارات</button>`;
}
