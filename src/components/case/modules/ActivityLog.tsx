'use client';

import { useEffect, useState } from 'react';
import { auditAPI } from '@/lib/api';

interface ActivityLogProps {
  caseId: string;
}

interface ActivityLogEntry {
  _id: string;
  action: string;
  userId: any;
  details?: any;
  createdAt: string;
}

export default function ActivityLog({ caseId }: ActivityLogProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, [caseId]);

  const loadLogs = async () => {
    try {
      const data = await auditAPI.getCaseLogs(caseId);
      setLogs(data);
    } catch (error: any) {
      console.error('Failed to load activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      case_created: 'התיק נוצר',
      case_updated: 'התיק עודכן',
      document_uploaded: 'הועלה מסמך',
      document_deleted: 'נמחק מסמך',
      lawyer_added_to_case: 'נוסף עורך דין',
      party_added_to_case: 'נוסף צד',
      decision_created: 'נוצרה החלטה',
      decision_updated: 'עודכנה החלטה',
      request_created: 'נוצרה בקשה',
      request_responded: 'נענתה בקשה',
      task_created: 'נוצרה משימה',
      task_updated: 'עודכנה משימה',
      hearing_created: 'נוצר דיון',
      hearing_updated: 'עודכן דיון',
      comment_created: 'נוספה תגובה',
      appeal_created: 'נוצר ערעור'
    };
    return actionMap[action] || action;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('created')) return '➕';
    if (action.includes('updated')) return '✏️';
    if (action.includes('deleted')) return '🗑️';
    if (action.includes('uploaded')) return '📤';
    if (action.includes('responded')) return '💬';
    return '📝';
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.action.includes(filter));

  const uniqueActions = Array.from(new Set(logs.map(log => {
    const baseAction = log.action.split('_')[0];
    return baseAction;
  })));

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
          <h2 className="text-xl font-bold text-gray-900">היסטוריית פעילות</h2>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">כל הפעולות</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין פעילות</h3>
            <p className="text-gray-600">פעילות בתיק תופיע כאן</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const user = typeof log.userId === 'object' ? log.userId.name : 'משתמש';
              const actionLabel = getActionLabel(log.action);
              const actionIcon = getActionIcon(log.action);

              return (
                <div
                  key={log._id}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                    {actionIcon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{actionLabel}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{user}</span>
                    </div>
                    {log.details && typeof log.details === 'object' && (
                      <div className="text-sm text-gray-600 mt-1">
                        {Object.entries(log.details).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            <span className="font-semibold">{key}:</span> {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.createdAt).toLocaleDateString('he-IL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
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

