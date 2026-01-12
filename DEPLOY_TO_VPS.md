# دليل نشر تطبيق Next.js على سيرفر VPS (AlmaLinux/CentOS) - النسخة المحدثة والمنقحة

تم تحديث هذا الدليل بناءً على التجربة العملية الناجحة لإصلاح مشاكل التوافق، خاصةً المتعلقة بمكتبة قواعد البيانات (SQLite) وإصدارات النظام القديمة.

## معلومات السيرفر
- **النظام:** AlmaLinux 8 (يحتوي على GLIBC و GCC قديمين).
- **Node.js:** الإصدار 20 (تم تثبيته عبر NodeSource).
- **المجلد:** `/root/visit_new` (أو `/home/ajawe/public_html/visit_new`).
- **عنوان IP:** `104.207.95.60`
- **النطاق:** `security.ajaweedjeddah.online`

---

## القاعدة الذهبية (هام جداً)
**لا تستخدم مكتبة `better-sqlite3` أبداً على هذا السيرفر.**
مترجمات السيرفر (GLIBC) قديمة ولا تدعم النسخ الحديثة من هذه المكتبة، وتثبيت أدوات بناء حديثة (GCC 12) لا يكفي لحل جميع المشاكل (خاصة أخطاء الـ Linking).
**الحل المعتمد:** استخدام مكتبة `sqlite3` الكلاسيكية مع الغلاف `sqlite`، واستخدام نمط `async/await` في الكود.

---

## خطوات التحديث والنشر (عند وجود تعديلات جديدة)
عندما تقوم بعمل تعديلات على جهازك وترفعها إلى GitHub، اتبع الخطوات التالية لتطبيقها على السيرفر:

### 1. الاتصال بالسيرفر
```bash
ssh root@104.207.95.60
# أدخل كلمة المرور عند الطلب
```

### 2. سحب التحديثات وبناء المشروع
انسخ هذه الأوامر ونفذها بالترتيب:

```bash
# الانتقال لمجلد المشروع
cd /root/visit_new

# سحب آخر التعديلات من GitHub
git pull origin main
# (ملاحظة: إذا واجهت خطأ "conflicts" أو "local changes"، نفذ الأمر التالي لمسح التغييرات المحلية وإجبار السحب: git reset --hard origin/main)

# تثبيت المكتبات (هام: استخدم --no-optional لتفادي محاولة بناء مكتبات غير مدعومة)
npm install --no-optional

# بناء نسخة الإنتاج (Production Build)
# تنظيف الكاش القديم أولاً لضمان عدم وجود ملفات فاسدة
rm -rf .next
npm run build

# إعادة تشغيل الخدمات
pm2 restart all

# حفظ حالة PM2 لتعمل بعد إعادة تشغيل السيرفر
pm2 save
```

---

## حلول المشاكل الشائعة

### مشكلة: `Module not found: Can't resolve ...`
السبب: ملف مفقود أو لم يتم رفعه إلى GitHub.
الحل: تأكد من رفع كل الملفات (`git add .`) ثم اسحبها في السيرفر (`git pull`).

### مشكلة: `Export 'getDb' doesn't exist`
السبب: السيرفر يملك نسخة قديمة من ملف `src/lib/db.ts`.
الحل: `git pull origin main`، وإذا استمرت، استخدم `git reset --hard origin/main`.

### مشكلة: `GLIBC_2.29 not found`
السبب: تم تثبيت مكتبة `better-sqlite3` أو أي مكتبة Native حديثة عن طريق الخطأ.
الحل:
1. احذف `node_modules`.
2. تأكد من أن `package.json` لا يحتوي على `better-sqlite3`.
3. ثبت من جديد: `npm install --no-optional`.

---

## إعدادات Nginx والنطاق (للمرجعية)

ملف الإعداد موجود في: `/etc/nginx/conf.d/visit.conf`
المحتوى الحالي (تقريباً):
```nginx
server {
    listen 80;
    server_name security.ajaweedjeddah.online 104.207.95.60;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
لتعديله: `nano /etc/nginx/conf.d/visit.conf`
ثم: `systemctl restart nginx`

---

## ملاحظات التطوير (للمبرمج)
عند كتابة كود قاعدة البيانات في المستقبل:
1. **استخدم دائماً:**
   ```typescript
   import { getDb } from '@/lib/db';
   // ...
   const db = await getDb();
   await db.run(...); // أو get, all
   ```
2. **لا تستخدم:** الاستدعاء المباشر المتزامن `db.prepare(...)`.
