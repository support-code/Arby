'use client';

import { useState, useEffect } from 'react';

// Dynamic import of react-pdf to avoid SSR issues
let Document: any;
let Page: any;
let pdfjs: any;

interface PDFViewerProps {
  file: string | Blob | File; // URL, Blob, or File
  onLoadSuccess?: (numPages: number) => void;
  className?: string;
}

export default function PDFViewer({ file, onLoadSuccess, className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);

  // Load react-pdf dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-pdf').then((reactPdf) => {
        Document = reactPdf.Document;
        Page = reactPdf.Page;
        pdfjs = reactPdf.pdfjs;
        
        // Configure PDF.js worker
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
          setWorkerReady(true);
        } catch (error) {
          console.error('Failed to configure PDF.js worker:', error);
          setError('שגיאה בהגדרת PDF viewer');
        }
      }).catch((error) => {
        console.error('Failed to load react-pdf:', error);
        setError('שגיאה בטעינת PDF viewer');
      });
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setError('שגיאה בטעינת הקובץ');
    setLoading(false);
  }

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(3, prev + 0.25));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.25));
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-100 rounded ${className}`}>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!workerReady) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-100 rounded ${className}`}>
        <p className="text-gray-600">טוען PDF...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            קודם
          </button>
          <span className="text-sm">
            עמוד {pageNumber} מתוך {numPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            הבא
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            -
          </button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4 flex justify-center">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-600">טוען PDF...</p>
          </div>
        )}
        {Document && Page && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <p className="text-gray-600">טוען PDF...</p>
              </div>
            }
            className="flex flex-col items-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        )}
      </div>
    </div>
  );
}

