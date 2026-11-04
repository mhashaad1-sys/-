// ================== بوابة أولياء الأمور ==================
// ولي الأمر بيدخل برقم موبايله، ويشوف ملف طفله بس: الحضور، الملاحظات، المصاريف، الإعلانات، الجدول،
// ويقدر يبعت طلبات (غياب، دواء، خروج بدري، حد تاني هيستلم، ملاحظة).
// الحضانة بتنشر ملف كل طفل في org/baraem/family/{childId} كل ما حاجة تتغير.

const REQUEST_TYPES = {
  absence: { label: 'طلب غياب', icon: '🏠', fields: [['from', 'من يوم', 'date', true], ['to', 'لحد يوم (لو أكتر من يوم)', 'date'], ['reason', 'السبب', 'textarea', true]] },
  medicine: { label: 'دواء', icon: '💊', fields: [['medName', 'اسم الدواء', 'text', true], ['dose', 'الجرعة', 'text', true], ['time', 'الميعاد', 'text'], ['from', 'من يوم', 'date', true], ['to', 'لحد يوم', 'date'], ['reason', 'ملاحظات', 'textarea']] },
  early: { label: 'خروج بدري', icon: '⏰', fields: [['from', 'اليوم', 'date', true], ['time', 'الساعة', 'time', true], ['reason', 'السبب', 'textarea']] },
  pickup: { label: 'حد تاني هيستلم الطفل', icon: '🧍', fields: [['from', 'اليوم', 'date', true], ['person', 'اسم الشخص وصلته بالطفل', 'text', true], ['phone', 'تليفونه', 'tel']] },
  note: { label: 'ملاحظة / طلب خاص', icon: '📝', fields: [['reason', 'اكتب الملاحظة', 'textarea', true]] },
};
const REQ_STATUS = { pending: ['في الانتظار', 'orange'], approved: ['تمت الموافقة', 'green'], rejected: ['مرفوض', 'red'], cancelled: ['ملغي', 'gray'] };
const isParent = () => Cloud.role === 'parent';

function reqDetails(r) {
  const parts = [];
  if (r.type === 'medicine') parts.push(`${r.medName || ''} — ${r.dose || ''}${r.time ? ' — ' + r.time : ''}`);
  if (r.type === 'pickup') parts.push(`${r.person || ''}${r.phone ? ' · ' + r.phone : ''}`);
  if (r.from) parts.push(r.to && r.to !== r.from ? `من ${dateLabel(r.from)} لـ ${dateLabel(r.to)}` : dateLabel(r.from));
  if (r.type === 'early' && r.time) parts.push('الساعة ' + r.time);
  if (r.reason) parts.push(r.reason);
  return parts.filter(Boolean).join('\n');
}
function reqRow(r, staff) {
  const t = REQUEST_TYPES[r.type] || REQUEST_TYPES.note, st = REQ_STATUS[r.status] || REQ_STATUS.pending;
  const name = staff ? (child(r.childId) || {}).name || r.childName || '' : '';
  return `<div class="item req ${staff && r.status === 'pending' ? 'clickable' : ''}" ${staff && r.status === 'pending' ? `data-action="decideReq" data-id="${r.id}"` : ''}>
    <div class="avatar">${t.icon}</div>
    <div class="main"><div class="title">${staff ? esc(name) + ' · ' : ''}${t.label} <span class="badge ${st[1]}">${st[0]}</span></div>
    <div class="sub" style="white-space:pre-wrap">${esc(reqDetails(r))}</div>
    ${r.reply ? `<div class="reply">💬 ${esc(r.reply)}</div>` : ''}
    <div class="sub">${staff ? 'من ' + esc(r.byName || 'ولي الأمر') + ' · ' : ''}${r.createdAt ? new Date(r.createdAt).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''}</div></div>
    ${!staff && r.status === 'pending' ? `<button class="btn small" data-action="cancelReq" data-id="${r.id}" data-child="${r.childId}">إلغاء</button>` : ''}
    ${staff && r.status === 'pending' ? '<span class="btn small primary">رد</span>' : ''}</div>`;
}

// ---------- الإشعارات ----------
function sysNotify(title, body) {
  try {
    if (window.Android && window.Android.notify) { window.Android.notify(title, body); return; }
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: 'img/logo-192.png' });
  } catch (e) { /* ignore */ }
}
function notifyRequest(r) {
  const t = REQUEST_TYPES[r.type] || REQUEST_TYPES.note;
  const c = child(r.childId);
  sysNotify(`${t.icon} ${t.label} - ${c ? c.name : r.childName || ''}`, reqDetails(r));
}
function parentNotify(kind, cid, before, after) {
  if (kind === 'announcements') {
    after.filter((a) => !before.includes(a.id)).forEach((a) => sysNotify('📢 ' + (a.title || 'إعلان من الحضانة'), a.text || ''));
  } else if (kind === 'requests') {
    after.forEach((r) => { const o = before.find((x) => x.id === r.id); if (o && o.status !== r.status && r.status !== 'cancelled') sysNotify(`${REQUEST_TYPES[r.type]?.icon || ''} ${REQ_STATUS[r.status][0]}`, `${REQUEST_TYPES[r.type]?.label || ''}${r.reply ? ': ' + r.reply : ''}`); });
  } else if (kind === 'family') {
    const name = after.name || '';
    const bn = (before.notes || []).length, an = (after.notes || []).length;
    if (an > bn || ((after.notes || [])[0] && JSON.stringify((after.notes || [])[0]) !== JSON.stringify((before.notes || [])[0]))) {
      const n = after.notes[0]; sysNotify(`📝 ملاحظة عن ${name}`, n.t);
    }
    const d = today(), a0 = (before.att || {})[d], a1 = (after.att || {})[d];
    if (a1 && (!a0 || a0.s !== a1.s)) sysNotify(`${a1.s === 'absent' ? '❌' : '✅'} ${name}`, a1.s === 'absent' ? 'متسجل غياب النهارده' : `وصل الحضانة${a1.i ? ' الساعة ' + a1.i : ''}`);
    if (a1 && a1.o && (!a0 || !a0.o)) sysNotify(`🚪 ${name}`, `خرج من الحضانة الساعة ${a1.o}`);
    const fb = famBalance(before), fa = famBalance(after);
    if (fa && fb && fa.payments > fb.payments) sysNotify('💵 تم استلام دفعة', `شكرًا لحضرتك — ${name}`);
  }
}

// ---------- نشر ملف الطفل لولي الأمر (من موبايلات الحضانة) ----------
const famTimers = {};
function queueFamily(cid) {
  if (!Cloud.role || isParent() || !cid) return;
  const c = child(cid);
  if (!c || !c.parentLogin) return;
  clearTimeout(famTimers[cid]);
  famTimers[cid] = setTimeout(() => publishFamily(cid), 700);
}
function publishFamily(cid) {
  const c = child(cid); if (!c) return;
  const cut = new Date(); cut.setDate(cut.getDate() - 150);
  const cutoff = `${cut.getFullYear()}-${pad(cut.getMonth() + 1)}-${pad(cut.getDate())}`;
  const att = {};
  D.attendance.filter((a) => a.childId === cid && a.date >= cutoff).forEach((a) => { att[a.date] = { s: a.status, i: a.checkIn || '', o: a.checkOut || '', e: a.excuse || '' }; });
  const data = {
    childId: cid, name: c.name, className: className(c.classId), photo: c.photo || '', birthDate: c.birthDate || '', gender: c.gender || '',
    medical: c.medical || '', pickup: c.pickup || '', active: c.active !== false, classId: c.classId || '', att,
    notes: D.notes.filter((n) => n.childId === cid && n.share !== false).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id)).slice(0, 30).map((n) => ({ d: n.date, k: n.kind, t: n.text })),
  };
  if (can('finance')) {
    const monthly = {};
    D.payments.filter((p) => p.childId === cid && p.type === 'monthly').forEach((p) => { monthly[p.month] = (monthly[p.month] || 0) + Number(p.amount || 0); });
    data.fin = {
      fee: Number(c.monthlyFee) || 0, start: (c.enrollDate || c.createdAt || today()).slice(0, 7), end: c.active === false && c.leaveDate ? c.leaveDate.slice(0, 7) : '',
      monthly, payments: D.payments.filter((p) => p.childId === cid).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 30)
        .map((p) => ({ d: p.date, a: Number(p.amount), t: PAYMENT_TYPES[p.type] || '', m: p.type === 'monthly' ? p.month : '', r: p.receiptNo || '', w: p.method || '' })),
    };
  }
  Cloud.setFamily(cid, data);
}
function famBalance(k) {
  const f = k && k.fin; if (!f) return null;
  const end = f.end || thisMonth();
  const months = Math.max(0, monthDiff(f.start, end) + 1);
  const paid = Object.entries(f.monthly || {}).filter(([m]) => m >= f.start && m <= end).reduce((s, [, v]) => s + v, 0);
  const thisPaid = (f.monthly || {})[thisMonth()] || 0;
  return { fee: f.fee, balance: Math.max(0, months * f.fee - paid), thisPaid, thisRemaining: Math.max(0, f.fee - thisPaid), payments: (f.payments || []).length };
}

// ================== شاشات ولي الأمر ==================
const PARENT_TABS = [['pHome', '🏠', 'الرئيسية'], ['pAtt', '📅', 'الحضور'], ['pReq', '📨', 'الطلبات'], ['pFees', '💵', 'المصاريف'], ['pMore', '☰', 'المزيد']];
function famKids() { return (Cloud.childIds || []).map((id) => ({ ...(Cloud.fam[id] || {}), id })); }
function curKid() { const ks = famKids(); return ks.find((k) => k.id === state.kid) || ks[0] || { id: '' }; }
function kidSwitcher() {
  const ks = famKids(); if (ks.length < 2) return '';
  return `<div class="day-tabs">${ks.map((k) => `<button class="${k.id === curKid().id ? 'active' : ''}" data-action="pickKid" data-id="${k.id}">${esc(k.name || '...')}</button>`).join('')}</div>`;
}
function seen(k) { return Number(LS.get('seen_' + k) || 0); }
function markSeen(k) { LS.set('seen_' + k, String(Date.now())); }
function parentBadges() {
  const reqs = Object.values(Cloud.req).flat();
  const newReplies = reqs.filter((r) => r.decidedAt && new Date(r.decidedAt).getTime() > seen('req')).length;
  return { pReq: newReplies };
}

function viewPHome() {
  const k = curKid(), s = settings(), t = today();
  if (!k.name) return `${kidSwitcher()}<div class="card empty">جاري تحميل بيانات طفلك... ⏳<br><small>لو فضلت الرسالة دي، اتأكد من الإنترنت أو كلم الحضانة.</small></div>`;
  const a = (k.att || {})[t];
  const m = thisMonth(), monthAtt = Object.entries(k.att || {}).filter(([d]) => d.startsWith(m)).map(([, v]) => v.s);
  const fb = famBalance(k);
  const anns = [...D.announcements].sort((x, y) => (y.date + y.id).localeCompare(x.date + x.id)).slice(0, 3);
  const newAnn = anns.filter((x) => x.createdAt && new Date(x.createdAt).getTime() > seen('ann')).length;
  const di = DAY_INDEX[new Date().getDay()];
  const sch = (k.classId && D.schedule.find((x) => x.id === k.classId && x.slots && x.slots.length)) || D.schedule.find((x) => x.id === 'general');
  const reqs = (Cloud.req[k.id] || []).filter((r) => r.status === 'pending').length;
  return `${kidSwitcher()}
  <div class="card kid-card"><div class="profile-head">${avatar(k, true)}<div>
    <h2>${esc(k.name)}</h2><div class="sub">${[k.className && k.className !== 'بدون فصل' ? esc(k.className) : '', k.birthDate ? age(k.birthDate) : ''].filter(Boolean).join(' · ')}</div>
    <div style="margin-top:6px">${a ? (a.s === 'absent' ? `<span class="badge red">❌ غائب النهارده${a.e ? ' (بإذن)' : ''}</span>` : `<span class="badge green">✅ في الحضانة${a.i ? ' من ' + a.i : ''}</span>${a.o ? ` <span class="badge blue">🚪 خرج ${a.o}</span>` : ''}`) : '<span class="badge gray">لسه ما اتسجلش حضور النهارده</span>'}</div>
  </div></div></div>
  ${fb && fb.balance > 0 ? `<div class="card due-card"><b>💵 مستحق على ${esc(k.name)}: ${money(fb.balance)}</b>${s.payInfo ? `<div class="sub" style="white-space:pre-wrap;margin-top:6px">${esc(s.payInfo)}</div>` : ''}
    <div class="btn-row" style="margin-top:8px"><button class="btn small" data-action="pTab" data-t="pFees">التفاصيل</button></div></div>` : ''}
  <div class="quick">
    <button data-action="newReq" data-type="absence"><span>🏠</span>طلب غياب</button>
    <button data-action="newReq" data-type="medicine"><span>💊</span>دواء</button>
    <button data-action="newReq" data-type="pickup"><span>🧍</span>حد هيستلم</button>
    <button data-action="newReq" data-type="note"><span>📝</span>ملاحظة</button>
  </div>
  ${reqs ? `<div class="alert">📨 عندك ${num(reqs)} طلب في انتظار رد الحضانة</div>` : ''}
  <div class="stats">
    <div class="stat green"><div class="label">حضور ${monthLabel(m)}</div><div class="value">${num(monthAtt.filter((x) => x !== 'absent').length)} يوم</div></div>
    <div class="stat red"><div class="label">غياب ${monthLabel(m)}</div><div class="value">${num(monthAtt.filter((x) => x === 'absent').length)} يوم</div></div>
  </div>
  ${anns.length ? `<div class="section-title"><h3>📢 إعلانات الحضانة ${newAnn ? `<span class="badge red">${num(newAnn)} جديد</span>` : ''}</h3></div>
  <div class="list">${anns.map(annRow).join('')}</div>` : ''}
  ${sch && sch.slots && sch.slots.length && di !== undefined ? `<div class="card"><h3>📅 جدول النهارده${sch.theme ? ` · <span class="badge purple">${esc(sch.theme)}</span>` : ''}</h3>
    ${sch.slots.filter((x) => x.cells[di]).map((x) => `<div class="sched-mini"><span>${esc(x.time)}</span><b>${esc(x.cells[di])}</b></div>`).join('')}</div>` : ''}
  ${(k.notes || []).length ? `<div class="section-title"><h3>📝 ملاحظات الحضانة عن ${esc(k.name)}</h3></div>
  <div class="list">${k.notes.slice(0, 5).map(famNoteRow).join('')}</div>` : ''}
  ${k.medical ? `<div class="card"><h3>⚕️ الملاحظات الصحية المسجلة</h3><div style="white-space:pre-wrap">${esc(k.medical)}</div><div class="sub">لو في تغيير ابعت ملاحظة للحضانة.</div></div>` : ''}`;
}
function annRow(a) {
  return `<div class="item"><div class="avatar">📢</div><div class="main"><div class="title">${esc(a.title || 'إعلان')}</div>
    <div style="white-space:pre-wrap;margin-top:2px">${esc(a.text || '')}</div><div class="sub">${dateLabel(a.date)}</div></div></div>`;
}
function famNoteRow(n) {
  return `<div class="item"><div class="main"><div class="title"><span class="badge ${n.k === 'حادثة / إصابة' || n.k === 'صحة' ? 'red' : 'blue'}">${esc(n.k)}</span> <span class="sub">${dateLabel(n.d)}</span></div>
    <div style="white-space:pre-wrap;margin-top:4px">${esc(n.t)}</div></div></div>`;
}

function viewPAtt() {
  const k = curKid(), m = state.month;
  const [y, mo] = m.split('-').map(Number);
  const first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
  const offset = (first.getDay() + 1) % 7; // السبت أول الأسبوع
  const att = k.att || {};
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push('<div></div>');
  for (let d = 1; d <= days; d++) {
    const ds = `${m}-${pad(d)}`, a = att[ds], fri = new Date(y, mo - 1, d).getDay() === 5;
    cells.push(`<div class="cal-day ${a ? a.s : fri ? 'off' : ''} ${ds === today() ? 'today' : ''}" title="${a && a.i ? 'دخول ' + a.i : ''}">${num(d)}${a && a.e ? '<i>إذن</i>' : ''}</div>`);
  }
  const vals = Object.entries(att).filter(([d]) => d.startsWith(m)).map(([, v]) => v);
  return `${kidSwitcher()}${monthPicker()}
  <div class="stats">
    <div class="stat green"><div class="label">حاضر</div><div class="value">${num(vals.filter((v) => v.s === 'present').length)}</div></div>
    <div class="stat orange"><div class="label">متأخر</div><div class="value">${num(vals.filter((v) => v.s === 'late').length)}</div></div>
    <div class="stat red"><div class="label">غائب</div><div class="value">${num(vals.filter((v) => v.s === 'absent').length)}</div></div>
  </div>
  <div class="card"><div class="cal">${['سبت', 'أحد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة'].map((d) => `<div class="cal-h">${d}</div>`).join('')}${cells.join('')}</div>
    <div class="legend"><span><i style="background:var(--green)"></i>حاضر</span><span><i style="background:var(--orange)"></i>متأخر</span><span><i style="background:var(--red)"></i>غائب</span></div></div>
  <div class="list">${Object.entries(att).filter(([d]) => d.startsWith(m)).sort((a, b) => b[0].localeCompare(a[0])).map(([d, v]) => `<div class="item"><div class="main"><div class="title">${dateLabel(d)}</div>
    <div class="sub">${v.i ? 'دخول ' + v.i : ''}${v.o ? ' · خروج ' + v.o : ''}${v.e ? ' · ' + esc(v.e) : ''}</div></div><span class="badge ${{ present: 'green', late: 'orange', absent: 'red' }[v.s]}">${ATT_LABEL[v.s]}</span></div>`).join('') || '<div class="empty">مفيش حضور متسجل في الشهر ده</div>'}</div>`;
}

function viewPReq() {
  const k = curKid();
  markSeen('req');
  const list = [...(Cloud.req[k.id] || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return `${kidSwitcher()}
  <div class="card"><h3>طلب جديد لـ ${esc(k.name || '')}</h3><div class="req-types">${Object.entries(REQUEST_TYPES).map(([key, t]) => `<button class="btn" data-action="newReq" data-type="${key}">${t.icon} ${t.label}</button>`).join('')}</div></div>
  <div class="section-title"><h3>طلباتي</h3></div>
  <div class="list">${list.map((r) => reqRow(r, false)).join('') || '<div class="empty">مفيش طلبات</div>'}</div>`;
}

function viewPFees() {
  const k = curKid(), fb = famBalance(k), s = settings();
  if (!fb) return `${kidSwitcher()}<div class="card empty">بيانات المصاريف لسه ما اتنشرتش. كلم الحضانة.</div>`;
  return `${kidSwitcher()}
  <div class="stats">
    <div class="stat purple"><div class="label">المصاريف الشهرية</div><div class="value">${money(fb.fee)}</div></div>
    <div class="stat ${fb.thisRemaining ? 'red' : 'green'}"><div class="label">${monthLabel(thisMonth())}</div><div class="value">${fb.thisRemaining ? 'باقي ' + money(fb.thisRemaining) : 'مدفوع ✅'}</div></div>
    <div class="stat ${fb.balance ? 'red' : 'green'}"><div class="label">إجمالي المستحق</div><div class="value">${money(fb.balance)}</div></div>
  </div>
  ${s.payInfo ? `<div class="card"><h3>💳 طرق الدفع</h3><div style="white-space:pre-wrap">${esc(s.payInfo)}</div></div>` : ''}
  <div class="section-title"><h3>المدفوعات</h3></div>
  <div class="list">${(k.fin.payments || []).map((p) => `<div class="item"><div class="main"><div class="title">${esc(p.t)}${p.m ? ' · ' + monthLabel(p.m) : ''}</div>
    <div class="sub">${dateLabel(p.d)}${p.w ? ' · ' + esc(p.w) : ''}${p.r ? ' · إيصال #' + num(p.r) : ''}</div></div><div class="amount in">${money(p.a)}</div></div>`).join('') || '<div class="empty">مفيش مدفوعات متسجلة</div>'}</div>`;
}

function viewPMore() {
  const s = settings(), di = state.schedDay;
  const k = curKid();
  const sch = (k.classId && D.schedule.find((x) => x.id === k.classId && x.slots && x.slots.length)) || D.schedule.find((x) => x.id === 'general');
  return `<div class="card sync-card"><div class="profile-head"><div class="avatar">👤</div><div><b>${esc(Cloud.name || 'ولي الأمر')}</b>
    <div class="sub">${esc(toDigits(Cloud.email.split('@')[0]))} · ${ROLES.parent}</div><div class="sub">${syncLabel()}</div></div></div>
    <div class="btn-row" style="margin-top:10px"><button class="btn small" data-action="logout">🚪 تسجيل خروج</button></div></div>
  <div class="card" style="text-align:center"><img src="img/logo-192.png" style="width:90px" alt=""><h3 style="margin:6px 0">${esc(s.name)}</h3><div class="slogan">${esc(s.slogan)}</div>
    <p>📍 ${esc(s.address)}</p>
    <div class="btn-row" style="justify-content:center"><a class="btn green" href="tel:${esc(s.phone)}">📞 اتصال بالحضانة</a>
    <a class="btn green" target="_blank" href="${waLink(s.phone, `السلام عليكم، أنا ولي أمر ${k.name || ''} `)}">💬 واتساب الحضانة</a></div></div>
  ${sch && sch.slots && sch.slots.length ? `<div class="card"><h3>📅 الجدول الأسبوعي${sch.theme ? ` · <span class="badge purple">${esc(sch.theme)}</span>` : ''}</h3>
    <div class="day-tabs">${DAYS.map((d, i) => `<button class="${i === di ? 'active' : ''}" data-action="schedDay" data-i="${i}">${d}</button>`).join('')}</div>
    ${sch.slots.map((x) => `<div class="sched-mini"><span>${esc(x.time)}</span><b>${esc(x.cells[di] || '—')}</b></div>`).join('')}</div>` : ''}`;
}

function requestForm(type) {
  const t = REQUEST_TYPES[type], k = curKid();
  openForm({
    title: `${t.icon} ${t.label} - ${k.name || ''}`,
    data: { from: today() },
    fields: t.fields.map(([name, label, ftype, required]) => ({ name, label, type: ftype === 'textarea' ? 'textarea' : ftype, required, full: ftype === 'textarea' || name === 'medName' || name === 'person', rows: 3 })),
    onSave: async (v) => {
      if (v.to && v.from && v.to < v.from) { toast('تاريخ النهاية قبل البداية'); return false; }
      try { await Cloud.sendRequest({ ...v, type, childId: k.id, childName: k.name || '' }); }
      catch (e) { toast(authMsg(e)); return false; }
      toast('تم إرسال الطلب للحضانة ✅');
    },
  });
}

// ================== جانب الحضانة: الطلبات والإعلانات وحسابات الأهالي ==================
function pendingRequests() { return D.requests.filter((r) => r.status === 'pending'); }
function activeMeds(cid, day = today()) { return D.requests.filter((r) => r.childId === cid && r.type === 'medicine' && r.status === 'approved' && r.from <= day && (r.to || r.from) >= day); }
function dayRequests(cid, day = today()) { return D.requests.filter((r) => r.childId === cid && ['pickup', 'early'].includes(r.type) && r.status === 'approved' && r.from === day); }

function viewRequests() {
  const tab = state.reqTab || 'pending';
  let list = [...D.requests].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (tab === 'pending') list = list.filter((r) => r.status === 'pending');
  if (tab === 'today') list = list.filter((r) => r.status === 'approved' && r.from <= today() && (r.to || r.from) >= today());
  return {
    title: 'طلبات أولياء الأمور',
    html: `<div class="tabs">
      <button class="${tab === 'pending' ? 'active' : ''}" data-action="reqTab" data-t="pending">جديدة (${num(pendingRequests().length)})</button>
      <button class="${tab === 'today' ? 'active' : ''}" data-action="reqTab" data-t="today">النهارده</button>
      <button class="${tab === 'all' ? 'active' : ''}" data-action="reqTab" data-t="all">الكل</button></div>
    <div class="list">${list.map((r) => reqRow(r, true)).join('') || '<div class="empty">مفيش طلبات</div>'}</div>`,
  };
}

function decideForm(r) {
  const c = child(r.childId), t = REQUEST_TYPES[r.type] || REQUEST_TYPES.note;
  openModal(`${t.icon} ${t.label} - ${c ? c.name : r.childName || ''}`, `<div class="card" style="white-space:pre-wrap">${esc(reqDetails(r))}</div>
    <div class="form"><label class="full">رد على ولي الأمر (اختياري)<textarea id="reqReply" rows="2"></textarea></label>
    ${r.type === 'absence' ? '<p class="sub full" style="color:var(--muted)">الموافقة هتسجل الطفل "غائب بإذن" في الأيام دي تلقائيًا.</p>' : ''}
    ${r.type === 'medicine' ? '<p class="sub full" style="color:var(--muted)">الموافقة هتظهر الدواء 💊 جنب اسم الطفل في الحضور طول المدة.</p>' : ''}
    <div class="actions"><button class="btn green" data-action="reqDecision" data-id="${r.id}" data-st="approved">✔ موافقة</button>
    <button class="btn danger" data-action="reqDecision" data-id="${r.id}" data-st="rejected">✗ رفض</button></div></div>`);
}

async function reqDecision(id, status) {
  const r = D.requests.find((x) => x.id === id); if (!r) return;
  const reply = ($('#reqReply') || {}).value || '';
  await save('requests', { ...r, status, reply: reply.trim(), decidedBy: Cloud.name || Cloud.email || 'الحضانة', decidedAt: new Date().toISOString() });
  if (status === 'approved' && r.type === 'absence' && r.from) {
    const end = r.to && r.to >= r.from ? r.to : r.from;
    for (let d = new Date(r.from); ; d.setDate(d.getDate() + 1)) {
      const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (ds > end) break;
      if (d.getDay() === 5) continue; // الجمعة
      await save('attendance', { id: `${ds}_${r.childId}`, date: ds, childId: r.childId, status: 'absent', checkIn: '', checkOut: '', excuse: r.reason || 'بإذن' });
    }
  }
  if (r.type === 'medicine' && status === 'approved') {
    const c = child(r.childId);
    if (c) await save('notes', { id: uid(), childId: r.childId, date: today(), kind: 'صحة', text: `💊 دواء: ${r.medName} — ${r.dose}${r.time ? ' — ' + r.time : ''} (${r.from}${r.to ? ' → ' + r.to : ''})`, share: true });
  }
  closeModal(); toast(status === 'approved' ? 'تمت الموافقة ✅' : 'تم الرفض'); render();
}

function viewAnnouncements() {
  const list = [...D.announcements].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  return {
    title: 'الإعلانات لأولياء الأمور',
    html: `<p class="sub" style="color:var(--muted)">الإعلان بيظهر لكل أولياء الأمور في التطبيق ويوصلهم إشعار.</p>
    ${can('manage') ? '<button class="btn primary block" data-action="addAnn">+ إعلان جديد</button>' : ''}
    <div class="list" style="margin-top:10px">${list.map((a) => `<div class="item ${can('manage') ? 'clickable' : ''}" data-action="${can('manage') ? 'editAnn' : ''}" data-id="${a.id}"><div class="avatar">📢</div>
      <div class="main"><div class="title">${esc(a.title)}</div><div style="white-space:pre-wrap">${esc(a.text)}</div><div class="sub">${dateLabel(a.date)}</div></div></div>`).join('') || '<div class="empty">مفيش إعلانات</div>'}</div>`,
  };
}
function annForm(a) {
  const isNew = !a; a = a || { date: today() };
  openForm({
    title: isNew ? 'إعلان جديد' : 'تعديل إعلان', data: a,
    fields: [
      { name: 'title', label: 'العنوان', required: true, full: true, list: ['إجازة', 'رحلة', 'حفلة', 'اجتماع أولياء الأمور', 'تذكير بالمصاريف', 'تغيير مواعيد'] },
      { name: 'text', label: 'التفاصيل', type: 'textarea', rows: 4, required: true, full: true },
      { name: 'date', label: 'التاريخ', type: 'date', full: true },
    ],
    onSave: async (v) => { await save('announcements', { ...a, ...v, id: a.id || uid(), createdAt: a.createdAt || new Date().toISOString() }); toast('تم نشر الإعلان ✅'); },
    onDelete: isNew ? null : async () => { await remove('announcements', a.id); },
  });
}

function randomPin() { return String(Math.floor(100000 + Math.random() * 900000)); }
function parentInvite(c, phone, pin) {
  const s = settings();
  const link = 'https://github.com/mhashaad1-sys/-/releases/latest/download/nursery-app.apk';
  return `السلام عليكم ولي أمر ${c.name} 🌸\nتقدر تتابع ${c.name} من تطبيق ${s.name}: الحضور والغياب، ملاحظات الحضانة، المصاريف، وتبعت طلب غياب أو دواء.\n\n📲 حمّل التطبيق:\n${link}\n\n👤 رقم الدخول: ${phone}\n🔑 الباسورد: ${pin}\n\n${s.name}`;
}
function parentForm(c) {
  const sib = D.children.find((x) => x.id !== c.id && x.parentLogin && toDigits(x.parentLogin) === toDigits(c.phone));
  openForm({
    title: `حساب ولي أمر ${c.name}`,
    intro: sib ? `<p class="alert">الرقم ده عنده حساب بالفعل (ولي أمر ${esc(sib.name)}). هيتضاف ${esc(c.name)} لنفس الحساب، ومش محتاج باسورد جديد.</p>` : '<p class="sub" style="color:var(--muted)">ولي الأمر هيدخل برقم الموبايل والباسورد ده. ابعتهم له على الواتساب بعد الحفظ.</p>',
    data: { name: c.guardianName || `ولي أمر ${c.name}`, phone: c.phone || '', password: sib ? '' : randomPin() },
    fields: [
      { name: 'name', label: 'اسم ولي الأمر', required: true, full: true },
      { name: 'phone', label: 'رقم الموبايل (للدخول)', type: 'tel', required: true, full: true },
      ...(sib ? [] : [{ name: 'password', label: 'الباسورد (٦ أرقام على الأقل)', required: true, full: true }]),
    ],
    onSave: async (v) => {
      if (!sib && v.password.length < 6) { toast('الباسورد لازم ٦ أرقام على الأقل'); return false; }
      try { await Cloud.addParent({ childId: c.id, name: v.name, phone: v.phone, password: v.password }); }
      catch (e) { toast(e.code === 'exists' ? e.message : authMsg(e)); return false; }
      const upd = { ...c, parentLogin: toDigits(v.phone), phone: c.phone || v.phone, guardianName: c.guardianName || v.name };
      await save('children', upd);
      publishFamily(c.id);
      toast('تم عمل الحساب ✅');
      if (!sib) setTimeout(() => openModal('بيانات الدخول', `<div class="card" style="white-space:pre-wrap">${esc(parentInvite(c, toDigits(v.phone), v.password))}</div>
        <div class="btn-row"><a class="btn green" target="_blank" href="${waLink(v.phone, parentInvite(c, toDigits(v.phone), v.password))}">💬 إرسال على واتساب</a></div>
        <p class="sub" style="color:var(--muted)">⚠️ الباسورد مش بيتحفظ في التطبيق، ابعته دلوقتي.</p>`), 80);
    },
  });
}
async function bulkParents() {
  const kids = activeChildren().filter((c) => c.phone && !c.parentLogin);
  if (!kids.length) { toast('كل الأطفال اللي ليهم رقم عندهم حسابات بالفعل'); return; }
  if (!confirm(`هيتعمل حساب لـ ${kids.length} ولي أمر (اللي ليهم رقم تليفون)، وبعدها تبعتلهم بيانات الدخول على الواتساب. متابعة؟`)) return;
  const done = [];
  for (const c of kids) {
    const sib = D.children.find((x) => x.parentLogin && toDigits(x.parentLogin) === toDigits(c.phone));
    const pin = sib ? '' : randomPin();
    try {
      await Cloud.addParent({ childId: c.id, name: c.guardianName || `ولي أمر ${c.name}`, phone: c.phone, password: pin });
      await save('children', { ...child(c.id), parentLogin: toDigits(c.phone) });
      publishFamily(c.id);
      done.push({ c, pin });
    } catch (e) { done.push({ c, err: e.code === 'exists' ? 'له حساب قديم' : authMsg(e) }); }
    toast(`${done.length} / ${kids.length}`);
  }
  state.bulk = done;
  push('bulkParents');
}
function viewBulkParents() {
  return {
    title: 'بيانات دخول أولياء الأمور',
    html: `<p class="alert">⚠️ الباسوردات دي مش بتتحفظ — ابعتها دلوقتي لكل ولي أمر.</p>
    <div class="list">${(state.bulk || []).map(({ c, pin, err }) => `<div class="item"><div class="main"><div class="title">${esc(c.name)}</div>
      <div class="sub">${err ? `<b style="color:var(--red)">${esc(err)}</b>` : `${esc(toDigits(c.phone))}${pin ? ' · باسورد: <b>' + pin + '</b>' : ' · اتضاف لحساب أخوه'}`}</div></div>
      ${!err && pin ? `<a class="btn small green" target="_blank" href="${waLink(c.phone, parentInvite(c, toDigits(c.phone), pin))}">💬 إرسال</a>` : ''}</div>`).join('')}</div>`,
  };
}
function parentSection(c) {
  if (!Cloud.role || !can('manage')) return '';
  const meds = activeMeds(c.id), dreqs = dayRequests(c.id);
  return `${meds.length ? `<div class="alert">💊 أدوية النهارده: ${meds.map((r) => esc(`${r.medName} (${r.dose}${r.time ? ' - ' + r.time : ''})`)).join('، ')}</div>` : ''}
    ${dreqs.map((r) => `<div class="alert">${REQUEST_TYPES[r.type].icon} ${esc(reqDetails(r))}</div>`).join('')}
    <div class="card"><h3>👨‍👩‍👧 تطبيق ولي الأمر</h3>${c.parentLogin
    ? `<div class="sub">✅ ولي الأمر عنده حساب برقم <b>${esc(c.parentLogin)}</b> ويقدر يتابع ${esc(c.name)} من التطبيق.</div>
       <div class="btn-row" style="margin-top:8px"><button class="btn small" data-action="republishFam" data-id="${c.id}">🔄 تحديث بياناته عند ولي الأمر</button>
       <button class="btn small danger" data-action="unlinkParent" data-id="${c.id}">إلغاء الربط</button></div>`
    : `<div class="sub">ولي الأمر يقدر يشوف الحضور والملاحظات والمصاريف ويبعت طلبات غياب ودواء.</div>
       <button class="btn small primary" style="margin-top:8px" data-action="makeParent" data-id="${c.id}">+ عمل حساب لولي الأمر</button>`}</div>`;
}

Object.assign(globalThis, { PARENT_VIEWS: { pHome: viewPHome, pAtt: viewPAtt, pReq: viewPReq, pFees: viewPFees, pMore: viewPMore } });
