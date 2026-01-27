'use client';

import { useEffect, useState } from 'react';
import { auditAPI, documentsAPI, hearingsAPI, discussionSessionsAPI } from '@/lib/api';
import { Document, Hearing, DiscussionSession } from '@/types';

interface TimelineEvent {
  date: string;
  action: string;
  user: string;
  details?: string;
}

interface TimelineProps {
  caseId: string;
}

export default function Timeline({ caseId }: TimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [caseId]);

  const formatDetails = (details: any): string => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      // Format object details nicely
      const entries = Object.entries(details);
      return entries.map(([key, value]) => {
        if (key === 'title' || key === 'name' || key === 'originalName') return String(value);
        if (key === 'status') return `סטטוס: ${String(value)}`;
        if (key === 'type') return `סוג: ${String(value)}`;
        return `${key}: ${String(value)}`;
      }).join(', ');
    }
    return String(details);
  };

  const loadTimeline = async () => {
    try {
      const [docsRes, logsRes, hearingsRes] = await Promise.all([
        documentsAPI.getByCase(caseId).catch(() => []),
        auditAPI.getCaseLogs(caseId).catch(() => []),
        hearingsAPI.getByCase(caseId).catch(() => [])
      ]);

      const timelineEvents: TimelineEvent[] = [];

      // Add hearings
      hearingsRes.forEach((hearing: Hearing) => {
        const createdBy = typeof hearing.createdBy === 'object' ? hearing.createdBy.name : 'משתמש';
        timelineEvents.push({
          date: hearing.createdAt,
          action: 'נוצר דיון',
          user: createdBy,
          details: `תאריך: ${new Date(hearing.scheduledDate).toLocaleDateString('he-IL')}, מיקום: ${hearing.location || 'לא צוין'}`
        });
      });

      // Load discussion sessions for each hearing
      for (const hearing of hearingsRes) {
        try {
          const sessions = await discussionSessionsAPI.getByHearing(hearing._id);
          sessions.forEach((session: DiscussionSession) => {
            const createdBy = typeof session.createdBy === 'object' ? session.createdBy.name : 'משתמש';
            timelineEvents.push({
              date: session.startedAt,
              action: 'התחיל דיון',
              user: createdBy,
              details: session.title
            });
            if (session.endedAt) {
              timelineEvents.push({
                date: session.endedAt,
                action: 'הסתיים דיון',
                user: createdBy,
                details: session.title
              });
            }
          });
        } catch (error: any) {
          console.error('Failed to load discussion sessions:', error);
        }
      }

      // Add document uploads
      docsRes.forEach((doc: Document) => {
        const uploadedBy = typeof doc.uploadedBy === 'object' && doc.uploadedBy
          ? doc.uploadedBy.name
          : 'משתמש';
        timelineEvents.push({
          date: doc.createdAt,
          action: 'הועלה מסמך',
          user: uploadedBy,
          details: doc.originalName
        });
      });

      // Add audit log events (but skip duplicates that are already in timeline)
      const existingActions = new Set(timelineEvents.map(e => `${e.action}-${e.date}`));
      logsRes.forEach((log: any) => {
        const logUser = typeof log.userId === 'object' && log.userId
          ? log.userId.name
          : 'משתמש';

        let action = '';
        switch (log.action) {
          case 'case_created':
            action = 'התיק נוצר';
            break;
          case 'case_updated':
            action = 'התיק עודכן';
            break;
          case 'document_uploaded':
            // Skip - already added from documents
            return;
          case 'hearing_created':
            // Skip - already added from hearings
            return;
          case 'lawyer_added_to_case':
            action = 'נוסף עורך דין';
            break;
          case 'party_added_to_case':
            action = 'נוסף צד';
            break;
          case 'decision_created':
            action = 'נוצרה החלטה';
            break;
          case 'request_created':
            action = 'נוצרה בקשה';
            break;
          case 'task_created':
            action = 'נוצרה משימה';
            break;
          case 'protocol_created':
            action = 'נוצר פרוטוקול';
            break;
          case 'discussion_session_started':
            // Skip - already added from discussion sessions
            return;
          case 'discussion_session_ended':
            // Skip - already added from discussion sessions
            return;
          default:
            action = log.action.replace(/_/g, ' ');
        }

        const eventKey = `${action}-${log.createdAt}`;
        if (!existingActions.has(eventKey)) {
          timelineEvents.push({
            date: log.createdAt,
            action,
            user: logUser,
            details: formatDetails(log.details)
          });
        }
      });

      // Sort by date (newest first)
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(timelineEvents);
    } catch (error: any) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
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
        <h2 className="text-xl font-bold text-gray-900 mb-6 border-b border-gray-200 pb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ציר פעולות בתיק
        </h2>

        {timeline.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין פעולות בתיק</h3>
            <p className="text-gray-600">פעולות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timeline.map((event, index) => (
              <div key={index} className="flex gap-4 relative">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow"></div>
                  {index < timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">{event.action}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{event.user}</span>
                  </div>
                  {event.details && (
                    <p className="text-sm text-gray-600">{event.details}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(event.date).toLocaleDateString('he-IL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

