'use client';

import { useState } from 'react';
import { Case, CaseStatus as CaseStatusType, UserRole } from '@/types';
import { getStatusConfig } from '@/utils/caseStatus';
import { useAuthStore } from '@/store/authStore';
import { casesAPI } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface CaseStatusProps {
  caseData: Case;
  onUpdate?: () => void;
}

export default function CaseStatus({ caseData, onUpdate }: CaseStatusProps) {
  const statusConfig = getStatusConfig(caseData.status);
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();
  const canEdit = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);

  const handleStatusChange = async (newStatus: CaseStatusType) => {
    if (newStatus === caseData.status) {
      setShowStatusSelector(false);
      return;
    }

    setIsUpdating(true);
    try {
      await casesAPI.update(caseData._id, { status: newStatus });
      showToast('סטטוס התיק עודכן בהצלחה', 'success');
      setShowStatusSelector(false);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Failed to update status:', error);
      showToast(error?.response?.data?.error || 'שגיאה בעדכון סטטוס', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusOptions = [
    { value: CaseStatusType.DRAFT, label: 'טיוטה', icon: '📝' },
    { value: CaseStatusType.ACTIVE, label: 'פעיל', icon: '🟢' },
    { value: CaseStatusType.PENDING_DECISION, label: 'ממתין להחלטה', icon: '⏳' },
    { value: CaseStatusType.CLOSED, label: 'סגור', icon: '✅' },
    { value: CaseStatusType.ARCHIVED, label: 'בארכיון', icon: '📦' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 border-b pb-2">סטטוס התיק</h2>
          {canEdit && (
            <button
              onClick={() => setShowStatusSelector(!showStatusSelector)}
              className="text-orange-600 hover:text-orange-700 text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              שנה סטטוס
            </button>
          )}
        </div>

        {showStatusSelector && canEdit && (
          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-gray-900 mb-3">בחר סטטוס חדש:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {statusOptions.map((option) => {
                const optionConfig = getStatusConfig(option.value);
                const isCurrent = option.value === caseData.status;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleStatusChange(option.value)}
                    disabled={isUpdating || isCurrent}
                    className={`p-3 border-2 rounded-lg text-right transition-all ${
                      isCurrent
                        ? 'border-orange-500 bg-orange-100 cursor-not-allowed'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                    } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{option.icon}</span>
                      <span className="font-semibold text-gray-900">{option.label}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-xs text-orange-600">נוכחי</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowStatusSelector(false)}
              className="mt-3 text-sm text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center gap-4">
              {statusConfig && (
                <>
                  <div className={`${statusConfig.bgColor} ${statusConfig.color} p-4 rounded-lg`}>
                    <span className="text-2xl">{statusConfig.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">סטטוס נוכחי</p>
                    <p className={`text-2xl font-bold ${statusConfig.color}`}>{statusConfig.label}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <span className="text-gray-600 text-sm block mb-1">תאריך פתיחה:</span>
              <p className="font-semibold text-gray-900">
                {new Date(caseData.createdAt).toLocaleDateString('he-IL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            {caseData.closedAt && (
              <div>
                <span className="text-gray-600 text-sm block mb-1">תאריך סגירה:</span>
                <p className="font-semibold text-gray-900">
                  {new Date(caseData.closedAt).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
