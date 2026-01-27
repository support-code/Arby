import { CaseStatus } from '@/types';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const getStatusConfig = (status: CaseStatus): StatusConfig => {
  const configs: Record<CaseStatus, StatusConfig> = {
    [CaseStatus.DRAFT]: {
      label: 'טיוטת תיק',
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-100',
      icon: '📝'
    },
    [CaseStatus.ACTIVE]: {
      label: 'תיק פעיל',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      icon: '⚖️'
    },
    [CaseStatus.PENDING_DECISION]: {
      label: 'ממתין להחלטה',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      icon: '⏳'
    },
    [CaseStatus.CLOSED]: {
      label: 'הוכרע',
      color: 'text-orange-800',
      bgColor: 'bg-orange-100',
      icon: '✅'
    },
    [CaseStatus.ARCHIVED]: {
      label: 'נעול',
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      icon: '🔒'
    }
  };

  return configs[status] || configs[CaseStatus.DRAFT];
};

