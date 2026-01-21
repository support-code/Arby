'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hearingsAPI, discussionSessionsAPI } from '@/lib/api';
import { Hearing, UserRole, HearingType, HearingStatus, DiscussionSession, Attendee, AttendeeType } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface HearingsProps {
  caseId: string;
}

export default function Hearings({ caseId }: HearingsProps) {
  const router = useRouter();
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [discussionSessions, setDiscussionSessions] = useState<Record<string, DiscussionSession[]>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    duration: '',
    location: '',
    type: HearingType.MAIN,
    notes: '',
    participants: [] as string[]
  });
  const { hasRole, user } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadHearings();
  }, [caseId]);

  const loadHearings = async () => {
    try {
      const data = await hearingsAPI.getByCase(caseId);
      setHearings(data);
      
      // Load discussion sessions for each hearing
      const sessionsMap: Record<string, DiscussionSession[]> = {};
      for (const hearing of data) {
        try {
          const sessions = await discussionSessionsAPI.getByHearing(hearing._id);
          sessionsMap[hearing._id] = sessions;
        } catch (error: any) {
          console.error(`Failed to load sessions for hearing ${hearing._id}:`, error);
          sessionsMap[hearing._id] = [];
        }
      }
      setDiscussionSessions(sessionsMap);
    } catch (error: any) {
      console.error('Failed to load hearings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDiscussion = async (hearingId: string) => {
    setStartingSession(hearingId);
    try {
      const hearing = hearings.find(h => h._id === hearingId);
      if (!hearing) return;

      // Convert hearing participants to attendees format
      const initialAttendees: Attendee[] = hearing.participants.map((p: any) => {
        const userId = typeof p === 'string' ? p : p._id;
        const name = typeof p === 'object' && p.name ? p.name : 'משתמש';
        return {
          type: AttendeeType.OTHER,
          name: name,
          userId: userId
        };
      });

      const session = await discussionSessionsAPI.create({
        hearingId,
        caseId,
        title: `דיון - ${new Date(hearing.scheduledDate).toLocaleDateString('he-IL')}`,
        startedAt: new Date().toISOString(),
        attendees: initialAttendees,
        status: 'active'
      });

      // Update hearing status to active
      await hearingsAPI.update(hearingId, { status: HearingStatus.ACTIVE });

      // Navigate to discussion session page
      router.push(`/cases/${caseId}/discussions/${session._id}`);
    } catch (error: any) {
      console.error('Failed to start discussion:', error);
      showToast(error?.response?.data?.error || 'שגיאה בהתחלת דיון', 'error');
    } finally {
      setStartingSession(null);
    }
  };

  const canCreate = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      await hearingsAPI.create({
        caseId,
        scheduledDate: scheduledDateTime.toISOString(),
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        location: formData.location || undefined,
        type: formData.type,
        notes: formData.notes || undefined,
        participants: formData.participants,
        status: HearingStatus.CREATED
      });
      
      setFormData({
        scheduledDate: '',
        scheduledTime: '',
        duration: '',
        location: '',
        type: HearingType.MAIN,
        notes: '',
        participants: []
      });
      setShowForm(false);
      showToast('דיון נוצר בהצלחה', 'success');
      await loadHearings();
    } catch (error: any) {
      console.error('Failed to create hearing:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת דיון', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeLabel = (type: HearingType) => {
    switch (type) {
      case HearingType.PRELIMINARY:
        return 'דיון מקדמי';
      case HearingType.MAIN:
        return 'דיון עיקרי';
      case HearingType.CLOSING:
        return 'דיון סיכום';
      default:
        return 'אחר';
    }
  };

  const getStatusLabel = (status: HearingStatus) => {
    switch (status) {
      case HearingStatus.CREATED:
        return 'נוצר';
      case HearingStatus.ACTIVE:
        return 'פעיל';
      case HearingStatus.ENDED:
        return 'הסתיים';
      case HearingStatus.SIGNED:
        return 'חתום';
      default:
        return status;
    }
  };

  const getStatusColor = (status: HearingStatus) => {
    switch (status) {
      case HearingStatus.CREATED:
        return 'bg-blue-100 text-blue-700';
      case HearingStatus.ACTIVE:
        return 'bg-yellow-100 text-yellow-700';
      case HearingStatus.ENDED:
        return 'bg-green-100 text-green-700';
      case HearingStatus.SIGNED:
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">דיונים</h2>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              דיון חדש
            </button>
          )}
        </div>

        {/* Create Hearing Form */}
        {showForm && canCreate && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">יצירת דיון חדש</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">שעה</label>
                <input
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג דיון</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as HearingType })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value={HearingType.PRELIMINARY}>דיון מקדמי</option>
                  <option value={HearingType.MAIN}>דיון עיקרי</option>
                  <option value={HearingType.CLOSING}>דיון סיכום</option>
                  <option value={HearingType.OTHER}>אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">משך זמן (דקות)</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="60"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">מיקום</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="מיקום הדיון"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">הערות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="הערות נוספות..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : 'צור דיון'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    scheduledDate: '',
                    scheduledTime: '',
                    duration: '',
                    location: '',
                    type: HearingType.MAIN,
                    notes: '',
                    participants: []
                  });
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {hearings.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין דיונים בתיק</h3>
            <p className="text-gray-600">דיונים בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hearings.map((hearing) => {
              const createdBy = typeof hearing.createdBy === 'object' ? hearing.createdBy.name : 'משתמש';
              const participants = hearing.participants
                .map(p => typeof p === 'object' ? p.name : 'משתמש')
                .join(', ');

              const sessions = discussionSessions[hearing._id] || [];
              const activeSession = sessions.find(s => s.status === 'active');
              const completedSession = sessions.find(s => s.status === 'completed' || s.status === 'cancelled');

              return (
                <div key={hearing._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold text-gray-900">
                            {new Date(hearing.scheduledDate).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(hearing.status)}`}>
                          {getStatusLabel(hearing.status)}
                        </span>
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                          {getTypeLabel(hearing.type)}
                        </span>
                        {(completedSession || (activeSession && activeSession.status !== 'active')) && (
                          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 font-semibold">
                            דיון סגור
                          </span>
                        )}
                      </div>
                      {hearing.location && (
                        <p className="text-gray-600 mb-1">
                          <span className="font-semibold">מיקום:</span> {hearing.location}
                        </p>
                      )}
                      {hearing.duration && (
                        <p className="text-gray-600 mb-1">
                          <span className="font-semibold">משך זמן:</span> {hearing.duration} דקות
                        </p>
                      )}
                      {participants && (
                        <p className="text-gray-600 mb-1">
                          <span className="font-semibold">משתתפים:</span> {participants}
                        </p>
                      )}
                      {hearing.notes && (
                        <p className="text-gray-600 mt-2 text-sm">{hearing.notes}</p>
                      )}
                      
                      {/* Discussion Sessions */}
                      {sessions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">דיונים:</p>
                          <div className="space-y-2">
                            {sessions.map((session) => (
                              <button
                                key={session._id}
                                onClick={() => router.push(`/cases/${caseId}/discussions/${session._id}`)}
                                className="w-full text-right p-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    session.status === 'active' ? 'bg-green-100 text-green-700' :
                                    session.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {session.status === 'active' ? 'פעיל' :
                                     session.status === 'completed' ? 'הושלם' : 'בוטל'}
                                  </span>
                                  <span className="font-semibold text-gray-900">{session.title}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {new Date(session.startedAt).toLocaleString('he-IL')}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-500">
                        נוצר על ידי: {createdBy}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mr-4">
                      {canCreate && !activeSession && !completedSession && hearing.status !== HearingStatus.ENDED && hearing.status !== HearingStatus.SIGNED && (
                        <button
                          onClick={() => handleStartDiscussion(hearing._id)}
                          disabled={startingSession === hearing._id}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                          {startingSession === hearing._id ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              מתחיל...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              התחל דיון
                            </>
                          )}
                        </button>
                      )}
                      {(activeSession || completedSession) && (
                        <button
                          onClick={() => router.push(`/cases/${caseId}/discussions/${(activeSession || completedSession)?._id}`)}
                          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap ${
                            (activeSession?.status === 'completed' || activeSession?.status === 'cancelled' || completedSession)
                              ? 'bg-gray-600 text-white hover:bg-gray-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {(activeSession?.status === 'completed' || activeSession?.status === 'cancelled' || completedSession) ? 'צפה בדיון (סגור)' : 'צפה בדיון'}
                        </button>
                      )}
                      {!activeSession && !completedSession && (hearing.status === HearingStatus.ENDED || hearing.status === HearingStatus.SIGNED) && (
                        <span className="text-sm text-gray-500 px-4 py-2">דיון הושלם - לא ניתן להתחיל שוב</span>
                      )}
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

