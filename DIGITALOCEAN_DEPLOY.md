# Digital Ocean Deployment Guide

## הבעיה
Digital Ocean מחפש תיקיות static (`_static`, `dist`, `public`, `build`) אבל Next.js מפיק את הקבצים ב-`.next`.

## פתרונות

### פתרון 1: הרצה כ-Node.js App (מומלץ)
Digital Ocean App Platform צריך להריץ את זה כ-**Node.js Application**, לא Static Site.

**הגדרות ב-Digital Ocean:**
1. בחר **Node.js** כ-Runtime
2. Build Command: `npm run build`
3. Run Command: `npm start`
4. Port: `3000` (או מה ש-Next.js משתמש)

### פתרון 2: Static Export (לא מומלץ עם App Router)
אם אתה ממש צריך static site, צריך לשנות את `next.config.js`:

```js
const nextConfig = {
  output: 'export',
  // ... שאר ההגדרות
};
```

**אבל:** זה לא יעבוד טוב עם App Router שיש לו server-side features.

### פתרון 3: Build Script מותאם
אם אתה משתמש ב-Static Site ב-Digital Ocean, השתמש ב:
```bash
npm run build:digitalocean
```

זה ייצור את התיקייה `out/_static` עם הקבצים הסטטיים.

## המלצה
השתמש בפתרון 1 - הרץ את זה כ-Node.js App ב-Digital Ocean.

