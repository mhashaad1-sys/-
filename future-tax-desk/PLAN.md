# خطة «مكتب فيوتشر الضريبي» — المرحلة 0

**الحالة:** مسودة للموافقة — مفيش كود اتكتب لسه.
**تاريخ:** 29 أكتوبر 2026

> **ملحوظة مهمة عن ملفات `samples/`:** الفولدر مش موجود دلوقتي. زي ما اتفقنا: **هنبدأ من غير samples ونأجّل الاستيراد لحد ما تحطها.**
> يعني الحاجات دي **مأجّلة** ومش هتتعمل غير بعد ما النسخ تتحط في `future-tax-desk/samples/`:
> - فحص تركيب ملفات Excel الحقيقية (القسم 3 تحت فاضي لحد ساعتها).
> - كتابة المستوردات الخاصة بكل ملف (شاشة «استيراد أولي» نفسها هتتبني، بس من غير محوّلات الملفات).
> - اختبارات القبول اللي بتعتمد على الأرقام (891 مستند، 184 أمر، 625 مستخلص، إقرار سبتمبر...).
> - كشف «ملفين بنفس المحتوى / نسختين من نفس الملف».
>
> كل حاجة تانية (الشاشات، قاعدة البيانات، القواعد، محرك التصنيف واختباراته، اختبارات نموذج 41، الـ Excel والـ PDF) هتتبني وتتختبر عادي من غير العينات.

---

## 1. مكان المشروع في الـ repo

الـ repo الحالي فيه تطبيق تاني خالص (تطبيق المرضى PWA في الجذر). عشان ماندوسش عليه، البرنامج كله هيبقى في فولدر منفصل:

```
future-tax-desk/
├─ PLAN.md, QUESTIONS.md
├─ package.json, electron-builder.yml, vite.config.ts, drizzle.config.ts
├─ resources/            ← أيقونة، خطوط Cairo/IBM Plex Arabic، tessdata (ara+eng)
├─ samples/              ← نسخ ملفاتك (في .gitignore — مش هتترفع على GitHub أبداً)
├─ src/
│  ├─ core/              ← منطق نقي + اختبارات Vitest (مفيش import من electron/react)
│  │  ├─ money.ts        ← قروش integer، تنسيق، نسب بالـ basis points
│  │  ├─ dates.ts        ← ISO، عرض يوم/شهر/سنة، كشف اليوم/الشهر المتقلوب
│  │  ├─ classify/       ← classifySite + محرك القواعد
│  │  ├─ invoices/       ← تطبيع أرقام الفواتير، مطابقة مورد+رقم
│  │  ├─ payment-orders/ ← بادئات، مأمورية متوقعة، اقتراح الربط + الثقة
│  │  ├─ vat/            ← حسابات نموذج 10 + تنبيهات الإقفال
│  │  ├─ wht/            ← قواعد نموذج 41 + التحقق قبل التصدير
│  │  ├─ import/         ← كشف صف العناوين، تجاهل الإجماليات، تقرير الاستيراد
│  │  └─ suggestions.ts  ← نموذج «اقتراح» موحد (current/proposed/reason/confidence)
│  ├─ main/              ← Electron main: db، IPC handlers، excel، pdf، ocr، backup، safeStorage
│  ├─ preload/           ← API محدود (contextBridge) — مفيش nodeIntegration
│  ├─ renderer/          ← React + Tailwind RTL + AG Grid
│  └─ db/
│     ├─ schema/*.ts     ← Drizzle
│     ├─ migrations/
│     └─ seed/           ← البيانات المرجعية (القسم 3 في البرومبت) كـ JSON
└─ tests/e2e/            ← Playwright (Electron)
```

## 2. قرارات تقنية (مطابقة للبرومبت، مع توضيحات)

| الموضوع | القرار |
|---|---|
| الإطار | Electron + React + TypeScript + Vite (عن طريق `electron-vite`) — زي ما طلبت. |
| الجداول | **AG Grid Community** (فيه تجميع row grouping محدود في Community — التجميع بالجهاز ← الموقع هعمله بـ tree/group من عندي لو لزم). |
| DB | `better-sqlite3` + Drizzle + migrations، WAL mode، `foreign_keys=ON`. |
| الفلوس | كل مبلغ `INTEGER` بالقرش (اسم العمود ينتهي بـ `_pt`). النسب `INTEGER` بجزء من عشرة آلاف (`1400` = 14%، `504` = 5.04%). التقريب: half-up على مستوى البند ثم الجمع (محتاج تأكيد — سؤال 11). |
| التواريخ | `TEXT` ISO `YYYY-MM-DD`. المستورد بيكشف لو اليوم ≤ 12 والقيمة ممكن تتقري بالعكس ويطلّع تنبيه. |
| كلمة سر خلية «إعداد» | تتخزن مشفرة بـ `safeStorage` في جدول `settings`. الشيت كله `protect(password)` وكل الخلايا **unlocked** ما عدا خلية «إعداد» — كده تقدر تعدّل في باقي الشيت وخلية الإعداد بس اللي بتطلب كلمة سر. ⚠️ معلومة: حماية الشيت في Excel مش تشفير؛ أي حد عنده أدوات ممكن يشيلها. |
| PDF | قوالب HTML + `printToPDF`، `page-break-before: always` لكل جهة، ترقيم «صفحة س من ص» في الـ footer. الخط مدمج فالتشكيل العربي صح. |
| OCR | `pdfjs-dist` للنص؛ لو الصفحة صورة → render ثم Tesseract.js (`ara+eng`) مع ملفات traineddata مدمجة (~15MB). الصفحة **التانية** افتراضياً، وتتغير يدوي. |
| مسار DB | افتراضي `%APPDATA%/FutureTaxDesk/future.db`. ⚠️ فتح SQLite مباشرة من فولدر OneDrive بيعرّضها للتلف وقت المزامنة؛ هقترح إن **النسخ الاحتياطي** هو اللي يروح OneDrive والقاعدة تفضل محلية (سؤال 4). |
| التغليف | electron-builder → NSIS x64. البيئة اللي أنا شغال فيها Linux، فهعمل **GitHub Actions على `windows-latest`** يبني Setup.exe ويطلعه كـ artifact. التجربة على جهاز نظيف لازم تتعمل منك. |
| بدون إنترنت | مفيش أي `fetch` خارجي، CSP بيمنع أي origin بره البرنامج. فحص التحديثات زرار يدوي بس (مرحلة 7). |

## 3. تركيب ملفات Excel

**⏸ مأجّل لحد ما تحط `samples/`.** لما تحطها هملا الجدول ده لكل ملف: الشيتات، صف العناوين الحقيقي، الأعمدة، صفوف الإجمالي، الخلايا المدموجة، المعادلات البايظة، عدد الصفوف، وأي تكرار بين الملفات — وأقف أسألك قبل ما أكتب المستورد.

اللي هبنيه دلوقتي من غير العينات: **مستورد عام** (`core/import`) بيدوّر على صف العناوين بمطابقة أسماء أعمدة متوقعة (مع تطبيع: ى/ي، ة/ه، أ/إ/ا، مسافات)، بيقرأ الـ cached values، بيتجاهل الفاضي والإجمالي، وبيسجل أي خلية مش مفهومة في `import_issues` — ومعاه اختبارات على ملفات Excel صناعية بعمله بنفسي في الاختبارات.

ومستورد **تصدير البورتال** (جميع الفواتير + بيانات الفواتير) هبنيه على أسماء الأعمدة المكتوبة في البرومبت (5.1)، وأأكده على العينة الحقيقية بعدين.

## 4. الـ Schema التفصيلي

اصطلاحات: كل جدول فيه `id INTEGER PK`، `created_at`، `updated_at`. `_pt` = قروش، `_bp` = نسبة ×100 (1400 = 14%). الـ enums نصوص بـ CHECK.

### 4.1 مرجعي
- **entities** (الأجهزة): `name` UNIQUE، `tax_id`، `is_central`، `parent_id` (للمركزية: المهندسين العسكريين/السويس/البحوث الزراعية)، `contact_name`، `contact_title`، `address`، `notes`.
- **entity_aliases**: `entity_id`، `alias` (كما في البورتال)، `alias_norm` UNIQUE.
- **payment_order_prefixes**: `prefix` UNIQUE (GP4854...)، `entity_id`.
- **tax_offices** (المأموريات): `name`، `code` UNIQUE (10601849...).
- **tax_office_expectations**: `year_from`، `year_to`، `tax_office_id`، `mode` (`only` / `allowed`) — منها تتحسب «مأمورية مشكوك فيها».
- **sites**: `entity_id`، `name_norm` (111، ب55، 76...)، `display_name`، `tax_class` (`14` / `5.04` / `pending`)، `vat_project_id` NULL، `manpower_file_no`، `directorate`، `start_date`، `closed_at`، UNIQUE(`entity_id`,`name_norm`). (الموقع مفتاحه الجهاز+الاسم، لأن «5» بدر غير «5» تاني.)
- **site_aliases**: `site_id`، `alias`، `alias_norm`.
- **vat_projects** (مشروعات 14%): `name`، `entity_id`، `cost_center_names` (JSON — «ديارنا»، «يدر اخضر16ع»...)، `revenue_buyer_alias` («أسواق مارينا»)، `start_date`.
- **tax_rate_periods**: `kind` (`table`/`vat`)، `date_from`، `date_to`، `site_tax_class`، `rate_bp`، `note` — النسب حسب السنة كبيانات مش كود.
- **classification_rules**: `priority`، `name`، `match_field` (`description`/`internal_no`/`buyer`/`entity`)، `pattern_type` (`regex`/`keywords`/`exact`)، `pattern`، `entity_condition_id` NULL، `exclude_pattern` NULL، `result_entity_id`، `result_site_id` NULL، `result_site_name` NULL، `stop` (bool)، `enabled`، `note`.
- **wht_transaction_types** (TRNS_TYP): `code`، `name`، `rate_bp`، `min_amount_pt`.
- **wht_deduction_types** (DED_TYPE): `code`، `name`، `forces_zero_rate`.
- **suppliers**: `tax_reg_no` UNIQUE، `name`، `national_id`، `address`، `default_trns_typ` NULL، `is_advance_payment` (كود 5)، `is_related_party` (آرت جروب)، `invoice_no_style` (مثلاً «بدون بادئة السنة»)، `notes`.
- **supplier_aliases**: `supplier_id`، `alias`، `alias_norm`.

### 4.2 الإيراد وأوامر الدفع
- **sales_invoices**: `uuid` UNIQUE، `internal_no`، `details`، `doc_type` (`invoice`/`credit`/`debit`)، `status`، `issue_date`، `submit_date`، `currency`، `sales_total_pt`، `invoice_value_pt`، `vat_pt`، `t1_bp`، `table_tax_pt`، `t2_bp`، `total_pt`، `buyer_tax_id`، `buyer_name`، `buyer_address`، `reference_no`، `entity_id`، `site_id`، `classification_reason`، `classification_status` (`auto`/`approved`/`unclassified`)، `running_no` (رقم الجاري)، `tax_year`، `tax_month`، `po_status` (محسوب: `original`/`copy`/`none`/`partial`)، `draft_id` NULL، `import_batch_id`، `superseded_by_batch_id`.
- **sales_invoice_lines**: `invoice_id`، `line_no`، `description`، `item_code`، `qty`، `unit_price_pt`، `net_pt`، `vat_pt`، `table_tax_pt`، `total_pt`.
- **invoice_drafts** (مسودات المستخلصات): `entity_id`، `site_id`، `running_no`، `description` (مولّد «جاري N موقع X [الجهاز]»)، `value_pt`، `rate_bp`، `tax_pt`، `status` (`draft`/`sent_for_review`/`submitted`)، `sales_invoice_id` NULL، `sent_at`.
- **payment_orders**: `order_no` UNIQUE (GP...)، `entity_id` (من البادئة)، `due_date`، `amount_pt`، `tax_office_id`، `beneficiary_text`، `original_status` (`original`/`copy`/`missing`/`unknown`)، `source` (`file`/`image`/`transcribed_list`/`manual`)، `ocr_confidence`، `suspicious_office` (محسوب)، `duplicate_of_id`، `notes`.
- **payment_order_links**: `payment_order_id`، `sales_invoice_id`، `allocated_pt`، `link_source` (`suggested`/`manual`/`imported`)، UNIQUE(الاتنين).
- **po_requests** (طلبات أوامر الدفع للأجهزة): `entity_id`، `generated_at`، `sent_at`، `reply_at`، `reply_notes`، `document_id`؛ و**po_request_items**: `request_id`، `sales_invoice_id`.
- **tax_claims**: `claim_no` UNIQUE، `type` (`vat`/`income`/`contributions`/`payroll`/`martyrs_fund`/`other`)، `period_from`، `period_to`، `original_pt`، `paid_pt`، `remaining_pt`، `last_synced_at`.
- **claim_payments**: `claim_id`، `receipt_no`، `paid_at`، `amount_pt`، `commission_pt`.
- **claim_order_links**: `claim_id`، `payment_order_id`، `allocated_pt`.

### 4.3 المشتريات ونموذج 10
- **purchase_invoices**: `uuid` UNIQUE، `internal_no`، `internal_no_norm`، `supplier_id`، `supplier_tax_reg_no`، `doc_type`، `status`، `portal_issue_date` (**المرجع**)، `babel_reg_date` (للمعلومة بس)، `net_pt`، `vat_pt`، `vat_rate_bp`، `t4_pt` (اللي المورد كتبه)، `items_summary` (أوصاف مفصولة بـ «+»)، `vat_class` (`14`/`5`/`exempt`/`out_of_scope`/`unclassified`)، `eligible_form10`، `has_wht`، `trns_typ_code`، `reported_in_return_id` NULL، `excluded_reason` (Cancelled...).
- **purchase_invoice_lines**: زي sales_invoice_lines.
- **purchase_allocations** (توزيع على مراكز التكلفة): `purchase_invoice_id`، `site_id` / `vat_project_id`، `net_pt`، `vat_pt`، `deductible` (محسوب من تصنيف المشروع). CHECK في الكود: المجموع = الفاتورة.
- **purchases_without_invoice**: `supplier_id`/`supplier_name`، `material`، `kind` (`should_have_invoice`/`by_nature`)، `amount_pt`، `period`، `followup_status`.
- **purchase_reviews** (كشف الأحد/الأربعاء): `reviewed_at`، `from_date`، `to_date`، `document_id`.
- **vat_returns**: `year`، `month`، `version` (مسودة 1، 2...)، `sales_14_base_pt`، `sales_exempt_pt`، `output_vat_pt`، `local_purchases_pt`، `input_vat_pt`، `prev_credit_pt`، `payable_pt`، `carried_credit_pt`، `status` (`draft`/`submitted`/`amended`)، `submitted_at`، UNIQUE(`year`,`month`,`version`).
- **vat_return_items**: `return_id`، `kind` (`sale`/`purchase`)، `invoice_id`، `base_pt`، `vat_pt`.

### 4.4 نموذج 41
- **wht_returns**: `year`، `quarter`، `status`، `submitted_at`.
- **wht_lines**: `return_id`، `serial`، `supplier_id`، `tax_reg_no`، `national_id`، `name`، `address`، `tax_office_name`، `tax_office_code`، `trns_date`، `trns_typ`، `trns_val_pt`، `ded_type`، `ded_date` (DED_AMNT)، `trns_net_pt`، `ded_bp`، `withheld_pt`، `source_invoice_ids` (JSON)، `status` (`included`/`excluded`)، `exclude_reason`، `flags` (JSON: related_party، service_at_1%...).
- **babel_wht**: `return_id`/`period`، `supplier_tax_reg_no`، `supplier_name`، `doc_no`، `doc_date`، `net_pt`، `withheld_pt`، `import_batch_id`.

### 4.5 القوى العاملة والتأمين والـ HR
- **manpower_files**: `site_id`، `authority`، `directorate`، `file_no`.
- **manpower_certificates**: `manpower_file_id`، `running_no`، `value_pt` NULL، `status` (`ok`/`missing_value`)، `portal_reg_date`، `clearance_issued`، `clearance_no`، `clearance_date`، `babel_matched`، `sales_invoice_id` NULL.
- **social_insurance**: `site_id`، `certificate_id`، `period`، `amount_pt`، `paid_pt`، `notes`.
- **contractor_balances**: `site_id`، `contractor_name`، `statement_balance_pt`، `proposed_pt`، `notes`، `import_batch_id`، `approved_at`.
- **employees**: `code`، `name`، `job_title`، `department`، `hire_date`، `hourly_rate_pt`، `active`.
- **payroll_monthly**: `employee_id`، `year`، `month`، `salary_pt`، `overtime_hours` (×100)، `overtime_pt`، `transport_pt`، `late_deduction_pt`، `net_pt`، UNIQUE(`employee_id`,`year`,`month`).
- **insurance_policies**: `policy_no`، `endorsement_no`، `insurer`، `site_id`، `entity_id`، `beneficiary`، `sum_insured_pt`، `start_date`، `end_date`، `premium_pt`، `premium_breakdown` (JSON)، `equipment` (JSON)، `deductible_pct_bp`، `deductible_min_pt`، `notes`.
- **insurance_quotes**: `request_ref`، `insurer`، `duration_months`، `rate_per_mille_bp`، `premium_pt`، `site_id`، `equipment`، `deductible`، `coverages`، `valid_until`.
- **income_tax_years**: `year` UNIQUE، `advance_pt`، `paid_pt`، `remaining_pt`، `assessment_status`، `assessment_notes`.
- **payroll_tax_filings** (كسب العمل الشهري): `year`، `month`، `file_name`، `uploaded_at`، `status`.

### 4.6 عام
- **tasks**: `title`، `module`، `related_table`، `related_id`، `priority`، `status`، `followup_date`، `notes`.
- **alerts**: `kind`، `severity`، `related_table`، `related_id`، `message`، `dismissed_at` (أغلبها بتتحسب وقت العرض، والجدول للـ dismiss بس).
- **documents**: `sha256`، `stored_path`، `original_name`، `mime`، `size`؛ و**document_links**: `document_id`، `related_table`، `related_id`.
- **suggestion_batches** + **suggestions**: `batch_id`، `module`، `target_table`، `target_id`، `field`، `current_value`، `proposed_value`، `reason`، `confidence`، `status` (`pending`/`applied`/`rejected`).
- **audit_log**: `at`، `action_group_id` (عشان Undo لـ «طبّق» كاملة)، `table`، `row_id`، `op`، `before` JSON، `after` JSON، `undone_at`.
- **import_batches**: `file_name`، `sha256`، `stored_path`، `file_type`، `period_from`، `period_to`، `imported_at`، `status` (`preview`/`applied`/`superseded`)؛ و**import_issues**: `batch_id`، `sheet`، `cell`، `raw_value`، `message`.
- **settings**: `key` PK، `value`، `is_secret` (القيمة مشفرة).
- **saved_views**: `grid_id`، `name`، `state` JSON.

## 5. القواعد الذهبية → إزاي هتتنفذ
1. **«طبّق»:** أي عملية تلقائية بتكتب في `suggestions` بس. `applySuggestions(ids)` بتعمل transaction واحدة وتسجل كل تغيير في `audit_log` بنفس `action_group_id` → Undo بيرجّع المجموعة كلها.
2. **الملفات الأصلية:** الاستيراد بيقرأ بس، وينسخ لـ `imports/<sha256>.<ext>`؛ نفس الـ hash → «الملف ده اتستورد قبل كده يوم كذا».
3. **آخر نسخة:** ملفين من نفس النوع لنفس الفترة → شاشة مقارنة (زيادة/ناقص/متغير) والمستخدم يختار. (التعارض مع «الأحدث يكسب» في القسم 6 — شوف سؤال 3.)
4. **Excel:** مُصدّر واحد `exportWorkbook()` بيحط خلية «إعداد» في كل شيت تلقائي؛ ملف رفع 41 بيستخدم مُصدّر تاني `exportPortalUpload()` من غير أي خلية زيادة، وعليه اختبار يتأكد.
5. **PDF:** قالب أساسي فيه الترويسة + الرقم الضريبي + تاريخ الإعداد + «إعداد: محمد حشاد» + ترقيم.
7. **مفيش «فواتير بديلة»:** مفيش أي وظيفة بتقترح مورد تاني لفاتورة؛ الحاجات اللي بطبيعتها من غير فاتورة بتتعلّم `by_nature`.

## 6. تعارضات وملاحظات لقيتها في البرومبت نفسه

| # | الملاحظة |
|---|---|
| أ | **الناقص 625 مستخلص**، بس مجموع التوزيع بالأجهزة = 196+143+172+25+37+12+13+8+16+1 = **623**. فرق 2 — غالباً فاتورتين 2022 اللي جهتهم مش معروفة (مهمة 2). محتاج تأكيد. |
| ب | القاعدة الذهبية 3 («مايختارش لوحده») بتتعارض مع جدول الاستيراد الأولي («الأحدث يكسب»). اقتراحي: يعرض الفرق ويقترح الأحدث كاختيار افتراضي وانت تطبّق. |
| ج | إقرار سبتمبر: المدخلات 8,906,134.37 − المخرجات 4,926,293.31 = **3,979,841.06** بالظبط = الرصيد الدائن. يعني الرصيد الدائن السابق من أغسطس = صفر؟ ولا مش داخل في الرقم ده؟ |
| د | المخرجات 4,926,293.31 = 35,187,809.38 × 14% بالظبط. محتاج أفهم إزاي فواتير الـ 5.04% بتتقسم في الإقرار (36% وعاء 14% و64% معفى؟). |
| هـ | التسليم المطلوب Windows Setup.exe، وأنا شغال على Linux في الكلاود — البناء هيبقى عن طريق GitHub Actions على Windows، والتجربة على جهاز نظيف منك. |
| و | الـ repo فيه تطبيق المرضى منشور على GitHub Pages (يعني غالباً الـ repo **public**). بيانات الشركة المرجعية (أرقام ضريبية، أسماء موردين، مهام فيها مبالغ) هتبقى في الـ seed. `samples/` و`*.db` في `.gitignore` في كل الأحوال. |

## 7. خطة المراحل (معدّلة عشان samples مأجّلة)

| المرحلة | المحتوى | يعتمد على samples؟ |
|---|---|---|
| 0 | الخطة دي + `QUESTIONS.md` | لا |
| 1 | الأساس كامل زي البرومبت (الهيكل، DB، seed، محرك التصنيف + اختباراته، الإعدادات، backup، audit/undo، شاشة الاقتراحات، Excel بخلية «إعداد»، PDF صفحة لكل جهة، المستورد العام بمعاينة) | لا |
| 2 | 5.1 + 5.2 (الشاشات، استيراد تصدير البورتال، OCR، الربط، الطلبات) — **من غير** محولات ملفات الاستيراد الأولي واختبارات الأرقام | جزئياً |
| 3 | 5.3 + 5.4 | جزئياً |
| 4 | 5.5 كامل + اختبارات القواعد | لا (القواعد) |
| 5 | 5.7 + 5.10 | جزئياً |
| 6 | 5.6، 5.8، 5.9، 5.11، 5.12، 5.13، الرئيسية | لا |
| **S** | **لما تحط samples:** فحص الملفات → تقرير التركيب والتكرار → أسئلتي → المستوردات الأولية → اختبارات القبول بالأرقام (القسم 8) | **أيوه** |
| 7 | التغليف، Setup.exe، الدليل | لا |

المرحلة S تتعمل في أي وقت بعد المرحلة 1، ويُفضّل قبل 7.

بعد كل مرحلة: هشغّل كل الاختبارات وأقولك النتيجة بصراحة، وأقف أستنى موافقتك.
