'use client';

import { Case, User, CaseLawyer } from '@/types';

interface LawyersProps {
  caseData: Case;
}

export default function Lawyers({ caseData }: LawyersProps) {
  // Get lawyers from legacy structure
  const lawyers = Array.isArray(caseData.lawyers) ? caseData.lawyers : [];
  const lawyersList = lawyers.map(l => typeof l === 'object' ? l : null).filter(Boolean) as User[];
  
  // Get lawyers from new caseLawyers structure
  const caseLawyers = Array.isArray(caseData.caseLawyers) ? caseData.caseLawyers : [];
  const caseLawyersList = caseLawyers.map(l => typeof l === 'object' ? l : null).filter(Boolean) as CaseLawyer[];
  
  // Combine both lists, avoiding duplicates
  const allLawyers: Array<{ id: string; name: string; email: string; profession?: string; phone?: string; address?: string }> = [];
  
  // Add legacy lawyers
  lawyersList.forEach(lawyer => {
    if (!allLawyers.find(l => l.email === lawyer.email)) {
      allLawyers.push({
        id: lawyer.id,
        name: lawyer.name,
        email: lawyer.email,
        profession: lawyer.profession
      });
    }
  });
  
  // Add caseLawyers
  caseLawyersList.forEach(lawyer => {
    const lawyerName = `${lawyer.firstName} ${lawyer.lastName}`.trim();
    if (!allLawyers.find(l => l.email === lawyer.email)) {
      allLawyers.push({
        id: lawyer._id,
        name: lawyerName || lawyer.email,
        email: lawyer.email,
        profession: lawyer.profession || 'עורך דין',
        phone: lawyer.phone,
        address: lawyer.address
      });
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">פרטי עורכי דין</h2>
        </div>

        {allLawyers.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין עורכי דין בתיק</h3>
            <p className="text-gray-600">ניתן להוסיף עורכי דין דרך הגדרות התיק</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allLawyers.map((lawyer, index) => (
              <div key={lawyer.id || index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{lawyer.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{lawyer.email}</p>
                    {lawyer.phone && (
                      <p className="text-sm text-gray-600">טלפון: {lawyer.phone}</p>
                    )}
                    {lawyer.address && (
                      <p className="text-sm text-gray-600">כתובת: {lawyer.address}</p>
                    )}
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      {lawyer.profession || 'עורך דין'}
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

