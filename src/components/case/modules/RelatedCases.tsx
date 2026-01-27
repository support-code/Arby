'use client';

import { useEffect, useState } from 'react';
import { relatedCasesAPI, casesAPI } from '@/lib/api';
import { RelatedCase, Case, RelationType, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/store/toastStore';

interface RelatedCasesProps {
  caseId: string;
}

const relationTypeLabels: Record<RelationType, string> = {
  [RelationType.RELATED]: 'קשור',
  [RelationType.APPEAL]: 'ערעור',
  [RelationType.MERGER]: 'מיזוג',
  [RelationType.SPLIT]: 'פיצול'
};

export default function RelatedCases({ caseId }: RelatedCasesProps) {
  const [relatedCases, setRelatedCases] = useState<RelatedCase[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    relatedCaseId: '',
    relationType: RelationType.RELATED,
    notes: ''
  });
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();
  const router = useRouter();
  const canManage = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  useEffect(() => {
    loadRelatedCases();
    if (canManage) {
      loadAllCases();
    }
  }, [caseId, canManage]);

  const loadRelatedCases = async () => {
    try {
      const data = await relatedCasesAPI.getByCase(caseId);
      setRelatedCases(data);
    } catch (error: any) {
      console.error('Failed to load related cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllCases = async () => {
    try {
      const data = await casesAPI.getAll();
      // Filter out current case
      const filtered = data.filter(c => c._id !== caseId);
      setAllCases(filtered);
    } catch (error: any) {
      console.error('Failed to load cases:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.relatedCaseId) return;

    try {
      await relatedCasesAPI.create({
        caseId,
        relatedCaseId: formData.relatedCaseId,
        relationType: formData.relationType,
        notes: formData.notes || undefined
      });
      showToast('קישור תיק נוצר בהצלחה', 'success');
      await loadRelatedCases();
      setShowForm(false);
      setFormData({ relatedCaseId: '', relationType: RelationType.RELATED, notes: '' });
    } catch (error: any) {
      console.error('Failed to create related case:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת קישור תיק', 'error');
    }
  };

  const handleDelete = async (relatedCaseId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קישור זה?')) return;

    try {
      await relatedCasesAPI.delete(relatedCaseId);
      showToast('קישור תיק נמחק בהצלחה', 'success');
      await loadRelatedCases();
    } catch (error: any) {
      console.error('Failed to delete related case:', error);
      showToast(error?.response?.data?.error || 'שגיאה במחיקת קישור תיק', 'error');
    }
  };

  const handleCaseClick = (relatedCaseId: string) => {
    router.push(`/cases/${relatedCaseId}`);
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
          <h2 className="text-xl font-bold text-gray-900">תיקים קשורים</h2>
          {canManage && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              קישור תיק
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && canManage && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <select
              value={formData.relatedCaseId}
              onChange={(e) => setFormData({ ...formData, relatedCaseId: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg mb-3"
              required
            >
              <option value="">בחר תיק</option>
              {allCases.map(c => (
                <option key={c._id} value={c._id}>
                  {c.title} {c.caseNumber ? `(${c.caseNumber})` : ''}
                </option>
              ))}
            </select>
            <select
              value={formData.relationType}
              onChange={(e) => setFormData({ ...formData, relationType: e.target.value as RelationType })}
              className="w-full p-3 border border-gray-300 rounded-lg mb-3"
            >
              {Object.values(RelationType).map(type => (
                <option key={type} value={type}>
                  {relationTypeLabels[type]}
                </option>
              ))}
            </select>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות (אופציונלי)"
              className="w-full p-3 border border-gray-300 rounded-lg mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-semibold"
              >
                צור קישור
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {relatedCases.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין תיקים קשורים</h3>
            <p className="text-gray-600">תיקים קשורים יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relatedCases.map((relatedCase) => {
              const relatedCaseDoc = typeof relatedCase.relatedCaseId === 'object' 
                ? relatedCase.relatedCaseId 
                : null;
              const caseTitle = relatedCaseDoc?.title || 'תיק לא נמצא';
              const caseNumber = relatedCaseDoc?.caseNumber || '';

              return (
                <div key={relatedCase._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                          {relationTypeLabels[relatedCase.relationType]}
                        </span>
                        <button
                          onClick={() => handleCaseClick(typeof relatedCase.relatedCaseId === 'object' 
                            ? relatedCase.relatedCaseId._id 
                            : relatedCase.relatedCaseId)}
                          className="font-semibold text-gray-900 hover:text-orange-600"
                        >
                          {caseTitle}
                        </button>
                      </div>
                      {caseNumber && (
                        <p className="text-sm text-gray-600 mb-1">מספר תיק: {caseNumber}</p>
                      )}
                      {relatedCase.notes && (
                        <p className="text-sm text-gray-600 mt-1">{relatedCase.notes}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        נוצר: {new Date(relatedCase.createdAt).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(relatedCase._id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="מחק קישור"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
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
