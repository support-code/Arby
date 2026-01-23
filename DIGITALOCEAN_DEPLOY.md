# Digital Ocean Deployment Guide

## ⚠️ חשוב: Web Service, לא Static Site!

Next.js עם App Router **חייב** להיות **Web Service** (Node.js runtime), לא Static Site.

## הגדרות ב-Digital Ocean App Platform:

### סוג האפליקציה:
- **Web Service** (לא Static Site!)

### הגדרות Runtime:
1. **Runtime**: Node.js
2. **Build Command**: `npm run build`
3. **Run Command**: `npm start`
4. **Port**: `3000` (או מה ש-Next.js משתמש - בדרך כלל 3000)
5. **Environment Variables**: הוסף את `NEXT_PUBLIC_API_URL` אם צריך

## למה Web Service ולא Static Site?

Next.js עם App Router משתמש ב:
- Server Components
- API Routes (אם יש)
- Dynamic rendering
- Server-side features

כל אלה דורשים Node.js runtime, לא static files.

## אם אתה מנסה Static Site (לא מומלץ):

אם אתה ממש צריך static site (לא מומלץ!), תצטרך:
1. לשנות את `next.config.js` ל-`output: 'export'`
2. להסיר כל server-side features
3. להשתמש ב-`npm run build:digitalocean`

**אבל זה לא יעבוד טוב עם App Router!**

## סיכום

✅ **השתמש ב-Web Service עם Node.js runtime**
❌ **אל תשתמש ב-Static Site**

