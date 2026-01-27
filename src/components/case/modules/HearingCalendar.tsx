'use client';

import { useEffect, useState } from 'react';
import { hearingsAPI } from '@/lib/api';
import { Hearing, HearingStatus } from '@/types';

interface HearingCalendarProps {
  caseId: string;
}

export default function HearingCalendar({ caseId }: HearingCalendarProps) {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    loadHearings();
  }, [caseId]);

  const loadHearings = async () => {
    try {
      const data = await hearingsAPI.getByCase(caseId);
      setHearings(data);
    } catch (error: any) {
      console.error('Failed to load hearings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Adjust for RTL (Sunday = 0, but we want it on the right)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    return { daysInMonth, startingDayOfWeek: adjustedStartingDay };
  };

  const getHearingsForDate = (date: Date) => {
    return hearings.filter(hearing => {
      const hearingDate = new Date(hearing.scheduledDate);
      return (
        hearingDate.getDate() === date.getDate() &&
        hearingDate.getMonth() === date.getMonth() &&
        hearingDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="text-center py-12">טוען...</div>
      </div>
    );
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(selectedMonth);
  const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const weekDays = ['ב', 'ג', 'ד', 'ה', 'ו', 'ש', 'א'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">יומן דיונים</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-gray-900">{monthName}</span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day, index) => (
            <div key={index} className="text-center font-semibold text-gray-700 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square"></div>
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const currentDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
            const dayHearings = getHearingsForDate(currentDate);
            const isToday = currentDate.toDateString() === new Date().toDateString();

            return (
              <div
                key={day}
                className={`aspect-square border rounded-lg p-1 ${
                  isToday
                    ? 'bg-orange-100 border-orange-400'
                    : dayHearings.length > 0
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-semibold mb-1">{day}</div>
                {dayHearings.length > 0 && (
                  <div className="space-y-1">
                    {dayHearings.slice(0, 2).map((hearing) => (
                      <div
                        key={hearing._id}
                        className="text-xs bg-orange-600 text-white px-1 rounded truncate"
                        title={new Date(hearing.scheduledDate).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      >
                        {new Date(hearing.scheduledDate).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    ))}
                    {dayHearings.length > 2 && (
                      <div className="text-xs text-gray-600">+{dayHearings.length - 2}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded"></div>
            <span>היום</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
            <span>יש דיונים</span>
          </div>
        </div>
      </div>
    </div>
  );
}

