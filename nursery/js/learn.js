// ================== منهج براعم المدمج (KG1 / KG2) ==================
// أنشطة تفاعلية جوه التطبيق: عربي، English، حساب، علوم، قيم وآداب.
// كل درس ٨ أسئلة بتتولد عشوائي من بيانات الدرس، فالطفل يقدر يعيد الدرس ويلاقي أسئلة جديدة.

var ACTIONS_EXTRA = {};

// ---------- المحتوى ----------
const AR_LETTERS = [
  ['أ', 'ألف', 'أرنب', '🐰'], ['ب', 'باء', 'بطة', '🦆'], ['ت', 'تاء', 'تفاحة', '🍎'], ['ث', 'ثاء', 'ثعلب', '🦊'], ['ج', 'جيم', 'جمل', '🐫'],
  ['ح', 'حاء', 'حصان', '🐴'], ['خ', 'خاء', 'خروف', '🐑'], ['د', 'دال', 'دب', '🐻'], ['ذ', 'ذال', 'ذرة', '🌽'], ['ر', 'راء', 'ريشة', '🪶'],
  ['ز', 'زاي', 'زرافة', '🦒'], ['س', 'سين', 'سمكة', '🐟'], ['ش', 'شين', 'شمس', '☀️'], ['ص', 'صاد', 'صاروخ', '🚀'], ['ض', 'ضاد', 'ضفدع', '🐸'],
  ['ط', 'طاء', 'طيارة', '✈️'], ['ظ', 'ظاء', 'ظرف', '✉️'], ['ع', 'عين', 'عنب', '🍇'], ['غ', 'غين', 'غزال', '🦌'], ['ف', 'فاء', 'فيل', '🐘'],
  ['ق', 'قاف', 'قطة', '🐱'], ['ك', 'كاف', 'كتاب', '📖'], ['ل', 'لام', 'ليمون', '🍋'], ['م', 'ميم', 'موز', '🍌'], ['ن', 'نون', 'نحلة', '🐝'],
  ['ه', 'هاء', 'هدية', '🎁'], ['و', 'واو', 'وردة', '🌹'], ['ي', 'ياء', 'يد', '✋'],
];
const EN_ABC = [
  ['A', 'apple', '🍎'], ['B', 'ball', '⚽'], ['C', 'cat', '🐱'], ['D', 'dog', '🐶'], ['E', 'egg', '🥚'], ['F', 'fish', '🐟'], ['G', 'grapes', '🍇'],
  ['H', 'hat', '🎩'], ['I', 'ice cream', '🍦'], ['J', 'juice', '🧃'], ['K', 'kite', '🪁'], ['L', 'lion', '🦁'], ['M', 'moon', '🌙'], ['N', 'nest', '🪺'],
  ['O', 'orange', '🍊'], ['P', 'pen', '🖊️'], ['Q', 'queen', '👸'], ['R', 'rabbit', '🐰'], ['S', 'sun', '☀️'], ['T', 'tree', '🌳'], ['U', 'umbrella', '☂️'],
  ['V', 'van', '🚐'], ['W', 'watch', '⌚'], ['X', 'box', '📦'], ['Y', 'yo-yo', '🪀'], ['Z', 'zebra', '🦓'],
];
const COLORS = [['أحمر', 'red', '#e53935'], ['أزرق', 'blue', '#1e88e5'], ['أخضر', 'green', '#43a047'], ['أصفر', 'yellow', '#fdd835'], ['برتقالي', 'orange', '#fb8c00'],
  ['بنفسجي', 'purple', '#8e24aa'], ['بني', 'brown', '#6d4c41'], ['أسود', 'black', '#212121'], ['أبيض', 'white', '#ffffff'], ['بمبي', 'pink', '#f06292']];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const AR_NUM = ['صفر', 'واحد', 'اتنين', 'تلاتة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'تمانية', 'تسعة', 'عشرة', 'حداشر', 'اتناشر', 'تلاتاشر', 'أربعتاشر', 'خمستاشر', 'ستاشر', 'سبعتاشر', 'تمنتاشر', 'تسعتاشر', 'عشرين'];
const SHAPES = [['دايرة', 'circle', '<circle cx="50" cy="50" r="40"/>'], ['مربع', 'square', '<rect x="12" y="12" width="76" height="76" rx="4"/>'],
  ['مثلث', 'triangle', '<polygon points="50,8 92,88 8,88"/>'], ['مستطيل', 'rectangle', '<rect x="5" y="25" width="90" height="50" rx="4"/>'],
  ['نجمة', 'star', '<polygon points="50,5 61,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 39,38"/>'], ['قلب', 'heart', '<path d="M50 88 C10 60 5 35 25 20 C38 10 50 22 50 30 C50 22 62 10 75 20 C95 35 90 60 50 88Z"/>']];
const ANIMALS = [['قطة', '🐱', 'مياو'], ['كلب', '🐶', 'هوهو'], ['بقرة', '🐮', 'موو'], ['خروف', '🐑', 'ماء'], ['فرخة', '🐔', 'كاك كاك'], ['حصان', '🐴', ''], ['أسد', '🦁', ''],
  ['فيل', '🐘', ''], ['زرافة', '🦒', ''], ['قرد', '🐒', ''], ['سمكة', '🐟', ''], ['عصفورة', '🐦', 'زقزقة'], ['بطة', '🦆', 'كواك'], ['أرنب', '🐰', ''], ['جمل', '🐫', '']];
const FRUITS = [['تفاحة', '🍎'], ['موزة', '🍌'], ['برتقانة', '🍊'], ['عنب', '🍇'], ['فراولة', '🍓'], ['بطيخة', '🍉'], ['مانجة', '🥭'], ['خوخة', '🍑']];
const VEGGIES = [['جزرة', '🥕'], ['طماطم', '🍅'], ['خيارة', '🥒'], ['بطاطس', '🥔'], ['بصل', '🧅'], ['ذرة', '🌽'], ['فلفل', '🫑'], ['باذنجان', '🍆']];
const BODY = [['عين', '👁️'], ['ودن', '👂'], ['مناخير', '👃'], ['بُق', '👄'], ['إيد', '✋'], ['رجل', '🦶'], ['سنان', '🦷'], ['دماغ', '🧠']];
const TRANSPORT = [['عربية', '🚗', 'land'], ['أتوبيس', '🚌', 'land'], ['قطر', '🚆', 'land'], ['عجلة', '🚲', 'land'], ['طيارة', '✈️', 'air'], ['هليكوبتر', '🚁', 'air'], ['مركب', '⛵', 'sea'], ['سفينة', '🚢', 'sea']];
const VALUES = [
  ['لما نيجي ناكل بنقول إيه؟', ['بسم الله 🍽️', 'تصبح على خير 🌙']], ['لما حد يساعدك تقوله إيه؟', ['شكرًا 🙏', 'مش عايز 😠']],
  ['لما نخلّص لعب بنعمل إيه؟', ['نرتّب اللعب 🧸', 'نسيبها على الأرض 🙈']], ['قبل الأكل بنغسل إيه؟', ['إيدينا 🧼', 'الكرسي 🪑']],
  ['لما نعطس بنقول إيه؟', ['الحمد لله 🤧', 'باي باي 👋']], ['صاحبك وقع على الأرض… تعمل إيه؟', ['أساعده يقوم 🤝', 'أضحك عليه 😆']],
  ['بنكلم بابا وماما إزاي؟', ['بأدب واحترام 🙂', 'بزعيق 😡']], ['أنهي أكل صحي أكتر؟', ['تفاحة 🍎', 'شيبسي كتير 🍟']],
  ['قبل ما ننام بنعمل إيه؟', ['نغسل سناننا 🪥', 'ناكل حلويات 🍬']], ['لما نقابل حد بنقول إيه؟', ['السلام عليكم 👋', 'ولا حاجة 😶']],
  ['لو خدت لعبة صاحبك من غير ما تستأذن؟', ['أرجعها وأقول آسف 🙏', 'أخبيها 🙈']], ['بنرمي الزبالة فين؟', ['في السلة 🗑️', 'في الشارع 🛣️']],
  ['لما نعدّي الشارع بنمسك إيد مين؟', ['بابا أو ماما 👨‍👩‍👧', 'محدش 🚗']], ['لو حد زعلان جنبك تعمل إيه؟', ['أطبطب عليه 🤗', 'أبعد عنه 🚶']],
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const others = (arr, item, n, key = (x) => x) => shuffle(arr.filter((x) => key(x) !== key(item))).slice(0, n);
const arDigits = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const opt = (value, html, extra = {}) => ({ value, html, ...extra });

// ---------- مولّدات الأسئلة ----------
const GEN = {
  arHear(L) { const it = pick(L); return { say: [`فين حرف ${it[1]}؟`, 'ar'], text: 'اسمع واختار الحرف', options: shuffle([it, ...others(AR_LETTERS, it, 3, (x) => x[0])]).map((x) => opt(x[0], `<span class="big-letter">${x[0]}</span>`)), answer: it[0], hint: [it[1], 'ar'] }; },
  arPic(L) { const it = pick(L); return { say: [`أنهي صورة بتبدأ بحرف ${it[1]}؟`, 'ar'], show: `<span class="big-letter">${it[0]}</span>`, text: `أنهي صورة بتبدأ بحرف (${it[0]})؟`, options: shuffle([it, ...others(AR_LETTERS, it, 2, (x) => x[0])]).map((x) => opt(x[0], `<span class="emo">${x[3]}</span><small>${x[2]}</small>`, { say: [x[2], 'ar'] })), answer: it[0] }; },
  arFirst(L) { const it = pick(L); return { say: [`${it[2]}… بتبدأ بأنهي حرف؟`, 'ar'], show: `<span class="emo xl">${it[3]}</span><div class="word">${it[2]}</div>`, text: 'الكلمة دي بتبدأ بأنهي حرف؟', options: shuffle([it, ...others(L.length >= 3 ? L : AR_LETTERS, it, 2, (x) => x[0])]).map((x) => opt(x[0], `<span class="big-letter">${x[0]}</span>`)), answer: it[0] }; },
  arHaraka(L) {
    const it = pick(L), H = [['َ', 'ا', 'فتحة'], ['ُ', 'و', 'ضمة'], ['ِ', 'ي', 'كسرة']], h = pick(H);
    return { say: [`فين ${it[0]}${h[1]}؟`, 'ar'], text: `اسمع: ${it[0]}${h[0]} — فين الحرف بالحركة الصح؟`, options: shuffle(H).map((x) => opt(x[2], `<span class="big-letter">${it[0]}${x[0]}</span><small>${x[2]}</small>`)), answer: h[2] };
  },
  trace(L) { const it = pick(L); return { type: 'trace', letter: it[0], say: [`اكتب حرف ${it[1]} بصباعك`, 'ar'], text: `اكتب حرف (${it[0]}) بصباعك على النقط` }; },
  enHear(L) { const it = pick(L); return { say: [`Find the letter ${it[0]}`, 'en'], text: 'Listen & choose 👂', options: shuffle([it, ...others(EN_ABC, it, 3, (x) => x[0])]).map((x) => opt(x[0], `<span class="big-letter en">${x[0]}${x[0].toLowerCase()}</span>`)), answer: it[0], hint: [it[0], 'en'] }; },
  enPhonic(L) { const it = pick(L); return { say: [`${it[1]}. What letter does ${it[1]} start with?`, 'en'], show: `<span class="emo xl">${it[2]}</span><div class="word en">${it[1]}</div>`, text: 'Which letter does it start with?', options: shuffle([it, ...others(L.length >= 3 ? L : EN_ABC, it, 2, (x) => x[0])]).map((x) => opt(x[0], `<span class="big-letter en">${x[0]}</span>`)), answer: it[0] }; },
  enWord(L) { const it = pick(L); return { say: [`Where is the ${it[1]}?`, 'en'], text: `Where is the ${it[1]}? 🔎`, options: shuffle([it, ...others(EN_ABC, it, 3, (x) => x[0])]).map((x) => opt(x[0], `<span class="emo">${x[2]}</span><small class="en">${x[1]}</small>`)), answer: it[0] }; },
  enColor() { const it = pick(COLORS); return { say: [`Find ${it[1]}`, 'en'], text: `Find ${it[1]} 🎨`, options: shuffle([it, ...others(COLORS, it, 3, (x) => x[1])]).map((x) => opt(x[1], `<span class="dot" style="background:${x[2]}"></span>`)), answer: it[1] }; },
  enNumber(max = 10) { const n = 1 + Math.floor(Math.random() * max); const os = shuffle([n, ...shuffle([...Array(max)].map((_, i) => i + 1).filter((x) => x !== n)).slice(0, 3)]); return { say: [`Find number ${EN_NUM[n]}`, 'en'], text: 'Find the number 🔢', options: os.map((x) => opt(x, `<span class="big-letter en">${x}</span>`)), answer: n }; },
  numHear(max) { const n = 1 + Math.floor(Math.random() * max); const os = shuffle([n, ...shuffle([...Array(max)].map((_, i) => i + 1).filter((x) => x !== n)).slice(0, 3)]); return { say: [`فين رقم ${AR_NUM[n]}؟`, 'ar'], text: 'اسمع واختار الرقم', options: os.map((x) => opt(x, `<span class="big-letter">${arDigits(x)}</span>`)), answer: n }; },
  count(max) {
    const n = 1 + Math.floor(Math.random() * max), thing = pick([...FRUITS, ...ANIMALS.map((a) => [a[0], a[1]])]);
    const os = shuffle([n, ...shuffle([...Array(Math.max(max, 4))].map((_, i) => i + 1).filter((x) => x !== n)).slice(0, 3)]);
    return { say: ['عِدّ… كام واحد؟', 'ar'], show: `<div class="count-box">${Array(n).fill(`<span>${thing[1]}</span>`).join('')}</div>`, text: `عِدّ ال${thing[0].replace(/^ال/, '')}… كام واحد؟`, options: os.map((x) => opt(x, `<span class="big-letter">${arDigits(x)}</span>`)), answer: n };
  },
  more(max) {
    let a = 1 + Math.floor(Math.random() * max), b = 1 + Math.floor(Math.random() * max); while (a === b) b = 1 + Math.floor(Math.random() * max);
    const t = pick(FRUITS), less = Math.random() < .4;
    return { say: [less ? 'أنهي ناحية فيها أقل؟' : 'أنهي ناحية فيها أكتر؟', 'ar'], text: less ? 'أنهي فيها أقل؟ 🤏' : 'أنهي فيها أكتر؟ 🙌',
      options: [opt('a', `<div class="count-box sm">${Array(a).fill(t[1]).join(' ')}</div>`), opt('b', `<div class="count-box sm">${Array(b).fill(t[1]).join(' ')}</div>`)], answer: (less ? a < b : a > b) ? 'a' : 'b', cols: 2 };
  },
  add(max, sub) {
    let a, b, r;
    if (sub) { a = 2 + Math.floor(Math.random() * (max - 1)); b = 1 + Math.floor(Math.random() * (a - 1)); r = a - b; } else { a = 1 + Math.floor(Math.random() * (max - 1)); b = 1 + Math.floor(Math.random() * (max - a)); r = a + b; }
    const t = pick(FRUITS)[1];
    const os = shuffle([r, ...shuffle([...Array(max + 1)].map((_, i) => i).filter((x) => x !== r && x > 0)).slice(0, 3)]);
    const show = sub ? `<div class="eq"><span class="count-box sm">${Array(a).fill(t).map((x, i) => (i >= a - b ? `<s>${x}</s>` : x)).join(' ')}</span></div><div class="word">${arDigits(a)} − ${arDigits(b)} = ؟</div>`
      : `<div class="eq"><span class="count-box sm">${Array(a).fill(t).join(' ')}</span><b>+</b><span class="count-box sm">${Array(b).fill(t).join(' ')}</span></div><div class="word">${arDigits(a)} + ${arDigits(b)} = ؟</div>`;
    return { say: [sub ? `${AR_NUM[a]} ناقص ${AR_NUM[b]}… يساوي كام؟` : `${AR_NUM[a]} زائد ${AR_NUM[b]}… يساوي كام؟`, 'ar'], show, text: sub ? 'شيلنا كام؟ فاضل كام؟' : 'كام مع بعض؟', options: os.map((x) => opt(x, `<span class="big-letter">${arDigits(x)}</span>`)), answer: r };
  },
  next(max) { const n = 1 + Math.floor(Math.random() * (max - 1)), before = Math.random() < .35 && n > 1; const r = before ? n - 1 : n + 1; const os = shuffle([r, ...shuffle([...Array(max)].map((_, i) => i + 1).filter((x) => x !== r)).slice(0, 2)]); return { say: [before ? `إيه الرقم اللي قبل ${AR_NUM[n]}؟` : `إيه الرقم اللي بعد ${AR_NUM[n]}؟`, 'ar'], show: `<div class="word">${before ? `؟ ← ${arDigits(n)}` : `${arDigits(n)} ← ؟`}</div>`, text: before ? 'الرقم اللي قبله؟' : 'الرقم اللي بعده؟', options: os.map((x) => opt(x, `<span class="big-letter">${arDigits(x)}</span>`)), answer: r }; },
  shape() { const it = pick(SHAPES), col = pick(COLORS.slice(0, 7))[2]; return { say: [`فين ال${it[0]}؟`, 'ar'], text: `فين ال${it[0]}؟`, options: shuffle([it, ...others(SHAPES, it, 3, (x) => x[1])]).map((x) => opt(x[1], `<svg viewBox="0 0 100 100" class="shape" fill="${col}">${x[2]}</svg>`)), answer: it[1] }; },
  pattern() {
    const set = shuffle(['🍎', '🍌', '🍇', '⭐', '❤️', '🔵', '🟢', '🐟']).slice(0, 3), kind = pick(['AB', 'AB', 'ABC', 'AAB']);
    const unit = kind === 'AB' ? [set[0], set[1]] : kind === 'ABC' ? set : [set[0], set[0], set[1]];
    const seq = Array(7).fill(0).map((_, i) => unit[i % unit.length]), ans = unit[7 % unit.length];
    const choices = shuffle([...new Set([...set, '🌙'])]).slice(0, 3); if (!choices.includes(ans)) choices[0] = ans;
    return { say: ['كمّل النمط… إيه اللي جاي؟', 'ar'], show: `<div class="pattern">${seq.join(' ')} <b>؟</b></div>`, text: 'إيه اللي جاي بعد كده؟', options: shuffle(choices).map((x) => opt(x, `<span class="emo">${x}</span>`)), answer: ans, cols: 3 };
  },
  arColor() { const it = pick(COLORS); return { say: [`فين اللون ال${it[0]}؟`, 'ar'], text: `فين اللون ال${it[0]}؟`, options: shuffle([it, ...others(COLORS, it, 3, (x) => x[1])]).map((x) => opt(x[1], `<span class="dot" style="background:${x[2]}"></span>`)), answer: it[1] }; },
  pickList(list, q) { const it = pick(list); return { say: [`${q}${it[0]}؟`, 'ar'], text: `${q}${it[0]}؟`, options: shuffle([it, ...others(list, it, 3, (x) => x[0])]).map((x) => opt(x[0], `<span class="emo">${x[1]}</span>`)), answer: it[0] }; },
  sound() { const it = pick(ANIMALS.filter((a) => a[2])); return { say: [`مين بيقول ${it[2]}؟`, 'ar'], text: `مين بيقول «${it[2]}»؟`, options: shuffle([it, ...others(ANIMALS, it, 2, (x) => x[0])]).map((x) => opt(x[0], `<span class="emo">${x[1]}</span>`)), answer: it[0] }; },
  fruitVeg() { const isF = Math.random() < .5, it = pick(isF ? FRUITS : VEGGIES), o = pick(isF ? VEGGIES : FRUITS); return { say: [isF ? 'فين الفاكهة؟' : 'فين الخضار؟', 'ar'], text: isF ? 'فين الفاكهة؟ 🍎' : 'فين الخضار؟ 🥕', options: shuffle([opt(it[0], `<span class="emo">${it[1]}</span><small>${it[0]}</small>`), opt(o[0], `<span class="emo">${o[1]}</span><small>${o[0]}</small>`)]), answer: it[0], cols: 2 }; },
  transport() { const kind = pick(['air', 'sea', 'land']), q = { air: 'أنهي بيطير في السما؟ ☁️', sea: 'أنهي بيمشي في البحر؟ 🌊', land: 'أنهي بيمشي على الأرض؟ 🛣️' }[kind]; const it = pick(TRANSPORT.filter((t) => t[2] === kind)); return { say: [q.replace(/[^؀-ۿ ؟]/g, ''), 'ar'], text: q, options: shuffle([it, ...others(TRANSPORT.filter((t) => t[2] !== kind), it, 2, (x) => x[0])]).map((x) => opt(x[0], `<span class="emo">${x[1]}</span><small>${x[0]}</small>`)), answer: it[0] }; },
  value() { const [q, [good, bad]] = pick(VALUES); return { say: [q, 'ar'], text: q, options: shuffle([opt('g', `<span class="val">${good}</span>`), opt('b', `<span class="val">${bad}</span>`)]), answer: 'g', cols: 1 }; },
};

// ---------- الدروس ----------
const SUBJECTS = {
  ar: { name: 'العربي', icon: 'أ ب', color: '#43a047' }, en: { name: 'English', icon: 'A b', color: '#8e24aa' },
  math: { name: 'الحساب', icon: '١ ٢ ٣', color: '#fb8c00' }, sci: { name: 'العالم حوالينا', icon: '🌍', color: '#1e88e5' }, val: { name: 'قيم وآداب', icon: '🤝', color: '#d6336c' },
};
const LESSONS = [];
(function build() {
  const L = (subject, level, title, mix) => LESSONS.push({ id: `${subject}-${LESSONS.filter((x) => x.subject === subject).length + 1}`, subject, level, title, mix });
  for (let i = 0; i < 28; i += 4) { const g = AR_LETTERS.slice(i, i + 4); L('ar', 'KG1', `حروف: ${g.map((x) => x[0]).join(' ')}`, [[GEN.arHear, g], [GEN.arPic, g], [GEN.arFirst, g], [GEN.arHear, g], [GEN.arPic, g], [GEN.arFirst, g], [GEN.arHear, g], [GEN.trace, g]]); }
  L('ar', 'KG1', 'مراجعة كل الحروف', [[GEN.arHear, AR_LETTERS], [GEN.arPic, AR_LETTERS], [GEN.arFirst, AR_LETTERS]]);
  for (let i = 0; i < 28; i += 7) { const g = AR_LETTERS.slice(i, i + 7); L('ar', 'KG2', `الحركات: ${g[0][0]} ← ${g[6][0]}`, [[GEN.arHaraka, g]]); }
  L('ar', 'KG2', 'اكتب الحروف ✍️', [[GEN.trace, AR_LETTERS]]);
  for (let i = 0; i < 26; i += 5) { const g = EN_ABC.slice(i, i + 5); L('en', 'KG1', `Letters ${g[0][0]} – ${g[g.length - 1][0]}`, [[GEN.enHear, g], [GEN.enPhonic, g], [GEN.enWord, g]]); }
  L('en', 'KG1', 'Colors 🎨', [[GEN.enColor]]);
  L('en', 'KG1', 'Numbers 1 – 10', [[GEN.enNumber, 10]]);
  L('en', 'KG2', 'Phonics review', [[GEN.enPhonic, EN_ABC], [GEN.enWord, EN_ABC]]);
  L('math', 'KG1', 'الأرقام من ١ لـ ٥', [[GEN.numHear, 5], [GEN.count, 5]]);
  L('math', 'KG1', 'الأرقام من ١ لـ ١٠', [[GEN.numHear, 10], [GEN.count, 10]]);
  L('math', 'KG1', 'نعدّ مع بعض', [[GEN.count, 10]]);
  L('math', 'KG1', 'أكتر ولا أقل؟', [[GEN.more, 8]]);
  L('math', 'KG1', 'الأشكال', [[GEN.shape]]);
  L('math', 'KG1', 'كمّل النمط', [[GEN.pattern]]);
  L('math', 'KG2', 'قبل وبعد', [[GEN.next, 10]]);
  L('math', 'KG2', 'الجمع لحد ٥', [[GEN.add, 5]]);
  L('math', 'KG2', 'الجمع لحد ١٠', [[GEN.add, 10]]);
  L('math', 'KG2', 'الطرح لحد ٥', [[GEN.add, 5, true]]);
  L('math', 'KG2', 'الأرقام من ١١ لـ ٢٠', [[GEN.numHear, 20]]);
  L('sci', 'KG1', 'الألوان', [[GEN.arColor]]);
  L('sci', 'KG1', 'الحيوانات', [[GEN.pickList, ANIMALS.map((a) => [a[0], a[1]]), 'فين ال'], [GEN.sound]]);
  L('sci', 'KG1', 'الفاكهة والخضار', [[GEN.fruitVeg], [GEN.pickList, FRUITS, 'فين ال'], [GEN.pickList, VEGGIES, 'فين ال']]);
  L('sci', 'KG1', 'جسمي', [[GEN.pickList, BODY, 'فين ال']]);
  L('sci', 'KG2', 'المواصلات', [[GEN.transport], [GEN.pickList, TRANSPORT, 'فين ال']]);
  L('val', 'KG1', 'آداب كل يوم', [[GEN.value]]);
  L('val', 'KG2', 'أخلاق براعم', [[GEN.value]]);
}());

// ---------- الصوت ----------
let speakSeq = 0; const speakWaiters = {};
function speak(text, lang = 'ar') {
  const code = lang === 'en' ? 'en-US' : 'ar-EG';
  return new Promise((res) => {
    const done = () => res();
    if (window.Android && window.Android.speak) {
      const id = 'L' + (++speakSeq); speakWaiters[id] = done;
      try { window.Android.speak(id, text, code, lang === 'en' ? 0.9 : 0.85, 1.1); } catch (e) { done(); }
      setTimeout(() => { if (speakWaiters[id]) { delete speakWaiters[id]; done(); } }, 1200 + text.length * 180);
    } else if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text); u.lang = code; u.rate = .85; u.pitch = 1.1;
        const v = speechSynthesis.getVoices().find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(lang === 'en' ? 'en' : 'ar'));
        if (v) u.voice = v;
        u.onend = u.onerror = done; speechSynthesis.speak(u);
        setTimeout(done, 1200 + text.length * 180);
      } catch (e) { done(); }
    } else done();
  });
}
const _prevTtsDone = window.__ttsDone;
window.__ttsDone = (id) => { if (speakWaiters[id]) { const f = speakWaiters[id]; delete speakWaiters[id]; f(); } else if (_prevTtsDone) _prevTtsDone(id); };
function stopSpeak() { try { if (window.Android && window.Android.stopSpeak) window.Android.stopSpeak(); else if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
let actx = null;
function chime(good) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = good ? [660, 880, 1320] : [300, 220];
    notes.forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + i * .09;
      o.type = good ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .35);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + .4);
    });
  } catch (e) { /* ignore */ }
}

// ---------- التقدم ----------
const LEARN_ID = 'learn';
function learnFresh() { return { v: 1, lessons: {}, xp: 0, ms: 0, days: {} }; }
async function learnLoad(cid) {
  if (!cid) return learnFresh();
  try { const x = JSON.parse(LS.get('learn_' + cid) || 'null'); if (x) return x; } catch (e) { /* ignore */ }
  if (Cloud.role === 'parent') {
    try { const d = await Cloud.col('hwState').doc(hwId(cid, LEARN_ID)).get(); if (d.exists) return JSON.parse(d.data().ls || 'null') || learnFresh(); } catch (e) { /* ignore */ }
  }
  return learnFresh();
}
function learnSummary(st) {
  const subj = {};
  LESSONS.forEach((l) => { const x = subj[l.subject] = subj[l.subject] || { done: 0, total: 0, acc: [] }; x.total++; const s = st.lessons[l.id]; if (s && s.stars) { x.done++; x.acc.push(s.acc); } });
  Object.values(subj).forEach((x) => { x.acc = x.acc.length ? Math.round(x.acc.reduce((a, b) => a + b, 0) / x.acc.length) : 0; });
  const done = Object.entries(st.lessons).filter(([, v]) => v.stars).sort((a, b) => b[1].last - a[1].last);
  return { title: 'منهج براعم (KG)', xp: st.xp, stars: done.reduce((a, [, v]) => a + v.stars, 0), minutes: Math.round(st.ms / 60000), days: Object.keys(st.days).length,
    done: done.length, total: LESSONS.length, subj, last: new Date().toISOString(), lastDay: Object.keys(st.days).sort().pop() || '',
    recent: done.slice(0, 6).map(([id, v]) => ({ n: `${SUBJECTS[(LESSONS.find((l) => l.id === id) || {}).subject]?.name || ''}: ${(LESSONS.find((l) => l.id === id) || {}).title || id}`, stars: v.stars, acc: v.acc })) };
}
function learnSave(L) {
  if (!L.cid) return;
  LS.set('learn_' + L.cid, JSON.stringify(L.st));
  if (Cloud.role === 'parent') {
    const id = hwId(L.cid, LEARN_ID), sum1 = learnSummary(L.st);
    Cloud.hwProg[id] = { ...sum1, childId: L.cid, itemId: LEARN_ID };
    Cloud.col('hwState').doc(id).set({ id, childId: L.cid, itemId: LEARN_ID, ls: JSON.stringify(L.st), u: Cloud.ts() }).catch((e) => console.warn(e));
    Cloud.col('hwProg').doc(id).set({ id, childId: L.cid, itemId: LEARN_ID, childName: L.name, ...sum1, u: Cloud.ts() }).catch((e) => console.warn(e));
  }
}

// ---------- الشاشة ----------
let LRN = null;
function lessonOpen(L, lesson) {
  if (L.preview || L.active) return true;
  return LESSONS.filter((x) => x.subject === lesson.subject).indexOf(lesson) === 0; // أول درس في كل مادة مجاني
}
async function openLearn(subject) {
  const k = isParent() ? curKid() : null;
  const st = await learnLoad(k && k.id);
  LRN = { cid: k ? k.id : null, name: k ? (k.name || '').split(' ')[0] : 'بطل', girl: k ? k.gender === 'بنت' : false, preview: !k,
    active: !k || hwActiveUntil(kidHwUntil(k)), st, screen: subject ? 'lessons' : 'home', subject: subject || 'ar', level: 'KG1', q: null };
  let ov = document.querySelector('.learn');
  if (!ov) { ov = document.createElement('div'); ov.className = 'learn'; document.body.appendChild(ov); }
  history.pushState({ learn: 1 }, '');
  learnRender();
}
function closeLearn(fromPop) {
  if (!LRN) return false;
  stopSpeak();
  if (LRN.q && LRN.t0) { LRN.st.ms += Date.now() - LRN.t0; learnSave(LRN); }
  const ov = document.querySelector('.learn'); if (ov) ov.remove();
  LRN = null;
  if (!fromPop) history.back();
  render();
  return true;
}
const g2 = (b, g) => (LRN && LRN.girl ? g : b);
function learnRender() {
  const L = LRN, ov = document.querySelector('.learn'); if (!L || !ov) return;
  const totalStars = Object.values(L.st.lessons).reduce((a, v) => a + (v.stars || 0), 0);
  const bar = `<div class="lr-bar"><button class="lr-x" data-action="learnBack">${L.screen === 'home' ? '✕' : '→'}</button>
    <b>${L.screen === 'play' ? esc(L.lesson.title) : L.screen === 'lessons' ? SUBJECTS[L.subject].name : `يلا نتعلّم يا ${esc(L.name)} 🌱`}</b><span class="lr-stars">⭐ ${num(totalStars)}</span></div>`;
  let body = '';
  if (L.screen === 'home') {
    body = `<div class="lr-hello"><div class="mascot">🐣</div><div>${g2('أهلاً يا بطل!', 'أهلاً يا بطلة!')} ${L.preview ? '<span class="badge orange">معاينة للحضانة</span>' : ''}<br><small>اختار${g2('', 'ي')} المادة اللي ${g2('عايز', 'عايزة')} تتعلّم${g2('ها', 'يها')}</small></div></div>
      <div class="lr-subjects">${Object.entries(SUBJECTS).map(([id, s]) => {
        const ls = LESSONS.filter((l) => l.subject === id), d = ls.filter((l) => (L.st.lessons[l.id] || {}).stars).length;
        return `<button class="lr-subj" style="--c:${s.color}" data-action="learnSubj" data-s="${id}"><span class="ico">${s.icon}</span><b>${s.name}</b><small>${num(d)} / ${num(ls.length)} درس</small>
          <span class="lr-prog"><i style="width:${ls.length ? d / ls.length * 100 : 0}%"></i></span></button>`;
      }).join('')}</div>
      ${!L.active ? `<div class="lr-lock">🔒 أول درس في كل مادة مجاني. اشترك${g2('', 'ي')} عشان كل الدروس تتفتح.</div>` : ''}`;
  } else if (L.screen === 'lessons') {
    const ls = LESSONS.filter((l) => l.subject === L.subject);
    body = `<div class="lr-lessons">${['KG1', 'KG2'].map((lv) => `<h3>${lv}</h3>${ls.filter((l) => l.level === lv).map((l) => {
      const s = L.st.lessons[l.id] || {}, open = lessonOpen(L, l);
      return `<button class="lr-lesson ${open ? '' : 'locked'}" data-action="${open ? 'learnStart' : 'learnLocked'}" data-id="${l.id}" style="--c:${SUBJECTS[l.subject].color}">
        <span class="t">${esc(l.title)}</span><span class="s">${open ? (s.stars ? '⭐'.repeat(s.stars) + '☆'.repeat(3 - s.stars) : '☆☆☆') : '🔒'}</span></button>`;
    }).join('')}`).join('')}</div>`;
  } else if (L.screen === 'play') {
    const q = L.q, prog = `<div class="lr-qprog">${L.lesson.qs.map((_, i) => `<i class="${i < L.i ? 'done' : i === L.i ? 'cur' : ''}"></i>`).join('')}</div>`;
    if (q.type === 'trace') {
      body = `${prog}<div class="lr-q"><div class="lr-text">${esc(q.text)} <button class="lr-say" data-action="learnSay">🔊</button></div>
        <div class="trace-wrap"><canvas id="traceCv" width="600" height="600"></canvas></div>
        <div class="btn-row" style="justify-content:center"><button class="btn" data-action="traceClear">🧽 امسح</button><button class="btn primary" data-action="traceDone">✔ خلصت</button></div></div>`;
    } else {
      body = `${prog}<div class="lr-q">${q.show ? `<div class="lr-show">${q.show}</div>` : ''}<div class="lr-text">${esc(q.text)} <button class="lr-say" data-action="learnSay">🔊</button></div>
        <div class="lr-opts" style="--cols:${q.cols || (q.options.length > 3 ? 2 : q.options.length)}">${q.options.map((o, i) => `<button class="lr-opt" data-action="learnAns" data-i="${i}">${o.html}</button>`).join('')}</div></div>`;
    }
  } else if (L.screen === 'done') {
    const r = L.result;
    body = `<div class="lr-done"><div class="big-stars">${'⭐'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
      <h2>${r.stars === 3 ? g2('ممتاز يا بطل! 🏆', 'ممتازة يا بطلة! 🏆') : r.stars === 2 ? g2('شاطر جدًا! 👏', 'شاطرة جدًا! 👏') : r.stars === 1 ? g2('برافو عليك! 🌟', 'برافو عليكي! 🌟') : 'يلا نجرّب تاني 💪'}</h2>
      <p>جاوبت صح ${num(r.correct)} من ${num(r.total)}</p><p class="xp">+${num(r.xp)} نقطة ✨</p>
      <div class="btn-row" style="justify-content:center"><button class="btn" data-action="learnStart" data-id="${L.lesson.id}">🔁 تاني</button>
      ${r.next ? `<button class="btn primary" data-action="learnStart" data-id="${r.next.id}">الدرس اللي بعده ←</button>` : ''}
      <button class="btn" data-action="learnSubj" data-s="${L.lesson.subject}">الدروس</button></div></div>`;
  }
  ov.innerHTML = bar + `<div class="lr-body">${body}</div>`;
  if (L.screen === 'play' && L.q.type === 'trace') setupTrace(L.q.letter);
}
function learnStart(id) {
  const lesson = LESSONS.find((l) => l.id === id); if (!lesson) return;
  if (!lessonOpen(LRN, lesson)) { toast('🔒 الدرس ده للمشتركين'); return; }
  const qs = [];
  for (let i = 0; i < 8; i++) { const [fn, ...args] = lesson.mix[i % lesson.mix.length]; qs.push([fn, args]); }
  if (!lesson.mix.some(([fn]) => fn === GEN.trace)) qs.sort(() => Math.random() - .5);
  Object.assign(LRN, { screen: 'play', lesson: { ...lesson, qs }, i: 0, correct: 0, score: 0, tries: 0, t0: Date.now() });
  learnNext();
}
function learnNext() {
  const L = LRN, [fn, args] = L.lesson.qs[L.i];
  L.q = fn(...args); L.tries = 0;
  learnRender();
  const q = L.q;
  setTimeout(() => { if (LRN && LRN.q === q) speak(...q.say); }, 250);
}
async function learnAnswer(i, el) {
  const L = LRN, q = L.q, o = q.options[i];
  if (L.locked) return;
  if (o.say) speak(...o.say);
  if (o.value === q.answer) {
    L.locked = true; el.classList.add('right'); chime(true);
    if (L.tries === 0) { L.correct++; L.score += 1; } else L.score += .5;
    await speak(pick(['برافو!', 'شاطر!', 'ممتاز!', 'صح كده!', 'جميل!']).replace('شاطر!', g2('شاطر!', 'شاطرة!')), 'ar');
    setTimeout(() => { L.locked = false; learnAdvance(); }, 350);
  } else {
    L.tries++; el.classList.add('wrong'); el.disabled = true; chime(false);
    speak(g2('حاول تاني', 'حاولي تاني'), 'ar');
    if (L.tries >= 2) { const idx = q.options.findIndex((x) => x.value === q.answer); const b = document.querySelectorAll('.lr-opt')[idx]; if (b) b.classList.add('hint'); }
  }
}
function learnAdvance() {
  const L = LRN; L.i++;
  if (L.i < L.lesson.qs.length) { learnNext(); return; }
  const total = L.lesson.qs.length, acc = Math.round(L.score / total * 100), stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  const prev = L.st.lessons[L.lesson.id] || { stars: 0, tries: 0 };
  const xp = stars * 10 + L.correct;
  L.st.lessons[L.lesson.id] = { stars: Math.max(prev.stars || 0, stars), acc: Math.max(prev.acc || 0, acc), tries: (prev.tries || 0) + 1, last: Date.now() };
  L.st.xp += xp; L.st.ms += Date.now() - L.t0; L.t0 = 0;
  const d = today(); L.st.days[d] = (L.st.days[d] || 0) + 1;
  const subjLs = LESSONS.filter((x) => x.subject === L.lesson.subject), ni = subjLs.findIndex((x) => x.id === L.lesson.id) + 1;
  const next = subjLs[ni] && lessonOpen(L, subjLs[ni]) ? subjLs[ni] : null;
  L.result = { stars, correct: L.correct, total, xp, next };
  L.screen = 'done'; L.q = null;
  learnSave(L);
  learnRender();
  if (stars) { chime(true); confetti(); }
  speak(stars ? g2(`برافو يا ${L.name}! خدت ${stars} نجوم`, `برافو يا ${L.name}! خدتي ${stars} نجوم`) : 'يلا نجرّب تاني', 'ar');
}
function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  for (let i = 0; i < 40; i++) { const s = document.createElement('i'); s.textContent = pick(['⭐', '🌸', '🎈', '✨', '🌼', '💚']); s.style.left = Math.random() * 100 + 'vw'; s.style.animationDelay = Math.random() * .6 + 's'; s.style.fontSize = 18 + Math.random() * 22 + 'px'; c.appendChild(s); }
  (document.querySelector('.learn') || document.body).appendChild(c); setTimeout(() => c.remove(), 3200);
}

// ---------- تتبّع الحرف ----------
let TR = null;
function setupTrace(letter) {
  const cv = document.getElementById('traceCv'); if (!cv) return;
  const ctx = cv.getContext('2d');
  const font = '420px "Noto Naskh Arabic", "Segoe UI", Tahoma, sans-serif';
  ctx.clearRect(0, 0, 600, 600);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f1e6f7'; ctx.fillText(letter, 300, 330);
  ctx.setLineDash([6, 10]); ctx.lineWidth = 4; ctx.strokeStyle = '#b48ad6'; ctx.strokeText(letter, 300, 330); ctx.setLineDash([]);
  // قناع الحرف للتقييم
  const m = document.createElement('canvas'); m.width = m.height = 600; const mc = m.getContext('2d');
  mc.font = font; mc.textAlign = 'center'; mc.textBaseline = 'middle'; mc.fillText(letter, 300, 330);
  const ink = document.createElement('canvas'); ink.width = ink.height = 600; const ic = ink.getContext('2d');
  ic.lineCap = ic.lineJoin = 'round'; ic.lineWidth = 46; ic.strokeStyle = '#000';
  TR = { cv, ctx, mask: mc.getImageData(0, 0, 600, 600).data, ink, ic, drawing: false, last: null, strokes: 0 };
  const pos = (e) => { const r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; return [(p.clientX - r.left) * 600 / r.width, (p.clientY - r.top) * 600 / r.height]; };
  const start = (e) => { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } TR.drawing = true; TR.last = pos(e); TR.strokes++; };
  const move = (e) => {
    if (!TR.drawing) return; e.preventDefault(); const p = pos(e);
    for (const [c, w, col] of [[ctx, 26, '#d6336c'], [ic, 46, '#000']]) { c.lineCap = c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = col; c.beginPath(); c.moveTo(...TR.last); c.lineTo(...p); c.stroke(); }
    TR.last = p;
  };
  const end = () => { TR.drawing = false; };
  cv.addEventListener('pointerdown', start); cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', end); cv.addEventListener('pointerleave', end); cv.addEventListener('pointercancel', end);
}
function traceScore() {
  if (!TR) return 0;
  const ink = TR.ic.getImageData(0, 0, 600, 600).data; let inMask = 0, covered = 0, outside = 0, drawn = 0;
  for (let i = 3; i < ink.length; i += 16) {
    const m = TR.mask[i] > 100, d = ink[i] > 100;
    if (m) { inMask++; if (d) covered++; } else if (d) outside++;
    if (d) drawn++;
  }
  if (!drawn) return 0;
  const cov = covered / Math.max(1, inMask), prec = covered / drawn;
  return cov >= .55 && prec >= .35 ? 1 : cov >= .35 && prec >= .25 ? .5 : 0;
}

// ---------- كارت المنهج في شاشة التمارين ----------
function learnCard(k) {
  const st = (() => { try { return JSON.parse(LS.get('learn_' + (k ? k.id : '')) || 'null'); } catch (e) { return null; } })();
  const p = k ? Cloud.hwProg[hwId(k.id, LEARN_ID)] : null;
  const done = p ? p.done : st ? Object.values(st.lessons).filter((v) => v.stars).length : 0;
  return `<div class="card learn-card"><div class="between"><div><h3 style="margin:0">🌱 منهج براعم — KG1 و KG2</h3>
    <div class="sub">عربي · English · حساب · العالم حوالينا · قيم وآداب — ${num(LESSONS.length)} درس بالصوت والصور</div></div><div class="mascot sm">🐣</div></div>
    <div class="lr-mini">${Object.entries(SUBJECTS).map(([id, s]) => `<button class="lr-chip" style="--c:${s.color}" data-action="learnOpen" data-s="${id}">${s.icon} <b>${s.name}</b></button>`).join('')}</div>
    ${k ? `<div class="bar-track" style="margin-top:8px"><div class="bar-fill green" style="width:${Math.round(done / LESSONS.length * 100)}%"></div></div><div class="sub">خلّص ${num(done)} من ${num(LESSONS.length)} درس${p && p.xp ? ` · ✨ ${num(p.xp)} نقطة` : ''}</div>` : ''}
    <button class="btn primary block" style="margin-top:10px" data-action="learnOpen">ابدأ التعلّم ←</button></div>`;
}

Object.assign(ACTIONS_EXTRA, {
  learnOpen: (el) => openLearn(el.dataset.s),
  learnBack: () => { if (!LRN) return; if (LRN.screen === 'home') closeLearn(false); else if (LRN.screen === 'lessons') { LRN.screen = 'home'; learnRender(); } else { stopSpeak(); if (LRN.t0) { LRN.st.ms += Date.now() - LRN.t0; LRN.t0 = 0; learnSave(LRN); } LRN.screen = 'lessons'; LRN.subject = LRN.lesson.subject; learnRender(); } },
  learnSubj: (el) => { stopSpeak(); LRN.screen = 'lessons'; LRN.subject = el.dataset.s; learnRender(); },
  learnStart: (el) => learnStart(el.dataset.id),
  learnLocked: () => { toast('🔒 اشترك عشان الدرس ده يتفتح'); speak('الدرس ده للمشتركين', 'ar'); },
  learnSay: () => { if (LRN && LRN.q) speak(...LRN.q.say); },
  learnAns: (el) => learnAnswer(Number(el.dataset.i), el),
  traceClear: () => setupTrace(LRN.q.letter),
  traceDone: async () => {
    const s = traceScore();
    if (s > 0) { LRN.score += s; if (s === 1) LRN.correct++; chime(true); await speak(s === 1 ? g2('برافو! كتبته صح', 'برافو! كتبتيه صح') : 'كويس! حاول تكتبه أحسن المرة الجاية', 'ar'); learnAdvance(); }
    else { chime(false); LRN.tries++; speak(g2('امشي على النقط وحاول تاني', 'امشي على النقط وحاولي تاني'), 'ar'); if (LRN.tries >= 3) learnAdvance(); }
  },
});
