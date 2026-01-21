'use client';

import { useEffect, useState } from 'react';
import { commentsAPI } from '@/lib/api';
import { Comment, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface CommentsProps {
  caseId: string;
}

export default function Comments({ caseId }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const { hasRole, user } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadComments();
  }, [caseId]);

  const loadComments = async () => {
    try {
      const data = await commentsAPI.getByCase(caseId);
      setComments(data);
    } catch (error: any) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await commentsAPI.create({
        caseId,
        content: newComment,
        isInternal: isInternal && hasRole([UserRole.ADMIN, UserRole.ARBITRATOR])
      });
      setNewComment('');
      setIsInternal(false);
      showToast('תגובה נוספה בהצלחה', 'success');
      await loadComments();
    } catch (error: any) {
      console.error('Failed to create comment:', error);
      showToast(error?.response?.data?.error || 'שגיאה בהוספת תגובה', 'error');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תגובה זו?')) return;

    try {
      await commentsAPI.delete(commentId);
      showToast('תגובה נמחקה בהצלחה', 'success');
      await loadComments();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      showToast(error?.response?.data?.error || 'שגיאה במחיקת תגובה', 'error');
    }
  };

  const canCreateInternal = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);
  const canDelete = (comment: Comment) => {
    if (hasRole([UserRole.ADMIN, UserRole.ARBITRATOR])) return true;
    return typeof comment.createdBy === 'object' && comment.createdBy.id === user?.id;
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
        <h2 className="text-xl font-bold mb-6 text-gray-900">תגובות</h2>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="הוסף תגובה..."
            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="flex items-center justify-between">
            {canCreateInternal && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                הערה פנימית (לבורר בלבד)
              </label>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              הוסף תגובה
            </button>
          </div>
        </form>

        {comments.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין תגובות בתיק</h3>
            <p className="text-gray-600">תגובות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const createdBy = typeof comment.createdBy === 'object' ? comment.createdBy.name : 'משתמש';
              const isOwner = typeof comment.createdBy === 'object' && comment.createdBy.id === user?.id;

              return (
                <div
                  key={comment._id}
                  className={`p-4 border rounded-lg ${
                    comment.isInternal
                      ? 'bg-yellow-50 border-yellow-200 border-r-4'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-900">{createdBy}</span>
                        {comment.isInternal && (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-200 text-yellow-800">
                            פנימי
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString('he-IL', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    {canDelete(comment) && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="מחק תגובה"
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
        )}
      </div>
    </div>
  );
}

