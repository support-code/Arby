'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { UserRole } from '@/types';
import { usersAPI, invitationsAPI, casesAPI } from '@/lib/api';
import { User, Invitation, Case } from '@/types';

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'arbitrator' });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, invitationsData, casesData] = await Promise.all([
        usersAPI.getAll(),
        invitationsAPI.getAll(),
        casesAPI.getAll()
      ]);
      setUsers(usersData);
      setInvitations(invitationsData);
      setCases(casesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await usersAPI.create(newUser);
      setCreatedPassword(result.password);
      setNewUser({ email: '', name: '', role: 'arbitrator' });
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'שגיאה ביצירת משתמש');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש "${userName}"?\nפעולה זו לא ניתנת לביטול!`)) {
      return;
    }

    try {
      await usersAPI.delete(userId);
      await loadData();
      alert('משתמש נמחק בהצלחה');
    } catch (error: any) {
      alert(error.response?.data?.error || 'שגיאה במחיקת משתמש');
    }
  };

  if (loading) {
    return (
      <Layout allowedRoles={[UserRole.ADMIN]}>
        <div className="text-center">טוען...</div>
      </Layout>
    );
  }

  return (
    <Layout allowedRoles={[UserRole.ADMIN]}>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">לוח בקרה - מנהל מערכת</h1>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-orange-600">{users.length}</h2>
            <p className="text-gray-600">משתמשים</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-green-600">{cases.length}</h2>
            <p className="text-gray-600">תיקים</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-orange-600">{invitations.filter(i => i.status === 'pending').length}</h2>
            <p className="text-gray-600">הזמנות ממתינות</p>
          </div>
        </div>

        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">לוח בקרה - מנהל מערכת</h1>
          <button
            onClick={() => setShowCreateUser(true)}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
          >
            + צור משתמש חדש
          </button>
        </div>

        {/* Create User Modal */}
        {showCreateUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-6">צור משתמש חדש</h2>
              
              {createdPassword && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-semibold text-green-800 mb-2">משתמש נוצר בהצלחה!</p>
                  <p className="text-sm text-green-700">סיסמה: <strong>{createdPassword}</strong></p>
                  <p className="text-xs text-green-600 mt-2">הסיסמה נשמרה גם בלוג של השרת</p>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תפקיד</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="arbitrator">בורר</option>
                    <option value="lawyer">עורך דין</option>
                    <option value="party">צד</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
                  >
                    צור משתמש
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUser(false);
                      setCreatedPassword(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">משתמשים</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">שם</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">אימייל</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תפקיד</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' :
                        user.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="text-red-600 hover:text-red-800 font-medium"
                        title="מחק משתמש"
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">תיקים</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">כותרת</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">בורר</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">תאריך יצירה</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cases.map((caseItem) => (
                  <tr key={caseItem._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <a href={`/cases/${caseItem._id}`} className="text-orange-600 hover:underline">
                        {caseItem.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {caseItem.arbitratorId && typeof caseItem.arbitratorId === 'object' && caseItem.arbitratorId !== null 
                        ? caseItem.arbitratorId.name 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{caseItem.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(caseItem.createdAt).toLocaleDateString('he-IL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

