# كيفية رفع الموقع على استضافة cPanel

بما أن موقعك يستخدم **Next.js** مع قاعدة بيانات **SQLite** (`better-sqlite3`)، فإن عملية الرفع تتطلب خطوات خاصة لضمان عمل قاعدة البيانات والأداء الصحيح.

لا يمكنك مجرد نسخ الملفات المبنية (build) من جهازك (Windows) إلى السيرفر (Linux) لأن مكتبة قاعدة البيانات تتطلب "بناء" متوافق مع نظام التشغيل. **لذا، يجب بناء المشروع على السيرفر.**

إليك الخطوات التفصيلية:

## 1. تجهيز الاستضافة (cPanel)

1.  تأكد من أن استضافتك تدعم **Node.js** (ابحث عن أيقونة "Setup Node.js App" أو "تطبيقات Node.js" في لوحة التحكم).
2.  يفضل أن يكون لديك صلاحية الدخول عبر الـ **Terminal** (موجه الأوامر) في cPanel.

## 2. رفع الملفات

أفضل طريقة هي سحب الملفات مباشرة من GitHub الذي قمنا بنشره للتو، لضمان سهولة التحديث مستقبلاً.

### الخيار أ: عبر Git (الأفضل)
1.  في cPanel، ابحث عن **Git™ Version Control**.
2.  اضغط **Create**.
3.  في خانة **Clone URL**، ضع رابط مشروعك: `https://github.com/overseas500-creator/visit.git`
4.  في خانة **Repository Path**، اختر مجلداً (مثلاً `visit_app`).
5.  اضغط **Create**.

### الخيار ب: رفع الملفات يدوياً
1.  اضغط `Download ZIP` من صفحة GitHub أو اضغط الملفات من جهازك (بدون مجلد `node_modules` وبدون مجلد `.next`).
2.  في cPanel، اذهب إلى **File Manager**.
3.  ارفع الملف المضغوط وفك الضغط في مجلد جديد (مثلاً `visit_app`).

## 3. إعداد تطبيق Node.js

1.  في cPanel، اذهب إلى **Setup Node.js App**.
2.  اضغط **Create Application**.
3.  **Application Root**: اكتب اسم المجلد الذي رفعت فيه الملفات (مثلاً `visit_app`).
4.  **Application URL**: اختر النطاق (Domain) الذي تريد تشغيل الموقع عليه.
5.  **Application Startup File**: في Next.js، يجب أن يكون هذا الملف هو ملف التشغيل المخصص. بما أننا نستخدم البناء المستقل، سنحتاج لإنشاء ملف `server.js` بسيط أو توجيهه.
    *   *ملاحظة:* اتركها فارغة مؤقتاً أو اكتب `server.js` وسنقوم بإنشائه لاحقاً.
6.  اضغط **Create**.
7.  ستظهر لك أوامر في الأعلى للدخول إلى البيئة الافتراضية (Virtual Environment). انسخ الأمر الذي يشبه:
    `source /home/username/nodevenv/visit_app/20/bin/activate && cd /home/username/visit_app`

## 4. تثبيت المكتبات وبناء المشروع

1.  افتح **Terminal** في cPanel.
2.  الصق أمر التفعيل الذي نسخته في الخطوة السابقة واضغط Enter.
3.  الآن، داخل المجلد، نفذ الأوامر التالية:

```bash
# تثبيت المكتبات
npm install

# بناء المشروع (هذا قد يستغرق وقتاً)
npm run build
```

*ملاحظة:* إذا فشل البناء بسبب الذاكرة (Memory)، قد تحتاج للتواصل مع الدعم الفني لزيادة الذاكرة المؤقتة أو استخدام `NODE_OPTIONS="--max-old-space-size=4096"` قبل الأمر.

## 5. تشغيل الموقع

Next.js في وضع الإنتاج (Production) يعمل بشكل أفضل مع ملف تشغيل مخصص أو عبر `npm start`. في cPanel، "Setup Node.js App" يبحث عن ملف `server.js` أو `app.js`.

بعد البناء الناجح، سيقوم Next.js (بفضل إعداد `output: 'standalone'`) بإنشاء نسخة جاهزة للتشغيل في المجلد `.next/standalone`.

افضل طريقة هي إنشاء ملف `server.js` في المجلد الرئيسي (`visit_app`) بالمحتوى التالي:

1.  في **File Manager**، داخل مجلد `visit_app`، أنشئ ملفاً جديداً باسم `server.js`.
2.  ضع فيه الكود التالي:

```javascript
// server.js for cPanel
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;
// Make sure to point to the standalone build if available, or standard next start
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
```

3.  عد إلى **Setup Node.js App**.
4.  تأكد أن **Application Startup File** هو `server.js`.
5.  اضغط **Restart**.

## ملاحظات هامة لقاعدة البيانات (SQLite)

قاعدة البيانات `visitors.db` ستكون ملفاً في المجلد الرئيسي.
*   تأكد من أن المجلد لديه صلاحيات الكتابة.
*   **احذر**: إذا قمت بإعادة رفع الملفات وحذف المجلد، ستفقد البيانات. احتفظ دائماً بنسخة احتياطية من ملف `visitors.db` من خلال File Manager.

---
مبروك! موقعك الآن يجب أن يعمل على الرابط المحدد.
