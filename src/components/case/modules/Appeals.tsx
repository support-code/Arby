'use client';

import { useEffect, useState } from 'react';
import { appealsAPI, decisionsAPI } from '@/lib/api';
import { Appeal, Decision, UserRole, AppealType, AppealStatus } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface AppealsProps {
  caseId: string;
}

export default function Appeals({ caseId }: AppealsProps) {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: AppealType.APPEAL,
    content: '',
    decisionId: ''
  });
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadAppeals();
    loadDecisions();
  }, [caseId]);

  const loadAppeals = async () => {
    try {
      const data = await appealsAPI.getByCase(caseId);
      setAppeals(data);
    } catch (error: any) {
      console.error('Failed to load appeals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDecisions = async () => {
    try {
      const data = await decisionsAPI.getByCase(caseId);
      setDecisions(data);
    } catch (error: any) {
      console.error('Failed to load decisions:', error);
    }
  };

  const canRespond = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

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
        return 'bg-blue-100 text-blue-700';
      case AppealStatus.APPROVED:
        return 'bg-green-100 text-green-700';
      case AppealStatus.REJECTED:
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await appealsAPI.create({
        caseId,
        type: formData.type,
        content: formData.content,
        decisionId: formData.decisionId || undefined
      });
      
      setFormData({
        type: AppealType.APPEAL,
        content: '',
        decisionId: ''
      });
      setShowForm(false);
      showToast('ערעור נוצר בהצלחה', 'success');
      await loadAppeals();
    } catch (error: any) {
      console.error('Failed to create appeal:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת ערעור', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (appealId: string, status: AppealStatus, response?: string) => {
    const responseText = response || prompt('הוסף תגובה (אופציונלי):');
    if (responseText === null) return; // User cancelled

    try {
      await appealsAPI.respond(appealId, { status, response: responseText || undefined });
      showToast('תגובה לערעור נשמרה בהצלחה', 'success');
      await loadAppeals();
    } catch (error: any) {
      console.error('Failed to respond to appeal:', error);
      showToast(error?.response?.data?.error || 'שגיאה בתגובה לערעור', 'error');
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
          <h2 className="text-xl font-bold text-gray-900">ערעורים / השגות</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ערעור חדש
          </button>
        </div>

        {/* Create Appeal Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">יצירת ערעור/השגה חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as AppealType })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value={AppealType.APPEAL}>ערעור</option>
                  <option value={AppealType.OBJECTION}>השגה</option>
                  <option value={AppealType.REQUEST_REVIEW}>בקשה לבדיקה מחדש</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תוכן הערעור/השגה *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={6}
                  placeholder="פרט את הערעור/השגה..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">החלטה קשורה (אופציונלי)</label>
                <select
                  value={formData.decisionId}
                  onChange={(e) => setFormData({ ...formData, decisionId: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">ללא החלטה קשורה</option>
                  {decisions.map((decision) => (
                    <option key={decision._id} value={decision._id}>
                      {decision.title} {decision.status === 'published' ? '(פורסם)' : '(טיוטה)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : 'שלח ערעור'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    type: AppealType.APPEAL,
                    content: '',
                    decisionId: ''
                  });
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {appeals.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין ערעורים בתיק</h3>
            <p className="text-gray-600">ערעורים והשגות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appeals.map((appeal) => {
              const submittedBy = typeof appeal.submittedBy === 'object' ? appeal.submittedBy.name : 'משתמש';

              return (
                <div key={appeal._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(appeal.status)}`}>
                          {getStatusLabel(appeal.status)}
                        </span>
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                          {getTypeLabel(appeal.type)}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{appeal.content}</p>
                      {appeal.response && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-3 border-r-4 border-blue-500">
                          <p className="text-sm font-semibold text-gray-700 mb-1">תגובה:</p>
                          <p className="text-gray-600">{appeal.response}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>הוגש על ידי: {submittedBy}</span>
                        {appeal.responseDate && (
                          <>
                            <span>•</span>
                            <span>
                              נענה: {new Date(appeal.responseDate).toLocaleDateString('he-IL')}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(appeal.createdAt).toLocaleDateString('he-IL')}</span>
                      </div>
                      {canRespond && appeal.status === AppealStatus.PENDING && (
                        <>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleRespond(appeal._id, AppealStatus.UNDER_REVIEW)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
                            >
                              לבדיקה
                            </button>
                            <button
                              onClick={() => handleRespond(appeal._id, AppealStatus.APPROVED)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-semibold"
                            >
                              לאשר
                            </button>
                            <button
                              onClick={() => handleRespond(appeal._id, AppealStatus.REJECTED)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-semibold"
                            >
                              לדחות
                            </button>
                          </div>
                          <div className="mt-2">
                            <button
                              onClick={() => {
                                const response = prompt('הוסף תגובה מפורטת:');
                                if (response) {
                                  handleRespond(appeal._id, AppealStatus.UNDER_REVIEW, response);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm underline"
                            >
                              הוסף תגובה מפורטת
                            </button>
                          </div>
                        </>
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

