export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location: string;
  type: EventType;
  maxAttendees?: number;
  currentAttendees: number;
  createdBy: string;
  imageUrl?: string;
  isRegistrationOpen: boolean;
  registeredUsers: string[];
}

export type EventType = 'bible_study' | 'youth' | 'special' | 'conference';