'use client';

import { useEffect, useState } from 'react';
import { internalNotesAPI } from '@/lib/api';
import { InternalNote, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface InternalNotesProps {
  caseId: string;
}

export default function InternalNotes({ caseId }: InternalNotesProps) {
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newTags, setNewTags] = useState('');
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (hasRole([UserRole.ADMIN, UserRole.ARBITRATOR])) {
      loadNotes();
    } else {
      setLoading(false);
    }
  }, [caseId, hasRole]);

  const loadNotes = async () => {
    try {
      const data = await internalNotesAPI.getByCase(caseId);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load internal notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      await internalNotesAPI.create({
        caseId,
        content: newNote,
        tags
      });
      setNewNote('');
      setNewTags('');
      showToast('הערה פנימית נוספה בהצלחה', 'success');
      await loadNotes();
    } catch (error: any) {
      console.error('Failed to create note:', error);
      showToast(error?.response?.data?.error || 'שגיאה בהוספת הערה פנימית', 'error');
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הערה זו?')) return;

    try {
      await internalNotesAPI.delete(noteId);
      showToast('הערה פנימית נמחקה בהצלחה', 'success');
      await loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      showToast(error?.response?.data?.error || 'שגיאה במחיקת הערה', 'error');
    }
  };

  const canAccess = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);

  if (!canAccess) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הרשאה</h3>
          <p className="text-gray-600">הערות פנימיות זמינות לבורר בלבד</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 border-r-4 border-r-yellow-500">
        <h2 className="text-xl font-bold mb-6 text-gray-900">הערות פנימיות</h2>

        {/* Add Note Form */}
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="הוסף הערה פנימית..."
            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            rows={4}
          />
          <input
            type="text"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="תגיות (מופרדות בפסיקים)"
            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
          <button
            type="submit"
            className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 font-semibold"
          >
            הוסף הערה
          </button>
        </form>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">תגיות:</span>
            {allTags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הערות פנימיות</h3>
            <p className="text-gray-600">הערות פנימיות לבורר יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => {
              const createdBy = typeof note.createdBy === 'object' ? note.createdBy.name : 'משתמש';

              return (
                <div
                  key={note._id}
                  className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 border-r-4 border-r-yellow-500"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{createdBy}</span>
                        <span className="px-2 py-1 text-xs rounded bg-yellow-200 text-yellow-800">
                          פנימי
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap mb-2">{note.content}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(note._id)}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="מחק הערה"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
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

