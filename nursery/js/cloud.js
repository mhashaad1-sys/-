// ================== المزامنة بين الموبايلات (Firebase) ==================
// البيانات بتتحفظ على الموبايل الأول (IndexedDB) وبتترفع للسيرفر.
// كل موبايل بيسحب بس التغييرات الجديدة (حقل u = وقت آخر تعديل على السيرفر) عشان نوفر في الاستهلاك.
// الحذف بيتعمل بعلامة deleted بدل المسح، عشان باقي الموبايلات تعرف إن الحاجة اتمسحت.

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAy-8sTvCFOYDvbqJcrTmzNWgekbjB6xaI',
  authDomain: 'baraem-dd5af.firebaseapp.com',
  projectId: 'baraem-dd5af',
  storageBucket: 'baraem-dd5af.firebasestorage.app',
  messagingSenderId: '510206544850',
  appId: '1:510206544850:web:f2a27cdc586a7d42ac960b',
};
const ORG_ID = 'baraem';

const ROLES = { owner: 'صاحبة الحضانة', admin: 'مدير/ة', accountant: 'محاسب/ة', teacher: 'معلمة / مشرفة' };
const ALL_STORES = ['settings', 'classes', 'children', 'attendance', 'payments', 'expenses', 'staff', 'notes', 'staffAtt', 'staffTx', 'schedule'];
const BASIC_STORES = ['settings', 'classes', 'children', 'attendance', 'notes', 'schedule'];
const CLOUD_READ = {
  admin: ALL_STORES,
  accountant: [...BASIC_STORES, 'payments', 'expenses', 'staff', 'staffTx', 'staffAtt'],
  teacher: BASIC_STORES,
};
const CLOUD_WRITE = {
  admin: ALL_STORES,
  accountant: ['attendance', 'notes', 'schedule', 'children', 'payments', 'expenses', 'staff', 'staffTx'],
  teacher: ['attendance', 'notes', 'schedule'],
};
// الحضور بيتخزن على السيرفر مستند واحد لكل يوم (أوفر بكتير من مستند لكل طفل)
const DAY_STORES = { attendance: { col: 'attDays', key: 'childId' }, staffAtt: { col: 'staffAttDays', key: 'staffId' } };
const cloudCol = (s) => (DAY_STORES[s] ? DAY_STORES[s].col : s);
const LS = {
  get(k) { try { return localStorage.getItem('baraem_' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('baraem_' + k, v); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem('baraem_' + k); } catch (e) { /* ignore */ } },
};
const clean = (o) => JSON.parse(JSON.stringify(o));

const Cloud = {
  ready: false, user: null, role: null, email: '', name: '', status: 'local', error: '',
  unsubs: [], pending: false, queue: Promise.resolve(), onChange: () => {},

  init(onChange) {
    this.onChange = onChange;
    if (typeof firebase === 'undefined') return;
    try {
      // للتجربة على الكمبيوتر فقط: ?emu=1 (سيرفر وهمي محلي)
      this.emu = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]emu=1/.test(location.search);
      if (this.emu) FIREBASE_CONFIG.projectId = 'demo-baraem';
      firebase.initializeApp(FIREBASE_CONFIG);
      this.db = firebase.firestore();
      this.auth = firebase.auth();
      if (this.emu) {
        this.db.useEmulator('localhost', 8080);
        this.auth.useEmulator('http://localhost:9099', { disableWarnings: true });
      }
      this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      this.ready = true;
      this.auth.onAuthStateChanged((u) => this.onUser(u).catch((e) => this.fail(e)));
      window.addEventListener('online', () => this.refreshStatus());
      window.addEventListener('offline', () => this.refreshStatus());
    } catch (e) { this.fail(e); }
  },

  fail(e) {
    console.error(e);
    this.status = 'error';
    this.error = e && e.code === 'unavailable' ? 'محتاج إنترنت أول مرة عشان نوصل للسيرفر' : (e && (e.message || e.code)) || String(e);
    this.onChange('status');
  },

  org() { return this.db.collection('org').doc(ORG_ID); },
  col(name) { return this.org().collection(name); },
  ts() { return firebase.firestore.FieldValue.serverTimestamp(); },
  effRole() { return this.role === 'owner' ? 'admin' : this.role; },
  canRead(s) { return !this.role || (CLOUD_READ[this.effRole()] || []).includes(s); },
  canWrite(s) { return !this.role || (CLOUD_WRITE[this.effRole()] || []).includes(s); },

  async login(email, pass) { await this.auth.signInWithEmailAndPassword(email.trim(), pass); },
  async resetPassword(email) { await this.auth.sendPasswordResetEmail(email.trim()); },
  async logout() {
    this.stop();
    await this.auth.signOut();
    // البيانات على الموبايل ده كانت نسخة من السيرفر: نمسحها عشان ما تختلطش
    for (const s of DB.STORES) await DB.clear(s);
    ['linked', ...ALL_STORES.map((s) => 'sync_' + cloudCol(s))].forEach((k) => LS.del(k));
    location.reload();
  },

  async onUser(u) {
    this.stop();
    this.user = u; this.role = null;
    if (!u) { this.status = 'local'; this.onChange('auth'); return; }
    this.email = (u.email || '').toLowerCase();
    this.status = 'connecting'; this.onChange('status');

    const orgSnap = await this.org().get();
    let role, uploaded = false;
    if (!orgSnap.exists) {
      const ok = confirm(`أول تسجيل دخول للحضانة على السيرفر.\n\nهل انتِ صاحبة الحضانة؟\nهيتم رفع كل البيانات اللي على الموبايل ده، وحسابك (${this.email}) هيبقى المدير الرئيسي.`);
      if (!ok) { await this.auth.signOut(); return; }
      await this.org().set({ owner: u.uid, ownerEmail: this.email, createdAt: this.ts() });
      role = 'owner';
      this.role = role;
      await this.uploadAll((done, total) => { this.error = `جاري رفع البيانات ${done} من ${total}...`; this.onChange('status'); });
      this.error = '';
      uploaded = true;
    } else if (orgSnap.data().owner === u.uid) {
      role = 'owner';
    } else {
      const m = await this.col('members').doc(this.email).get();
      if (!m.exists) { this.status = 'noaccess'; this.onChange('status'); return; }
      role = m.data().role; this.name = m.data().name || '';
    }
    this.role = role;

    // موبايل جديد على الحساب ده: نبدأ من بيانات السيرفر
    if (LS.get('linked') !== u.uid) {
      if (!uploaded) for (const s of DB.STORES) await DB.clear(s);
      ALL_STORES.forEach((s) => LS.del('sync_' + cloudCol(s)));
      LS.set('linked', u.uid);
    }
    this.onChange('reload');
    this.start();

    // لو المدير غيّر الصلاحية أو شال الحساب
    if (role !== 'owner') {
      this.unsubs.push(this.col('members').doc(this.email).onSnapshot((d) => {
        if (!d.exists || d.data().role !== this.role) location.reload();
      }, () => {}));
    }
  },

  start() {
    this.status = navigator.onLine ? 'synced' : 'offline';
    for (const s of ALL_STORES.filter((x) => this.canRead(x))) {
      const c = cloudCol(s);
      const since = Number(LS.get('sync_' + c) || 0);
      let q = this.col(c);
      if (since) q = q.where('u', '>=', firebase.firestore.Timestamp.fromMillis(since));
      this.unsubs.push(q.onSnapshot((snap) => { this.queue = this.queue.then(() => this.apply(s, c, snap)).catch(console.error); },
        (e) => console.warn('sync', s, e.code)));
    }
    this.onChange('status');
  },

  stop() { this.unsubs.forEach((u) => u()); this.unsubs = []; },

  async apply(s, c, snap) {
    let maxU = Number(LS.get('sync_' + c) || 0), changed = false;
    const day = DAY_STORES[s];
    for (const ch of snap.docChanges()) {
      if (ch.type === 'removed') continue;
      const d = ch.doc.data({ serverTimestamps: 'estimate' });
      const u = d.u && d.u.toMillis ? d.u.toMillis() : 0;
      if (!ch.doc.metadata.hasPendingWrites && u > maxU) maxU = u;
      delete d.u;
      if (day) {
        for (const [k, rec] of Object.entries(d.r || {})) {
          const id = `${d.date}_${k}`;
          if (rec) await localPut(s, { ...rec, id, date: d.date, [day.key]: k });
          else await localDel(s, id);
        }
      } else if (d.deleted) await localDel(s, ch.doc.id);
      else await localPut(s, { ...d, id: ch.doc.id });
      changed = true;
    }
    if (maxU) LS.set('sync_' + c, String(maxU));
    if (changed) this.onChange('data');
  },

  // ---------- الكتابة على السيرفر ----------
  write(store, obj) {
    if (!this.role) return;
    if (!this.canWrite(store)) { this.denied(); return; }
    const day = DAY_STORES[store];
    const ref = day ? this.col(day.col).doc(obj.date) : this.col(store).doc(obj.id);
    const data = day ? { id: obj.date, date: obj.date, u: this.ts(), r: { [obj[day.key]]: clean(obj) } } : { ...clean(obj), u: this.ts() };
    this.track(ref.set(data, day ? { merge: true } : {}));
  },
  del(store, id) {
    if (!this.role) return;
    if (!this.canWrite(store)) { this.denied(); return; }
    const day = DAY_STORES[store];
    if (day) {
      const date = id.slice(0, 10), key = id.slice(11);
      this.track(this.col(day.col).doc(date).set({ id: date, date, u: this.ts(), r: { [key]: null } }, { merge: true }));
    } else this.track(this.col(store).doc(id).set({ id, deleted: true, u: this.ts() }));
  },
  track(p) {
    this.pending = true; this.refreshStatus();
    p.catch((e) => { if (e.code === 'permission-denied') this.denied(); else console.error(e); });
    this.db.waitForPendingWrites().then(() => { this.pending = false; this.refreshStatus(); });
  },
  denied() { if (typeof toast === 'function') toast('⛔ حسابك مش مسموح له بالتعديل ده'); },
  refreshStatus() {
    if (!this.role) return;
    this.status = !navigator.onLine ? 'offline' : this.pending ? 'pending' : 'synced';
    this.onChange('status');
  },

  // رفع كل البيانات المحلية (أول مرة، أو بعد استرجاع نسخة احتياطية)
  async uploadAll(progress) {
    const ops = [];
    for (const s of DB.STORES) {
      if (!this.canWrite(s)) continue;
      const rows = await DB.getAll(s);
      const day = DAY_STORES[s];
      if (day) {
        const byDate = {};
        rows.forEach((r) => { (byDate[r.date] = byDate[r.date] || {})[r[day.key]] = clean(r); });
        Object.entries(byDate).forEach(([date, r]) => ops.push([day.col, date, { id: date, date, r }]));
      } else rows.forEach((r) => ops.push([s, r.id, clean(r)]));
    }
    for (let i = 0; i < ops.length; i += 300) {
      const b = this.db.batch();
      ops.slice(i, i + 300).forEach(([c, id, data]) => b.set(this.col(c).doc(id), { ...data, u: this.ts() }));
      await b.commit();
      if (progress) progress(Math.min(i + 300, ops.length), ops.length);
    }
  },

  // ---------- المستخدمين (للمدير) ----------
  async listMembers() { const q = await this.col('members').get(); return q.docs.map((d) => d.data()); },
  async addMember({ name, email, password, role }) {
    email = email.trim().toLowerCase();
    if (password) {
      // تطبيق فرعي عشان إنشاء الحساب ما يخرجش المدير من حسابه
      const sec = firebase.apps.find((a) => a.name === 'sec') || firebase.initializeApp(FIREBASE_CONFIG, 'sec');
      if (this.emu) { try { sec.auth().useEmulator('http://localhost:9099', { disableWarnings: true }); } catch (e) { /* already */ } }
      try { await sec.auth().createUserWithEmailAndPassword(email, password); }
      catch (e) { if (e.code !== 'auth/email-already-in-use') throw e; }
      await sec.auth().signOut();
    }
    await this.col('members').doc(email).set({ email, name, role, addedBy: this.email, addedAt: this.ts() });
  },
  async removeMember(email) { await this.col('members').doc(email).delete(); },
};

// تحديث البيانات المحلية من السيرفر (من غير ما نرجع نرفعها تاني)
async function localPut(store, obj) {
  await DB.put(store, obj);
  const i = D[store].findIndex((x) => x.id === obj.id);
  if (i >= 0) D[store][i] = obj; else D[store].push(obj);
}
async function localDel(store, id) { await DB.del(store, id); D[store] = D[store].filter((x) => x.id !== id); }

const AUTH_ERRORS = {
  'auth/invalid-credential': 'الإيميل أو الباسورد غلط', 'auth/wrong-password': 'الباسورد غلط', 'auth/user-not-found': 'الإيميل ده مش متسجل',
  'auth/invalid-email': 'الإيميل مكتوب غلط', 'auth/too-many-requests': 'محاولات كتير، استنى شوية وجرب تاني', 'auth/network-request-failed': 'مفيش إنترنت',
  'auth/weak-password': 'الباسورد لازم يكون ٦ حروف أو أرقام على الأقل', 'auth/operation-not-allowed': 'فعّل Email/Password في Firebase (Authentication ← Sign-in method)',
  'permission-denied': 'مش مسموح — اتأكد إن قواعد الحماية (Rules) اتنشرت في Firebase',
};
const authMsg = (e) => AUTH_ERRORS[e && e.code] || (e && e.message) || String(e);
