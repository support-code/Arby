'use client';

import { useEffect, useState } from 'react';
import { requestsAPI } from '@/lib/api';
import { Request, UserRole, RequestType, RequestStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface RequestsProps {
  caseId: string;
}

export default function Requests({ caseId }: RequestsProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: RequestType.INSTRUCTION,
    title: '',
    content: ''
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
        return 'bg-blue-100 text-blue-700';
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
      });
      
      setFormData({
        type: RequestType.INSTRUCTION,
        title: '',
        content: ''
      });
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
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            בקשה חדשה
          </button>
        </div>

        {/* Create Request Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
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
                        <div className="bg-gray-50 p-3 rounded-lg mb-3 border-r-4 border-blue-500">
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
                      {canRespond && request.status === RequestStatus.PENDING && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleRespond(request._id, RequestStatus.APPROVED)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                          >
                            לאשר
                          </button>
                          <button
                            onClick={() => handleRespond(request._id, RequestStatus.REJECTED)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
                          >
                            לדחות
                          </button>
                          <button
                            onClick={() => handleRespond(request._id, RequestStatus.UNDER_REVIEW)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                          >
                            לבדיקה
                          </button>
                        </div>
                      )}
                      {canRespond && request.status === RequestStatus.PENDING && !request.response && (
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              const response = prompt('הוסף תגובה מפורטת:');
                              if (response) {
                                handleRespond(request._id, RequestStatus.UNDER_REVIEW, response);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm underline"
                          >
                            הוסף תגובה מפורטת
                          </button>
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
    </div>
  );
}

