import { create } from 'zustand';
import { apiService } from '@/services/api';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  relatedId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  isInitialized: boolean;
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reset: () => void;
  // Giữ lại hàm cũ để tránh lỗi UI hiện tại
  addNotification: (notification: any) => void;
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  isInitialized: false,
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  ...initialState,

  fetchNotifications: async (page = 1) => {
    set({ isLoading: true });
    try {
      const response = await apiService.getNotifications(page);
      set((state) => ({
        notifications: page === 1 ? response.data : [...state.notifications, ...response.data],
        page: response.pagination.page,
        totalPages: response.pagination.totalPages,
        isLoading: false,
        isInitialized: true,
      }));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await apiService.getUnreadNotificationCount();
      const currentCount = get().unreadCount;
      
      if (response.count !== currentCount) {
        set({ unreadCount: response.count });
        // If unread count changed, refresh notifications if we are on page 1
        if (get().page === 1) {
          get().fetchNotifications(1);
        }
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (id: number) => {
    try {
      await apiService.markNotificationAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiService.markAllNotificationsAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  addNotification: (notification: any) => {
    // Keep for backward compatibility with components using addNotification (which were faking it)
    // Actually we should trigger a fetchUnreadCount to see if anything changed.
    get().fetchUnreadCount();
  },

  reset: () => {
    set(initialState);
  },
}));
