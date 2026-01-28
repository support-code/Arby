'use client';

import { useEffect, useState } from 'react';
import { requestsAPI, decisionsAPI } from '@/lib/api';
import { Request, UserRole, RequestType, RequestStatus, Decision, Document } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import dynamic from 'next/dynamic';

// Dynamically import PDF components with SSR disabled
const PDFAnnotator = dynamic(() => import('@/components/pdf/PDFAnnotatorDirect'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">טוען PDF...</div>
});

const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">טוען PDF...</div>
});

interface RequestsProps {
  caseId: string;
}

export default function Requests({ caseId }: RequestsProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState<string | null>(null);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<{ requestId: string; documentId: string } | null>(null);
  const [requestAttachments, setRequestAttachments] = useState<{ [requestId: string]: Document[] }>({});
  const [formData, setFormData] = useState({
    type: RequestType.INSTRUCTION,
    title: '',
    content: ''
  });
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [decisionFormData, setDecisionFormData] = useState({
    title: '',
    content: '',
    decisionType: 'note' as 'note' | 'final', // 'note' = החלטה עבור הבקשה, 'final' = החלטה סופית
    closesCase: false
  });
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadRequests();
  }, [caseId]);

  const loadRequests = async () => {
    try {
      const data = await requestsAPI.getByCase(caseId);
      setRequests(data);
      
      // Load attachments for each request that has attachments
      const attachmentsMap: { [requestId: string]: Document[] } = {};
      for (const request of data) {
        // Try to load attachments if request has attachments array (even if empty, we'll try)
        if (request.attachments !== undefined) {
          try {
            const attachments = await requestsAPI.getAttachments(request._id);
            if (attachments && attachments.length > 0) {
              attachmentsMap[request._id] = attachments;
            }
          } catch (error: any) {
            // If attachments endpoint fails, try to use attachments from request object
            if (request.attachments && request.attachments.length > 0) {
              // Keep the attachment IDs from request object as fallback
              attachmentsMap[request._id] = request.attachments as Document[];
            }
            console.error(`Failed to load attachments for request ${request._id}:`, error);
          }
        }
      }
      setRequestAttachments(attachmentsMap);
    } catch (error: any) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const canRespond = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  const getTypeLabel = (type: RequestType) => {
    switch (type) {
      case RequestType.INSTRUCTION:
        return 'בקשה להוראה';
      case RequestType.TEMPORARY_RELIEF:
        return 'בקשה לסעד זמני';
      case RequestType.AFTER_CLOSURE:
        return 'בקשה אחרי סגירה';
      default:
        return 'בקשה אחרת';
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return 'ממתין';
      case RequestStatus.APPROVED:
        return 'אושר';
      case RequestStatus.REJECTED:
        return 'נדחה';
      case RequestStatus.UNDER_REVIEW:
        return 'בבדיקה';
      default:
        return status;
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case RequestStatus.APPROVED:
        return 'bg-green-100 text-green-700';
      case RequestStatus.REJECTED:
        return 'bg-red-100 text-red-700';
      case RequestStatus.UNDER_REVIEW:
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await requestsAPI.create({
        caseId,
        type: formData.type,
        title: formData.title,
        content: formData.content
      }, pdfFiles.length > 0 ? pdfFiles : undefined);
      
      setFormData({
        type: RequestType.INSTRUCTION,
        title: '',
        content: ''
      });
      setPdfFiles([]);
      setShowForm(false);
      showToast('בקשה נוצרה בהצלחה', 'success');
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to create request:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת בקשה', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (requestId: string, status: RequestStatus, response?: string) => {
    const responseText = response || prompt('הוסף תגובה (אופציונלי):');
    if (responseText === null) return; // User cancelled

    try {
      await requestsAPI.respond(requestId, { status, response: responseText || undefined });
      showToast('תגובה לבקשה נשמרה בהצלחה', 'success');
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to respond to request:', error);
      showToast(error?.response?.data?.error || 'שגיאה בתגובה לבקשה', 'error');
    }
  };

  const handleCreateDecision = async (requestId: string) => {
    if (!decisionFormData.title || !decisionFormData.content) {
      showToast('יש למלא כותרת ותוכן להחלטה', 'error');
      return;
    }

    setDecisionSubmitting(true);
    try {
      await requestsAPI.createDecision(requestId, {
        title: decisionFormData.title,
        content: decisionFormData.content,
        isFinalDecision: decisionFormData.decisionType === 'final',
        closesCase: decisionFormData.closesCase
      });
      showToast('החלטה נוצרה בהצלחה', 'success');
      setShowDecisionForm(null);
      setDecisionFormData({
        title: '',
        content: '',
        decisionType: 'note',
        closesCase: false
      });
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to create decision:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת החלטה', 'error');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">בקשות</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            בקשה חדשה
          </button>
        </div>

        {/* Create Request Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-gray-900 mb-4">יצירת בקשה חדשה</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג בקשה</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as RequestType })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value={RequestType.INSTRUCTION}>בקשה להוראה</option>
                  <option value={RequestType.TEMPORARY_RELIEF}>בקשה לסעד זמני</option>
                  <option value={RequestType.AFTER_CLOSURE}>בקשה אחרי סגירה</option>
                  <option value={RequestType.OTHER}>אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">כותרת</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="כותרת הבקשה"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תוכן הבקשה</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={5}
                  placeholder="פרט את הבקשה..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">צרף קבצי PDF (אופציונלי)</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPdfFiles(files.filter(f => f.type === 'application/pdf'));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                {pdfFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">קבצים נבחרו:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {pdfFiles.map((file, idx) => (
                        <li key={idx}>{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : 'שלח בקשה'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    type: RequestType.INSTRUCTION,
                    title: '',
                    content: ''
                  });
                  setPdfFiles([]);
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין בקשות בתיק</h3>
            <p className="text-gray-600">בקשות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const submittedBy = typeof request.submittedBy === 'object' ? request.submittedBy.name : 'משתמש';
              const respondedBy = request.respondedBy && typeof request.respondedBy === 'object' 
                ? request.respondedBy.name 
                : request.respondedBy;

              return (
                <div key={request._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{request.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                          {getTypeLabel(request.type)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{request.content}</p>
                      {request.response && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-3 border-r-4 border-orange-500">
                          <p className="text-sm font-semibold text-gray-700 mb-1">תגובה:</p>
                          <p className="text-gray-600">{request.response}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>הוגש על ידי: {submittedBy}</span>
                        {request.responseDate && (
                          <>
                            <span>•</span>
                            <span>
                              נענה: {new Date(request.responseDate).toLocaleDateString('he-IL')}
                              {respondedBy && ` על ידי ${respondedBy}`}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(request.createdAt).toLocaleDateString('he-IL')}</span>
                      </div>
                      {requestAttachments[request._id] && requestAttachments[request._id].length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">קבצים מצורפים:</p>
                          <div className="flex flex-wrap gap-2">
                            {requestAttachments[request._id].map((attachment) => {
                              const docId = typeof attachment === 'string' ? attachment : attachment._id;
                              const docName = typeof attachment === 'string' ? 'מסמך' : attachment.originalName;
                              return (
                                <div key={docId} className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">{docName}</span>
                                  {canRespond && (
                                    <button
                                      onClick={() => setViewingPdf({ requestId: request._id, documentId: docId })}
                                      className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600"
                                    >
                                      סמן PDF
                                    </button>
                                  )}
                                  {!canRespond && (
                                    <button
                                      onClick={() => setViewingPdf({ requestId: request._id, documentId: docId })}
                                      className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                                    >
                                      צפה ב-PDF
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {canRespond && request.status === RequestStatus.PENDING && (
                        <div className="mt-3">
                          <button
                            onClick={async () => {
                              setShowDecisionForm(request._id);
                              // Always try to load attachments when opening decision form
                              if (!requestAttachments[request._id] || requestAttachments[request._id].length === 0) {
                                try {
                                  const attachments = await requestsAPI.getAttachments(request._id);
                                  if (attachments && attachments.length > 0) {
                                    setRequestAttachments(prev => ({ ...prev, [request._id]: attachments }));
                                  } else if (request.attachments && request.attachments.length > 0) {
                                    // Fallback: use attachments from request object
                                    setRequestAttachments(prev => ({ ...prev, [request._id]: request.attachments as Document[] }));
                                  }
                                } catch (error: any) {
                                  console.error(`Failed to load attachments for request ${request._id}:`, error);
                                  // Fallback: use attachments from request object if API fails
                                  if (request.attachments && request.attachments.length > 0) {
                                    setRequestAttachments(prev => ({ ...prev, [request._id]: request.attachments as Document[] }));
                                  }
                                }
                              }
                            }}
                            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
                          >
                            יצירת החלטה
                          </button>
                        </div>
                      )}
                      {canRespond && showDecisionForm === request._id && (
                        <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="font-semibold text-gray-900 mb-3">יצירת החלטה על הבקשה</h4>
                          <div className="space-y-3">
                            {/* Show request attachments - always show if request has attachments */}
                            {request.attachments && request.attachments.length > 0 && (
                              <div className="mb-4 p-3 bg-white rounded-lg border border-purple-300">
                                <p className="text-sm font-semibold text-gray-700 mb-2">מסמכים מצורפים לבקשה:</p>
                                <div className="space-y-2">
                                  {requestAttachments[request._id] && requestAttachments[request._id].length > 0 ? (
                                    // Show loaded attachments with full details
                                    requestAttachments[request._id].map((attachment) => {
                                      const docId = typeof attachment === 'string' ? attachment : attachment._id;
                                      const docName = typeof attachment === 'string' ? 'מסמך' : attachment.originalName;
                                      return (
                                        <div key={docId} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                                          <span className="text-sm text-gray-700 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            {docName}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setViewingPdf({ requestId: request._id, documentId: docId })}
                                            className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 flex items-center gap-1 transition-colors"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            סמן PDF
                                          </button>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    // Show attachment IDs from request while loading
                                    request.attachments.map((attachmentId, idx) => {
                                      const docId = typeof attachmentId === 'string' ? attachmentId : (typeof attachmentId === 'object' && attachmentId !== null ? (attachmentId._id || String(attachmentId)) : String(attachmentId));
                                      const docName = typeof attachmentId === 'object' && attachmentId !== null && attachmentId.originalName ? attachmentId.originalName : 'מסמך PDF';
                                      const keyValue = typeof docId === 'string' || typeof docId === 'number' ? docId : `doc-${idx}`;
                                      return (
                                        <div key={keyValue} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                                          <span className="text-sm text-gray-700 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            {docName}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setViewingPdf({ requestId: request._id, documentId: docId })}
                                            className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 flex items-center gap-1 transition-colors"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            סמן PDF
                                          </button>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">ניתן לסמן את המסמכים לפני יצירת ההחלטה</p>
                              </div>
                            )}
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">סוג החלטה</label>
                              <select
                                value={decisionFormData.decisionType}
                                onChange={(e) => setDecisionFormData({ ...decisionFormData, decisionType: e.target.value as 'note' | 'final' })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                              >
                                <option value="note">החלטה עבור הבקשה</option>
                                <option value="final">החלטה סופית</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">כותרת ההחלטה</label>
                              <input
                                type="text"
                                value={decisionFormData.title}
                                onChange={(e) => setDecisionFormData({ ...decisionFormData, title: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                placeholder="כותרת ההחלטה"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">תוכן ההחלטה</label>
                              <textarea
                                value={decisionFormData.content}
                                onChange={(e) => setDecisionFormData({ ...decisionFormData, content: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                rows={5}
                                placeholder="פרט את ההחלטה..."
                                required
                              />
                            </div>
                            {decisionFormData.decisionType === 'final' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={decisionFormData.closesCase}
                                  onChange={(e) => setDecisionFormData({ ...decisionFormData, closesCase: e.target.checked })}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm text-gray-700">סוגרת את התיק</span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCreateDecision(request._id)}
                                disabled={decisionSubmitting}
                                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
                              >
                                {decisionSubmitting ? 'יוצר...' : 'צור החלטה'}
                              </button>
                              <button
                                onClick={() => {
                                  setShowDecisionForm(null);
                                  setDecisionFormData({
                                    title: '',
                                    content: '',
                                    decisionType: 'note',
                                    closesCase: false
                                  });
                                }}
                                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
                              >
                                ביטול
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PDF Viewer/Annotator Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">צפייה/סימון PDF</h3>
              <button
                onClick={() => setViewingPdf(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {canRespond ? (
                <PDFAnnotator
                  documentId={viewingPdf.documentId}
                  requestId={viewingPdf.requestId}
                  caseId={caseId}
                  readOnly={false}
                  onSave={() => {
                    // Reload requests to get updated annotations
                    loadRequests();
                  }}
                />
              ) : (
                <PDFViewer
                  file={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/documents/${viewingPdf.documentId}/download`}
                  className="h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

