'use client';

import { Case, User } from '@/types';

interface PartiesProps {
  caseData: Case;
}

export default function Parties({ caseData }: PartiesProps) {
  const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
  const partiesList = parties.map(p => typeof p === 'object' ? p : null).filter(Boolean) as User[];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">פרטי הצדדים</h2>
        </div>

        {partiesList.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין צדדים בתיק</h3>
            <p className="text-gray-600">ניתן להוסיף צדדים דרך הגדרות התיק</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partiesList.map((party, index) => (
              <div key={party.id || index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{party.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{party.email}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      צד לתיק
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

