'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, AnnotationType } from '@/types';
import { annotationsAPI, documentsAPI } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

// Dynamic import of react-pdf to avoid SSR issues
let Document: any = null;
let Page: any = null;
let pdfjs: any = null;

interface PDFAnnotatorProps {
  documentId: string;
  requestId: string;
  readOnly?: boolean;
  onSave?: () => void;
}

type AnnotationTool = AnnotationType | null;
type DrawingState = {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentAnnotation: Partial<Annotation> | null;
};

export default function PDFAnnotator({ documentId, requestId, readOnly = false, onSave }: PDFAnnotatorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>(null);
  const [selectedColor, setSelectedColor] = useState('#ffff00');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<{ [page: number]: { width: number; height: number } }>({});
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentAnnotation: null
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workerReady, setWorkerReady] = useState(false);
  const pageRefs = useRef<{ [page: number]: HTMLDivElement | null }>({});
  const { showToast } = useToastStore();

  // Load react-pdf dynamically on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const loadReactPdf = async () => {
      try {
        console.log('[PDFAnnotator] Loading react-pdf...');
        // Use dynamic import with explicit chunk name to avoid bundling issues
        const reactPdf = await import(/* webpackChunkName: "react-pdf" */ 'react-pdf');
        console.log('[PDFAnnotator] react-pdf loaded successfully');
        
        if (!isMounted) return;

        Document = reactPdf.Document;
        Page = reactPdf.Page;
        pdfjs = reactPdf.pdfjs;
        
        // Configure PDF.js worker
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
          console.log('[PDFAnnotator] PDF.js worker configured:', pdfjs.GlobalWorkerOptions.workerSrc);
          
          if (isMounted) {
            setWorkerReady(true);
          }
        } catch (error) {
          console.error('[PDFAnnotator] Failed to configure PDF.js worker:', error);
          if (isMounted) {
            showToast('שגיאה בהגדרת PDF viewer', 'error');
          }
        }
      } catch (error) {
        console.error('[PDFAnnotator] Failed to load react-pdf:', error);
        if (isMounted) {
          showToast('שגיאה בטעינת PDF viewer. נסה לרענן את הדף.', 'error');
        }
      }
    };

    loadReactPdf();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Load PDF - only after worker is ready
  useEffect(() => {
    if (!workerReady || !documentId) return;

    const loadPdf = async () => {
      try {
        console.log('Loading PDF for document:', documentId);
        setLoading(true);
        const blob = await documentsAPI.download(documentId);
        console.log('PDF blob received, size:', blob.size);
        const url = URL.createObjectURL(blob);
        console.log('PDF URL created:', url);
        setPdfUrl(url);
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to load PDF:', error);
        showToast(error?.response?.data?.error || 'שגיאה בטעינת הקובץ', 'error');
        setLoading(false);
      }
    };
    loadPdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId, workerReady]);

  // Load annotations
  useEffect(() => {
    if (!requestId || !documentId) return;

    const loadAnnotations = async () => {
      try {
        const data = await annotationsAPI.getByDocument(requestId, documentId);
        setAnnotations(data.filter(a => !a.isDeleted));
      } catch (error: any) {
        console.error('Failed to load annotations:', error);
      }
    };
    loadAnnotations();
  }, [requestId, documentId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF document loaded successfully, pages:', numPages);
    setNumPages(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF document load error:', error);
    showToast('שגיאה בטעינת PDF: ' + error.message, 'error');
  };

  const onPageLoadSuccess = (page: any, pageNum: number) => {
    const viewport = page.getViewport({ scale: 1.0 });
    setPageDimensions(prev => ({
      ...prev,
      [pageNum]: { width: viewport.width, height: viewport.height }
    }));
  };

  // Convert absolute coordinates to relative (0-1)
  const absoluteToRelative = (pageNum: number, x: number, y: number) => {
    const dims = pageDimensions[pageNum];
    if (!dims) return { x: 0, y: 0 };
    return {
      x: x / dims.width,
      y: y / dims.height
    };
  };

  // Convert relative coordinates to absolute
  const relativeToAbsolute = (pageNum: number, x: number, y: number) => {
    const dims = pageDimensions[pageNum];
    if (!dims) return { x: 0, y: 0 };
    return {
      x: x * dims.width,
      y: y * dims.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (readOnly || !selectedTool) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rel = absoluteToRelative(pageNum, x, y);

    setDrawingState({
      isDrawing: true,
      startX: rel.x,
      startY: rel.y,
      currentAnnotation: {
        requestId,
        documentId,
        pageNumber: pageNum,
        type: selectedTool,
        x: rel.x,
        y: rel.y,
        width: 0,
        height: 0,
        color: selectedColor
      }
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (readOnly || !drawingState.isDrawing || !drawingState.currentAnnotation) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rel = absoluteToRelative(pageNum, x, y);

    const width = Math.abs(rel.x - drawingState.startX);
    const height = Math.abs(rel.y - drawingState.startY);
    const newX = Math.min(rel.x, drawingState.startX);
    const newY = Math.min(rel.y, drawingState.startY);

    setDrawingState(prev => ({
      ...prev,
      currentAnnotation: prev.currentAnnotation ? {
        ...prev.currentAnnotation,
        x: newX,
        y: newY,
        width,
        height
      } : null
    }));
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (readOnly || !drawingState.isDrawing || !drawingState.currentAnnotation) return;

    const annotation = drawingState.currentAnnotation;
    if (annotation.width! > 0.01 && annotation.height! > 0.01) {
      // Save annotation
      try {
        if (selectedTool === AnnotationType.TEXT) {
          const content = prompt('הזן טקסט:');
          if (content) {
            annotation.content = content;
          } else {
            setDrawingState({ isDrawing: false, startX: 0, startY: 0, currentAnnotation: null });
            return;
          }
        }

        const saved = await annotationsAPI.create(annotation as Annotation);
        setAnnotations(prev => [...prev, saved]);
        if (onSave) onSave();
      } catch (error: any) {
        console.error('Failed to save annotation:', error);
        showToast('שגיאה בשמירת הסימון', 'error');
      }
    }

    setDrawingState({ isDrawing: false, startX: 0, startY: 0, currentAnnotation: null });
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (readOnly) return;
    try {
      await annotationsAPI.delete(annotationId);
      setAnnotations(prev => prev.filter(a => a._id !== annotationId));
      if (onSave) onSave();
      showToast('הסימון נמחק', 'success');
    } catch (error: any) {
      console.error('Failed to delete annotation:', error);
      showToast('שגיאה במחיקת הסימון', 'error');
    }
  };

  const renderAnnotation = (annotation: Annotation, pageNum: number) => {
    const dims = pageDimensions[pageNum];
    if (!dims) return null;

    const absX = annotation.x * dims.width;
    const absY = annotation.y * dims.height;
    const absWidth = annotation.width * dims.width;
    const absHeight = annotation.height * dims.height;

    const isSelected = selectedAnnotation === annotation._id;
    const isCurrent = drawingState.currentAnnotation === annotation;

    let element: JSX.Element | null = null;

    switch (annotation.type) {
      case AnnotationType.HIGHLIGHT:
      case AnnotationType.RECTANGLE:
        element = (
          <rect
            x={absX}
            y={absY}
            width={absWidth}
            height={absHeight}
            fill={annotation.color}
            fillOpacity={0.3}
            stroke={isSelected ? '#000' : annotation.color}
            strokeWidth={isSelected ? 2 : 1}
            onClick={() => !readOnly && setSelectedAnnotation(annotation._id || null)}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          />
        );
        break;
      case AnnotationType.CIRCLE:
        const radius = Math.min(absWidth, absHeight) / 2;
        const centerX = absX + absWidth / 2;
        const centerY = absY + absHeight / 2;
        element = (
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill={annotation.color}
            fillOpacity={0.3}
            stroke={isSelected ? '#000' : annotation.color}
            strokeWidth={isSelected ? 2 : 1}
            onClick={() => !readOnly && setSelectedAnnotation(annotation._id || null)}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          />
        );
        break;
      case AnnotationType.ARROW:
        element = (
          <g>
            <line
              x1={absX}
              y1={absY}
              x2={absX + absWidth}
              y2={absY + absHeight}
              stroke={annotation.color}
              strokeWidth={2}
              onClick={() => !readOnly && setSelectedAnnotation(annotation._id || null)}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}
            />
            {/* Simple arrowhead */}
            <polygon
              points={`${absX + absWidth},${absY + absHeight} ${absX + absWidth - 10},${absY + absHeight - 5} ${absX + absWidth - 10},${absY + absHeight + 5}`}
              fill={annotation.color}
              onClick={() => !readOnly && setSelectedAnnotation(annotation._id || null)}
            />
          </g>
        );
        break;
      case AnnotationType.TEXT:
        element = (
          <g>
            <rect
              x={absX}
              y={absY}
              width={absWidth}
              height={absHeight}
              fill="white"
              fillOpacity={0.8}
              stroke={annotation.color}
              strokeWidth={1}
              onClick={() => !readOnly && setSelectedAnnotation(annotation._id || null)}
              style={{ cursor: readOnly ? 'default' : 'pointer' }}
            />
            <text
              x={absX + 5}
              y={absY + 15}
              fill={annotation.color}
              fontSize={12}
              onClick={() => !readOnly && setSelectedAnnotation(annotation._id || null)}
            >
              {annotation.content || ''}
            </text>
          </g>
        );
        break;
    }

    return (
      <g key={annotation._id}>
        {element}
        {isSelected && !readOnly && (
          <foreignObject x={absX} y={absY - 30} width={200} height={30}>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteAnnotation(annotation._id!)}
                className="px-2 py-1 bg-red-500 text-white text-xs rounded"
              >
                מחק
              </button>
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  if (!workerReady || !Document || !Page) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600 mb-2">טוען PDF viewer...</p>
        {!workerReady && <p className="text-sm text-gray-500">מגדיר worker...</p>}
        {!Document && <p className="text-sm text-gray-500">טוען react-pdf...</p>}
      </div>
    );
  }

  if (loading || !pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-gray-600 mb-2">טוען PDF מהשרת...</p>
        {loading && <p className="text-sm text-gray-500">מוריד קובץ...</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 bg-gray-100 border-b">
          <span className="text-sm font-semibold">כלי סימון:</span>
          <button
            onClick={() => setSelectedTool(AnnotationType.HIGHLIGHT)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.HIGHLIGHT ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            הדגשה
          </button>
          <button
            onClick={() => setSelectedTool(AnnotationType.RECTANGLE)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.RECTANGLE ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            מלבן
          </button>
          <button
            onClick={() => setSelectedTool(AnnotationType.CIRCLE)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.CIRCLE ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            עיגול
          </button>
          <button
            onClick={() => setSelectedTool(AnnotationType.ARROW)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.ARROW ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            חץ
          </button>
          <button
            onClick={() => setSelectedTool(AnnotationType.TEXT)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.TEXT ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            טקסט
          </button>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-10 h-8"
          />
          <button
            onClick={() => setSelectedTool(null)}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            בטל בחירה
          </button>
        </div>
      )}

      {/* PDF Pages */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        {pdfUrl && Document && Page ? (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center p-8">
                <p className="text-gray-600">טוען PDF...</p>
              </div>
            }
            error={
              <div className="flex items-center justify-center p-8">
                <p className="text-red-600">שגיאה בטעינת PDF</p>
              </div>
            }
            className="flex flex-col items-center gap-4"
          >
            {Array.from(new Array(numPages), (el, index) => index + 1).map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => { pageRefs.current[pageNum] = el; }}
                className="relative"
                onMouseDown={(e) => handleMouseDown(e, pageNum)}
                onMouseMove={(e) => handleMouseMove(e, pageNum)}
                onMouseUp={(e) => handleMouseUp(e, pageNum)}
                style={{ cursor: selectedTool && !readOnly ? 'crosshair' : 'default' }}
              >
                <Page
                  pageNumber={pageNum}
                  scale={scale}
                  onLoadSuccess={(page: any) => onPageLoadSuccess(page, pageNum)}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />
              {/* SVG Overlay for annotations */}
              {pageDimensions[pageNum] && (
                <svg
                  className="absolute top-0 left-0 pointer-events-none"
                  width={pageDimensions[pageNum].width * scale}
                  height={pageDimensions[pageNum].height * scale}
                  style={{ pointerEvents: readOnly ? 'none' : 'auto' }}
                >
                  {/* Render existing annotations for this page */}
                  {annotations
                    .filter(a => a.pageNumber === pageNum)
                    .map(a => renderAnnotation(a, pageNum))}
                  
                  {/* Render current drawing annotation */}
                  {drawingState.currentAnnotation &&
                    drawingState.currentAnnotation.pageNumber === pageNum &&
                    renderAnnotation(drawingState.currentAnnotation as Annotation, pageNum)}
                </svg>
              )}
            </div>
          ))}
          </Document>
        ) : (
          <div className="flex items-center justify-center p-8">
            <p className="text-red-600">שגיאה: PDF viewer לא מוכן. נסה לרענן את הדף.</p>
          </div>
        )}
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-t">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
            disabled={pageNumber <= 1}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            קודם
          </button>
          <span className="text-sm">
            עמוד {pageNumber} מתוך {numPages}
          </span>
          <button
            onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
            disabled={pageNumber >= numPages}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            הבא
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.25))}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            -
          </button>
          <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(prev => Math.min(3, prev + 0.25))}
            className="px-3 py-1 bg-gray-500 text-white rounded"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

