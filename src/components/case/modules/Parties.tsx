'use client';

import { Case, User, CaseParty, CaseLawyer } from '@/types';

interface PartiesProps {
  caseData: Case;
}

export default function Parties({ caseData }: PartiesProps) {
  // Use new caseParties structure if available, fallback to legacy parties
  const caseParties = Array.isArray(caseData.caseParties) ? caseData.caseParties : [];
  const caseLawyers = Array.isArray(caseData.caseLawyers) ? caseData.caseLawyers : [];
  
  // Legacy support
  const legacyParties = Array.isArray(caseData.parties) ? caseData.parties : [];
  const legacyPartiesList = legacyParties.map(p => typeof p === 'object' ? p : null).filter(Boolean) as User[];

  // Group lawyers by party
  const lawyersByParty: Record<string, CaseLawyer[]> = {};
  caseLawyers.forEach((lawyer: CaseLawyer) => {
    const partyId = lawyer.partyId;
    if (!lawyersByParty[partyId]) {
      lawyersByParty[partyId] = [];
    }
    lawyersByParty[partyId].push(lawyer);
  });

  const hasParties = caseParties.length > 0 || legacyPartiesList.length > 0;

  return (
    <div className="space-y-6">
      {/* Parties Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">פרטי הצדדים והלקוח</h2>
        </div>

        {!hasParties ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין צדדים בתיק</h3>
            <p className="text-gray-600">ניתן להוסיף צדדים דרך הגדרות התיק</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* New structure: caseParties */}
            {caseParties.map((party: CaseParty, index: number) => (
              <div key={party._id || index} className="p-5 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {party.isCompany ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-900 text-lg">
                            {party.companyId && typeof party.companyId === 'object' && (party.companyId as any).companyName
                              ? (party.companyId as any).companyName
                              : 'חברה'}
                          </p>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-semibold">
                            חברה
                          </span>
                        </div>
                        {party.companyId && typeof party.companyId === 'object' && (party.companyId as any).companyNumber && (
                          <p className="text-sm text-gray-600">מספר חברה: {(party.companyId as any).companyNumber}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-900 text-lg">
                          {party.firstName && party.lastName 
                            ? `${party.firstName} ${party.lastName}`
                            : party.email || 'אדם פרטי'}
                        </p>
                        <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                          {party.status || 'צד לתיק'}
                        </span>
                      </>
                    )}
                    {party.address && (
                      <p className="text-sm text-gray-600 mt-1">כתובת: {party.address}</p>
                    )}
                    {party.phone && (
                      <p className="text-sm text-gray-600">טלפון: {party.phone}</p>
                    )}
                    {party.email && (
                      <p className="text-sm text-gray-600">דוא&quot;ל: {party.email}</p>
                    )}
                  </div>
                </div>
                
                {/* Lawyers for this party */}
                {lawyersByParty[party._id] && lawyersByParty[party._id].length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">עורכי דין/מייצגים:</h4>
                    <div className="space-y-2">
                      {lawyersByParty[party._id].map((lawyer: CaseLawyer, lawyerIndex: number) => (
                        <div key={lawyer._id || lawyerIndex} className="pl-4 border-l-2 border-gray-300">
                          <p className="font-medium text-gray-900">
                            {lawyer.firstName} {lawyer.lastName}
                          </p>
                          <p className="text-xs text-gray-600">{lawyer.profession || 'עורך דין'}</p>
                          {lawyer.email && (
                            <p className="text-xs text-gray-500">דוא&quot;ל: {lawyer.email}</p>
                          )}
                          {lawyer.phone && (
                            <p className="text-xs text-gray-500">טלפון: {lawyer.phone}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Legacy parties (fallback) */}
            {caseParties.length === 0 && legacyPartiesList.map((party, index) => (
              <div key={party.id || index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{party.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{party.email}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
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

