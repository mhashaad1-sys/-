// تطبيق إدارة مرضى د. محمد مجدي - جراحة الصدر
// كل البيانات تُخزَّن محليًا على الهاتف (IndexedDB) ولا يتم إرسالها لأي سيرفر

let currentPatientId = null;
let currentImages = [];

const $ = (id) => document.getElementById(id);

// ---------- محرك اقتراحات مبدئي (قائمة مبنية على خبرة جراحة الصدر) ----------
// ملاحظة: اقتراحات إرشادية لتسريع كتابة الملف فقط، ولا تغني عن تقييم الطبيب.
const SUGGESTION_RULES = [
  { keywords: ['ضيق نفس', 'ضيق تنفس', 'صعوبة تنفس'], suggestions: [
    'احتمال: انصباب جنبي (Pleural Effusion) - يُقترح أشعة مقطعية على الصدر',
    'احتمال: استرواح صدري (Pneumothorax) - يُقترح أشعة صدر عاجلة',
    'يُقترح: قياس تشبع الأكسجين ووظائف التنفس (PFTs)'
  ]},
  { keywords: ['ألم صدر', 'وجع صدر', 'ألم بالصدر'], suggestions: [
    'يُقترح: تخطيط قلب (ECG) لاستبعاد أسباب قلبية أولًا',
    'احتمال: التهاب غضروف ضلعي أو سبب عضلي هيكلي',
    'يُقترح: أشعة صدر ومراجعة تاريخ الإصابات أو الجراحات السابقة'
  ]},
  { keywords: ['نفث دم', 'دم مع الكحة', 'كحة دم'], suggestions: [
    'يُقترح: أشعة مقطعية على الصدر بصبغة + تنظير قصبات لاستبعاد ورم أو توسع قصبات',
    'مهم: تقييم عاجل نظرًا لاحتمالية وجود ورم بالرئة خاصة مع التدخين'
  ]},
  { keywords: ['سعال', 'كحة مزمنة', 'كحة مستمرة'], suggestions: [
    'يُقترح: أشعة صدر + مزرعة بلغم إذا استمر السعال أكثر من 3 أسابيع',
    'احتمال: التهاب شعبي مزمن أو ارتجاع مريئي إذا كان مصحوبًا بحرقان'
  ]},
  { keywords: ['فقدان وزن', 'نحافة', 'دعف مفاجئ'], suggestions: [
    'مهم: فقدان الوزن غير المبرر مع أعراض صدرية يستدعي استبعاد ورم بالرئة أو المريء'
  ]},
  { keywords: ['كتلة', 'ورم', 'تضخم غدد'], suggestions: [
    'يُقترح: أشعة مقطعية بالصبغة + عينة نسيجية (Biopsy) لتحديد طبيعة الكتلة'
  ]},
  { keywords: ['حادث', 'كسر ضلوع', 'إصابة صدر', 'ارتجاج'], suggestions: [
    'يُقترح: أشعة مقطعية على الصدر لاستبعاد استرواح أو نزيف داخل الصدر بعد الإصابة'
  ]},
];

function generateSuggestions(text) {
  const t = (text || '').trim();
  if (!t) return [];
  const found = new Set();
  for (const rule of SUGGESTION_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) {
      rule.suggestions.forEach((s) => found.add(s));
    }
  }
  return Array.from(found);
}

function renderSuggestions() {
  const text = $('fComplaint').value;
  const suggestions = generateSuggestions(text);
  const box = $('suggestionBox');
  const chips = $('suggestionChips');
  chips.innerHTML = '';
  if (suggestions.length === 0) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  suggestions.forEach((s) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = s;
    chip.onclick = () => {
      const notesField = $('fNotes');
      notesField.value = notesField.value ? notesField.value + '\n' + s : s;
      toast('تمت إضافة الاقتراح للملاحظات');
    };
    chips.appendChild(chip);
  });
}

// ---------- أدوات مساعدة ----------
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.add('hidden'), 2200);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showView(view) {
  $('listView').classList.toggle('hidden', view !== 'list');
  $('detailView').classList.toggle('hidden', view !== 'detail');
}

// ---------- شاشة القائمة ----------
async function renderPatientList(filter = '') {
  const patients = await DB.getAllPatients();
  const list = $('patientList');
  list.innerHTML = '';
  const filtered = patients
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  $('emptyState').classList.toggle('hidden', patients.length !== 0);

  filtered.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'patient-card';
    card.innerHTML = `
      <div>
        <div class="name">${escapeHtml(p.name || 'بدون اسم')}</div>
        <div class="meta">${p.age ? 'السن: ' + p.age : ''} ${p.phone ? '· ' + p.phone : ''}</div>
      </div>
      <div class="chevron">‹</div>
    `;
    card.onclick = () => openPatient(p.id);
    list.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- شاشة التفاصيل ----------
async function openPatient(id) {
  currentPatientId = id;
  let patient;
  if (id) {
    patient = await DB.getPatient(id);
  } else {
    patient = {
      id: DB.uid(),
      name: '', age: '', gender: 'ذكر', phone: '', address: '', nationalId: '',
      chronic: '', allergies: '', meds: '', prevSurgeries: '', smoking: 'لا',
      complaint: '', diagnosis: '', notes: '',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
  }

  $('fName').value = patient.name || '';
  $('fAge').value = patient.age || '';
  $('fGender').value = patient.gender || 'ذكر';
  $('fPhone').value = patient.phone || '';
  $('fAddress').value = patient.address || '';
  $('fNationalId').value = patient.nationalId || '';
  $('fChronic').value = patient.chronic || '';
  $('fAllergies').value = patient.allergies || '';
  $('fMeds').value = patient.meds || '';
  $('fPrevSurgeries').value = patient.prevSurgeries || '';
  $('fSmoking').value = patient.smoking || 'لا';
  $('fComplaint').value = patient.complaint || '';
  $('fDiagnosis').value = patient.diagnosis || '';
  $('fNotes').value = patient.notes || '';

  $('deletePatientBtn').classList.toggle('hidden', !id);
  currentPatientId = patient.id;

  renderSuggestions();
  await renderImages();
  showView('detail');
}

async function renderImages() {
  currentImages = currentPatientId ? await DB.getImagesForPatient(currentPatientId) : [];
  const grid = $('imageGrid');
  grid.innerHTML = '';
  currentImages
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((img) => {
      const item = document.createElement('div');
      item.className = 'image-item';
      const isPdf = img.mime === 'application/pdf';
      item.innerHTML = `
        ${isPdf
          ? `<div class="pdf-thumb">📄</div>`
          : `<img src="${img.dataUrl}" alt="${escapeHtml(img.type)}">`}
        <div class="img-label">${escapeHtml(img.type)}<br>${new Date(img.createdAt).toLocaleDateString('ar-EG')}</div>
        <button class="img-del" data-id="${img.id}">✕</button>
      `;
      const viewEl = item.querySelector('img, .pdf-thumb');
      viewEl.onclick = () => openLightbox(img);
      item.querySelector('.img-del').onclick = async (e) => {
        e.stopPropagation();
        if (confirm('حذف هذه الصورة؟')) {
          await DB.deleteImage(img.id);
          renderImages();
        }
      };
      grid.appendChild(item);
    });
}

function openLightbox(img) {
  if (img.mime === 'application/pdf') {
    window.open(img.dataUrl, '_blank');
    return;
  }
  $('lightboxImg').src = img.dataUrl;
  $('lightbox').classList.remove('hidden');
}

async function savePatient() {
  const name = $('fName').value.trim();
  if (!name) {
    toast('من فضلك أدخل اسم المريض');
    $('fName').focus();
    return;
  }
  const existing = currentPatientId ? await DB.getPatient(currentPatientId) : null;
  const patient = {
    id: currentPatientId || DB.uid(),
    name,
    age: $('fAge').value,
    gender: $('fGender').value,
    phone: $('fPhone').value.trim(),
    address: $('fAddress').value.trim(),
    nationalId: $('fNationalId').value.trim(),
    chronic: $('fChronic').value.trim(),
    allergies: $('fAllergies').value.trim(),
    meds: $('fMeds').value.trim(),
    prevSurgeries: $('fPrevSurgeries').value.trim(),
    smoking: $('fSmoking').value,
    complaint: $('fComplaint').value.trim(),
    diagnosis: $('fDiagnosis').value.trim(),
    notes: $('fNotes').value.trim(),
    createdAt: existing ? existing.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
  currentPatientId = patient.id;
  if (existing) {
    await DB.updatePatient(patient);
  } else {
    await DB.addPatient(patient);
  }
  toast('تم حفظ البيانات على الهاتف بنجاح');
}

async function deleteCurrentPatient() {
  if (!currentPatientId) return;
  if (!confirm('هل أنت متأكد من حذف بيانات هذا المريض نهائيًا؟')) return;
  await DB.deletePatient(currentPatientId);
  currentPatientId = null;
  await renderPatientList($('searchInput').value);
  showView('list');
  toast('تم حذف المريض');
}

async function handleImageUpload(file, type) {
  if (!currentPatientId) {
    await savePatient();
  }
  const dataUrl = await fileToDataUrl(file);
  const image = {
    id: DB.uid(),
    patientId: currentPatientId,
    type,
    mime: file.type,
    dataUrl,
    createdAt: Date.now(),
  };
  await DB.addImage(image);
  await renderImages();
  toast('تمت إضافة الصورة/الأشعة');
}

// ---------- تصدير / استيراد نسخة احتياطية ----------
async function exportBackup() {
  const data = await DB.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `نسخة-احتياطية-مرضى-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('تم تصدير النسخة الاحتياطية');
}

async function importBackup(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await DB.importAll(data);
    await renderPatientList();
    toast('تم استيراد النسخة الاحتياطية بنجاح');
  } catch (err) {
    toast('تعذر استيراد الملف، تأكد أنه ملف نسخة احتياطية صحيح');
  }
}

// ---------- ربط الأحداث ----------
window.addEventListener('DOMContentLoaded', () => {
  renderPatientList();

  $('addPatientBtn').onclick = () => openPatient(null);
  $('backBtn').onclick = async () => {
    showView('list');
    await renderPatientList($('searchInput').value);
  };
  $('searchInput').oninput = (e) => renderPatientList(e.target.value);

  $('savePatientBtn').onclick = savePatient;
  $('deletePatientBtn').onclick = deleteCurrentPatient;
  $('fComplaint').oninput = renderSuggestions;

  $('fImgFile').onchange = (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file, $('fImgType').value);
    e.target.value = '';
  };

  $('lightboxClose').onclick = () => $('lightbox').classList.add('hidden');
  $('lightbox').onclick = (e) => { if (e.target.id === 'lightbox') $('lightbox').classList.add('hidden'); };

  $('menuBtn').onclick = () => $('menuPanel').classList.toggle('hidden');
  document.addEventListener('click', (e) => {
    if (!$('menuPanel').contains(e.target) && e.target !== $('menuBtn')) {
      $('menuPanel').classList.add('hidden');
    }
  });
  $('exportBtn').onclick = () => { exportBackup(); $('menuPanel').classList.add('hidden'); };
  $('importBtn').onclick = () => { $('importFile').click(); $('menuPanel').classList.add('hidden'); };
  $('importFile').onchange = (e) => {
    const file = e.target.files[0];
    if (file) importBackup(file);
    e.target.value = '';
  };
  $('printBtn').onclick = () => { window.print(); $('menuPanel').classList.add('hidden'); };
});

// ---------- تسجيل Service Worker للعمل بدون إنترنت ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
