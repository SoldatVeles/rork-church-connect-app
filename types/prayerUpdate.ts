export interface PrayerUpdate {
  id: string;
  prayerId: string;
  content: string;
  isAnsweredUpdate: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}
