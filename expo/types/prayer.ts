export interface PrayerUpdate {
  id: string;
  prayerId: string;
  content: string;
  isAnsweredUpdate: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

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
  answeredAt?: Date;
  updates?: PrayerUpdate[];
}

export type PrayerStatus = 'active' | 'answered' | 'archived';