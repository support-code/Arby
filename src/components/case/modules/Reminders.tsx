'use client';

import { useEffect, useState } from 'react';
import { remindersAPI, casesAPI } from '@/lib/api';
import { Reminder, Case, User, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface RemindersProps {
  caseId: string;
  caseData: Case;
}

export default function Reminders({ caseId, caseData }: RemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    assignedTo: ''
  });
  const [caseUsers, setCaseUsers] = useState<User[]>([]);
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();
  const canCreate = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  useEffect(() => {
    loadReminders();
    loadCaseUsers();
  }, [caseId]);

  const loadReminders = async () => {
    try {
      const data = await remindersAPI.getByCase(caseId);
      setReminders(data);
    } catch (error: any) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseUsers = () => {
    const users: User[] = [];
    
    // Add arbitrator
    if (caseData.arbitratorId) {
      if (typeof caseData.arbitratorId === 'object') {
        const arbitrator = caseData.arbitratorId as any;
        users.push({
          id: arbitrator._id || arbitrator.id,
          name: arbitrator.name || 'בורר',
          email: arbitrator.email || '',
          role: arbitrator.role || UserRole.ARBITRATOR
        });
      } else {
        users.push({ 
          id: caseData.arbitratorId, 
          name: 'בורר', 
          email: '', 
          role: UserRole.ARBITRATOR 
        });
      }
    }
    
    // Add lawyers
    if (Array.isArray(caseData.lawyers)) {
      caseData.lawyers.forEach(lawyer => {
        if (typeof lawyer === 'object') {
          const lawyerObj = lawyer as any;
          users.push({
            id: lawyerObj._id || lawyerObj.id,
            name: lawyerObj.name || 'עורך דין',
            email: lawyerObj.email || '',
            role: lawyerObj.role || UserRole.LAWYER
          });
        } else {
          users.push({ 
            id: lawyer, 
            name: 'עורך דין', 
            email: '', 
            role: UserRole.LAWYER 
          });
        }
      });
    }
    
    // Add parties
    if (Array.isArray(caseData.parties)) {
      caseData.parties.forEach(party => {
        if (typeof party === 'object') {
          const partyObj = party as any;
          users.push({
            id: partyObj._id || partyObj.id,
            name: partyObj.name || 'צד',
            email: partyObj.email || '',
            role: partyObj.role || UserRole.PARTY
          });
        } else {
          users.push({ 
            id: party, 
            name: 'צד', 
            email: '', 
            role: UserRole.PARTY 
          });
        }
      });
    }
    
    setCaseUsers(users);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate || !formData.assignedTo) return;

    try {
      await remindersAPI.create({
        caseId,
        title: formData.title,
        dueDate: new Date(formData.dueDate).toISOString(),
        assignedTo: formData.assignedTo
      });
      showToast('תזכורת נוצרה בהצלחה', 'success');
      await loadReminders();
      setShowForm(false);
      setFormData({ title: '', dueDate: '', assignedTo: '' });
    } catch (error: any) {
      console.error('Failed to create reminder:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת תזכורת', 'error');
    }
  };

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      await remindersAPI.update(reminder._id, { isCompleted: !reminder.isCompleted });
      showToast(reminder.isCompleted ? 'תזכורת בוטלה' : 'תזכורת הושלמה', 'success');
      await loadReminders();
    } catch (error: any) {
      console.error('Failed to update reminder:', error);
      showToast(error?.response?.data?.error || 'שגיאה בעדכון תזכורת', 'error');
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תזכורת זו?')) return;

    try {
      await remindersAPI.delete(reminderId);
      showToast('תזכורת נמחקה בהצלחה', 'success');
      await loadReminders();
    } catch (error: any) {
      console.error('Failed to delete reminder:', error);
      showToast(error?.response?.data?.error || 'שגיאה במחיקת תזכורת', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  const upcomingReminders = reminders.filter(r => !r.isCompleted && new Date(r.dueDate) >= new Date());
  const overdueReminders = reminders.filter(r => !r.isCompleted && new Date(r.dueDate) < new Date());
  const completedReminders = reminders.filter(r => r.isCompleted);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">תזכורות</h2>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              תזכורת חדשה
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && canCreate && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="כותרת התזכורת"
              className="w-full p-3 border border-gray-300 rounded-lg mb-3"
              required
            />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              >
                <option value="">בחר משתמש</option>
                {caseUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
              >
                צור תזכורת
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

        {reminders.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין תזכורות</h3>
            <p className="text-gray-600">תזכורות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue */}
            {overdueReminders.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  תזכורות שפגו ({overdueReminders.length})
                </h3>
                <div className="space-y-2">
                  {overdueReminders.map((reminder) => {
                    const assignedTo = typeof reminder.assignedTo === 'object' ? reminder.assignedTo.name : 'משתמש';
                    return (
                      <div key={reminder._id} className="p-4 border border-red-300 rounded-lg bg-red-50 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{reminder.title}</p>
                          <p className="text-sm text-red-600 mt-1">
                            {new Date(reminder.dueDate).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">מוקצה ל: {assignedTo}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleComplete(reminder)}
                            className="text-green-600 hover:text-green-700"
                            title="סמן כהושלם"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          {canCreate && (
                            <button
                              onClick={() => handleDelete(reminder._id)}
                              className="text-red-600 hover:text-red-700"
                              title="מחק"
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
              </div>
            )}

            {/* Upcoming */}
            {upcomingReminders.length > 0 && (
              <div>
                <h3 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                  <span>📅</span>
                  תזכורות קרובות ({upcomingReminders.length})
                </h3>
                <div className="space-y-2">
                  {upcomingReminders.map((reminder) => {
                    const assignedTo = typeof reminder.assignedTo === 'object' ? reminder.assignedTo.name : 'משתמש';
                    return (
                      <div key={reminder._id} className="p-4 border border-blue-200 rounded-lg bg-blue-50 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{reminder.title}</p>
                          <p className="text-sm text-blue-600 mt-1">
                            {new Date(reminder.dueDate).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">מוקצה ל: {assignedTo}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleComplete(reminder)}
                            className="text-green-600 hover:text-green-700"
                            title="סמן כהושלם"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          {canCreate && (
                            <button
                              onClick={() => handleDelete(reminder._id)}
                              className="text-red-600 hover:text-red-700"
                              title="מחק"
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
              </div>
            )}

            {/* Completed */}
            {completedReminders.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-600 mb-3 flex items-center gap-2">
                  <span>✅</span>
                  הושלמו ({completedReminders.length})
                </h3>
                <div className="space-y-2">
                  {completedReminders.map((reminder) => {
                    const assignedTo = typeof reminder.assignedTo === 'object' ? reminder.assignedTo.name : 'משתמש';
                    return (
                      <div key={reminder._id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 opacity-60 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 line-through">{reminder.title}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(reminder.dueDate).toLocaleDateString('he-IL')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">מוקצה ל: {assignedTo}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleComplete(reminder)}
                            className="text-gray-600 hover:text-gray-700"
                            title="בטל השלמה"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                          {canCreate && (
                            <button
                              onClick={() => handleDelete(reminder._id)}
                              className="text-red-600 hover:text-red-700"
                              title="מחק"
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
