// ================== الجروبات + لحظات اليوم + الاتصال العاجل ==================

// ---------- الجروبات الثابتة: التمهيدي / KG1 / KG2 ----------
const GROUPS = [['g_pre', 'التمهيدي'], ['g_kg1', 'KG1'], ['g_kg2', 'KG2']];
const normCls = (n) => String(n || '').toLowerCase().replace(/\s+/g, '').replace(/^ال/, '').replace('kg١', 'kg1').replace('kg٢', 'kg2');
let groupsChecked = false;
async function ensureGroups() {
  if (groupsChecked || !can('manage')) return;
  groupsChecked = true;
  for (const [id, name] of GROUPS) {
    if (D.classes.some((k) => k.id === id || normCls(k.name) === normCls(name))) continue;
    await save('classes', { id, name });
  }
}
function groupPicker(cid) {
  const c = child(cid); if (!c) return;
  openModal(`👥 جروب ${c.name}`, `<div class="group-pick">${D.classes.map((k) => `<button class="btn ${c.classId === k.id ? 'primary' : ''}" data-action="setGroup" data-id="${cid}" data-cls="${k.id}">${esc(k.name)}${c.classId === k.id ? ' ✔' : ''}</button>`).join('')}
    <button class="btn ${!c.classId ? 'primary' : ''}" data-action="setGroup" data-id="${cid}" data-cls="">بدون جروب</button></div>`);
}
async function setGroup(cid, clsId) {
  const c = child(cid); if (!c) return;
  await save('children', { ...c, classId: clsId });
  closeModal(); toast(clsId ? `${c.name} اتنقل لـ ${className(clsId)} ✅` : 'تم ✅'); render();
}
function groupChip(c) {
  if (!can('editChildren')) return '';
  return `<button class="cls-chip ${c.classId ? '' : 'none'}" data-action="pickGroup" data-id="${c.id}">${c.classId ? esc(className(c.classId)) : '+ جروب'}</button>`;
}

// ---------- الاتصال العاجل بولي الأمر ----------
function urgentModal(cid) {
  const c = child(cid); if (!c) return;
  const s = settings();
  const msg = `السلام عليكم ولي أمر ${c.name}،\nبرجاء التواصل مع ${s.name} فورًا بخصوص ${c.name}.\n📞 ${s.phone}`;
  const canPush = !!(Cloud.role && c.parentLogin);
  openModal(`🚨 اتصال عاجل - ${c.name}`, `
    ${!c.phone && !c.phone2 ? '<p class="alert">📞 مفيش رقم تليفون لولي الأمر. ضيفه من تعديل بيانات الطفل.</p>' : ''}
    <div class="urgent-actions">
      ${c.phone ? `<button class="btn danger block" data-action="urgentCall" data-id="${cid}" data-n="phone">📞 اتصال بـ${esc(c.guardianName || 'ولي الأمر')} (${esc(c.phone)})</button>` : ''}
      ${c.phone2 ? `<button class="btn danger block" data-action="urgentCall" data-id="${cid}" data-n="phone2">📞 اتصال بالرقم التاني (${esc(c.phone2)})</button>` : ''}
    </div>
    <div class="form"><label class="full">الرسالة<textarea id="urgentMsg" rows="4">${esc(msg)}</textarea></label></div>
    <div class="btn-row">
      ${c.phone ? `<button class="btn green" data-action="urgentWa" data-id="${cid}">💬 واتساب</button>` : ''}
      ${canPush ? `<button class="btn primary" data-action="urgentPush" data-id="${cid}">🔔 إشعار عاجل في التطبيق</button>` : ''}
    </div>
    ${!canPush ? '<p class="sub" style="color:var(--muted)">الإشعار في التطبيق بيشتغل لما يكون لولي الأمر حساب.</p>' : ''}
    <p class="sub" style="color:var(--muted)">كل تواصل عاجل بيتسجل في ملاحظات الطفل بالوقت.</p>`);
}
async function logUrgent(cid, how) {
  const msg = (($('#urgentMsg') || {}).value || '').trim();
  await save('notes', { id: uid(), childId: cid, date: today(), kind: 'تواصل عاجل', text: `🚨 ${how} — الساعة ${timeLabel(nowTime())}${Cloud.name ? ' — ' + Cloud.name : ''}${msg ? '\n' + msg : ''}`, share: false });
  return msg;
}
async function urgentCall(el) {
  const c = child(el.dataset.id), n = c[el.dataset.n];
  await logUrgent(c.id, `اتصال بـ ${n}`);
  openUrl(`tel:${n}`);
}
async function urgentWa(el) {
  const c = child(el.dataset.id);
  const msg = await logUrgent(c.id, 'رسالة واتساب');
  openUrl(waLink(c.phone, msg));
}
async function urgentPush(el) {
  const c = child(el.dataset.id);
  const msg = await logUrgent(c.id, 'إشعار في التطبيق');
  Cloud.setFamily(c.id, { urgent: { t: new Date().toISOString(), m: msg } });
  closeModal(); toast('🔔 الإشعار العاجل اتبعت لولي الأمر');
}
function parentUrgentCard(k) {
  const u = k.urgent;
  if (!u || !u.t || Date.now() - new Date(u.t).getTime() > 12 * 3600e3) return '';
  const s = settings();
  return `<div class="card urgent-card"><b>🚨 رسالة عاجلة من الحضانة</b><div style="white-space:pre-wrap;margin:6px 0">${esc(u.m || '')}</div>
    <div class="sub">${new Date(u.t).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}</div>
    <div class="btn-row" style="margin-top:8px"><a class="btn danger" href="tel:${esc(s.phone)}">📞 اتصل بالحضانة دلوقتي</a></div></div>`;
}

// ---------- لحظات اليوم ----------
const MOMENT_KINDS = [['🍎', 'بياكلوا'], ['🎨', 'بيرسموا ويلوّنوا'], ['📖', 'بيحفظوا قرآن'], ['🔤', 'بيتعلموا الحروف'], ['🔢', 'بيتعلموا الأرقام'], ['🔠', 'بيتعلموا إنجليزي'],
  ['⚽', 'بيلعبوا'], ['🎵', 'بيغنّوا'], ['🧩', 'نشاط'], ['📚', 'قصة'], ['🙏', 'بيصلّوا'], ['😴', 'وقت الراحة'], ['🎉', 'حفلة'], ['🌳', 'نشاط برّه']];
const MAX_PICS = 4;
const MOMENT_DAYS = 30;
const PICS = {};
function moState() {
  if (!state.mo) state.mo = { target: 'class', classId: (D.classes[0] || {}).id || '', childId: '', icon: '', kind: '', text: '', photos: [], filter: '' };
  return state.mo;
}
function momentTitle(m) { return m.classId ? (m.className || className(m.classId)) : ((child(m.childId) || {}).name || m.childName || ''); }
function momentCard(m, opts = {}) {
  const t = new Date(m.t || m.date);
  const mine = !isParent() && (can('manage') || (m.by && m.by === Cloud.name));
  return `<div class="card moment"><div class="between"><div class="row"><span class="mo-ico">${m.icon || '📸'}</span><div>
      <b>${opts.hideTitle ? '' : esc(momentTitle(m)) + (m.kind ? ' · ' : '')}${esc(m.kind || '')}</b>
      <div class="sub">${m.date === today() ? 'النهارده' : dateLabel(m.date)} · ${t.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}${m.by && !isParent() ? ' · ' + esc(m.by) : ''}</div></div></div>
      ${mine ? `<button class="btn small" data-action="momentDel" data-id="${m.id}">🗑️</button>` : ''}</div>
    ${m.text ? `<div style="white-space:pre-wrap;margin-top:6px">${esc(m.text)}</div>` : ''}
    ${m.n ? `<div class="mo-pics n${Math.min(m.n, 4)}">${Array.from({ length: m.n }, (_, i) => `<img data-mpic="${m.id}" data-i="${i}" data-action="mpicOpen" data-id="${m.id}" alt="">`).join('')}</div>` : ''}</div>`;
}
async function getPics(id) {
  if (PICS[id]) return PICS[id];
  let p = await DB.get('momentPics', id).catch(() => null);
  if (!p && Cloud.role) {
    try { p = await Cloud.getPics(id); if (p) DB.put('momentPics', { ...p, id }).catch(() => {}); } catch (e) { p = null; }
  }
  if (p) PICS[id] = p;
  return p;
}
function hydratePics() {
  document.querySelectorAll('img[data-mpic]:not([src])').forEach((img) => {
    img.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
    img.classList.add('loading');
    getPics(img.dataset.mpic).then((p) => {
      const u = p && p.p && p.p[Number(img.dataset.i)];
      img.classList.remove('loading');
      if (u) img.src = u; else img.classList.add('missing');
    });
  });
}
function mpicOpen(el) {
  const p = PICS[el.dataset.id]; if (!p) return;
  const i = Number(el.dataset.i), url = p.p[i];
  window.__mpic = url;
  openModal('📸 الصورة', `<img src="${url}" style="width:100%;border-radius:12px">
    <div class="btn-row" style="justify-content:center;margin-top:10px"><button class="btn primary" data-action="mpicSave">⬇️ حفظ على الموبايل</button></div>`);
}
async function mpicSave() {
  const url = window.__mpic; if (!url) return;
  const blob = await (await fetch(url)).blob();
  saveBlob(`baraem-${today()}-${Date.now() % 100000}.jpg`, blob);
}

function viewMoments() {
  if (isParent()) {
    const k = curKid(), list = momentsFor(k.id);
    return { title: `📸 لحظات ${k.name || ''}`, html: `${kidSwitcher()}<p class="sub" style="color:var(--muted)">الصور بتفضل هنا ${num(MOMENT_DAYS)} يوم. احفظ اللي تحبه على موبايلك.</p>
      ${list.map((m) => momentCard(m)).join('') || '<div class="card empty">لسه مفيش لحظات</div>'}` };
  }
  const mo = moState();
  const groupKids = mo.target === 'class' ? activeChildren().filter((c) => c.classId === mo.classId) : [];
  const noPhoto = groupKids.filter((c) => c.photoOk === 'no'), unknown = groupKids.filter((c) => !c.photoOk);
  const cut = addDaysStr(-MOMENT_DAYS);
  let feed = D.moments.filter((m) => m.date >= cut).sort((a, b) => (b.t || '').localeCompare(a.t || ''));
  if (mo.filter) feed = feed.filter((m) => m.classId === mo.filter || (!m.classId && (child(m.childId) || {}).classId === mo.filter));
  return {
    title: '📸 لحظات اليوم',
    html: `<div class="card composer">
      <div class="tabs" style="margin-bottom:8px"><button class="${mo.target === 'class' ? 'active' : ''}" data-action="moTarget" data-t="class">👥 للجروب</button><button class="${mo.target === 'child' ? 'active' : ''}" data-action="moTarget" data-t="child">👶 لطفل واحد</button></div>
      ${mo.target === 'class'
    ? `<div class="chips">${D.classes.map((k) => `<button class="chip ${mo.classId === k.id ? 'on' : ''}" data-action="moClass" data-id="${k.id}">${esc(k.name)} (${num(activeChildren().filter((c) => c.classId === k.id).length)})</button>`).join('')}</div>
         ${noPhoto.length ? `<div class="alert" style="margin-top:8px">🚫 ما تصوريش: ${noPhoto.map((c) => esc(c.name)).join('، ')}</div>` : ''}
         ${unknown.length ? `<div class="sub" style="margin-top:6px">ℹ️ ${num(unknown.length)} طفل لسه ما اتسجلش موافقة أهلهم على التصوير (من تعديل بيانات الطفل).</div>` : ''}`
    : `<select id="moChild"><option value="">اختار الطفل</option>${activeChildren().map((c) => `<option value="${c.id}" ${mo.childId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`}
      <div class="lbl" style="margin:10px 0 4px">بيعملوا إيه دلوقتي؟</div>
      <div class="chips">${MOMENT_KINDS.map(([ic, l]) => `<button class="chip ${mo.kind === l ? 'on' : ''}" data-action="moKind" data-ic="${ic}" data-l="${l}">${ic} ${l}</button>`).join('')}</div>
      <textarea id="moText" rows="2" placeholder="اكتبي سطر (اختياري): مثال لوّنا شجرة الخريف 🍂" style="margin-top:8px">${esc(mo.text)}</textarea>
      <div class="mo-thumbs">${mo.photos.map((u, i) => `<div class="th"><img src="${u}"><button data-action="moPicDel" data-i="${i}">✕</button></div>`).join('')}
        ${mo.photos.length < MAX_PICS ? '<button class="th add" data-action="moPicAdd">📷<br>صورة</button>' : ''}</div>
      <input type="file" id="moFile" accept="image/*" multiple hidden>
      <button class="btn primary block" style="margin-top:10px" data-action="moSend">📤 إرسال للأهالي</button></div>
    <div class="section-title"><h3>آخر اللحظات</h3><select id="moFilter" style="width:auto">${classOpts(mo.filter, 'كل الجروبات')}</select></div>
    ${feed.map((m) => momentCard(m)).join('') || '<div class="empty">لسه مفيش لحظات</div>'}`,
  };
}
async function moAddFiles(files) {
  const mo = moState();
  for (const f of Array.from(files).slice(0, MAX_PICS - mo.photos.length)) {
    try { mo.photos.push(await resizeImage(f, 1000, 0.7)); } catch (e) { /* skip */ }
  }
  render();
}
async function moSend() {
  const mo = moState();
  mo.text = (($('#moText') || {}).value || '').trim();
  if (!mo.kind && !mo.text && !mo.photos.length) { toast('اختاري هم بيعملوا إيه أو اكتبي سطر أو ضيفي صورة'); return; }
  let kids = [];
  if (mo.target === 'class') {
    if (!mo.classId) { toast('اختاري الجروب'); return; }
    kids = activeChildren().filter((c) => c.classId === mo.classId).map((c) => c.id);
    if (!kids.length) { toast('الجروب ده مفيهوش أطفال لسه'); return; }
  } else {
    if (!mo.childId) { toast('اختاري الطفل'); return; }
    kids = [mo.childId];
  }
  const id = uid(), photos = mo.photos.slice(0, MAX_PICS);
  const meta = {
    id, date: today(), t: new Date().toISOString(), kids, icon: mo.icon || '📸', kind: mo.kind || '', text: mo.text, n: photos.length, by: Cloud.name || '',
    classId: mo.target === 'class' ? mo.classId : '', className: mo.target === 'class' ? className(mo.classId) : '', childId: mo.target === 'child' ? mo.childId : '', childName: mo.target === 'child' ? (child(mo.childId) || {}).name || '' : '',
  };
  if (photos.length) {
    const pics = { id, kids, p: photos };
    PICS[id] = pics;
    await DB.put('momentPics', pics);
    Cloud.setPics(id, pics);
  }
  await save('moments', meta);
  Object.assign(mo, { icon: '', kind: '', text: '', photos: [] });
  toast(`📤 اتبعتت لأهالي ${num(kids.length)} طفل ✅`);
  render();
}
async function momentDel(id) {
  if (!confirm('مسح اللحظة دي؟')) return;
  await remove('moments', id);
  DB.del('momentPics', id).catch(() => {}); Cloud.delPics(id); delete PICS[id];
  render();
}
// مسح اللحظات الأقدم من ٣٠ يوم (مرة في اليوم من موبايل المدير)
async function cleanupMoments() {
  if (!can('manage') || LS.get('momClean') === today()) return;
  LS.set('momClean', today());
  const cut = addDaysStr(-MOMENT_DAYS);
  for (const m of D.moments.filter((x) => x.date < cut)) {
    await remove('moments', m.id);
    DB.del('momentPics', m.id).catch(() => {}); Cloud.delPics(m.id);
  }
}

// ولي الأمر
function momentsFor(cid) {
  const cut = addDaysStr(-MOMENT_DAYS);
  return (Cloud.mom[cid] || []).filter((m) => m.date >= cut).sort((a, b) => (b.t || '').localeCompare(a.t || ''));
}
function momentsNotify(cid, list) {
  if (!Cloud.momSeen) Cloud.momSeen = {};
  const first = !Cloud.momSeen['_' + cid];
  Cloud.momSeen['_' + cid] = true;
  list.forEach((m) => {
    if (Cloud.momSeen[m.id]) return;
    Cloud.momSeen[m.id] = true;
    if (first || !m.t || Date.now() - new Date(m.t).getTime() > 3600e3) return;
    const k = Cloud.fam[cid] || {};
    sysNotify(`${m.icon || '📸'} ${m.classId ? (m.className || 'الجروب') + ' دلوقتي' : k.name || ''}: ${m.kind || ''}`.trim(), m.text || (m.n ? '📸 صور جديدة من الحضانة' : 'افتح التطبيق وشوف'));
  });
}
function parentMomentsSection(k) {
  const list = momentsFor(k.id), t = today();
  const todays = list.filter((m) => m.date === t);
  if (!list.length) return '';
  return `<div class="section-title"><h3>📸 لحظات ${esc(k.name)} ${todays.length ? 'النهارده' : ''}</h3><button class="btn small" data-action="goMoments">كل اللحظات</button></div>
    ${(todays.length ? todays : list.slice(0, 1)).slice(0, 4).map((m) => momentCard(m)).join('')}`;
}

Object.assign(ACTIONS_EXTRA, {
  pickGroup: (el) => groupPicker(el.dataset.id),
  setGroup: (el) => setGroup(el.dataset.id, el.dataset.cls),
  assignTo: async (el) => { const c = child(el.dataset.id); await save('children', { ...c, classId: el.dataset.cls }); render(); },
  urgent: (el) => urgentModal(el.dataset.id),
  urgentCall, urgentWa, urgentPush,
  goMoments: () => push('moments'),
  moTarget: (el) => { moState().target = el.dataset.t; moState().text = ($('#moText') || {}).value || ''; render(); },
  moClass: (el) => { moState().classId = el.dataset.id; moState().text = ($('#moText') || {}).value || ''; render(); },
  moKind: (el) => { const mo = moState(); mo.text = ($('#moText') || {}).value || ''; if (mo.kind === el.dataset.l) { mo.kind = ''; mo.icon = ''; } else { mo.kind = el.dataset.l; mo.icon = el.dataset.ic; } render(); },
  moPicAdd: () => { moState().text = ($('#moText') || {}).value || ''; $('#moFile').click(); },
  moPicDel: (el) => { moState().photos.splice(Number(el.dataset.i), 1); render(); },
  moSend,
  momentDel: (el) => momentDel(el.dataset.id),
  mpicOpen, mpicSave,
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'moFile' && t.files.length) { moAddFiles(t.files); t.value = ''; }
  else if (t.id === 'moChild') moState().childId = t.value;
  else if (t.id === 'moFilter') { moState().filter = t.value; render(); }
});
