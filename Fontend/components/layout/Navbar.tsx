'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAppointmentStore } from '@/stores/appointmentStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { API_BASE_URL } from '@/services/api';
import Cookie from 'js-cookie';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, Bell, Calendar, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { fetchAppointments } = useAppointmentStore();
  const { 
    notifications: storeNotifications, 
    unreadCount,
    markAsRead, 
    markAllAsRead, 
    fetchNotifications,
    fetchUnreadCount
  } = useNotificationStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      fetchNotifications(1);
      
      const token = Cookie.get('accessToken') || localStorage.getItem('accessToken');
      if (!token) return;

      const eventSource = new EventSource(`${API_BASE_URL}/api/notifications/stream?token=${token}`);
      
      eventSource.addEventListener('NOTIFICATION', (event) => {
        // When a new notification arrives via SSE, trigger our smart update logic
        fetchUnreadCount();
        try {
          const newNotification = JSON.parse(event.data);
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
        } catch (e) {
          console.error('Failed to parse SSE notification data', e);
        }
      });

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  }, [isAuthenticated, fetchUnreadCount, fetchNotifications]);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    setIsNotifyOpen(false);
    router.push('/');
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    if (n.relatedId) {
      router.push(`/appointments/${n.relatedId}`);
      setIsNotifyOpen(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            S
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
            Sunrise
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {isAuthenticated ? (
            <>
              <Link href={user?.role?.toUpperCase() === 'DOCTOR' || user?.role?.toUpperCase() === 'ROLE_DOCTOR' ? '/doctor-dashboard' : '/dashboard'} className="text-foreground/70 hover:text-primary font-medium transition-colors">
                {user?.role?.toUpperCase() === 'DOCTOR' || user?.role?.toUpperCase() === 'ROLE_DOCTOR' ? 'Dashboard' : 'Dashboard'}
              </Link>
              {!(user?.role?.toUpperCase() === 'DOCTOR' || user?.role?.toUpperCase() === 'ROLE_DOCTOR') && (
                <Link href="/appointments" className="text-foreground/70 hover:text-primary font-medium transition-colors">
                  Appointments
                </Link>
              )}
              <Link href="/profile" className="text-foreground/70 hover:text-primary font-medium transition-colors">
                Profile
              </Link>
              {(user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ROLE_ADMIN') && (
                <Link href="/admin" className="text-foreground/70 hover:text-primary font-medium transition-colors">
                  Admin Panel
                </Link>
              )}

              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotifyOpen(!isNotifyOpen)}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors relative"
                >
                  <Bell size={22} className={unreadCount > 0 ? "text-rose-500 animate-swing" : "text-slate-600"} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-black min-w-4 h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotifyOpen && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="font-black text-slate-900">Notifications</h4>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-[420px] overflow-y-auto scrollbar-hide py-2">
                      {storeNotifications.length === 0 ? (
                        <div className="py-12 text-center">
                          <Bell size={40} className="mx-auto text-slate-100 mb-4" />
                          <p className="text-sm text-slate-400">All caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {storeNotifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => handleNotificationClick(n)}
                              className={`px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors flex gap-4 ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                            >
                              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 leading-tight mb-1">{n.title}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                                <p className="text-[10px] font-medium text-slate-400 mt-2">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {storeNotifications.length > 0 && (
                      <Link 
                        href="/dashboard" 
                        onClick={() => setIsNotifyOpen(false)}
                        className="block py-4 text-center text-xs font-bold text-slate-400 hover:text-primary border-t border-slate-50 transition-colors"
                      >
                        View all activity
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pl-8 border-l">
                <div>
                  <p className="text-sm font-bold text-slate-900">{user?.fullName}</p>
                  <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut size={18} />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/doctors" className="text-foreground/70 hover:text-primary font-medium transition-colors">
                Find Doctors
              </Link>
              <Button variant="outline" onClick={() => router.push('/login')}>
                Login
              </Button>
              <Button onClick={() => router.push('/register')} className="bg-primary hover:bg-primary/90">
                Register
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-foreground hover:text-primary transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-card/95 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
          {isAuthenticated ? (
            <>
              <div className="px-4 py-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                <p className="text-sm font-bold text-slate-900">{user?.fullName}</p>
                <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
              </div>
              <Link href={user?.role?.toUpperCase() === 'DOCTOR' || user?.role?.toUpperCase() === 'ROLE_DOCTOR' ? '/doctor-dashboard' : '/dashboard'} className="block px-4 py-2 text-foreground hover:bg-primary/10 rounded transition-colors">
                {user?.role?.toUpperCase() === 'DOCTOR' || user?.role?.toUpperCase() === 'ROLE_DOCTOR' ? 'Dashboard' : 'Dashboard'}
              </Link>
              {!(user?.role?.toUpperCase() === 'DOCTOR' || user?.role?.toUpperCase() === 'ROLE_DOCTOR') && (
                <Link href="/appointments" className="block px-4 py-2 text-foreground hover:bg-primary/10 rounded transition-colors">
                  My Appointments
                </Link>
              )}
              <Link href="/profile" className="block px-4 py-2 text-foreground hover:bg-primary/10 rounded transition-colors">
                Profile
              </Link>
              {(user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ROLE_ADMIN') && (
                <Link href="/admin" className="block px-4 py-2 text-foreground hover:bg-primary/10 rounded transition-colors">
                  Admin Panel
                </Link>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full text-destructive hover:text-destructive mt-4"
              >
                <LogOut size={18} className="mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/doctors" className="block px-4 py-2 text-foreground hover:bg-primary/10 rounded transition-colors">
                Find Doctors
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  router.push('/login');
                  setIsMenuOpen(false);
                }}
                className="w-full"
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  router.push('/register');
                  setIsMenuOpen(false);
                }}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Register
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
