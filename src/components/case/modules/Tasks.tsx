'use client';

import { useEffect, useState } from 'react';
import { tasksAPI } from '@/lib/api';
import { Task, UserRole, TaskStatus, TaskPriority, Case, User } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface TasksProps {
  caseId: string;
  caseData: Case;
}

export default function Tasks({ caseId, caseData }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: TaskPriority.MEDIUM
  });
  const { hasRole, user } = useAuthStore();
  const { showToast } = useToastStore();

  // Get all users from case (parties, lawyers, arbitrator)
  const getAllCaseUsers = (): User[] => {
    const users: User[] = [];
    
    if (caseData.arbitratorIds && Array.isArray(caseData.arbitratorIds)) {
      caseData.arbitratorIds.forEach(arbitrator => {
        if (typeof arbitrator === 'object' && arbitrator !== null) {
          const arb = arbitrator as any;
          users.push({
            id: arb.id || arb._id,
            email: arb.email,
            name: arb.name,
            role: arb.role
          });
        }
      });
    }
    
    const lawyers = Array.isArray(caseData.lawyers) ? caseData.lawyers : [];
    lawyers.forEach(lawyer => {
      if (typeof lawyer === 'object' && lawyer) {
        const l = lawyer as any;
        users.push({
          id: l.id || l._id,
          email: l.email,
          name: l.name,
          role: l.role
        });
      }
    });
    
    const parties = Array.isArray(caseData.parties) ? caseData.parties : [];
    parties.forEach(party => {
      if (typeof party === 'object' && party) {
        const p = party as any;
        users.push({
          id: p.id || p._id,
          email: p.email,
          name: p.name,
          role: p.role
        });
      }
    });
    
    return users;
  };

  useEffect(() => {
    loadTasks();
  }, [caseId]);

  const loadTasks = async () => {
    try {
      const data = await tasksAPI.getByCase(caseId);
      setTasks(data);
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await tasksAPI.create({
        caseId,
        title: formData.title,
        description: formData.description || undefined,
        assignedTo: formData.assignedTo,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        priority: formData.priority,
        status: TaskStatus.PENDING
      });
      
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        priority: TaskPriority.MEDIUM
      });
      setShowForm(false);
      showToast('משימה נוצרה בהצלחה', 'success');
      await loadTasks();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת משימה', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      showToast('סטטוס המשימה עודכן בהצלחה', 'success');
      await loadTasks();
    } catch (error: any) {
      console.error('Failed to update task:', error);
      showToast(error?.response?.data?.error || 'שגיאה בעדכון המשימה', 'error');
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-red-100 text-red-700 border-red-300';
      case TaskPriority.HIGH:
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case TaskPriority.MEDIUM:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case TaskPriority.LOW:
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'דחוף';
      case TaskPriority.HIGH:
        return 'גבוה';
      case TaskPriority.MEDIUM:
        return 'בינוני';
      case TaskPriority.LOW:
        return 'נמוך';
      default:
        return priority;
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending') return task.status !== TaskStatus.COMPLETED;
    if (filter === 'completed') return task.status === TaskStatus.COMPLETED;
    return true;
  });

  const isAssignedToMe = (task: Task) => {
    if (!user) return false;
    const assignedTo = typeof task.assignedTo === 'object' 
      ? (task.assignedTo.id || (task.assignedTo as any)._id) 
      : task.assignedTo;
    const userId = user.id || (user as any)._id;
    return assignedTo === userId;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">משימות</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-semibold flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            משימה חדשה
          </button>
        </div>

        {/* Create Task Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h3 className="font-semibold text-gray-900 mb-4">יצירת משימה חדשה</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">כותרת המשימה *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="כותרת המשימה"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="תיאור המשימה..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">הקצה ל</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">בחר משתמש</option>
                  {getAllCaseUsers().map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'arbitrator' ? 'בורר' : u.role === 'lawyer' ? 'עורך דין' : 'צד'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך יעד</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">עדיפות</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value={TaskPriority.LOW}>נמוך</option>
                  <option value={TaskPriority.MEDIUM}>בינוני</option>
                  <option value={TaskPriority.HIGH}>גבוה</option>
                  <option value={TaskPriority.URGENT}>דחוף</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : 'צור משימה'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    title: '',
                    description: '',
                    assignedTo: '',
                    dueDate: '',
                    priority: TaskPriority.MEDIUM
                  });
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-semibold transition-colors ${
              filter === 'all'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            הכל ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-semibold transition-colors ${
              filter === 'pending'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ממתין ({tasks.filter(t => t.status !== TaskStatus.COMPLETED).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 font-semibold transition-colors ${
              filter === 'completed'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            הושלם ({tasks.filter(t => t.status === TaskStatus.COMPLETED).length})
          </button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין משימות</h3>
            <p className="text-gray-600">משימות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const assignedTo = typeof task.assignedTo === 'object' ? task.assignedTo.name : 'לא הוגדר';
              const createdBy = typeof task.createdBy === 'object' ? task.createdBy.name : 'משתמש';
              const isMine = isAssignedToMe(task);

              return (
                <div
                  key={task._id}
                  className={`p-4 border rounded-lg transition-all ${
                    isMine
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={task.status === TaskStatus.COMPLETED}
                          onChange={(e) =>
                            handleStatusChange(
                              task._id,
                              e.target.checked ? TaskStatus.COMPLETED : TaskStatus.PENDING
                            )
                          }
                          className="w-5 h-5 rounded text-orange-600"
                        />
                        <h3 className={`font-semibold ${task.status === TaskStatus.COMPLETED ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        {isMine && (
                          <span className="px-2 py-1 text-xs rounded bg-orange-200 text-orange-800">
                            שלי
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>מוקצה ל: {assignedTo}</span>
                        {task.dueDate && (
                          <>
                            <span>•</span>
                            <span className={new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED ? 'text-red-600 font-semibold' : ''}>
                              תאריך יעד: {new Date(task.dueDate).toLocaleDateString('he-IL')}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>נוצר על ידי: {createdBy}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

