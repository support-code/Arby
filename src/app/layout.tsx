import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import PDFConfig from '@/components/pdf/PDFConfig';

const rubik = Rubik({ 
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700']
});

export const metadata: Metadata = {
  title: 'Negotify - ניהול בוררות דיגיטלי',
  description: 'פלטפורמת SaaS לניהול תיקי בוררות עבור השוק הישראלי',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={rubik.className}>
        <PDFConfig />
        {children}
      </body>
    </html>
  );
}

