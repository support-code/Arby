'use client';

import { Case, User } from '@/types';

interface ArbitratorProps {
  caseData: Case;
}

export default function Arbitrator({ caseData }: ArbitratorProps) {
  const arbitrator = typeof caseData.arbitratorId === 'object' ? caseData.arbitratorId : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-900 border-b pb-2">פרטי הבורר / הרכב</h2>

        {arbitrator ? (
          <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-xl mb-1">{arbitrator.name}</p>
                <p className="text-gray-600 mb-3">{arbitrator.email}</p>
                <span className="inline-block px-3 py-1 bg-orange-600 text-white text-sm rounded-lg font-semibold">
                  בורר ראשי
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">בורר לא הוגדר</h3>
            <p className="text-gray-600">יש להגדיר בורר לתיק</p>
          </div>
        )}
      </div>
    </div>
  );
}

