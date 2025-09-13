export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'event' | 'prayer' | 'announcement' | 'general';
  relatedId?: string;
  createdAt: Date;
  isRead: boolean;
  userId?: string;
}

class NotificationStorage {
  private notifications: Notification[] = [];

  constructor() {
    // Initialize with some sample notifications
    this.notifications = [
      {
        id: '1',
        title: 'New Event: Youth Bible Study',
        message: 'A new event has been scheduled for this Friday at 7:00 PM',
        type: 'event',
        relatedId: 'event-1',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
      },
      {
        id: '2',
        title: 'Prayer Request Update',
        message: 'Sarah\'s prayer request has been answered!',
        type: 'prayer',
        relatedId: 'prayer-1',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        isRead: false,
      },
      {
        id: '3',
        title: 'Community Announcement',
        message: 'Volunteers needed for community outreach program',
        type: 'announcement',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isRead: false,
      },
    ];
  }

  getAll(userId?: string): Notification[] {
    // In a real app, filter by userId
    return this.notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getUnread(userId?: string): Notification[] {
    return this.getAll(userId).filter(n => !n.isRead);
  }

  markAsRead(id: string): Notification | undefined {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.isRead = true;
    }
    return notification;
  }

  markAllAsRead(userId?: string): void {
    this.notifications.forEach(n => {
      if (!userId || n.userId === userId) {
        n.isRead = true;
      }
    });
  }

  create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      isRead: false,
    };
    this.notifications.push(newNotification);
    return newNotification;
  }

  delete(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const notificationStorage = new NotificationStorage();