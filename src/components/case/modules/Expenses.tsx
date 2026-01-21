'use client';

import { useEffect, useState } from 'react';
import { expensesAPI } from '@/lib/api';
import { Expense, UserRole, ExpenseCategory } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

interface ExpensesProps {
  caseId: string;
}

export default function Expenses({ caseId }: ExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: ExpenseCategory.OTHER,
    date: new Date().toISOString().split('T')[0]
  });
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    loadExpenses();
  }, [caseId]);

  const loadExpenses = async () => {
    try {
      const data = await expensesAPI.getByCase(caseId);
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await expensesAPI.create({
        caseId,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date
      });
      
      setFormData({
        description: '',
        amount: '',
        category: ExpenseCategory.OTHER,
        date: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      showToast('הוצאה נוצרה בהצלחה', 'success');
      await loadExpenses();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      showToast(error?.response?.data?.error || 'שגיאה ביצירת הוצאה', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    switch (category) {
      case ExpenseCategory.ARBITRATOR_FEE:
        return 'שכר בורר';
      case ExpenseCategory.ADMINISTRATIVE:
        return 'אדמיניסטרטיבי';
      case ExpenseCategory.EXPERT_FEE:
        return 'שכר מומחה';
      case ExpenseCategory.LEGAL_FEE:
        return 'שכר עורך דין';
      case ExpenseCategory.TRAVEL:
        return 'נסיעות';
      case ExpenseCategory.DOCUMENTATION:
        return 'תיעוד';
      case ExpenseCategory.OTHER:
        return 'אחר';
      default:
        return category;
    }
  };

  const canCreate = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

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
          <div>
            <h2 className="text-xl font-bold text-gray-900">הוצאות</h2>
            {expenses.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                סה"כ: {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(totalAmount)}
              </p>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              הוצאה חדשה
            </button>
          )}
        </div>

        {/* Create Expense Form */}
        {showForm && canCreate && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-4">יצירת הוצאה חדשה</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">תיאור *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="תיאור ההוצאה"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סכום (₪) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">קטגוריה *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value={ExpenseCategory.ARBITRATOR_FEE}>שכר בורר</option>
                  <option value={ExpenseCategory.ADMINISTRATIVE}>אדמיניסטרטיבי</option>
                  <option value={ExpenseCategory.EXPERT_FEE}>שכר מומחה</option>
                  <option value={ExpenseCategory.LEGAL_FEE}>שכר עורך דין</option>
                  <option value={ExpenseCategory.TRAVEL}>נסיעות</option>
                  <option value={ExpenseCategory.DOCUMENTATION}>תיעוד</option>
                  <option value={ExpenseCategory.OTHER}>אחר</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">תאריך *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : 'צור הוצאה'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    description: '',
                    amount: '',
                    category: ExpenseCategory.OTHER,
                    date: new Date().toISOString().split('T')[0]
                  });
                }}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 font-semibold"
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {expenses.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הוצאות בתיק</h3>
            <p className="text-gray-600">הוצאות בתיק יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => {
              const createdBy = typeof expense.createdBy === 'object' ? expense.createdBy.name : 'משתמש';
              return (
                <div key={expense._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                          {getCategoryLabel(expense.category)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{new Date(expense.date).toLocaleDateString('he-IL')}</span>
                        <span>•</span>
                        <span>נוצר על ידי: {createdBy}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-gray-900">
                        {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(expense.amount)}
                      </p>
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

