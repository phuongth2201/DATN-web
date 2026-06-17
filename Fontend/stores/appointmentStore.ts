import { create } from 'zustand';
import { apiService } from '@/services/api';

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  symptoms: string;
  notes?: string;
  consultationType: string;
  paymentStatus?: string;
  createdAt: string;
}

interface AppointmentStore {
  appointments: Appointment[];
  currentAppointment: Appointment | null;
  isLoading: boolean;
  error: string | null;

  fetchAppointments: () => Promise<void>;
  getAppointmentById: (id: string) => Promise<void>;
  bookAppointment: (data: any) => Promise<void>;
  cancelAppointment: (id: string, reason: string) => Promise<void>;
  rescheduleAppointment: (
    id: string,
    newDate: string,
    newSlot: string
  ) => Promise<void>;
  processPayment: (id: string, method: string, amount?: number) => Promise<any>;
  clearError: () => void;
}

export const useAppointmentStore = create<AppointmentStore>((set) => ({
  appointments: [],
  currentAppointment: null,
  isLoading: false,
  error: null,

  fetchAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getUserAppointments({ sortBy: 'date', sortOrder: 'desc' });
      let apps = [];
      if (Array.isArray(response)) apps = response;
      else if (Array.isArray(response?.data)) apps = response.data;
      else if (Array.isArray(response?.data?.data)) apps = response.data.data;
      
      set({
        isLoading: false,
        appointments: apps,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch appointments',
      });
    }
  },

  getAppointmentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.getAppointmentById(id);
      set({
        isLoading: false,
        currentAppointment: response?.data || response,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch appointment',
      });
    }
  },

  bookAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.bookAppointment(data);
      set((state) => ({
        isLoading: false,
        appointments: [response?.data || response, ...state.appointments],
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to book appointment',
      });
      throw error;
    }
  },

  cancelAppointment: async (id, reason) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.cancelAppointment(id, reason);
      set((state) => ({
        isLoading: false,
        appointments: state.appointments.map((apt) =>
          apt.id === id ? { ...apt, status: 'CANCELLED' } : apt
        ),
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to cancel appointment',
      });
      throw error;
    }
  },

  rescheduleAppointment: async (id, newDate, newSlot) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.rescheduleAppointment(
        id,
        newDate,
        newSlot
      );
      set((state) => ({
        isLoading: false,
        appointments: state.appointments.map((apt) =>
          apt.id === id
            ? {
                ...apt,
                appointmentDate: newDate,
                appointmentTime: newSlot,
              }
            : apt
        ),
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error:
          error.response?.data?.message || 'Failed to reschedule appointment',
      });
      throw error;
    }
  },

  processPayment: async (id, method, amount) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiService.initiatePayment(id, method, amount);
      
      // Update local state to PENDING
      set((state) => ({
        isLoading: false,
        appointments: state.appointments.map((apt) =>
          String(apt.id) === String(id) ? { ...apt, paymentStatus: 'PENDING' } : apt
        ),
        currentAppointment: state.currentAppointment && String(state.currentAppointment.id) === String(id)
          ? { ...state.currentAppointment, paymentStatus: 'PENDING' }
          : state.currentAppointment
      }));
      
      if (response && response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
      }
      
      return response;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Payment initiation failed',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
