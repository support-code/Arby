'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Annotation, AnnotationType } from '@/types';
import { annotationsAPI, documentsAPI, remindersAPI, decisionsAPI } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface PDFAnnotatorProps {
  documentId: string;
  requestId: string;
  caseId?: string;
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

export default function PDFAnnotatorDirect({ documentId, requestId, caseId, readOnly = false, onSave }: PDFAnnotatorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>(null);
  const [selectedColor, setSelectedColor] = useState('#ffff00');
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [textAlign, setTextAlign] = useState<'right' | 'center' | 'left'>('right');
  const [textBold, setTextBold] = useState<boolean>(false);
  const [pageDimensions, setPageDimensions] = useState<{ [page: number]: { width: number; height: number } }>({});
  const [canvasDisplayDimensions, setCanvasDisplayDimensions] = useState<{ [page: number]: { width: number; height: number } }>({});
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentAnnotation: null
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pdfjs, setPdfjs] = useState<any>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [reminders, setReminders] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [reminderFormData, setReminderFormData] = useState({ title: '', dueDate: '', assignedTo: '' });
  const [decisionFormData, setDecisionFormData] = useState({ title: '', content: '', decisionType: 'note' as 'note' | 'final', closesCase: false });
  const canvasRefs = useRef<{ [page: number]: HTMLCanvasElement | null }>({});
  const containerRefs = useRef<{ [page: number]: HTMLDivElement | null }>({});
  const { showToast } = useToastStore();

  // Load pdfjs-dist from CDN to avoid bundling issues
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadPdfjs = async () => {
      try {
        console.log('[PDFAnnotator] Loading pdfjs-dist from CDN...');
        
        // Load pdfjs from CDN instead of npm package
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('[PDFAnnotator] pdfjs-dist loaded from CDN');
            // @ts-ignore - pdfjs is loaded from CDN
            const pdfjsLib = window.pdfjsLib || window.pdfjs;
            if (pdfjsLib) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
              console.log('[PDFAnnotator] PDF.js worker configured');
              setPdfjs(pdfjsLib);
              resolve(pdfjsLib);
            } else {
              reject(new Error('pdfjs not found on window'));
            }
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error('[PDFAnnotator] Failed to load pdfjs-dist from CDN:', error);
        showToast('שגיאה בטעינת PDF viewer', 'error');
      }
    };

    loadPdfjs();
  }, [showToast]);

  // Load PDF
  useEffect(() => {
    if (!pdfjs || !documentId) return;

    const loadPdf = async () => {
      try {
        console.log('[PDFAnnotator] Loading PDF for document:', documentId);
        setLoading(true);
        const blob = await documentsAPI.download(documentId);
        console.log('[PDFAnnotator] PDF blob received, size:', blob.size);
        
        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        
        console.log('[PDFAnnotator] PDF loaded, pages:', doc.numPages);
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (error: any) {
        console.error('[PDFAnnotator] Failed to load PDF:', error);
        showToast(error?.response?.data?.error || 'שגיאה בטעינת הקובץ', 'error');
        setLoading(false);
      }
    };

    loadPdf();
  }, [documentId, pdfjs]);

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

  // Load reminders and decisions
  useEffect(() => {
    if (!caseId) return;

    const loadData = async () => {
      try {
        const [remindersData, decisionsData] = await Promise.all([
          remindersAPI.getByCase(caseId),
          decisionsAPI.getByCase(caseId)
        ]);
        setReminders(remindersData);
        setDecisions(decisionsData.filter((d: any) => d.requestId === requestId));
      } catch (error: any) {
        console.error('Failed to load reminders/decisions:', error);
      }
    };

    loadData();
  }, [caseId, requestId]);

  // Handle Delete key to delete selected annotation
  useEffect(() => {
    if (readOnly || !selectedAnnotation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const annotation = annotations.find(a => a._id === selectedAnnotation);
        if (annotation) {
          annotationsAPI.delete(annotation._id!)
            .then(() => {
              return annotationsAPI.getByDocument(requestId, documentId);
            })
            .then(data => {
              setAnnotations(data.filter(a => !a.isDeleted));
              setSelectedAnnotation(null);
              showToast('הסימון נמחק', 'success');
            })
            .catch((error: any) => {
              console.error('Failed to delete annotation:', error);
              showToast('שגיאה במחיקת הסימון', 'error');
            });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotation, annotations, requestId, documentId, readOnly, showToast]);

  // Render PDF pages
  useEffect(() => {
    if (!pdfDoc || !pdfjs) return;

    const renderPages = async () => {
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = canvasRefs.current[pageNum];
        const container = containerRefs.current[pageNum];
        if (!canvas || !container) continue;

        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });
          const context = canvas.getContext('2d');
          
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          setPageDimensions(prev => ({
            ...prev,
            [pageNum]: { width: viewport.width, height: viewport.height }
          }));

          // Update displayed dimensions after rendering
          setTimeout(() => {
            const canvasRect = canvas.getBoundingClientRect();
            setCanvasDisplayDimensions(prev => ({
              ...prev,
              [pageNum]: { width: canvasRect.width, height: canvasRect.height }
            }));
          }, 100);

          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };

          await page.render(renderContext).promise;
        } catch (error) {
          console.error(`Failed to render page ${pageNum}:`, error);
        }
      }
    };

    renderPages();
  }, [pdfDoc, pdfjs, numPages, scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent, pageNum: number) => {
    if (readOnly || !selectedTool || !pageDimensions[pageNum]) return;

    const container = containerRefs.current[pageNum];
    if (!container) return;

    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;

    // Get mouse position relative to canvas
    const canvasRect = canvas.getBoundingClientRect();
    const x = (e.clientX - canvasRect.left);
    const y = (e.clientY - canvasRect.top);
    
    // Convert to relative coordinates (0-1) using displayed canvas dimensions
    // canvasRect.width/height are the displayed dimensions (with scale)
    // canvas.width/height are the actual pixel dimensions
    const displayedWidth = canvasRect.width;
    const displayedHeight = canvasRect.height;
    const relX = Math.max(0, Math.min(1, x / displayedWidth));
    const relY = Math.max(0, Math.min(1, y / displayedHeight));

    setDrawingState({
      isDrawing: true,
      startX: relX,
      startY: relY,
      currentAnnotation: {
        pageNumber: pageNum,
        type: selectedTool,
        x: relX,
        y: relY,
        width: 0,
        height: 0,
        color: selectedColor
      }
    });
  }, [readOnly, selectedTool, selectedColor, pageDimensions, scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent, pageNum: number) => {
    if (!drawingState.isDrawing || !pageDimensions[pageNum]) return;

    const container = containerRefs.current[pageNum];
    if (!container) return;

    const canvas = canvasRefs.current[pageNum];
    if (!canvas) return;

    // Get mouse position relative to canvas
    const canvasRect = canvas.getBoundingClientRect();
    const x = (e.clientX - canvasRect.left);
    const y = (e.clientY - canvasRect.top);
    
    // Convert to relative coordinates (0-1) using displayed canvas dimensions
    // canvasRect.width/height are the displayed dimensions (with scale)
    // canvas.width/height are the actual pixel dimensions
    const displayedWidth = canvasRect.width;
    const displayedHeight = canvasRect.height;
    const relX = Math.max(0, Math.min(1, x / displayedWidth));
    const relY = Math.max(0, Math.min(1, y / displayedHeight));

    const width_rel = Math.abs(relX - drawingState.startX);
    const height_rel = Math.abs(relY - drawingState.startY);
    const x_rel = Math.min(relX, drawingState.startX);
    const y_rel = Math.min(relY, drawingState.startY);

    setDrawingState(prev => ({
      ...prev,
      currentAnnotation: {
        ...prev.currentAnnotation,
        x: x_rel,
        y: y_rel,
        width: width_rel,
        height: height_rel
      }
    }));
  }, [drawingState, pageDimensions, scale]);

  const handleMouseUp = useCallback(async (e: React.MouseEvent, pageNum: number) => {
    if (!drawingState.isDrawing || !drawingState.currentAnnotation) {
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentAnnotation: null
      });
      return;
    }

    const annotation = drawingState.currentAnnotation;
    if (annotation.width && annotation.width > 0.01 && annotation.height && annotation.height > 0.01) {
      try {
        // Validate all required fields
        if (!requestId || !documentId || !annotation.type || annotation.x === undefined || annotation.y === undefined) {
          console.error('Missing required fields:', { requestId, documentId, type: annotation.type, x: annotation.x, y: annotation.y });
          throw new Error('Missing required fields');
        }

        // Prepare data with explicit type conversion
        const annotationData: Partial<Annotation> = {
          requestId: String(requestId),
          documentId: String(documentId),
          pageNumber: parseInt(String(pageNum), 10),
          type: annotation.type as AnnotationType,
          x: parseFloat(String(annotation.x)),
          y: parseFloat(String(annotation.y)),
          width: parseFloat(String(annotation.width)),
          height: parseFloat(String(annotation.height)),
          color: String(annotation.color || '#ffff00')
        };

        console.log('Sending annotation data:', annotationData);

        // Keep the annotation visible while saving
        const savedAnnotation = await annotationsAPI.create(annotationData);
        
        // Reload annotations to get the saved one with _id
        const data = await annotationsAPI.getByDocument(requestId, documentId);
        const updatedAnnotations = data.filter(a => !a.isDeleted);
        setAnnotations(updatedAnnotations);
        
        // If it's a rectangle annotation, automatically open edit mode for text input
        if (annotation.type === AnnotationType.RECTANGLE) {
          // Try to use the saved annotation's _id first, otherwise find by coordinates
          let annotationToEdit: Annotation | undefined;
          
          if (savedAnnotation && savedAnnotation._id) {
            annotationToEdit = updatedAnnotations.find(a => a._id === savedAnnotation._id);
          }
          
          // If not found by _id, find by coordinates and type (fallback)
          if (!annotationToEdit) {
            annotationToEdit = updatedAnnotations.find(a => 
              a.type === AnnotationType.RECTANGLE &&
              a.pageNumber === pageNum &&
              Math.abs(a.x - annotation.x) < 0.01 &&
              Math.abs(a.y - annotation.y) < 0.01 &&
              Math.abs((a.width || 0) - (annotation.width || 0)) < 0.01 &&
              Math.abs((a.height || 0) - (annotation.height || 0)) < 0.01
            );
          }
          
          if (annotationToEdit && annotationToEdit._id) {
            // Use setTimeout to ensure the annotation is rendered before opening edit mode
            setTimeout(() => {
              setSelectedAnnotation(annotationToEdit!._id!);
              setEditingAnnotation(annotationToEdit!._id!);
              setTextContent(annotationToEdit!.content || '');
              setTextAlign((annotationToEdit as any).textAlign || 'right');
              setTextBold((annotationToEdit as any).textBold || false);
            }, 100);
          }
        }
        
        if (onSave) {
          onSave();
        }
        
        // Clear drawing state only after successful save
        setDrawingState({
          isDrawing: false,
          startX: 0,
          startY: 0,
          currentAnnotation: null
        });
      } catch (error: any) {
        console.error('Failed to save annotation:', error);
        console.error('Error details:', error.response?.data);
        const errorMsg = error.response?.data?.errors?.[0]?.msg || 
                        error.response?.data?.errors?.[0]?.message || 
                        error.response?.data?.error || 
                        'שגיאה בשמירת הסימון';
        console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
        showToast(errorMsg, 'error');
        // Keep the annotation visible on error so user can try again
        // Don't clear drawing state on error
      }
    } else {
      // Clear if annotation is too small
      setDrawingState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentAnnotation: null
      });
    }
  }, [drawingState, requestId, documentId, onSave, showToast]);

  const handleAnnotationClick = (annotation: Annotation) => {
    if (readOnly) return;
    
    setSelectedAnnotation(annotation._id || null);
    setEditingAnnotation(annotation._id || null);
    setTextContent(annotation.content || '');
    setTextAlign((annotation as any).textAlign || 'right');
    setTextBold((annotation as any).textBold || false);
  };

  const handleSaveText = async (annotationId: string) => {
    try {
      await annotationsAPI.update(annotationId, {
        content: textContent,
        textAlign: textAlign,
        textBold: textBold
      } as any);
      
      const data = await annotationsAPI.getByDocument(requestId, documentId);
      setAnnotations(data.filter(a => !a.isDeleted));
      setEditingAnnotation(null);
      setSelectedAnnotation(null);
      showToast('הטקסט נשמר בהצלחה', 'success');
    } catch (error: any) {
      console.error('Failed to save text:', error);
      showToast('שגיאה בשמירת הטקסט', 'error');
    }
  };

  const renderAnnotation = (annotation: Annotation, pageNum: number) => {
    if (!canvasDisplayDimensions[pageNum]) return null;
    
    // Use the same coordinate system as mouse events - canvasRect dimensions
    const displayedWidth = canvasDisplayDimensions[pageNum].width;
    const displayedHeight = canvasDisplayDimensions[pageNum].height;
    
    // Convert relative coordinates (0-1) to absolute pixels on displayed canvas
    const absX = annotation.x * displayedWidth;
    const absY = annotation.y * displayedHeight;
    const absWidth = (annotation.width || 0) * displayedWidth;
    const absHeight = (annotation.height || 0) * displayedHeight;
    const isEditing = editingAnnotation === annotation._id;
    const annotationTextAlign = (annotation as any).textAlign || 'right';
    const annotationTextBold = (annotation as any).textBold || false;

    return (
      <div
        key={annotation._id}
        style={{
          position: 'absolute',
          left: `${absX}px`,
          top: `${absY}px`,
          width: `${absWidth}px`,
          height: `${absHeight}px`,
          border: `2px solid ${annotation.color}`,
          backgroundColor: `${annotation.color}40`,
          pointerEvents: readOnly ? 'none' : 'auto',
          cursor: readOnly ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          padding: '4px',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Don't open edit mode if already editing or if clicking on textarea
          if (!readOnly && !isEditing && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            handleAnnotationClick(annotation);
          }
        }}
      >
        {isEditing ? (
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            onBlur={() => {
              if (annotation._id) {
                handleSaveText(annotation._id);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && e.ctrlKey && annotation._id) {
                handleSaveText(annotation._id);
              }
              if (e.key === 'Escape') {
                setEditingAnnotation(null);
                setSelectedAnnotation(null);
                setTextContent('');
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              minHeight: '20px',
              border: 'none',
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              textAlign: textAlign,
              fontWeight: textBold ? 'bold' : 'normal',
              fontSize: '12px',
              direction: 'rtl',
              zIndex: 1000,
              position: 'relative'
            }}
            dir="rtl"
            placeholder="הקלד טקסט כאן..."
            autoFocus
          />
        ) : (
          annotation.content ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                textAlign: annotationTextAlign,
                fontWeight: annotationTextBold ? 'bold' : 'normal',
                fontSize: '12px',
                direction: 'rtl',
                overflow: 'hidden',
                wordWrap: 'break-word'
              }}
              dir="rtl"
            >
              {annotation.content}
            </div>
          ) : (
            // Show placeholder text when no content but annotation exists
            <div
              style={{
                width: '100%',
                height: '100%',
                textAlign: 'center',
                fontSize: '11px',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                direction: 'rtl'
              }}
              dir="rtl"
            >
              לחץ לעריכה
            </div>
          )
        )}
        {selectedAnnotation === annotation._id && !readOnly && !isEditing && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await annotationsAPI.delete(annotation._id!);
                const data = await annotationsAPI.getByDocument(requestId, documentId);
                setAnnotations(data.filter(a => !a.isDeleted));
                setSelectedAnnotation(null);
                showToast('הסימון נמחק', 'success');
              } catch (error: any) {
                console.error('Failed to delete annotation:', error);
                showToast('שגיאה במחיקת הסימון', 'error');
              }
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs z-10 hover:bg-red-600 shadow-lg"
            title="מחק סימון (או לחץ Delete)"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  if (loading || !pdfjs || !pdfDoc) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">טוען PDF...</p>
      </div>
    );
  }

  const handleCreateReminder = async () => {
    if (!caseId) return;
    try {
      await remindersAPI.create({
        caseId,
        title: reminderFormData.title,
        dueDate: reminderFormData.dueDate,
        assignedTo: reminderFormData.assignedTo || undefined
      });
      const data = await remindersAPI.getByCase(caseId);
      setReminders(data);
      setShowReminderForm(false);
      setReminderFormData({ title: '', dueDate: '', assignedTo: '' });
      showToast('תזכורת נוצרה בהצלחה', 'success');
    } catch (error: any) {
      console.error('Failed to create reminder:', error);
      showToast('שגיאה ביצירת תזכורת', 'error');
    }
  };

  const handleCreateDecision = async () => {
    if (!caseId) return;
    try {
      await decisionsAPI.create({
        caseId,
        requestId: decisionFormData.decisionType === 'note' ? requestId : undefined,
        title: decisionFormData.title,
        content: decisionFormData.content,
        type: decisionFormData.decisionType === 'note' ? 'NOTE_DECISION' : 'FINAL_DECISION',
        closesCase: decisionFormData.closesCase
      } as any);
      const data = await decisionsAPI.getByCase(caseId);
      setDecisions(data.filter(d => d.requestId === requestId));
      setShowDecisionForm(false);
      setDecisionFormData({ title: '', content: '', decisionType: 'note', closesCase: false });
      showToast('החלטה נוצרה בהצלחה', 'success');
    } catch (error: any) {
      console.error('Failed to create decision:', error);
      showToast('שגיאה ביצירת החלטה', 'error');
    }
  };

  return (
    <div className="flex h-full bg-black bg-opacity-50 relative">
      {/* Reminders and Decisions Section - Left Side */}
      {caseId && (
        <div className="w-80 bg-white border-r border-gray-300 flex flex-col overflow-y-auto">
          <div className="p-4 border-b">
            <h4 className="font-semibold">תזכורות והחלטות:</h4>
          </div>
          <div className="flex-1 p-4 space-y-2">
            {reminders.length === 0 && decisions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">אין תזכורות או החלטות עדיין</p>
            ) : (
              <>
                {reminders.map((reminder: any) => (
                  <div key={reminder._id} className="bg-white border border-gray-300 rounded p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">תזכורת:</span>
                      <span className="text-xs text-gray-500">{new Date(reminder.dueDate).toLocaleDateString('he-IL')}</span>
                    </div>
                    <p className="text-sm">{reminder.title}</p>
                  </div>
                ))}
                {decisions.map((decision: any) => (
                  <div key={decision._id} className="bg-white border border-gray-300 rounded p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">החלטה:</span>
                      <span className="text-xs text-gray-500">{new Date(decision.createdAt).toLocaleDateString('he-IL')}</span>
                    </div>
                    <p className="text-sm font-semibold">{decision.title}</p>
                    {decision.content && <p className="text-xs text-gray-600 mt-1">{decision.content.substring(0, 100)}...</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* PDF Section - Center */}
      <div className="flex flex-col flex-1 bg-transparent items-center justify-center overflow-auto">
        {/* Toolbar */}
        {!readOnly && (
          <div className="flex items-center gap-2 p-2 bg-white bg-opacity-90 rounded-lg shadow-lg w-full max-w-4xl mx-auto mt-4 mb-2">
          <span className="text-sm font-semibold">כלי סימון:</span>
          <button
            onClick={() => setSelectedTool(AnnotationType.HIGHLIGHT)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.HIGHLIGHT ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
          >
            הדגשה
          </button>
          <button
            onClick={() => setSelectedTool(AnnotationType.RECTANGLE)}
            className={`px-3 py-1 rounded ${selectedTool === AnnotationType.RECTANGLE ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
          >
            מלבן
          </button>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-10 h-8"
          />
          {editingAnnotation && (
            <>
              <span className="text-sm text-gray-600 mx-2">|</span>
              <span className="text-sm font-semibold">עריכת טקסט:</span>
              <button
                onClick={() => setTextAlign('right')}
                className={`px-2 py-1 rounded text-sm ${textAlign === 'right' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
                title="יישור ימין"
              >
                ⟵
              </button>
              <button
                onClick={() => setTextAlign('center')}
                className={`px-2 py-1 rounded text-sm ${textAlign === 'center' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
                title="יישור מרכז"
              >
                ⟷
              </button>
              <button
                onClick={() => setTextAlign('left')}
                className={`px-2 py-1 rounded text-sm ${textAlign === 'left' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
                title="יישור שמאל"
              >
                ⟶
              </button>
              <button
                onClick={() => setTextBold(!textBold)}
                className={`px-2 py-1 rounded text-sm ${textBold ? 'bg-orange-500 text-white font-bold' : 'bg-gray-200'}`}
                title="הדגשה"
              >
                <strong>B</strong>
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSelectedTool(null);
              setEditingAnnotation(null);
              setTextContent('');
            }}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            בטל בחירה
          </button>
          {annotations.length > 0 && (
            <>
              <span className="text-sm text-gray-600 mx-2">|</span>
              <button
                onClick={async () => {
                  if (confirm(`האם אתה בטוח שברצונך למחוק את כל הסימונים בעמוד ${pageNumber}?`)) {
                    try {
                      const pageAnnotations = annotations.filter(a => a.pageNumber === pageNumber);
                      await Promise.all(pageAnnotations.map(a => annotationsAPI.delete(a._id!)));
                      const data = await annotationsAPI.getByDocument(requestId, documentId);
                      setAnnotations(data.filter(a => !a.isDeleted));
                      showToast('כל הסימונים נמחקו', 'success');
                    } catch (error: any) {
                      console.error('Failed to delete annotations:', error);
                      showToast('שגיאה במחיקת הסימונים', 'error');
                    }
                  }
                }}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                title="מחק את כל הסימונים בעמוד הנוכחי"
              >
                מחק כל הסימונים
              </button>
            </>
          )}
        </div>
      )}

        {/* PDF Pages */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center">
        {Array.from(new Array(numPages), (el, index) => index + 1).map((pageNum) => (
          <div
            key={pageNum}
            ref={(el) => { containerRefs.current[pageNum] = el; }}
            className="relative mb-4 bg-white rounded-lg shadow-xl p-2"
            onMouseDown={(e) => handleMouseDown(e, pageNum)}
            onMouseMove={(e) => handleMouseMove(e, pageNum)}
            onMouseUp={(e) => handleMouseUp(e, pageNum)}
            style={{ cursor: selectedTool && !readOnly ? 'crosshair' : 'default' }}
          >
            <div className="relative inline-block">
              <canvas
                ref={(el) => { canvasRefs.current[pageNum] = el; }}
                className="shadow-lg block"
              />
              {/* Annotations Overlay - positioned exactly over canvas */}
              {canvasDisplayDimensions[pageNum] && (
                <div 
                  className="absolute top-0 left-0" 
                  style={{ 
                    width: `${canvasDisplayDimensions[pageNum].width}px`, 
                    height: `${canvasDisplayDimensions[pageNum].height}px`,
                    pointerEvents: readOnly ? 'none' : 'auto'
                  }}
                >
                  {/* Render existing annotations for this page */}
                  {annotations
                    .filter(a => a.pageNumber === pageNum)
                    .map(a => renderAnnotation(a, pageNum))}
                  
                  {/* Render current drawing annotation - keep it visible even after mouse up until saved */}
                  {drawingState.currentAnnotation &&
                    drawingState.currentAnnotation.pageNumber === pageNum &&
                    (drawingState.isDrawing || drawingState.currentAnnotation.width! > 0.01) &&
                    renderAnnotation(drawingState.currentAnnotation as Annotation, pageNum)}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>

        {/* Page Navigation */}
        <div className="flex items-center justify-between p-2 bg-white bg-opacity-90 rounded-lg shadow-lg w-full max-w-4xl mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">-</button>
            <span>{(scale * 100).toFixed(0)}%</span>
            <button onClick={() => setScale(prev => Math.min(2.0, prev + 0.1))} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">+</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPageNumber(prev => Math.max(1, prev - 1))} disabled={pageNumber <= 1} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">הקודם</button>
            <span>עמוד {pageNumber} מתוך {numPages}</span>
            <button onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))} disabled={pageNumber >= numPages} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50">הבא</button>
          </div>
        </div>
      </div>

      {/* Sidebar - Right Side */}
      {!readOnly && caseId && (
        <div className={`w-80 bg-white border-l border-gray-300 flex flex-col transition-all duration-300 ${showSidebar ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0'}`} style={{ zIndex: 20 }}>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">אפשרויות</h3>
            <button onClick={() => setShowSidebar(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <button
                onClick={() => setShowReminderForm(!showReminderForm)}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                הוסף תזכורת
              </button>
              {showReminderForm && (
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                  <input
                    type="text"
                    placeholder="כותרת תזכורת"
                    value={reminderFormData.title}
                    onChange={(e) => setReminderFormData({ ...reminderFormData, title: e.target.value })}
                    className="w-full p-2 border rounded mb-2"
                  />
                  <input
                    type="datetime-local"
                    value={reminderFormData.dueDate}
                    onChange={(e) => setReminderFormData({ ...reminderFormData, dueDate: e.target.value })}
                    className="w-full p-2 border rounded mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreateReminder} className="flex-1 px-3 py-1 bg-green-500 text-white rounded">שמור</button>
                    <button onClick={() => setShowReminderForm(false)} className="flex-1 px-3 py-1 bg-gray-300 rounded">ביטול</button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => setShowDecisionForm(!showDecisionForm)}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                קבע החלטה
              </button>
              {showDecisionForm && (
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                  <select
                    value={decisionFormData.decisionType}
                    onChange={(e) => setDecisionFormData({ ...decisionFormData, decisionType: e.target.value as 'note' | 'final' })}
                    className="w-full p-2 border rounded mb-2"
                  >
                    <option value="note">החלטה עבור הבקשה</option>
                    <option value="final">החלטה סופית</option>
                  </select>
                  <input
                    type="text"
                    placeholder="כותרת החלטה"
                    value={decisionFormData.title}
                    onChange={(e) => setDecisionFormData({ ...decisionFormData, title: e.target.value })}
                    className="w-full p-2 border rounded mb-2"
                  />
                  <textarea
                    placeholder="תוכן החלטה"
                    value={decisionFormData.content}
                    onChange={(e) => setDecisionFormData({ ...decisionFormData, content: e.target.value })}
                    className="w-full p-2 border rounded mb-2"
                    rows={4}
                  />
                  {decisionFormData.decisionType === 'final' && (
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={decisionFormData.closesCase}
                        onChange={(e) => setDecisionFormData({ ...decisionFormData, closesCase: e.target.checked })}
                      />
                      <span className="text-sm">סגור את התיק</span>
                    </label>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleCreateDecision} className="flex-1 px-3 py-1 bg-green-500 text-white rounded">שמור</button>
                    <button onClick={() => setShowDecisionForm(false)} className="flex-1 px-3 py-1 bg-gray-300 rounded">ביטול</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Toggle Button */}
      {!readOnly && caseId && !showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-orange-500 text-white px-3 py-2 rounded-l shadow-lg hover:bg-orange-600 z-10"
        >
          אפשרויות ◄
        </button>
      )}
    </div>
  );
}

