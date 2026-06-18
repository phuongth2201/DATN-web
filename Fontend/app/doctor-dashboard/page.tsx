'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  XCircle, 
  Activity, 
  TrendingUp,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function DoctorDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useAuthStore();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState('');
  
  // Get today's date in YYYY-MM-DD
  const todayDate = new Date().toISOString().split('T')[0];

  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const [appliedFilterDate, setAppliedFilterDate] = useState<string>('');
  const [appliedFilterStatus, setAppliedFilterStatus] = useState<string>('ALL');
  
  // Track previous pending count for notifications
  const prevPendingCountRef = useRef<number>(-1);
  
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    diagnosis: '',
    treatment: '',
    notes: ''
  });
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  const formatAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    const role = user?.role?.toUpperCase();
    const isDoctor = role === 'DOCTOR' || role === 'ROLE_DOCTOR';
    
    if (!isAuthenticated || !isDoctor) {
      router.push('/login');
      return;
    }

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const checkProfileAndFetch = async () => {
      try {
        await apiService.getCurrentDoctor();
        // Profile exists, load appointments
        fetchAppointments();
      } catch (error: any) {
        if (error.response?.status === 404) {
          toast({
            title: 'Profile Incomplete',
            description: 'Please complete your onboarding profile first.',
          });
          router.push('/doctor-onboarding');
        } else {
          // Other error, just load appointments and see what happens
          fetchAppointments();
        }
      }
    };

    checkProfileAndFetch();
  }, [isInitialized, isAuthenticated, user?.role, router]);

  const fetchAppointments = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await apiService.getUserAppointments();
      const newAppointments = Array.isArray(response) ? response : response?.data || [];
      
      // Calculate pending count for notification
      const currentPending = newAppointments.filter((a: any) => a.status === 'PENDING').length;
      if (prevPendingCountRef.current !== -1 && currentPending > prevPendingCountRef.current) {
        toast({
          title: '🔔 New Appointment Request!',
          description: 'A patient has just booked a new appointment.',
          variant: 'default',
          className: 'bg-blue-600 text-white border-none',
        });
      }
      prevPendingCountRef.current = currentPending;

      setAppointments(newAppointments);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Removed polling to avoid continuous API calls and UI flickering

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await apiService.updateAppointmentStatus(id, newStatus);
      toast({
        title: 'Status Updated',
        description: `Appointment marked as ${newStatus}`,
      });
      fetchAppointments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleteClick = (apt: any) => {
    setSelectedApt(apt);
    setRecordForm({
      diagnosis: '',
      treatment: '',
      notes: ''
    });
    setIsRecordDialogOpen(true);
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApt) return;
    if (!recordForm.diagnosis.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter the diagnosis',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmittingRecord(true);
    try {
      // 1. Create medical record
      await apiService.createMedicalRecord({
        appointmentId: Number(selectedApt.id),
        doctorId: Number(selectedApt.doctorId || user?.id),
        diagnosis: recordForm.diagnosis,
        treatment: recordForm.treatment,
        notes: recordForm.notes,
        userId: Number(selectedApt.userId || selectedApt.patientId)
      });

      // 2. Mark appointment as completed
      await apiService.updateAppointmentStatus(selectedApt.id, 'COMPLETED');

      toast({
        title: 'Success',
        description: 'Consultation completed and medical record saved successfully.',
      });

      setIsRecordDialogOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error('Failed to complete appointment:', error);
      toast({
        title: 'Error',
        description: 'Could not save medical record and complete the appointment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const role = user?.role?.toUpperCase();
  const isDoctor = role === 'DOCTOR' || role === 'ROLE_DOCTOR';
  if (!isAuthenticated || !isDoctor) return null;

  // Apply filters using APPLIED states
  const filteredAppointments = appointments.filter(a => {
    let dateMatch = true;
    let statusMatch = true;
    
    if (appliedFilterDate) {
      if (!a.appointmentDate) {
        dateMatch = false;
      } else {
        try {
          const aptDate = new Date(a.appointmentDate).toISOString().split('T')[0];
          dateMatch = aptDate === appliedFilterDate;
        } catch (e) {
          dateMatch = false;
        }
      }
    }
    
    if (appliedFilterStatus !== 'ALL') {
      statusMatch = a.status === appliedFilterStatus;
    }
    
    return dateMatch && statusMatch;
  });

  const pendingAppointments = filteredAppointments.filter(a => a.status === 'PENDING');
  const scheduledAppointments = filteredAppointments.filter(a => a.status === 'CONFIRMED');
  const completedAppointments = filteredAppointments.filter(a => a.status === 'COMPLETED');
  const cancelledAppointments = filteredAppointments.filter(a => a.status === 'CANCELLED');

  const uniquePatients = new Set(
    appointments.map(a => a.patientId).filter(id => id != null)
  ).size;

  const ITEMS_PER_PAGE = 10;
  const STATUS_SORT: Record<string, number> = { PENDING: 0, CONFIRMED: 1, COMPLETED: 2, CANCELLED: 3 };
  const allSortedFiltered = [...filteredAppointments].sort((a, b) => {
    const diff = (STATUS_SORT[a.status] ?? 99) - (STATUS_SORT[b.status] ?? 99);
    if (diff !== 0) return diff;
    return new Date(b.appointmentDate + 'T00:00:00').getTime() - new Date(a.appointmentDate + 'T00:00:00').getTime();
  });
  const totalPages = Math.ceil(allSortedFiltered.length / ITEMS_PER_PAGE);
  const paginatedFiltered = allSortedFiltered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const pendingPage = paginatedFiltered.filter(a => a.status === 'PENDING');
  const scheduledPage = paginatedFiltered.filter(a => a.status === 'CONFIRMED');
  const historyPage = paginatedFiltered.filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED');

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F8FAFC]">
        {/* Doctor Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 to-indigo-800 py-16">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-white blur-[100px] rounded-full"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[120%] bg-indigo-300 blur-[100px] rounded-full"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-3 py-1 text-sm">
                  Doctor Workspace
                </Badge>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                  {greeting}, <span className="text-blue-200">{user?.fullName}</span>
                </h1>
                <p className="text-lg text-blue-100 max-w-2xl font-medium">
                  Manage your schedule, review patient records, and provide care efficiently.
                </p>
              </div>
              <div className="flex gap-4">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 h-12 px-6 rounded-xl font-bold shadow-lg">
                  <Calendar className="mr-2 h-5 w-5" /> View Calendar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 -mt-8 pb-20 relative z-20">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Pending Requests', value: pendingAppointments.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Upcoming Today', value: scheduledAppointments.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Patients Treated', value: completedAppointments.length, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Performance', value: '4.8★', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((stat, i) => (
              <Card key={i} className="border-0 shadow-md hover:shadow-lg transition-all group rounded-2xl overflow-hidden">
                <CardContent className="p-6 flex items-center justify-between bg-white">
                  <div>
                    <p className="text-sm font-semibold text-slate-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-slate-800">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-sm`}>
                    <stat.icon size={26} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-8 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Filter by Date</label>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Filter by Status</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex-none flex gap-2">
              <Button
                onClick={async () => {
                  setAppliedFilterDate(filterDate);
                  setAppliedFilterStatus(filterStatus);
                  setCurrentPage(1);
                  await fetchAppointments();
                }}
                className="h-[42px] bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterDate('');
                  setFilterStatus('ALL');
                  setAppliedFilterDate('');
                  setAppliedFilterStatus('ALL');
                  setCurrentPage(1);
                }}
                className="h-[42px]"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - Schedule */}
            <div className="lg:col-span-2 space-y-8">
              {/* Pending Appointments Section */}
              {pendingPage.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Activity className="text-amber-500 w-6 h-6" />
                    <h2 className="text-2xl font-bold text-slate-800">Pending Approvals</h2>
                    <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">{pendingAppointments.length}</Badge>
                  </div>
                  <div className="space-y-4">
                    {pendingPage.map(apt => (
                      <Card 
                        key={apt.id} 
                        className="border border-amber-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-amber-300 transition-all duration-300 overflow-hidden relative cursor-pointer group"
                        onClick={() => router.push(`/doctor-dashboard/appointments/${apt.id}`)}
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 mb-1">{(apt as any).patientName || `Patient #${apt.id}`}</h3>
                              <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-600 mb-2">
                                <span className="flex items-center gap-1"><Calendar size={14} className="text-slate-400" /> {new Date(apt.appointmentDate).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1"><Clock size={14} className="text-slate-400" /> {formatAMPM(apt.appointmentTime)}</span>
                              </div>
                              <p className="text-sm text-slate-500"><span className="font-semibold text-slate-700">Reason:</span> {apt.reason || 'N/A'}</p>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button 
                                variant="outline" 
                                className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(apt.id, 'CANCELLED');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(apt.id, 'CONFIRMED');
                                }}
                              >
                                Confirm
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {/* Scheduled Appointments */}
              {scheduledPage.length > 0 && (appliedFilterStatus === 'ALL' || appliedFilterStatus === 'CONFIRMED') && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-blue-600 w-6 h-6" />
                      <h2 className="text-2xl font-bold text-slate-800">Upcoming Consultations</h2>
                    </div>
                  </div>

                  {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scheduledPage.map(apt => (
                      <Card 
                        key={apt.id} 
                        className="border border-transparent shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 overflow-hidden relative cursor-pointer group"
                        onClick={() => router.push(`/doctor-dashboard/appointments/${apt.id}`)}
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row">
                            <div className="p-6 flex-1">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-slate-800">{(apt as any).patientName || `Patient #${apt.id}`}</h3>
                                <div className="flex flex-wrap gap-2 justify-end">
                                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">{apt.consultationType || 'Consultation'}</Badge>
                                  {apt.paymentStatus === 'PAID' ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">PAID</Badge>
                                  ) : (
                                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-0">UNPAID</Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center gap-2">
                                  <Calendar size={16} className="text-blue-500" />
                                  <span className="text-sm font-semibold text-slate-700">{new Date(apt.appointmentDate).toLocaleDateString()}</span>
                                </div>
                                <div className="bg-slate-50 p-2.5 rounded-lg flex items-center gap-2">
                                  <Clock size={16} className="text-blue-500" />
                                  <span className="text-sm font-semibold text-slate-700">{formatAMPM(apt.appointmentTime)}</span>
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 line-clamp-1"><span className="font-semibold text-slate-800">Reason:</span> {apt.reason || apt.notes}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-6 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:min-w-[220px]">
                              <Button 
                                className="w-full bg-slate-800 hover:bg-slate-900 shadow-md"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/doctor-dashboard/appointments/${apt.id}`);
                                }}
                              >
                                <FileText size={16} className="mr-2" /> View Details
                              </Button>
                              <Button 
                                variant="outline"
                                className={`w-full ${apt.paymentStatus === 'PAID' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (apt.paymentStatus === 'PAID') {
                                    handleMarkCompleteClick(apt);
                                  } else {
                                    toast({ title: 'Warning', description: 'Patient has not paid yet, cannot complete consultation.', variant: 'destructive' });
                                  }
                                }}
                              >
                                <CheckCircle size={16} className="mr-2" /> Mark Complete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
              )}

              {/* History / Other Appointments */}
              {historyPage.length > 0 && (appliedFilterStatus === 'ALL' || appliedFilterStatus === 'COMPLETED' || appliedFilterStatus === 'CANCELLED') && (
                <section className="mt-8 pt-8 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-6">
                    <h2 className="text-xl font-bold text-slate-800">History (Completed & Cancelled)</h2>
                  </div>
                  <div className="space-y-4">
                    {historyPage.map(apt => (
                      <Card 
                        key={apt.id} 
                        className={`border border-transparent shadow-sm overflow-hidden relative cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-slate-200 transition-all duration-300 ${apt.status === 'CANCELLED' ? 'opacity-70' : ''}`}
                        onClick={() => router.push(`/doctor-dashboard/appointments/${apt.id}`)}
                      >
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${apt.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-800">{(apt as any).patientName || `Patient #${apt.id}`}</h3>
                              <Badge className={apt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                                {apt.status}
                              </Badge>
                            </div>
                            <div className="flex gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(apt.appointmentDate).toLocaleDateString()}</span>
                              <span className="flex items-center gap-1"><Clock size={14}/> {formatAMPM(apt.appointmentTime)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-8">
              <Card className="border-0 shadow-sm bg-white rounded-2xl">
                <CardHeader>
                  <CardTitle>Schedule Overview</CardTitle>
                  <CardDescription>Your availability today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm">
                        <Clock size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">Working Hours</p>
                        <p className="font-bold text-slate-800">08:00 AM - 05:00 PM</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Next Appointments</h4>
                      <div className="space-y-3">
                        {scheduledAppointments.slice(0, 3).map((apt, i) => (
                          <div key={i} className="flex gap-3 relative">
                            <div className="flex flex-col items-center">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full z-10" />
                              {i !== 2 && <div className="w-0.5 h-full bg-blue-100 absolute top-2.5" />}
                            </div>
                            <div className="pb-3">
                              <p className="text-sm font-bold text-slate-800">{formatAMPM(apt.appointmentTime)}</p>
                              <p className="text-xs text-slate-500">{(apt as any).patientName || `Patient #${apt.id}`} • {apt.consultationType || 'Visit'}</p>
                            </div>
                          </div>
                        ))}
                        {scheduledAppointments.length === 0 && (
                          <p className="text-sm text-slate-500 italic">No more appointments today.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold mb-2">Need a break?</h3>
                  <p className="text-slate-300 text-sm mb-6">Manage your availability or block specific time slots.</p>
                  <Button className="w-full bg-white text-slate-900 hover:bg-slate-100">
                    Update Schedule Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Pagination */}
          {!isLoading && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                Next →
              </button>
            </div>
          )}

          {/* Empty state when no appointments exist at all */}
          {!isLoading && filteredAppointments.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Calendar className="w-14 h-14 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">No appointments found</h3>
              <p className="text-slate-500 text-sm">
                {appliedFilterDate || appliedFilterStatus !== 'ALL'
                  ? 'No appointments match your current filters.'
                  : 'You have no appointments yet.'}
              </p>
              {(appliedFilterDate || appliedFilterStatus !== 'ALL') && (
                <button
                  onClick={() => { setFilterDate(''); setFilterStatus('ALL'); setAppliedFilterDate(''); setAppliedFilterStatus('ALL'); setCurrentPage(1); }}
                  className="mt-4 px-5 py-2 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Input Medical Record Dialog */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-6 bg-white/95 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              Input Medical Record
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Complete the consultation by recording the diagnosis and treatment plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRecord} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis" className="text-sm font-bold text-slate-700 ml-1">
                Diagnosis <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="diagnosis"
                placeholder="e.g. Stage 1 Hypertension, needs monitoring..."
                value={recordForm.diagnosis}
                onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                className="bg-slate-50/50 border-slate-100 focus:border-primary rounded-xl min-h-[80px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatment" className="text-sm font-bold text-slate-700 ml-1">
                Treatment Plan / Prescription
              </Label>
              <Textarea
                id="treatment"
                placeholder="e.g. Amlodipine 5mg, take 1 pill in the morning after meal..."
                value={recordForm.treatment}
                onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                className="bg-slate-50/50 border-slate-100 focus:border-primary rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-bold text-slate-700 ml-1">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Doctor's advice for the patient..."
                value={recordForm.notes}
                onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                className="bg-slate-50/50 border-slate-100 focus:border-primary rounded-xl min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRecordDialogOpen(false)}
                className="rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRecord}
                className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                {isSubmittingRecord ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </div>
                ) : (
                  'Confirm Completion'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
