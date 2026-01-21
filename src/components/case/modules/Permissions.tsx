'use client';

import { Case, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';

interface PermissionsProps {
  caseData: Case;
}

export default function Permissions({ caseData }: PermissionsProps) {
  const { hasRole } = useAuthStore();
  const canManage = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
  const lawyers = Array.isArray(caseData.lawyers) ? caseData.lawyers : [];

  if (!canManage) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הרשאה</h3>
          <p className="text-gray-600">ניהול הרשאות זמין לבורר בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-900">הרשאות</h2>

        <div className="space-y-6">
          {/* Parties Permissions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              הרשאות צדדים ({parties.length})
            </h3>
            {parties.length === 0 ? (
              <p className="text-gray-600 text-sm">אין צדדים בתיק</p>
            ) : (
              <div className="space-y-3">
                {parties.map((party: any, index) => {
                  const partyName = typeof party === 'object' ? party.name : party;
                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">{partyName}</span>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>צפייה במסמכים</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>העלאת מסמכים</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lawyers Permissions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              הרשאות עורכי דין ({lawyers.length})
            </h3>
            {lawyers.length === 0 ? (
              <p className="text-gray-600 text-sm">אין עורכי דין בתיק</p>
            ) : (
              <div className="space-y-3">
                {lawyers.map((lawyer: any, index) => {
                  const lawyerName = typeof lawyer === 'object' ? lawyer.name : lawyer;
                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">{lawyerName}</span>
                        <div className="flex gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>צפייה בכל המסמכים</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>העלאת מסמכים</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span>יצירת בקשות</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Global Permissions */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">הרשאות כלליות</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>אפשר לצדדים לראות מסמכים של צדדים אחרים</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>אפשר לעורכי דין לראות הערות פנימיות</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span>הגבל גישה למסמכים סודיים</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

