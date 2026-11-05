// ================== تحسينات: التقييم الشهري، الشهادات، ملخص الخزنة، الترشيحات ==================

// ---------- التقييم الشهري ----------
const EVAL_SKILLS = [
  ['lang', 'اللغة والتواصل', '🗣️'], ['math', 'الأرقام والتفكير', '🔢'], ['motor', 'الحركة والمهارات', '🤸'],
  ['social', 'التعامل مع أصحابه', '🤝'], ['behavior', 'السلوك والانضباط', '🌟'], ['self', 'الاعتماد على النفس', '🧼'], ['quran', 'القرآن والقيم', '📖'],
];
const stars = (n) => '⭐'.repeat(n || 0) + '☆'.repeat(5 - (n || 0));
const evalOf = (m, cid) => D.evals.find((e) => e.id === `${m}_${cid}`);
function viewEvals() {
  const m = state.month;
  let kids = activeChildren(); if (state.evalClass) kids = kids.filter((c) => c.classId === state.evalClass);
  const done = kids.filter((c) => evalOf(m, c.id)).length;
  return {
    title: 'التقييم الشهري',
    html: `${monthPicker()}<div class="toolbar"><select id="evalClass">${classOpts(state.evalClass)}</select></div>
    <div class="card"><b>${num(done)} / ${num(kids.length)}</b> اتقيّموا في ${monthLabel(m)} <div class="sub">التقييم بيوصل لولي الأمر في التطبيق كشهادة تقدير شهرية.</div></div>
    <div class="list">${kids.map((c) => { const e = evalOf(m, c.id); const avg = e ? Math.round(EVAL_SKILLS.reduce((a, [k]) => a + (Number(e[k]) || 0), 0) / EVAL_SKILLS.length * 10) / 10 : 0;
      return `<div class="item clickable" data-action="evalEdit" data-id="${c.id}">${avatar(c)}<div class="main"><div class="title">${esc(c.name)}</div>
        <div class="sub">${e ? `متوسط ${num(avg)} / ٥ ${e.comment ? '· ' + esc(e.comment.slice(0, 40)) : ''}` : 'لسه ما اتقيّمش'}</div></div><span class="badge ${e ? 'green' : 'gray'}">${e ? '✔' : '+'}</span></div>`; }).join('')}</div>`,
  };
}
function evalForm(cid) {
  const c = child(cid), m = state.month, e = evalOf(m, cid) || { id: `${m}_${cid}`, month: m, childId: cid };
  const prev = evalOf(addMonths(m, -1), cid);
  openForm({
    title: `تقييم ${c.name} — ${monthLabel(m)}`,
    intro: prev ? '<p class="sub" style="color:var(--muted)">التقييم اللي فات متعبّي كبداية، عدّل اللي اتغير بس.</p>' : '',
    data: { ...(prev && !evalOf(m, cid) ? { ...prev, comment: '' } : e) },
    fields: [
      ...EVAL_SKILLS.map(([k, label, ico]) => ({ name: k, label: `${ico} ${label}`, type: 'select', options: [['', '—'], ...[5, 4, 3, 2, 1].map((n) => [n, stars(n)])] })),
      { name: 'comment', label: '💬 كلمة المعلمة لولي الأمر', type: 'textarea', rows: 3, full: true, placeholder: 'مثال: يوسف اتحسن جدًا في الكلام وبيشارك أصحابه 👏' },
    ],
    onSave: async (v) => {
      const obj = { ...e, ...v, id: `${m}_${cid}`, month: m, childId: cid, by: Cloud.name || '' };
      EVAL_SKILLS.forEach(([k]) => { obj[k] = Number(obj[k]) || 0; });
      await save('evals', obj); toast('تم حفظ التقييم ✅');
    },
    onDelete: evalOf(m, cid) ? async () => { await remove('evals', `${m}_${cid}`); } : null,
  });
}
function evalCardHTML(e, name) {
  return `<div class="eval-card"><div class="between"><b>📊 تقييم ${esc(name || '')} — ${monthLabel(e.month)}</b></div>
    ${EVAL_SKILLS.filter(([k]) => e[k]).map(([k, label, ico]) => `<div class="eval-row"><span>${ico} ${label}</span><span class="st">${stars(e[k])}</span></div>`).join('')}
    ${e.comment ? `<div class="reply">💬 ${esc(e.comment)}</div>` : ''}</div>`;
}

// ---------- الشهادات ----------
const AWARD_TYPES = {
  star: ['نجم الأسبوع', '⭐', 'لتميّزه ونشاطه طول الأسبوع'],
  quran: ['حفظ سورة', '📖', 'لحفظه سورة'],
  behavior: ['سلوك ممتاز', '🌟', 'لأخلاقه الجميلة وتعامله الرائع مع أصحابه'],
  learn: ['بطل التعلّم', '🏆', 'لاجتهاده في دروس منهج براعم'],
  custom: ['شهادة تقدير', '🎖️', ''],
};
function awardForm(cid, preset = {}) {
  const c = child(cid);
  openForm({
    title: `🏆 شهادة لـ ${c.name}`,
    data: { type: 'star', date: today(), ...preset },
    fields: [
      { name: 'type', label: 'نوع الشهادة', type: 'select', options: Object.entries(AWARD_TYPES).map(([k, v]) => [k, `${v[1]} ${v[0]}`]), full: true },
      { name: 'surah', label: 'السورة (لو حفظ سورة)', type: 'select', options: [['', '—'], ...SURAHS.map((s) => [s.name, 'سورة ' + s.name])], full: true },
      { name: 'reason', label: 'السبب (اختياري)', full: true, placeholder: 'هيتكتب في الشهادة' },
      { name: 'date', label: 'التاريخ', type: 'date', full: true },
    ],
    onSave: async (v) => {
      const t = AWARD_TYPES[v.type];
      const reason = v.reason || (v.type === 'quran' && v.surah ? `لحفظه سورة ${v.surah}` : t[2]);
      const a = { id: uid(), childId: cid, type: v.type, title: t[0], icon: t[1], reason, surah: v.surah || '', date: v.date || today(), by: Cloud.name || '' };
      await save('awards', a);
      toast('تم إصدار الشهادة ✅'); setTimeout(() => showCertificate(a, c.name, c.gender), 100);
    },
  });
}
function certReason(a, gender) {
  let r = a.reason || '';
  if (gender === 'بنت') r = r.replace(/لتميّزه/g, 'لتميّزها').replace(/ونشاطه/g, 'ونشاطها').replace(/لحفظه/g, 'لحفظها').replace(/لأخلاقه/g, 'لأخلاقها').replace(/وتعامله/g, 'وتعاملها').replace(/أصحابه/g, 'أصحابها').replace(/لاجتهاده/g, 'لاجتهادها');
  return r;
}
let LOGO_IMG = null;
function loadLogo() { return LOGO_IMG ? Promise.resolve(LOGO_IMG) : new Promise((res) => { const i = new Image(); i.onload = () => res(LOGO_IMG = i); i.onerror = () => res(null); i.src = 'img/logo-512.png'; }); }
async function certificatePNG(a, name, gender) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#fff7fa'); g.addColorStop(1, '#f3e8ff'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#d6336c'; x.lineWidth = 18; x.strokeRect(30, 30, W - 60, H - 60);
  x.strokeStyle = '#c9a227'; x.lineWidth = 4; x.strokeRect(60, 60, W - 120, H - 120);
  ['⭐', '🌸', '✨', '🌼'].forEach((e, i) => { x.font = '64px sans-serif'; x.fillText(e, [90, W - 160, 90, W - 160][i], [150, 150, H - 90, H - 90][i]); });
  const logo = await loadLogo(); if (logo) x.drawImage(logo, W / 2 - 150, 90, 300, 300);
  x.textAlign = 'center'; x.direction = 'rtl';
  x.fillStyle = '#5b2a86'; x.font = '900 72px Cairo, "Segoe UI", Tahoma, sans-serif'; x.fillText('شهادة تقدير', W / 2, 470);
  x.font = '120px sans-serif'; x.fillText(a.icon || '🏆', W / 2, 620);
  x.fillStyle = '#d6336c'; x.font = '900 64px Cairo, "Segoe UI", Tahoma, sans-serif'; x.fillText(a.title, W / 2, 720);
  x.fillStyle = '#2d2640'; x.font = '700 44px Cairo, "Segoe UI", Tahoma, sans-serif'; x.fillText(gender === 'بنت' ? 'تُمنح هذه الشهادة للبطلة' : 'تُمنح هذه الشهادة للبطل', W / 2, 820);
  x.fillStyle = '#d6336c'; x.font = '900 86px Cairo, "Segoe UI", Tahoma, sans-serif'; x.fillText(name, W / 2, 935);
  x.fillStyle = '#5b2a86'; x.font = '700 44px Cairo, "Segoe UI", Tahoma, sans-serif';
  const words = certReason(a, gender).split(' '); let line = '', y = 1030;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > W - 220) { x.fillText(line, W / 2, y); y += 60; line = w; } else line = t; }
  if (line) x.fillText(line, W / 2, y);
  x.fillStyle = '#3f9b48'; x.font = '900 40px Cairo, "Segoe UI", Tahoma, sans-serif'; x.fillText('نزرع القيم .. ننمي المستقبل', W / 2, H - 175);
  x.fillStyle = '#6c5a80'; x.font = '700 34px Cairo, "Segoe UI", Tahoma, sans-serif'; x.fillText(`${settings().name} · ${dateLabel(a.date)}`, W / 2, H - 120);
  return cv.toDataURL('image/png');
}
async function showCertificate(a, name, gender) {
  const url = await certificatePNG(a, name, gender);
  window.__cert = { url, name: `شهادة-${name}-${a.date}.png` };
  openModal(`${a.icon} ${a.title}`, `<img src="${url}" style="width:100%;border-radius:12px;box-shadow:0 4px 14px #0002">
    <div class="btn-row" style="margin-top:12px;justify-content:center"><button class="btn primary" data-action="certSave">⬇️ حفظ الصورة</button>
    ${navigator.share && !window.Android ? '<button class="btn green" data-action="certShare">📤 مشاركة</button>' : ''}</div>`);
}
async function certSave() {
  const c = window.__cert; if (!c) return;
  const blob = await (await fetch(c.url)).blob();
  saveBlob(c.name, blob);
}
async function certShare() {
  const c = window.__cert; if (!c) return;
  try { const blob = await (await fetch(c.url)).blob(); await navigator.share({ files: [new File([blob], c.name, { type: 'image/png' })] }); } catch (e) { certSave(); }
}
function viewAwards() {
  const list = [...D.awards].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  return {
    title: 'الشهادات والتقدير',
    html: `<p class="sub" style="color:var(--muted)">الشهادة بتوصل لولي الأمر في التطبيق مع إشعار، ويقدر يحفظها صورة ويشاركها. ابعت شهادة من صفحة أي طفل (🏆).</p>
    <div class="btn-row" style="margin-bottom:10px"><button class="btn primary small" data-action="starOfWeek">⭐ اختار نجم الأسبوع</button></div>
    <div class="list">${list.map((a) => { const c = child(a.childId); return `<div class="item clickable" data-action="certOpen" data-id="${a.id}"><div class="avatar">${a.icon}</div>
      <div class="main"><div class="title">${esc(c ? c.name : '')} — ${esc(a.title)}</div><div class="sub">${esc(certReason(a, c && c.gender))} · ${dateLabel(a.date)}</div></div></div>`; }).join('') || '<div class="empty">لسه مفيش شهادات</div>'}</div>`,
  };
}
function starOfWeekSuggest() {
  // اقتراح: أكتر طفل حاضر الأسبوع ده + نجوم المنهج
  const from = new Date(); from.setDate(from.getDate() - 7); const f = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
  const score = (c) => D.attendance.filter((a) => a.childId === c.id && a.date >= f && a.status === 'present').length * 2
    + ((D.hwProg.find((p) => p.childId === c.id && p.itemId === 'learn') || {}).stars || 0) / 5
    + D.reports.filter((r) => r.childId === c.id && r.date >= f && r.mood === 'happy').length;
  return activeChildren().map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s).slice(0, 5);
}

// ---------- ملخص الخزنة اليومي ----------
function viewCashDay() {
  const d = state.cashDate || today();
  const pays = D.payments.filter((p) => p.date === d), exps = D.expenses.filter((e) => e.date === d);
  const byMethod = {}; pays.forEach((p) => { byMethod[p.method || 'نقدي'] = (byMethod[p.method || 'نقدي'] || 0) + Number(p.amount || 0); });
  const cashIn = byMethod['نقدي'] || 0, cashOut = sum(exps, (e) => e.amount);
  return {
    title: 'ملخص الخزنة',
    html: `<div class="toolbar"><input type="date" id="cashDate" value="${d}"></div>
    <div class="stats"><div class="stat green"><div class="label">إجمالي المقبوضات</div><div class="value">${money(sum(pays, (p) => p.amount))}</div></div>
      <div class="stat red"><div class="label">المصروفات</div><div class="value">${money(cashOut)}</div></div>
      <div class="stat purple"><div class="label">المفروض في الخزنة (نقدي − مصروفات)</div><div class="value">${money(cashIn - cashOut)}</div></div></div>
    <div class="card"><h3>المقبوضات حسب طريقة الدفع</h3>${Object.keys(byMethod).length ? Object.entries(byMethod).map(([k, v]) => `<div class="ob-row"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('') : '<div class="empty">مفيش مقبوضات</div>'}</div>
    <div class="card"><h3>عدّ الخزنة</h3><div class="form"><label class="full">المبلغ اللي في الخزنة فعلًا<input type="number" id="cashCount" placeholder="اكتب المبلغ بعد العدّ"></label></div><div id="cashDiff" class="sub"></div></div>
    <div class="list">${pays.map(paymentRow).join('')}${exps.map(expenseRow).join('')}</div>
    <button class="btn block" style="margin-top:10px" data-action="cashShare">📤 مشاركة ملخص اليوم</button>`,
  };
}
function cashShareText() {
  const d = state.cashDate || today(), pays = D.payments.filter((p) => p.date === d), exps = D.expenses.filter((e) => e.date === d);
  const byMethod = {}; pays.forEach((p) => { byMethod[p.method || 'نقدي'] = (byMethod[p.method || 'نقدي'] || 0) + Number(p.amount || 0); });
  return `🧮 ملخص خزنة ${settings().name}\n${dateLabel(d)}\n\n💵 المقبوضات: ${money(sum(pays, (p) => p.amount))}\n${Object.entries(byMethod).map(([k, v]) => `  • ${k}: ${money(v)}`).join('\n')}\n🧾 المصروفات: ${money(sum(exps, (e) => e.amount))}\n💰 المفروض في الخزنة: ${money((byMethod['نقدي'] || 0) - sum(exps, (e) => e.amount))}`;
}

// ---------- الترشيحات ----------
function referralsCard() {
  const refs = D.children.filter((c) => c.referredBy && child(c.referredBy));
  if (!refs.length) return '';
  const by = {}; refs.forEach((c) => { (by[c.referredBy] = by[c.referredBy] || []).push(c.name); });
  return `<div class="card"><h3>🎁 الترشيحات (${num(refs.length)})</h3>${Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([rid, names]) => `<div class="ob-row"><span>ولي أمر <b>${esc(child(rid).name)}</b></span><span class="sub">رشّح ${num(names.length)}: ${esc(names.join('، '))}</span></div>`).join('')}</div>`;
}

// ---------- تجربة الإشعارات ----------
async function testNotify() {
  if (window.Android && window.Android.notify) {
    try { window.Android.askNotifications(); } catch (e) { /* ignore */ }
    setTimeout(() => window.Android.notify('🔔 تجربة من براعم', 'الإشعارات شغالة على الموبايل ده ✅'), 800);
    toast('لو ما وصلش إشعار: الإعدادات ← التطبيقات ← براعم ← الإشعارات ← تشغيل');
    return;
  }
  if (!('Notification' in window)) { toast('الموبايل ده مش بيدعم الإشعارات'); return; }
  const r = await Notification.requestPermission();
  if (r === 'granted') sysNotify('🔔 تجربة من براعم', 'الإشعارات شغالة ✅'); else toast('الإشعارات مقفولة من إعدادات الموبايل');
}

Object.assign(ACTIONS_EXTRA, {
  goEvals: () => { state.month = thisMonth(); push('evals'); },
  evalEdit: (el) => evalForm(el.dataset.id),
  goAwards: () => push('awards'),
  awardNew: (el) => awardForm(el.dataset.id),
  certOpen: (el) => { const a = D.awards.find((x) => x.id === el.dataset.id); const c = child(a.childId) || {}; showCertificate(a, c.name || '', c.gender); },
  certSave, certShare,
  starOfWeek: () => {
    const sug = starOfWeekSuggest();
    openModal('⭐ نجم الأسبوع', `<p class="sub">اقتراحات حسب الحضور ونجوم المنهج والمزاج في التقارير — اختار واحد:</p>
      <div class="list">${sug.map(({ c }) => `<div class="item clickable" data-action="awardStar" data-id="${c.id}">${avatar(c)}<div class="main"><div class="title">${esc(c.name)}</div></div><span>⭐</span></div>`).join('')}</div>
      <div class="sub" style="margin-top:8px">أو افتح صفحة أي طفل واضغط 🏆.</div>`);
  },
  awardStar: (el) => { closeModal(); setTimeout(() => awardForm(el.dataset.id, { type: 'star' }), 80); },
  goCash: () => { state.cashDate = today(); push('cashday'); },
  cashShare: () => shareText(cashShareText()),
  testNotify,
  pCert: (el) => { const k = curKid(); const a = (k.awards || []).find((x) => x.id === el.dataset.id); if (a) showCertificate(a, k.name || '', k.gender); },
});
