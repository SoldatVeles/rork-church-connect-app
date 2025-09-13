export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  requestedByName: string;
  isAnonymous: boolean;
  isUrgent: boolean;
  status: PrayerStatus;
  createdAt: Date;
  prayedBy: string[];
}

export type PrayerStatus = 'active' | 'answered' | 'archived';