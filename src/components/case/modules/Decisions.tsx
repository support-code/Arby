'use client';

import { useEffect, useState } from 'react';
import { decisionsAPI, documentsAPI, appealsAPI, requestsAPI, discussionSessionsAPI } from '@/lib/api';
import { Decision, Appeal, UserRole, DecisionStatus, DecisionType, AppealType, AppealStatus, Request, DiscussionSession, Document } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import dynamic from 'next/dynamic';

// Dynamically import PDF viewer with SSR disabled
const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">טוען PDF...</div>
});

const PDFAnnotator = dynamic(() => import('@/components/pdf/PDFAnnotatorDirect'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">טוען PDF...</div>
});

interface DecisionsProps {
  caseId: string;
}

export default function Decisions({ caseId }: DecisionsProps) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [discussionSessions, setDiscussionSessions] = useState<DiscussionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingAnnotatedPdf, setViewingAnnotatedPdf] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ requestId: string; documentId: string } | null>(null);
  const [requestAttachments, setRequestAttachments] = useState<{ [requestId: string]: Document[] }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: DecisionType.NOTE_DECISION,
    title: '',
    summary: '',
    content: '',
    documentId: '',
    requestId: '',
    discussionSessionId: '',
    status: DecisionStatus.DRAFT
  });
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadDecisions();
    loadDocuments();
    loadAppeals();
    loadRequests();
    loadDiscussionSessions();
  }, [caseId]);

  const loadDecisions = async () => {
    try {
      const data = await decisionsAPI.getByCase(caseId);
      setDecisions(data);
    } catch (error: any) {
      console.error('Failed to load decisions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const data = await documentsAPI.getByCase(caseId);
      setDocuments(data);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
    }
  };

  const loadAppeals = async () => {
    try {
      const data = await appealsAPI.getByCase(caseId);
      setAppeals(data);
    } catch (error: any) {
      console.error('Failed to load appeals:', error);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await requestsAPI.getByCase(caseId);
      setRequests(data);
      
      // Load attachments for each request
      const attachmentsMap: { [requestId: string]: Document[] } = {};
      for (const request of data) {
        if (request.attachments && request.attachments.length > 0) {
          try {
            const attachments = await requestsAPI.getAttachments(request._id);
            attachmentsMap[request._id] = attachments;
          } catch (error: any) {
            console.error(`Failed to load attachments for request ${request._id}:`, error);
          }
        }
      }
      setRequestAttachments(attachmentsMap);
    } catch (error: any) {
      console.error('Failed to load requests:', error);
    }
  };
  
  const loadRequestAttachments = async (requestId: string) => {
    if (requestAttachments[requestId]) {
      return; // Already loaded
    }
    try {
      const attachments = await requestsAPI.getAttachments(requestId);
      setRequestAttachments(prev => ({ ...prev, [requestId]: attachments }));
    } catch (error: any) {
      console.error(`Failed to load attachments for request ${requestId}:`, error);
    }
  };

  const loadDiscussionSessions = async () => {
    try {
      const data = await discussionSessionsAPI.getByCase(caseId);
      setDiscussionSessions(data);
    } catch (error: any) {
      console.error('Failed to load discussion sessions:', error);
    }
  };

  const getAppealsForDecision = (decisionId: string): Appeal[] => {
    return appeals.filter(appeal => {
      if (!appeal.decisionId) return false;
      const appealDecisionId = typeof appeal.decisionId === 'object' 
        ? (appeal.decisionId._id || (appeal.decisionId as any).id)
        : appeal.decisionId;
      return appealDecisionId === decisionId;
    });
  };

  const getTypeLabel = (type: AppealType) => {
    switch (type) {
      case AppealType.APPEAL:
        return 'ערעור';
      case AppealType.OBJECTION:
        return 'השגה';
      case AppealType.REQUEST_REVIEW:
        return 'בקשה לבדיקה מחדש';
      default:
        return type;
    }
  };

  const getStatusLabel = (status: AppealStatus) => {
    switch (status) {
      case AppealStatus.PENDING:
        return 'ממתין';
      case AppealStatus.UNDER_REVIEW:
        return 'בבדיקה';
      case AppealStatus.APPROVED:
        return 'אושר';
      case AppealStatus.REJECTED:
        return 'נדחה';
      default:
        return status;
    }
  };

  const getStatusColor = (status: AppealStatus) => {
    switch (status) {
      case AppealStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case AppealStatus.UNDER_REVIEW:
        return 'bg-orange-100 text-orange-700';
      case AppealStatus.APPROVED:
        return 'bg-green-100 text-green-700';
      case AppealStatus.REJECTED:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDecisionTypeLabel = (type: DecisionType) => {
    switch (type) {
      case DecisionType.NOTE_DECISION:
        return 'החלטה בפיתקית';
      case DecisionType.FINAL_DECISION:
        return 'החלטה סופית';
      case DecisionType.DISCUSSION_DECISION:
        return 'החלטה דיונית';
      default:
        return type;
    }
  };

  const getDecisionTypeColor = (type: DecisionType) => {
    switch (type) {
      case DecisionType.NOTE_DECISION:
        return 'bg-orange-100 text-orange-700';
      case DecisionType.FINAL_DECISION:
        return 'bg-green-100 text-green-700';
      case DecisionType.DISCUSSION_DECISION:
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate type-specific requirements
      if (formData.type === DecisionType.NOTE_DECISION && !formData.requestId) {
        showToast('אנא בחר בקשה עבור החלטה בפיתקית', 'warning');
        setSubmitting(false);
        return;
      }
      if ((formData.type === DecisionType.DISCUSSION_DECISION || formData.type === DecisionType.FINAL_DECISION) && !formData.discussionSessionId) {
        showToast('אנא בחר דיון עבור החלטה דיונית/סופית', 'warning');
        setSubmitting(false);
        return;
      }

      await decisionsAPI.create({
        caseId,
        type: formData.type,
        title: formData.title,
        summary: formData.summary || undefined,
        content: formData.content || undefined,
        documentId: formData.documentId || undefined,
        requestId: formData.type === DecisionType.NOTE_DECISION ? formData.requestId || undefined : undefined,
        discussionSessionId: (formData.type === DecisionType.DISCUSSION_DECISION || formData.type === DecisionType.FINAL_DECISION) 
          ? formData.discussionSessionId || undefined 
          : undefined,
        closesDiscussion: formData.type === DecisionType.FINAL_DECISION,
        status: formData.status
      });
      
      setFormData({
        type: DecisionType.NOTE_DECISION,
        title: '',
        summary: '',
        content: '',
        documentId: '',
        requestId: '',
        discussionSessionId: '',
        status: DecisionStatus.DRAFT
      });
      setShowForm(false);
      showToast('החלטה נוצרה בהצלחה', 'success');
      await loadDecisions();
    } catch (error: any) {
      console.error('Failed to create decision:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת החלטה', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

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
          <h2 className="text-xl font-bold text-gray-900">החלטות</h2>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              החלטה חדשה
            </button>
          )}
        </div>

        {/* Create Decision Form */}
        {showForm && canCreate && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-gray-900 mb-4">יצירת החלטה חדשה</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג החלטה *</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as DecisionType;
                    setFormData({ 
                      ...formData, 
                      type: newType,
                      requestId: newType === DecisionType.NOTE_DECISION ? formData.requestId : '',
                      discussionSessionId: (newType === DecisionType.DISCUSSION_DECISION || newType === DecisionType.FINAL_DECISION) 
                        ? formData.discussionSessionId 
                        : ''
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value={DecisionType.NOTE_DECISION}>החלטה בפיתקית (על גבי בקשה)</option>
                  <option value={DecisionType.FINAL_DECISION}>החלטה סופית (סוגרת דיון)</option>
                  <option value={DecisionType.DISCUSSION_DECISION}>החלטה דיונית (נוצרת דרך דיונים)</option>
                </select>
              </div>
              
              {formData.type === DecisionType.NOTE_DECISION && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">בחר בקשה *</label>
                    <select
                      value={formData.requestId}
                      onChange={(e) => {
                        const requestId = e.target.value;
                        setFormData({ ...formData, requestId });
                        if (requestId) {
                          loadRequestAttachments(requestId);
                        }
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      required
                    >
                      <option value="">בחר בקשה...</option>
                      {requests.map((req) => (
                        <option key={req._id} value={req._id}>
                          {req.title} ({typeof req.type === 'string' ? req.type : req.type})
                        </option>
                      ))}
                    </select>
                    {requests.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">אין בקשות זמינות בתיק זה</p>
                    )}
                  </div>
                  {formData.requestId && requestAttachments[formData.requestId] && requestAttachments[formData.requestId].length > 0 && (
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">מסמכים מצורפים לבקשה:</p>
                      <div className="space-y-2">
                        {requestAttachments[formData.requestId].map((attachment) => {
                          const docId = typeof attachment === 'string' ? attachment : attachment._id;
                          const docName = typeof attachment === 'string' ? 'מסמך' : attachment.originalName;
                          return (
                            <div key={docId} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                              <span className="text-sm text-gray-700 flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                {docName}
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingPdf({ requestId: formData.requestId, documentId: docId })}
                                className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                סמן PDF
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">ניתן לסמן את המסמכים לפני יצירת ההחלטה</p>
                    </div>
                  )}
                </>
              )}

              {(formData.type === DecisionType.DISCUSSION_DECISION || formData.type === DecisionType.FINAL_DECISION) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">בחר דיון *</label>
                  <select
                    value={formData.discussionSessionId}
                    onChange={(e) => setFormData({ ...formData, discussionSessionId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    required
                  >
                    <option value="">בחר דיון...</option>
                    {discussionSessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session.title} ({session.status === 'completed' ? 'סגור' : 'פעיל'})
                      </option>
                    ))}
                  </select>
                  {discussionSessions.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">אין דיונים זמינים בתיק זה</p>
                  )}
                  {formData.type === DecisionType.FINAL_DECISION && (
                    <p className="text-sm text-green-600 mt-1">החלטה זו תסגור את הדיון</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">כותרת ההחלטה *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="כותרת ההחלטה"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סיכום</label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={2}
                  placeholder="סיכום קצר של ההחלטה..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תוכן מלא</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={6}
                  placeholder="תוכן מלא של ההחלטה..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">קישור למסמך</label>
                  <select
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">ללא מסמך</option>
                    {documents.map((doc) => (
                      <option key={doc._id} value={doc._id}>
                        {doc.originalName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as DecisionStatus })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value={DecisionStatus.DRAFT}>טיוטה</option>
                    <option value={DecisionStatus.PUBLISHED}>פורסם</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : 'צור החלטה'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    type: DecisionType.NOTE_DECISION,
                    title: '',
                    summary: '',
                    content: '',
                    documentId: '',
                    requestId: '',
                    discussionSessionId: '',
                    status: DecisionStatus.DRAFT
                  });
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {decisions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין החלטות בתיק</h3>
            <p className="text-gray-600">החלטות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => {
              const createdBy = typeof decision.createdBy === 'object' ? decision.createdBy.name : 'משתמש';
              const statusColors: Record<DecisionStatus, string> = {
                [DecisionStatus.DRAFT]: 'bg-gray-100 text-gray-700',
                [DecisionStatus.SENT_FOR_SIGNATURE]: 'bg-yellow-100 text-yellow-700',
                [DecisionStatus.SIGNED]: 'bg-green-100 text-green-700',
                [DecisionStatus.PUBLISHED]: 'bg-green-100 text-green-700',
                [DecisionStatus.REVOKED]: 'bg-red-100 text-red-700'
              };
              const relatedAppeals = getAppealsForDecision(decision._id);

              return (
                <div key={decision._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-lg">{decision.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${getDecisionTypeColor(decision.type)}`}>
                          {getDecisionTypeLabel(decision.type)}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${statusColors[decision.status] || 'bg-gray-100 text-gray-700'}`}>
                          {decision.status === DecisionStatus.DRAFT && 'טיוטה'}
                          {decision.status === DecisionStatus.SENT_FOR_SIGNATURE && 'נשלח לחתימה'}
                          {decision.status === DecisionStatus.SIGNED && 'נחתם'}
                          {decision.status === DecisionStatus.PUBLISHED && 'פורסם'}
                          {decision.status === DecisionStatus.REVOKED && 'בוטל'}
                        </span>
                        {decision.closesCase && (
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 font-semibold">
                            סוגרת תיק
                          </span>
                        )}
                        {decision.closesDiscussion && (
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                            סוגר דיון
                          </span>
                        )}
                        {relatedAppeals.length > 0 && (
                          <span className="px-2 py-1 text-xs rounded bg-orange-100 text-orange-700">
                            {relatedAppeals.length} ערעור{relatedAppeals.length > 1 ? 'ים' : ''}
                          </span>
                        )}
                      </div>
                      {decision.requestId && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">קשור לבקשה: </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {typeof decision.requestId === 'object' ? decision.requestId.title : 'בקשה'}
                          </span>
                        </div>
                      )}
                      {decision.discussionSessionId && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">קשור לדיון: </span>
                          <span className="text-sm font-semibold text-gray-900">
                            {typeof decision.discussionSessionId === 'object' 
                              ? (decision.discussionSessionId as any).title 
                              : 'דיון'}
                          </span>
                        </div>
                      )}
                      {decision.summary && (
                        <p className="text-gray-600 mb-2">{decision.summary}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>נוצר על ידי: {createdBy}</span>
                        {decision.publishedAt && (
                          <>
                            <span>•</span>
                            <span>פורסם: {new Date(decision.publishedAt).toLocaleDateString('he-IL')}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Annotated PDF */}
                      {decision.annotatedPdfDocumentId && (
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              const docId = typeof decision.annotatedPdfDocumentId === 'object' 
                                ? decision.annotatedPdfDocumentId._id 
                                : decision.annotatedPdfDocumentId;
                              setViewingAnnotatedPdf(docId ?? null);
                            }}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                          >
                            צפה ב-PDF מסומן
                          </button>
                        </div>
                      )}
                      
                      {/* Related Appeals */}
                      {relatedAppeals.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-semibold text-gray-700 mb-2 text-sm">ערעורים קשורים:</h4>
                          <div className="space-y-2">
                            {relatedAppeals.map((appeal) => {
                              const submittedBy = typeof appeal.submittedBy === 'object' ? appeal.submittedBy.name : 'משתמש';
                              return (
                                <div key={appeal._id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(appeal.status)}`}>
                                      {getStatusLabel(appeal.status)}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">
                                      {getTypeLabel(appeal.type)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 mb-1">{appeal.content}</p>
                                  {appeal.response && (
                                    <div className="mt-2 p-2 bg-orange-50 rounded border-r-2 border-orange-300">
                                      <p className="text-xs font-semibold text-gray-700 mb-1">תגובה:</p>
                                      <p className="text-xs text-gray-600">{appeal.response}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                                    <span>הוגש על ידי: {submittedBy}</span>
                                    <span>•</span>
                                    <span>{new Date(appeal.createdAt).toLocaleDateString('he-IL')}</span>
                                  </div>
                                </div>
                              );
                            })}
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
              {canCreate ? (
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

