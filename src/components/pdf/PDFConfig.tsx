'use client';

import { useEffect } from 'react';

export default function PDFConfig() {
  useEffect(() => {
    // Configure PDF.js worker only on client side
    if (typeof window !== 'undefined') {
      import('pdfjs-dist').then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      });
    }
  }, []);

  return null; // This component doesn't render anything
}

