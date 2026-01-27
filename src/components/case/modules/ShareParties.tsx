'use client';

import { useState } from 'react';
import { Case, UserRole, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { invitationsAPI, casesAPI } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface SharePartiesProps {
  caseData: Case;
}

export default function ShareParties({ caseData }: SharePartiesProps) {
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();
  const canManage = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: UserRole.PARTY as UserRole
  });
  const [inviting, setInviting] = useState(false);

  const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
  const lawyers = Array.isArray(caseData.lawyers) ? caseData.lawyers : [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email) return;

    setInviting(true);
    try {
      await invitationsAPI.create({
        email: inviteData.email,
        role: inviteData.role,
        caseId: caseData._id
      });
      showToast(`הזמנה נשלחה ל-${inviteData.email}`, 'success');
      setInviteData({ email: '', role: UserRole.PARTY });
      setShowInviteForm(false);
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      showToast(error?.response?.data?.error || 'שגיאה בשליחת הזמנה', 'error');
    } finally {
      setInviting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הרשאה</h3>
          <p className="text-gray-600">ניהול שיתוף זמין לבורר בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">שיתוף צדדים</h2>
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            הזמן משתמש חדש
          </button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <form onSubmit={handleInvite} className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                כתובת אימייל
              </label>
              <input
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="email@example.com"
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                תפקיד
              </label>
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as UserRole })}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value={UserRole.PARTY}>צד</option>
                <option value={UserRole.LAWYER}>עורך דין</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50"
              >
                {inviting ? 'שולח...' : 'שלח הזמנה'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Current Parties */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              צדדים בתיק ({parties.length})
            </h3>
            {parties.length === 0 ? (
              <p className="text-gray-600 text-sm">אין צדדים בתיק</p>
            ) : (
              <div className="space-y-2">
                {parties.map((party: any, index) => {
                  const partyName = typeof party === 'object' ? party.name : 'צד';
                  const partyEmail = typeof party === 'object' ? party.email : '';
                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{partyName}</p>
                        {partyEmail && <p className="text-sm text-gray-600">{partyEmail}</p>}
                      </div>
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">צד</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              עורכי דין בתיק ({lawyers.length})
            </h3>
            {lawyers.length === 0 ? (
              <p className="text-gray-600 text-sm">אין עורכי דין בתיק</p>
            ) : (
              <div className="space-y-2">
                {lawyers.map((lawyer: any, index) => {
                  const lawyerName = typeof lawyer === 'object' ? lawyer.name : 'עורך דין';
                  const lawyerEmail = typeof lawyer === 'object' ? lawyer.email : '';
                  return (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-900">{lawyerName}</p>
                        {lawyerEmail && <p className="text-sm text-gray-600">{lawyerEmail}</p>}
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">עורך דין</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
