# 🚀 دليل نشر ماسـبيرو (Maspero Services) على السيرفر — كل حاجة مطلوبة منك

> **الهدف:** ملف واحد فيه كل خطوة مطلوبة منك عشان نظام ماسـبيرو للخدمات الإلكترونية والمحافظ يشتغل على `maspero.openappo.com`
> بنفس طريقة (mazaya + opengym + rtx) على نفس السيرفر `64.226.118.40`.

---

## 📌 ملخص سريع (الترتيب)

```
1. إنشاء GitHub Repo جديد (maspero-system)
2. إضافة Secrets على الـ Repo
3. إضافة DNS في Hostinger (maspero)
4. إعداد السيرفر (قاعدة بيانات + Nginx + SSL)
5. أول Push = أول Deploy أوتوماتيك ✅
```

---

## الخطوة 1: إنشاء GitHub Repository

1. ادخل على [github.com/new](https://github.com/new)
2. أنشئ repo جديد:
   - **Repository name:** `maspero-system`
   - **Visibility:** Private
   - **لا تضيف** README أو .gitignore (موجودين بالفعل وهنرفعهم من عندك)
3. بعد الإنشاء، انسخ الـ SSH URL:
   ```
   git@github.com-momarzouk:momarzouk1998/maspero-system.git
   ```

---

## الخطوة 2: إضافة GitHub Secrets 🔐

> هذه أهم خطوة — بدونها الـ CI/CD مش هيشتغل.

ادخل على:
```
https://github.com/momarzouk1998/maspero-system/settings/secrets/actions
```

اضغط **"New repository secret"** وأضف الآتي:

| اسم الـ Secret | القيمة | الشرح |
|---|---|---|
| `SSH_PRIVATE_KEY` | محتوى ملف المفتاح الخاص `opengym_ci` | نفس المفتاح المستخدم في OpenGym و Mazaya (موجود عندك) |
| `SSH_HOST` | `64.226.118.40` | عنوان IP للسيرفر (DigitalOcean) |
| `SSH_USER` | `root` | اسم المستخدم للدخول على السيرفر (نفسه في OpenGym) |

### كيف تحصل على `SSH_PRIVATE_KEY`؟
هو **نفس المفتاح** المستخدم في المشاريع السابقة. تقدر تنسخه من:
- **GitHub → OpenGym repo → Settings → Secrets → SSH_PRIVATE_KEY** (انسخه)
- أو من جهازك: `cat ~/.ssh/opengym_ci` (لو حفظته محلياً)

> ⚠️ **مهم:** لازم تنسخ المفتاح بالكامل من أول سطر `-----BEGIN OPENSSH PRIVATE KEY-----` لحد آخر سطر `-----END OPENSSH PRIVATE KEY-----`.

---

## الخطوة 3: إعداد DNS في Hostinger 🌐

> عشان `maspero.openappo.com` يشاور على السيرفر بتاعك.

1. ادخل على [لوحة تحكم Hostinger](https://hpanel.hostinger.com/)
2. اختار دومين `openappo.com`
3. روح قسم **DNS / Zone Editor**
4. أضف سجل **A Record** جديد:

| النوع | الاسم (Name) | القيمة (Points to) | TTL |
|---|---|---|---|
| **A** | `maspero` | `64.226.118.40` | `14400` (أو Auto) |

> ⚠️ **مهم جداً:** اكتب `maspero` فقط (بدون `.openappo.com`)، هوستنجر بيكمله تلقائياً.

5. اضغط **Save** / **Add Record**
6. انتظر من **5 دقائق إلى ساعة** حتى ينتشر الـ DNS.

### التأكد من نجاح الـ DNS:
شغّل هذا الأمر من جهازك (بعد الانتظار):
```bash
nslookup maspero.openappo.com
```
المفروض يرجع:
```
Address: 64.226.118.40
```

---

## الخطوة 4: إعداد السيرفر (مرة واحدة فقط) 🖥️

> هذه الخطوات تتنفذ على السيرفر نفسه عبر SSH.

### 4.1 — ادخل على السيرفر:
```bash
ssh root@64.226.118.40
```

### 4.2 — أنشئ قاعدة بيانات PostgreSQL جديدة ونطاق Schema خاص بـ Maspero:
```bash
sudo -u postgres psql <<EOF
CREATE USER maspero WITH PASSWORD 'MasperoSystem2026!SecureDb';
CREATE DATABASE maspero_db OWNER maspero;
GRANT ALL PRIVILEGES ON DATABASE maspero_db TO maspero;
\c maspero_db
CREATE SCHEMA maspero AUTHORIZATION maspero;
EOF
```

> ⚠️ غيّر كلمة السر `MasperoSystem2026!SecureDb` لأي حاجة تختارها (وسجلها عندك).

### 4.3 — أنشئ مجلد المشروع وملف البيئة:
```bash
mkdir -p /opt/maspero-system
cat > /opt/maspero-system/.env <<EOF
DATABASE_URL="postgresql://maspero:MasperoSystem2026!SecureDb@localhost:5432/maspero_db?schema=maspero"
JWT_SECRET="maspero-production-secret-key-change-this-2026"
NEXT_PUBLIC_APP_NAME="ماسـبيرو للخدمات الرقمية"
NODE_ENV=production
PORT=3007
HOSTNAME=0.0.0.0
EOF
```

> ⚠️ **المنفذ `3007`** — اخترناه عشان نتفادى المنافذ المستخدمة على نفس السيرفر:
> - `3000` = OpenGym (مستخدم)
> - `3001` = Mazaya (مستخدم)
> - `3006` = RTX (مستخدم)
> - `3007` = Maspero (جديد) ✅

### 4.4 — أنشئ Nginx config لـ Maspero:
```bash
cat > /etc/nginx/sites-available/maspero <<'NGINX'
server {
    server_name maspero.openappo.com;
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
NGINX
```

### 4.5 — فعّل الموقع وأعد تشغيل Nginx:
```bash
ln -sf /etc/nginx/sites-available/maspero /etc/nginx/sites-enabled/maspero
nginx -t && systemctl reload nginx
```

### 4.6 — أصدر شهادة SSL (بعد ما الـ DNS ينتشر):
```bash
certbot --nginx -d maspero.openappo.com
```
> اختار **2** (Redirect all HTTP to HTTPS) لو سألك.

---

## الخطوة 5: أول Push = أول Deploy 🚀

بعد ما تخلّص الخطوات اللي فوق، افتح PowerShell أو Terminal في جهازك ونفّذ:

```bash
cd "D:\OPEN APPS\DigitalOcian Projects\Maspero"

# تهيئة Git وربط الـ Repository
git init
git branch -M main
git remote add origin git@github.com-momarzouk:momarzouk1998/maspero-system.git

# رفع الكود بالكامل
git add -A
git commit -m "feat: Maspero System - initial digital ocean deployment"
git push -u origin main
```

### الخطوة 6: تشغيل استيراد بيانات AppSheet التاريخية على السيرفر (مرة واحدة):
بعد انتهاء الـ Deployment الأول بنجاح، شغل استيراد البيانات التاريخية (20,700+ حركة محفظة، 21,200+ خدمات...) على السيرفر:
```bash
ssh root@64.226.118.40
docker exec maspero npm run db:import
```

---

## 📋 قائمة مراجعة (Checklist) — اتأكد من كل حاجة

| # | المهمة | الحالة |
|---|---|---|
| 1 | إنشاء GitHub repo `maspero-system` (Private) | ☐ |
| 2 | إضافة Secret: `SSH_PRIVATE_KEY` | ☐ |
| 3 | إضافة Secret: `SSH_HOST` = `64.226.118.40` | ☐ |
| 4 | إضافة Secret: `SSH_USER` = `root` | ☐ |
| 5 | إضافة A Record في Hostinger: `maspero` → `64.226.118.40` | ☐ |
| 6 | التأكد من انتشار DNS: `nslookup maspero.openappo.com` | ☐ |
| 7 | إنشاء قاعدة بيانات `maspero_db` على السيرفر | ☐ |
| 8 | إنشاء ملف `/opt/maspero-system/.env` على السيرفر | ☐ |
| 9 | إنشاء Nginx config + تفعيله على المنفذ `3007` | ☐ |
| 10 | إصدار شهادة SSL بـ Certbot | ☐ |
| 11 | أول `git push origin main` من جهازك | ☐ |
| 12 | متابعة GitHub Actions حتى ✅ | ☐ |
| 13 | تشغيل `docker exec maspero npm run db:import` لاستيراد الـ 45,000+ سجل | ☐ |
| 14 | اختبار `https://maspero.openappo.com` | ☐ |

---

## 📁 الملفات المجهزة داخل المشروع

| الملف | الوظيفة | الحالة |
|---|---|---|
| `Dockerfile` | بناء الصورة المجهزة بالمنفذ 3007 | ✅ تم |
| `.dockerignore` | تنقية ملفات البناء الحساسة | ✅ تم |
| `.github/workflows/build-and-push.yml` | بناء الصورة على GitHub ورفعها لـ GHCR | ✅ تم |
| `.github/workflows/deploy.yml` | سحب الصورة على السيرفر وتحديث الكود تلقائياً عند كل push | ✅ تم |
| `prisma/schema.prisma` | السكيمة والهيكلية كاملة مع الفهرسة الحثيثة | ✅ تم |
| `prisma/import-maspero.ts` | سكريبت استيراد كافة بيانات AppSheet التاريخية | ✅ تم |
| `DEPLOY_GUIDE.md` | دليل النشر والربط الكامل | ✅ تم |

---

## 🚨 لو حصلت أي مشكلة

| المشكلة | الحل |
|---|---|
| `nslookup` مش بيرجع الـ IP | انتظر قليلاً — انتشار الـ DNS قد يستغرق بعض الوقت. |
| GitHub Actions فشل في الـ Deploy | تأكد من صحة `SSH_PRIVATE_KEY` و `SSH_HOST` في Secrets |
| الموقع بيرجع `502` | الكونتينر مش شغّال — ادخل على السيرفر: `docker logs maspero --tail 50` |
| الموقع بيرجع `ERR_SSL` | شغّل `certbot --nginx -d maspero.openappo.com` على السيرفر |
