'use client';

import { Case } from '@/types';
import { getStatusConfig } from '@/utils/caseStatus';

interface GeneralDetailsProps {
  caseData: Case;
}

export default function GeneralDetails({ caseData }: GeneralDetailsProps) {
  const statusConfig = getStatusConfig(caseData.status);
  const arbitratorName = typeof caseData.arbitratorId === 'object' && caseData.arbitratorId
    ? caseData.arbitratorId.name
    : 'לא הוגדר';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">פרטים כלליים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-gray-600 text-sm block mb-1">כותרת התיק:</span>
            <p className="font-semibold text-gray-900 text-lg">{caseData.title}</p>
          </div>
          {caseData.caseNumber && (
            <div>
              <span className="text-gray-600 text-sm block mb-1">מספר תיק:</span>
              <p className="font-semibold text-gray-900">{caseData.caseNumber}</p>
            </div>
          )}
          {caseData.description && (
            <div className="md:col-span-2">
              <span className="text-gray-600 text-sm block mb-1">תיאור:</span>
              <p className="text-gray-900">{caseData.description}</p>
            </div>
          )}
          <div>
            <span className="text-gray-600 text-sm block mb-1">בורר:</span>
            <p className="font-semibold text-gray-900">{arbitratorName}</p>
          </div>
          <div>
            <span className="text-gray-600 text-sm block mb-1">סטטוס התיק:</span>
            {statusConfig && (
              <span className={`inline-flex items-center gap-2 ${statusConfig.bgColor} ${statusConfig.color} px-3 py-1 rounded-lg font-semibold text-sm`}>
                <span>{statusConfig.icon}</span>
                <span>{statusConfig.label}</span>
              </span>
            )}
          </div>
          {caseData.caseType && (
            <div>
              <span className="text-gray-600 text-sm block mb-1">סוג תיק:</span>
              <p className="font-semibold text-gray-900">{caseData.caseType}</p>
            </div>
          )}
          {caseData.claimAmount !== undefined && (
            <div>
              <span className="text-gray-600 text-sm block mb-1">סכום התביעה:</span>
              <p className="font-semibold text-gray-900">
                {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(caseData.claimAmount)}
              </p>
            </div>
          )}
          {caseData.confidentialityLevel && (
            <div>
              <span className="text-gray-600 text-sm block mb-1">רמת חסיון:</span>
              <p className="font-semibold text-gray-900">
                {caseData.confidentialityLevel === 'public' && 'פומבי'}
                {caseData.confidentialityLevel === 'confidential' && 'חסוי'}
                {caseData.confidentialityLevel === 'secret' && 'סודי'}
                {caseData.confidentialityLevel === 'top_secret' && 'סודי ביותר'}
              </p>
            </div>
          )}
          <div>
            <span className="text-gray-600 text-sm block mb-1">נפתח:</span>
            <p className="font-semibold text-gray-900">
              {new Date(caseData.createdAt).toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <span className="text-gray-600 text-sm block mb-1">עודכן לאחרונה:</span>
            <p className="font-semibold text-gray-900">
              {new Date(caseData.updatedAt).toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

