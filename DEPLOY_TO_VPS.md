# دليل نشر تطبيق Next.js على سيرفر VPS (AlmaLinux/CentOS)

بما أن لديك سيرفر خاص (VPS) بنظام AlmaLinux، فلديك تحكم كامل في البيئة. هذه الطريقة هي الأكثر احترافية وتمنحك أفضل أداء.

## المتطلبات الأساسية
- رقم الـ IP للسيرفر (من الصورة: `104.207.95.60`).
- كلمة مرور الـ root (يمكنك الحصول عليها من تبويب "Root/Admin Password" في لوحة التحكم).
- برنامج للاتصال بالسيرفر (مثل Terminal في Mac/Linux أو PuTTY/PowerShell في Windows).

---

## الخطوات التفصيلية

### 1. الاتصال بالسيرفر
افتح موجه الأوامر (Terminal/PowerShell) على جهازك واكتب:
```bash
ssh root@104.207.95.60
```
(سيطلب منك كلمة المرور، اكتبها واضغط Enter. لن تظهر### 2. Install System Updates and Dependencies

Update the system and install essential tools, including development tools required for compiling database dependencies.

```bash
# Update system
dnf update -y

# Install basic tools
dnf install git curl nano -y

# Install Development Tools and GCC 12 (Crucial for better-sqlite3)
dnf groupinstall "Development Tools" -y
dnf install python3 make gcc-c++ -y
dnf install gcc-toolset-12 -y

# Enable GCC 12
source /opt/rh/gcc-toolset-12/enable
```

### 3. تثبيت Node.js (الإصدار 20)
```bash
# إضافة مستودع NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -

# تثبيت Node.js
dnf install nodejs -y

# التحقق من التثبيت
node -v
npm -v
```

### 4. إعداد المجلد وسحب المشروع
```bash
# الذهاب لمجلد الويب (يمكنك اختيار أي مسار)
cd /var/www

# نسخ المشروع من GitHub
git clone https://github.com/overseas500-creator/visit.git

# الدخول للمجلد
cd visit
```

### 5. تثبيت المكتبات وبناء المشروع
بما أن الرام 2GB، قد نحتاج لـ Swap (ذاكرة وهمية) لتجنب توقف البناء، لكن لنجرب أولاً.
```bash
npm install

# بناء المشروع
npm run build
```
*إذا فشل البناء بسبب الذاكرة، أخبرني لنقوم بإنشاء Swap file.*

### 6. تشغيل التطبيق باستخدام PM2 (مدير العمليات)
نستخدم PM2 لضمان عمل الموقع بشكل دائم وإعادة تشغيله تلقائياً عند الخطأ أو إعادة تشغيل السيرفر.
```bash
# تثبيت PM2 عالمياً
npm install -g pm2

# تشغيل التطبيق
pm2 start npm --name "visit-app" -- start

# حفظ القائمة لتعمل عند إعادة التشغيل
pm2 save
pm2 startup
# (انسخ الأمر الذي سيظهر لك ونفذه)
```

### 7. إعداد Nginx (كوسيط Web Server)
لجعل الموقع يعمل على المنفذ 80 (بدون كتابة :3000 في الرابط) ولإدارة الدومين.

```bash
# تثبيت Nginx
dnf install nginx -y

# تشغيل الخدمة
systemctl enable nginx
systemctl start nginx

# إعداد ملف الكونفيج
nano /etc/nginx/conf.d/visit.conf
```
ألصق المحتوى التالي داخل الملف (استخدم الزر الأيمن للفأرة للصق):
```nginx
server {
    listen 80;
    server_name server1.ajaweedjeddah.online; # أو الدومين الخاص بك إذا اشتريت واحداً

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
اضغط `Ctrl+X` ثم `Y` ثم `Enter` للحفظ والخروج.

أخيراً، أعد تشغيل Nginx:
```bash
nginx -t
systemctl restart nginx
```

### 8. Configure Firewall and SELinux

Allow HTTP traffic through the firewall and give Nginx permission to connect to the network (required for proxying).

```bash
# Open HTTP port in firewall
firewall-cmd --permanent --add-service=http
firewall-cmd --reload

# Allow Nginx to connect to the application (Crucial for avoiding 502 errors)
setsebool -P httpd_can_network_connect 1

# Open HTTPS port in firewall
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

---
### 9. Configure Domain and HTTPS (SSL)

To make the site accessible via your domain securely.

1.  **Update DNS:** Go to your domain registrar and create an **A Record** for `security.ajaweedjeddah.online` pointing to `104.207.95.60`.
2.  **Update Nginx Config:**
    ```bash
    # Update server_name
    sed -i 's/server_name _;/server_name security.ajaweedjeddah.online;/' /etc/nginx/conf.d/visit.conf
    systemctl restart nginx
    ```
3.  **Install SSL (Certbot):**
    ```bash
    # Install Certbot via Snap (Recommended for AlmaLinux 9)
    dnf install epel-release -y
    dnf upgrade -y
    dnf install certbot python3-certbot-nginx -y

    # Run Certbot to get the certificate
    certbot --nginx -d security.ajaweedjeddah.online
    ```
    (Follow the on-screen prompts, enter your email, and verify).
