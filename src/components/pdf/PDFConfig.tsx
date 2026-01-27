'use client';

import { useEffect } from 'react';

export default function PDFConfig() {
  useEffect(() => {
    // Configure PDF.js worker only on client side using CDN to avoid bundling issues
    if (typeof window !== 'undefined') {
      try {
        // Try to load from CDN first (safer approach)
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
          // @ts-ignore - pdfjs is loaded from CDN
          const pdfjsLib = window.pdfjsLib || window.pdfjs;
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('[PDFConfig] PDF.js configured from CDN');
          }
        };
        script.onerror = () => {
          // Fallback to dynamic import if CDN fails
          console.warn('[PDFConfig] CDN failed, trying dynamic import');
          import('pdfjs-dist').then((pdfjs) => {
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
          }).catch((err) => {
            console.error('[PDFConfig] Failed to load pdfjs-dist:', err);
          });
        };
        document.head.appendChild(script);
      } catch (error) {
        console.error('[PDFConfig] Error setting up PDF.js:', error);
      }
    }
  }, []);

  return null; // This component doesn't render anything
}

