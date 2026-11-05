// ================== باقات الاشتراك ==================
// الإدارة بتحدد الباقات (شهري، الترم، سنة، ...) بالسعر والمدة (عدد شهور أو لحد تاريخ معين)،
// وتحدد الاشتراك بيفتح إيه: التمارين والمنهج بس، أو التطبيق كله لولي الأمر.
// تاريخ نهاية الاشتراك بيتحفظ لكل طفل (hwUntil)، وأبعد تاريخ بيتكتب في حساب ولي الأمر على السيرفر
// عشان قواعد الحماية تقفل المحتوى المدفوع بعد انتهاء المدة.

const DEFAULT_PLANS = [
  { id: 'month', name: 'شهري', price: 100, months: 1 },
  { id: 'term', name: 'الترم كله', price: 150, months: 4 },
];
const plans = () => (settings().plans && settings().plans.length ? settings().plans : DEFAULT_PLANS);
const subMode = () => settings().subMode || 'hw'; // hw = التمارين والمنهج بس، app = التطبيق كله
const planById = (id) => plans().find((p) => p.id === id) || plans()[0];
function planDuration(p) { return p.until ? `لحد ${dateLabel(p.until)}` : p.months === 1 ? 'شهر' : p.months === 2 ? 'شهرين' : `${num(p.months)} ${p.months <= 10 ? 'شهور' : 'شهر'}`; }
function planUntil(p, base) {
  if (p.until) return p.until;
  const d = new Date(base || today()); d.setMonth(d.getMonth() + (Number(p.months) || 1));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const subWhat = () => (subMode() === 'app' ? 'اشتراك تطبيق براعم' : 'اشتراك منصة التمارين');

// تفعيل / تجديد اشتراك طفل
async function subActivate(cid, { planId, until, price, paid = true, silent = false } = {}) {
  const c = child(cid); if (!c) return false;
  const p = planById(planId);
  const base = hwActiveUntil(c.hwUntil) ? c.hwUntil : today();
  const end = until || planUntil(p, base);
  const amount = price === undefined || price === '' ? Number(p.price) || 0 : Number(price) || 0;
  await save('children', { ...c, hwUntil: end, hwPlan: p.name });
  if (paid && amount > 0) {
    await save('payments', { id: uid(), childId: cid, type: 'homework', month: thisMonth(), amount, date: today(), method: 'إنستاباي',
      receiptNo: Math.max(0, ...D.payments.map((x) => x.receiptNo || 0)) + 1, note: `${subWhat()} — ${p.name} لحد ${end}` });
  }
  await syncMemberUntil(cid);
  publishFamily(cid);
  if (!silent) toast(`✅ اتفعل لحد ${dateLabel(end)}`);
  render();
  return true;
}
async function subStop(cid) {
  const c = child(cid); if (!c) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  await save('children', { ...c, hwUntil: `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}` });
  await syncMemberUntil(cid); publishFamily(cid); render();
}
// أبعد تاريخ لكل الإخوات على نفس حساب ولي الأمر ← حساب ولي الأمر على السيرفر
async function syncMemberUntil(cid) {
  const c = child(cid); if (!c || !c.parentLogin || !Cloud.role) return;
  const max = D.children.filter((x) => x.parentLogin === c.parentLogin).map((x) => x.hwUntil || '').sort().pop();
  try { await Cloud.col('members').doc(parentEmail(c.parentLogin)).update({ hwUntil: max ? new Date(max + 'T23:59:59').getTime() : 0 }); }
  catch (e) { toast(authMsg(e)); }
}

function planOptions(withNone) {
  return [...(withNone ? [['', '— بدون اشتراك دلوقتي —']] : []), ...plans().map((p) => [p.id, `${p.name} — ${money(p.price)} (${planDuration(p)})`]), ['custom', '✏️ مدة وسعر تحددهم انت']];
}
// فورم التفعيل للإدارة
function activateForm(cid, presetPlan) {
  const c = child(cid); if (!c) return;
  const p0 = planById(presetPlan);
  const base = hwActiveUntil(c.hwUntil) ? c.hwUntil : today();
  openForm({
    title: `${hwActiveUntil(c.hwUntil) ? 'تجديد' : 'تفعيل'} اشتراك ${c.name}`,
    intro: `<p class="sub" style="color:var(--muted)">${subMode() === 'app' ? 'الاشتراك بيفتح التطبيق كله لولي الأمر.' : 'الاشتراك بيفتح منصة التمارين والمنهج.'}${hwActiveUntil(c.hwUntil) ? ` الاشتراك الحالي لحد ${dateLabel(c.hwUntil)}، والتجديد هيبدأ من بعده.` : ''}</p>`,
    data: { plan: p0.id, until: planUntil(p0, base), price: p0.price, paid: true },
    fields: [
      { name: 'plan', label: 'الباقة', type: 'select', options: planOptions(false), full: true },
      { name: 'until', label: 'ينتهي يوم', type: 'date', full: true },
      { name: 'price', label: 'المبلغ', type: 'number' },
      { name: 'paid', label: 'اتدفع (يتسجل في المقبوضات)', type: 'checkbox' },
    ],
    onSave: async (v) => {
      if (!v.until || v.until < today()) { toast('اختار تاريخ نهاية بعد النهارده'); return false; }
      await subActivate(cid, { planId: v.plan === 'custom' ? plans()[0].id : v.plan, until: v.until, price: v.price, paid: v.paid });
    },
  });
  const f = $('#mform');
  f.elements.plan.addEventListener('change', () => {
    if (f.elements.plan.value === 'custom') return;
    const p = planById(f.elements.plan.value);
    f.elements.until.value = planUntil(p, base); f.elements.price.value = p.price;
  });
}

// ---------- إعدادات الباقات ----------
function viewPlans() {
  const m = subMode();
  return {
    title: 'الباقات والاشتراكات',
    html: `<div class="card"><h3>الاشتراك بيفتح إيه؟</h3>
      <label class="radio-row"><input type="radio" name="subMode" value="hw" ${m === 'hw' ? 'checked' : ''}> <div><b>📚 التمارين والمنهج بس</b><div class="sub">ولي الأمر بيتابع الحضور والتقارير والمصاريف ببلاش، والاشتراك بيفتح المنهج والتمارين (أول درس في كل مادة مجاني).</div></div></label>
      <label class="radio-row"><input type="radio" name="subMode" value="app" ${m === 'app' ? 'checked' : ''}> <div><b>📱 التطبيق كله</b><div class="sub">ولي الأمر مش هيقدر يستخدم التطبيق (الحضور، التقارير، المصاريف، التمارين) غير وهو مشترك. القرآن الكريم مفتوح دايمًا.</div></div></label>
    </div>
    <div class="section-title"><h3>الباقات</h3><button class="btn primary small" data-action="planEdit">+ باقة</button></div>
    <div class="list">${plans().map((p) => `<div class="item clickable" data-action="planEdit" data-id="${p.id}"><div class="avatar">🎟️</div>
      <div class="main"><div class="title">${esc(p.name)} — ${money(p.price)}</div><div class="sub">${planDuration(p)}</div></div><span>✏️</span></div>`).join('')}</div>
    <p class="sub" style="color:var(--muted)">مثال: باقة "الترم الأول" بـ ١٥٠ ج.م لحد آخر يناير، أو "شهري" بـ ١٠٠ ج.م لمدة شهر. ولي الأمر بيشوف الباقات دي في التطبيق ويختار.</p>`,
  };
}
function planForm(p) {
  const isNew = !p; p = p || { id: uid(), name: '', price: '', months: 1 };
  openForm({
    title: isNew ? 'باقة جديدة' : p.name,
    data: { ...p, kind: p.until ? 'date' : 'months' },
    fields: [
      { name: 'name', label: 'اسم الباقة', required: true, full: true, list: ['شهري', 'الترم الأول', 'الترم التاني', 'الترم كله', 'السنة الدراسية', 'الصيف'] },
      { name: 'price', label: 'السعر', type: 'number', required: true },
      { name: 'kind', label: 'المدة', type: 'select', options: [['months', 'عدد شهور من يوم التفعيل'], ['date', 'لحد تاريخ معين (زي آخر الترم)']] },
      { name: 'months', label: 'عدد الشهور', type: 'number' },
      { name: 'until', label: 'ينتهي يوم', type: 'date' },
    ],
    onSave: async (v) => {
      if (v.kind === 'date' && (!v.until || v.until < today())) { toast('اختار تاريخ النهاية'); return false; }
      if (v.kind === 'months' && !(Number(v.months) > 0)) { toast('اكتب عدد الشهور'); return false; }
      const np = { id: p.id, name: v.name, price: Number(v.price) || 0, ...(v.kind === 'date' ? { until: v.until } : { months: Number(v.months) }) };
      const list = plans().filter((x) => x.id !== p.id); const i = plans().findIndex((x) => x.id === p.id);
      list.splice(i < 0 ? list.length : i, 0, np);
      await saveSettings({ plans: list });
    },
    onDelete: isNew || plans().length < 2 ? null : async () => { await saveSettings({ plans: plans().filter((x) => x.id !== p.id) }); },
  });
  const f = $('#mform'), sync = () => { const d = f.elements.kind.value === 'date'; f.elements.until.closest('label').style.display = d ? '' : 'none'; f.elements.months.closest('label').style.display = d ? 'none' : ''; };
  f.elements.kind.addEventListener('change', sync); sync();
}

// ---------- عند ولي الأمر ----------
function plansPicker(k, compact) {
  const sel = planById(state.subPlan);
  return `<div class="plans">${plans().map((p) => `<button class="plan ${p.id === sel.id ? 'on' : ''}" data-action="pickPlan" data-id="${p.id}">
      <b>${esc(p.name)}</b><span class="pp">${money(p.price)}</span><small>${planDuration(p)}</small></button>`).join('')}</div>
    ${instaCard(k.name || '', sel.price, `${subWhat()} — ${sel.name}`)}
    ${(Cloud.req[k.id] || []).some((r) => r.type === 'hwsub' && r.status === 'pending') ? '<div class="alert">⏳ طلب الاشتراك وصل للحضانة وهيتفعل بعد مراجعة التحويل</div>'
      : `<button class="btn primary block" style="margin-top:10px" data-action="hwSubscribe">✔ حوّلت ${money(sel.price)} — فعّلوا ${esc(sel.name)}</button>`}`;
}
function subStatusLine(k) {
  const until = kidHwUntil(k);
  if (!hwActiveUntil(until)) return '';
  const days = Math.round((new Date(until) - new Date(today())) / 864e5);
  return days <= 7 ? `<div class="alert">⏳ الاشتراك هيخلص ${days <= 0 ? 'النهارده' : `بعد ${num(days)} ${days <= 10 ? 'أيام' : 'يوم'}`} (${dateLabel(until)}) — جدّد من صفحة التمارين</div>` : '';
}
// وضع "التطبيق كله": ولي الأمر غير المشترك بيشوف شاشة الاشتراك بس
function parentLocked() { return isParent() && subMode() === 'app' && !(Cloud.memberUntil > Date.now()); }
function viewPLocked() {
  const s = settings();
  const k = curKid().name ? curKid() : { id: (Cloud.childIds || [])[0], name: '' };
  return `<div class="card" style="text-align:center"><img src="img/logo-192.png" style="width:100px" alt="">
    <h2 style="margin:6px 0">${Cloud.memberUntil ? 'الاشتراك انتهى' : 'اشترك في تطبيق براعم'} 🌱</h2>
    <p>تابع الحضور والتقرير اليومي والمصاريف، وابعت طلبات الغياب والدوا، ومنهج التعلّم الكامل لطفلك.</p>
    ${Cloud.memberUntil ? `<div class="sub">آخر اشتراك كان لحد ${new Date(Cloud.memberUntil).toLocaleDateString('ar-EG')}</div>` : ''}</div>
    <div class="card">${plansPicker(k)}</div>
    <div class="btn-row" style="justify-content:center;margin:10px 0"><button class="btn" data-action="learnOpen" data-s="quran">📖 القرآن الكريم (مفتوح دايمًا)</button>
      <a class="btn green" href="tel:${esc(s.phone)}">📞 كلّم الحضانة</a></div>`;
}
