# PlayStation Cafe Manager — Desktop App

نظام إدارة كافيه بلايستيشن — تطبيق سطح المكتب

## متطلبات التشغيل
- Node.js 18 أو أحدث: https://nodejs.org
- Windows 10/11 x64

## خطوات البناء والتشغيل

```bash
# 1. تثبيت المكتبات
npm install

# 2. تشغيل في وضع التطوير
npm run dev

# 3. بناء ملف الـ .exe
npm run build:exe
```

ستجد ملف الـ `.exe` في مجلد `dist-electron/`

## بناء الـ Frontend فقط (بدون exe)
```bash
npm run build
```

## ملاحظات
- قاعدة البيانات (SQLite) تُحفظ تلقائياً في: `C:\Users\[اسمك]\AppData\Roaming\ps-cafe-manager\cafe.db`
- لا يحتاج اتصال إنترنت — يعمل بالكامل offline
- لا يعتمد على Replit أو أي منصة خارجية
