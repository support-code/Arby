'use client';

import { useState } from 'react';
import { Case, UserRole } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { casesAPI } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

interface CaseSettingsProps {
  caseData: Case;
  onUpdate?: () => void;
}

export default function CaseSettings({ caseData, onUpdate }: CaseSettingsProps) {
  const { hasRole } = useAuthStore();
  const { showToast } = useToastStore();
  const canManage = hasRole([UserRole.ADMIN, UserRole.ARBITRATOR]);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    caseNumber: caseData.caseNumber || '',
    caseType: caseData.caseType || '',
    claimAmount: caseData.claimAmount || 0,
    confidentialityLevel: caseData.confidentialityLevel || 'confidential'
  });

  if (!canManage) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">אין הרשאה</h3>
          <p className="text-gray-600">הגדרות תיק זמינות לבורר בלבד</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await casesAPI.update(caseData._id, {
        caseNumber: settings.caseNumber || undefined,
        caseType: settings.caseType || undefined,
        claimAmount: settings.claimAmount || undefined,
        confidentialityLevel: settings.confidentialityLevel
      });
      showToast('הגדרות התיק נשמרו בהצלחה', 'success');
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      showToast(error?.response?.data?.error || 'שגיאה בשמירת הגדרות', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold mb-6 text-gray-900">הגדרות תיק</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              מספר תיק רשמי
            </label>
            <input
              type="text"
              value={settings.caseNumber}
              onChange={(e) => setSettings({ ...settings, caseNumber: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="מספר תיק"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              סוג תיק
            </label>
            <input
              type="text"
              value={settings.caseType}
              onChange={(e) => setSettings({ ...settings, caseType: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="סוג תיק"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              סכום התביעה
            </label>
            <input
              type="number"
              value={settings.claimAmount}
              onChange={(e) => setSettings({ ...settings, claimAmount: parseFloat(e.target.value) || 0 })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              רמת חסיון
            </label>
            <select
              value={settings.confidentialityLevel}
              onChange={(e) => setSettings({ ...settings, confidentialityLevel: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="public">פומבי</option>
              <option value="confidential">חסוי</option>
              <option value="secret">סודי</option>
              <option value="top_secret">סודי ביותר</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
