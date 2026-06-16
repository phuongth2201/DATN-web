import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookie from 'js-cookie';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8082';

class ApiService {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = Cookie.get('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const isAuthRequest = originalRequest.url?.includes('/api/authenticate') || originalRequest.url?.includes('/api/auth/');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
          originalRequest._retry = true;
          if (!this.refreshTokenPromise) {
            this.refreshTokenPromise = this.refreshAccessToken();
          }
          try {
            const newToken = await this.refreshTokenPromise;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            Cookie.remove('accessToken');
            Cookie.remove('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.refreshTokenPromise = null;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = Cookie.get('refreshToken');
    if (!refreshToken) throw new Error('No refresh token available');
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
    const { token } = response.data;
    Cookie.set('accessToken', token);
    return token;
  }

  async login(identifier: string, password: string) {
    try {
      const response = await this.client.post('/api/authenticate', {
        username: identifier,
        password: password,
        rememberMe: true
      });
      return this.handleLoginSuccess(response);
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const response = await this.client.post('/api/auth/login', {
            email: identifier,
            username: identifier,
            password: password
          });
          return this.handleLoginSuccess(response);
        } catch (error2: any) {
          throw error2;
        }
      }
      throw error;
    }
  }

  private handleLoginSuccess(response: any) {
    const data = response.data;
    let token = data.id_token || data.token || data.accessToken || data.idToken;
    if (!token && response.headers.authorization) {
      token = response.headers.authorization.replace('Bearer ', '');
    }
    if (token) Cookie.set('accessToken', token);
    if (data.refreshToken) Cookie.set('refreshToken', data.refreshToken);
    return data;
  }

  async logout() {
    Cookie.remove('accessToken');
    Cookie.remove('refreshToken');
    try {
      return await this.client.post('/api/auth/logout');
    } catch (e) {
      return { data: { success: true } };
    }
  }

  async register(data: any) {
    return (await this.client.post('/api/auth/register', {
      login: data.email.split('@')[0],
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      firstName: data.fullName.split(' ')[0],
      lastName: data.fullName.split(' ').slice(1).join(' '),
      langKey: 'vi',
      activated: true,
      authorities: ['ROLE_USER']
    })).data;
  }

  async getUserProfile() {
    // 1. Get basic account info & roles
    const response = await this.client.get('/api/account');
    const data = response.data;

    // 2. Get detailed profile info from custom endpoint
    let profileData: any = {};
    try {
      const profileRes = await this.client.get('/api/users/me');
      profileData = profileRes.data;
    } catch (error) {
      console.warn('Could not fetch detailed profile from /api/users/me');
    }

    return {
      data: {
        ...data,
        ...profileData,
        fullName: profileData.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.login || data.email,
        phoneNumber: profileData.phoneNumber || data.phone || '',
        address: profileData.address || '',
        dateOfBirth: profileData.dateOfBirth || '',
        gender: profileData.gender || '',
        healthInsurance: profileData.healthInsurance || '',
        profilePicture: profileData.avatar || data.imageUrl || '',
        role: data.authorities?.includes('ROLE_ADMIN')
          ? 'ROLE_ADMIN'
          : (data.authorities && data.authorities.length > 0 ? data.authorities[0] : 'USER')
      }
    };
  }

  async updateMyProfile(data: any) {
    const payload = {
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      healthInsurance: data.healthInsurance
    };

    try {
      // First try to update the custom profile endpoint
      const response = await this.client.put('/api/users/me', payload);
      return response.data;
    } catch (e) {
      // Fallback to post if put is not allowed
      const response = await this.client.post('/api/users/me', payload);
      return response.data;
    }
  }

  // Medical Records endpoints
  async getMedicalRecords(page = 1, limit = 10) {
    try {
      const res = await this.client.get('/api/medical-records', {
        params: { page, limit }
      });
      return res.data;
    } catch (e: any) {
      // Fallback: try without pagination params
      if (e.response?.status === 500) {
        try {
          const res = await this.client.get('/api/medical-records');
          return res.data;
        } catch (e2) {
          return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
        }
      }
      // If 401 or other auth error, return empty instead of crashing
      if (e.response?.status === 401 || e.response?.status === 403) {
        return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      }
      throw e;
    }
  }

  async createMedicalRecord(data: {
    appointmentId: number;
    doctorId: number;
    diagnosis: string;
    treatment: string;
    notes: string;
    userId?: number;
  }) {
    const res = await this.client.post('/api/medical-records', data);
    return res.data;
  }

  // Doctor & Schedule endpoints
  async searchDoctors(params: any) {
    const apiParams = { ...params };
    if (apiParams.keyword !== undefined) {
      apiParams.search = apiParams.keyword;
      delete apiParams.keyword;
    }
    if (apiParams.specialization !== undefined) {
      apiParams.specialty = apiParams.specialization;
      delete apiParams.specialization;
    }
    return (await this.client.get('/api/doctors', { params: apiParams })).data;
  }

  async getDoctorById(id: string) {
    return (await this.client.get(`/api/doctors/${id}`)).data;
  }

  async getCurrentDoctor() {
    return (await this.client.get(`/api/doctors/me`)).data;
  }

  async getDoctorSlots(doctorId: string, params: any) {
    // Handle both object params { date: '...' } and direct string '...'
    const date = typeof params === 'string' ? params : params?.date;

    try {
      console.log(`Fetching schedule for Doctor ID: ${doctorId} on Date: ${date}`);
      const res = await this.client.get(`/api/appointments/${doctorId}/available-slots`, {
        params: { startDate: date, endDate: date }
      });

      const data = res.data?.availableSlots || [];
      const daySlots = data.find((d: any) => d.date === date)?.slots || [];

      return {
        data: daySlots.map((time: string) => ({
          id: time, // use time string as ID
          startTime: time,
          isAvailable: true // Backend only returns available slots
        }))
      };
    } catch (error) {
      console.error('Error fetching slots:', error);
      return { data: [] };
    }
  }

  async getPublicStats() {
    return (await this.client.get('/api/public/stats')).data;
  }

  async getSpecialties() {
    return (await this.client.get('/api/specialties')).data;
  }

  async getHospitals() {
    return (await this.client.get('/api/hospitals')).data;
  }

  // Specialty Admin endpoints
  async getAllSpecialtiesAdmin() {
    return (await this.client.get('/api/admin/specialties')).data;
  }

  async getSpecialtyById(id: string | number) {
    return (await this.client.get(`/api/admin/specialties/${id}`)).data;
  }

  async createSpecialty(data: any) {
    const payload = {
      name: data.name,
      vietnamName: data.vietnamName,
      icon: data.icon,
      description: data.description
    };
    return (await this.client.post('/api/admin/specialties', payload)).data;
  }

  async updateSpecialty(id: string | number, data: any) {
    const payload = {
      name: data.name,
      vietnamName: data.vietnamName,
      icon: data.icon,
      description: data.description
    };
    return (await this.client.put(`/api/admin/specialties/${id}`, payload)).data;
  }

  async deleteSpecialty(id: string | number) {
    return (await this.client.delete(`/api/admin/specialties/${id}`)).data;
  }

  // Appointment endpoints
  async bookAppointment(data: any) {
    const formattedTime = data.appointmentTime?.length === 5
      ? `${data.appointmentTime}:00`
      : data.appointmentTime;

    return (await this.client.post('/api/appointments', {
      doctorId: Number(data.doctorId),
      appointmentDate: data.appointmentDate,
      appointmentTime: formattedTime,
      reason: data.symptoms,
      notes: `Consultation Type: ${data.consultationType}`
    })).data;
  }

  async getUserAppointments(params?: any) {
    return (await this.client.get('/api/appointments', { params })).data;
  }

  async getAllAppointments(page = 1, limit = 10, status = '') {
    try {
      return (await this.client.get('/api/admin/appointments', {
        params: { page, limit, status }
      })).data;
    } catch (e) {
      return (await this.client.get('/api/appointments', {
        params: { page, limit, status }
      })).data;
    }
  }

  private mapUserData(u: any) {
    if (!u) return u;
    return {
      ...u,
      fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.login || u.email,
      phoneNumber: u.phoneNumber || u.phone || '',
    };
  }

  async getAllUsers(page = 1, limit = 20) {
    const res = (await this.client.get('/api/admin/users', {
      params: { page: page - 1, limit }
    })).data;
    
    // Support both direct array and paginated object
    const data = Array.isArray(res) ? res : (res.data || res.content || []);
    const mappedData = data.map((u: any) => this.mapUserData(u));
    
    if (Array.isArray(res)) return mappedData;
    return { ...res, data: mappedData };
  }

  async getUserById(login: string) {
    const data = (await this.client.get(`/api/admin/users/${login}`)).data;
    return this.mapUserData(data);
  }

  async updateUser(data: any) {
    // Ensure we don't send synthesized fields back to the API
    const { fullName, ...payload } = data;
    
    // Send all possible phone field names to be safe with different backend versions
    const phoneValue = payload.phoneNumber || payload.phone || payload.mobile;
    if (phoneValue) {
      payload.phoneNumber = phoneValue;
      payload.phone = phoneValue;
      payload.mobile = phoneValue;
    }

    // Use login in URL if available for better REST compliance
    const url = payload.login ? `/api/admin/users/${payload.login}` : '/api/admin/users';
    const res = await this.client.put(url, payload);
    return this.mapUserData(res.data);
  }

  async createUser(data: any) {
    const payload = {
      login: data.login || data.email.split('@')[0],
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email,
      phoneNumber: data.phoneNumber || '',
      authorities: data.authorities || ['ROLE_USER'],
      langKey: 'vi'
    };
    const res = await this.client.post('/api/admin/users', payload);
    return this.mapUserData(res.data);
  }

  async deleteUser(identifier: string | number) {
    try {
      // Try as ID first if numeric
      return (await this.client.delete(`/api/admin/users/${identifier}`)).data;
    } catch (error) {
      // If it fails, maybe the backend expects login/email
      return (await this.client.delete(`/api/admin/users/${identifier}`)).data;
    }
  }

  async getAllDoctors(page = 1, limit = 20) {
    try {
      return (await this.client.get('/api/admin/doctors', {
        params: { page: page - 1, limit }
      })).data;
    } catch (e) {
      return (await this.client.get('/api/doctors', {
        params: { page: page - 1, limit }
      })).data;
    }
  }

  async updateDoctorStatus(id: string, isActive: boolean) {
    try {
      return (await this.client.put(`/api/admin/doctors/${id}/status`, { isActive })).data;
    } catch (error) {
      return (await this.client.put(`/api/admin/doctors/${id}`, { active: isActive })).data;
    }
  }

  async updateDoctor(id: string | number, data: any) {
    const payload: any = {
      id: Number(id),
      fullName: (data.fullName || '').trim(),
      email: data.email || '',
      phoneNumber: data.phoneNumber || '',
      bio: data.bio || '',
      avatar: data.avatar || '',
      experience: Number(data.yearsOfExperience || data.experience || 0),
      license: data.license || '',
      price: Number(data.consultationFee || data.price || 0),
      rating: Number(data.rating || 0),
      reviewCount: Number(data.reviewCount || 0),
      specialtyId: data.specialtyId ? Number(data.specialtyId) : (data.specialty?.id ? Number(data.specialty.id) : null),
      hospitalId: data.hospitalId ? Number(data.hospitalId) : (data.hospital?.id ? Number(data.hospital.id) : null),
      activated: data.active !== undefined ? data.active : (data.activated !== undefined ? data.activated : true),
      active: data.active !== undefined ? data.active : (data.activated !== undefined ? data.activated : true)
    };

    // Ensure fullName is not empty to avoid @NotBlank 400 error
    if (!payload.fullName) {
      throw new Error('Full name is required');
    }

    console.log('Final Payload to Backend (Exact Spec):', payload);

    const res = await this.client.put(`/api/admin/doctors/${id}`, payload);
    return res.data;
  }

  async createDoctor(data: any) {
    const payload = {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      bio: data.bio,
      avatar: data.avatar,
      experience: Number(data.yearsOfExperience || data.experience || 0),
      license: data.license,
      price: Number(data.consultationFee || data.price || 0),
      rating: Number(data.rating || 0),
      reviewCount: Number(data.reviewCount || 0),
      specialtyId: Number(data.specialtyId),
      hospitalId: Number(data.hospitalId)
    };

    const res = await this.client.post('/api/admin/doctors', payload);
    return res.data;
  }

  async deleteDoctor(id: string | number) {
    return (await this.client.delete(`/api/admin/doctors/${id}`)).data;
  }

  async getAppointmentById(id: string) {
    return (await this.client.get(`/api/appointments/${id}`)).data;
  }

  async cancelAppointment(id: string, reason: string) {
  const res = await this.client.delete(`/api/appointments/${id}`, {
    data: {
      reason,
    },
  });

  return res.data;
}

  async rescheduleAppointment(id: string, newDate: string, newSlot: string) {
    try {
      return (await this.client.put(`/api/appointments/${id}/reschedule`, {
        appointmentDate: newDate,
        appointmentTime: newSlot,
      })).data;
    } catch {
      return (await this.client.put(`/api/appointments/${id}`, {
        appointmentDate: newDate,
        appointmentTime: newSlot,
        status: 'CONFIRMED',
      })).data;
    }
  }

  async updateAppointmentStatus(id: string, status: string) {
    try {
      return (await this.client.put(`/api/admin/appointments/${id}`, { status })).data;
    } catch (error: any) {
      try {
        const appointments = await this.getAllAppointments(1, 1000);
        const apps = Array.isArray(appointments) ? appointments : (appointments.data || appointments.content || []);
        const appointment = apps.find((a: any) => String(a.id) === String(id));
        if (appointment) {
          return (await this.client.put(`/api/admin/appointments/${id}`, { ...appointment, status })).data;
        }
        throw error;
      } catch (innerError) {
        throw innerError;
      }
    }
  }

  async getAdminDashboard() {
    try {
      const res = await this.client.get('/api/admin/dashboard');
      const statsObj = res.data?.statistics || res.data;
      if (!statsObj || !statsObj.trends) {
        return await this.calculateManualDashboardStats(statsObj || {});
      }
      return {
        totalDoctors: statsObj.totalDoctors || 0,
        totalAppointments: statsObj.totalAppointments || 0,
        totalUsers: statsObj.totalUsers || 0,
        totalRevenue: statsObj.totalRevenue || 0,
        monthlyRevenue: statsObj.monthlyRevenue || 0,
        monthlyAppointments: statsObj.monthlyAppointments || 0,
        trends: statsObj.trends || { users: '+0%', usersUp: true, appointments: '+0%', appointmentsUp: true, revenue: '+0%', revenueUp: true, doctors: '+0%', doctorsUp: true },
        appointmentStats: {
          pending: statsObj.appointmentStatuses?.PENDING || 0,
          scheduled: statsObj.appointmentStatuses?.CONFIRMED || 0,
          completed: statsObj.appointmentStatuses?.COMPLETED || 0,
          cancelled: statsObj.appointmentStatuses?.CANCELLED || 0
        },
        revenueStats: statsObj.revenueStats || [],
        dailyStats: statsObj.dailyStats || []
      };
    } catch (error: any) {
      return await this.calculateManualDashboardStats();
    }
  }

  private async calculateManualDashboardStats(existingStats: any = {}) {
    try {
      const [doctorsRes, appointmentsRes, usersRes] = await Promise.all([
        this.client.get('/api/admin/doctors?limit=100').catch(() => this.client.get('/api/doctors?limit=100')).catch(() => ({ data: [] })),
        this.client.get('/api/admin/appointments?limit=100').catch(() => this.client.get('/api/appointments?limit=100')).catch(() => ({ data: [] })),
        this.client.get('/api/admin/users?limit=100').catch(() => this.client.get('/api/users?limit=100')).catch(() => ({ data: [] }))
      ]);

      const extract = (res: any) => {
        const body = res.data || res;
        if (Array.isArray(body)) return body;
        if (Array.isArray(body.content)) return body.content;
        if (Array.isArray(body.data)) return body.data;
        if (Array.isArray(body.data?.content)) return body.data.content;
        return [];
      };

      const doctors = extract(doctorsRes);
      const appointments = extract(appointmentsRes);
      const users = extract(usersRes);

      const calcTotalRevenue = (list: any[]) => list
        .filter((a: any) => (a.status || '').toUpperCase() === 'COMPLETED' || (a.status || '').toUpperCase() === 'SUCCESS')
        .reduce((sum: number, a: any) => sum + (Number(a.price) || Number(a.doctorPrice) || 50), 0);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = appointments.filter((a: any) => (a.appointmentDate || a.createdAt || '').includes(dateStr)).length;
        dailyStats.push({ name: days[d.getDay()], appointments: count, fullDate: dateStr });
      }

      const now = new Date();
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
      const prevYear = curMonth === 0 ? curYear - 1 : curYear;

      const isMatch = (dStr: string, m: number, y: number) => {
        if (!dStr) return false;
        const d = new Date(dStr);
        return d.getMonth() === m && d.getFullYear() === y;
      };

      const calcTrend = (list: any[], dateField: string) => {
        const cur = list.filter(item => isMatch(item[dateField] || item.createdAt, curMonth, curYear)).length;
        const prev = list.filter(item => isMatch(item[dateField] || item.createdAt, prevMonth, prevYear)).length;
        if (prev === 0) return cur > 0 ? '+100%' : '+0%';
        const pct = Math.round(((cur - prev) / prev) * 100);
        return pct >= 0 ? `+${pct}%` : `${pct}%`;
      };

      const getRevenueForMonth = (m: number, y: number) => appointments
        .filter(a => ((a.status || '').toUpperCase() === 'COMPLETED' || (a.status || '').toUpperCase() === 'SUCCESS') && isMatch(a.appointmentDate || a.createdAt, m, y))
        .reduce((sum, a) => sum + (Number(a.price) || Number(a.doctorPrice) || 50), 0);

      const curRevVal = getRevenueForMonth(curMonth, curYear);
      const prevRevVal = getRevenueForMonth(prevMonth, prevYear);
      const revenueTrendPct = prevRevVal === 0 ? (curRevVal > 0 ? '+100%' : '+0%') : `${Math.round(((curRevVal - prevRevVal) / prevRevVal) * 100)}%`;

      return {
        totalDoctors: existingStats.totalDoctors || doctors.length,
        totalAppointments: existingStats.totalAppointments || appointments.length,
        totalUsers: existingStats.totalUsers || users.length,
        totalRevenue: calcTotalRevenue(appointments),
        monthlyRevenue: curRevVal,
        monthlyAppointments: appointments.filter((a: any) => isMatch(a.appointmentDate || a.createdAt, curMonth, curYear)).length,
        trends: {
          users: calcTrend(users, 'createdAt'),
          usersUp: !calcTrend(users, 'createdAt').startsWith('-'),
          appointments: calcTrend(appointments, 'appointmentDate'),
          appointmentsUp: !calcTrend(appointments, 'appointmentDate').startsWith('-'),
          revenue: revenueTrendPct.startsWith('-') ? revenueTrendPct : `+${revenueTrendPct}`,
          revenueUp: !revenueTrendPct.startsWith('-'),
          doctors: calcTrend(doctors, 'createdAt'),
          doctorsUp: !calcTrend(doctors, 'createdAt').startsWith('-')
        },
        appointmentStats: {
          pending: appointments.filter((a: any) => (a.status || '').toUpperCase() === 'PENDING').length,
          scheduled: appointments.filter((a: any) => (a.status || '').toUpperCase() === 'CONFIRMED').length,
          completed: appointments.filter((a: any) => (a.status || '').toUpperCase() === 'COMPLETED').length,
          cancelled: appointments.filter((a: any) => (a.status || '').toUpperCase() === 'CANCELLED').length
        },
        revenueStats: [{ month: 'Last Month', revenue: prevRevVal }, { month: 'This Month', revenue: curRevVal }],
        dailyStats
      };
    } catch (e: any) {
      return { totalDoctors: 0, totalAppointments: 0, totalUsers: 0, totalRevenue: 0 };
    }
  }

  // Payment methods
  async initiatePayment(appointmentId: string | number, paymentMethod: string, amount: number = 5000) {
    const res = await this.client.post('/api/payments/process', {
      appointmentId: Number(appointmentId),
      amount: amount,
      paymentMethod
    });
    return res.data;
  }

  async getPaymentStatus(paymentId: string | number) {
    const res = await this.client.get(`/api/payments/${paymentId}/status`);
    return res.data;
  }

  // Notifications endpoints
  async getNotifications(page = 1, limit = 20) {
    return (await this.client.get('/api/notifications', { params: { page, limit } })).data;
  }

  async getUnreadNotificationCount() {
    return (await this.client.get('/api/notifications/unread-count')).data;
  }

  async markNotificationAsRead(id: number) {
    return (await this.client.put(`/api/notifications/${id}/read`)).data;
  }

  async markAllNotificationsAsRead() {
    await this.client.put('/api/notifications/read-all');
  }
  async createReview(data: {
  appointmentId: string | number;
  doctorId: string | number;
  rating: number;
  comment: string;
}) {
  const res = await this.client.post('/api/reviews', {
    appointmentId: Number(data.appointmentId),
    doctorId: Number(data.doctorId),
    rating: Number(data.rating),
    comment: data.comment,
  });

  return res.data;
}

async getDoctorReviews(doctorId: string | number) {
  const res = await this.client.get(`/api/reviews/doctor/${doctorId}`);
  return res.data;
}
}

export const apiService = new ApiService();
