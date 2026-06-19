'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAppointmentStore } from '@/stores/appointmentStore';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle, CreditCard, ArrowUpDown, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { PaymentModal } from '@/components/PaymentModal';
import { useState } from 'react';

// Appointments cancelled because their doctor was deleted — handled separately
const isSystemCancelled = (apt: any) =>
  apt.status === 'CANCELLED' && typeof apt.notes === 'string' && apt.notes.includes('[SYSTEM]: Doctor is no longer available');

const isRebookPending = (apt: any) => apt.status === 'REBOOK_PENDING';

export default function AppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isInitialized, user } = useAuthStore();
  const { appointments, isLoading, fetchAppointments } = useAppointmentStore();
  const { toast } = useToast();
  const [selectedAptToPay, setSelectedAptToPay] = useState<any>(null);
  const [cancellingRebook, setCancellingRebook] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'created'>('created');
  const [sortByStatus, setSortByStatus] = useState(false);
  const paymentConfirmedRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const role = user?.role?.toUpperCase();
    if (role === 'DOCTOR' || role === 'ROLE_DOCTOR') {
      router.push('/doctor-dashboard');
      return;
    }

    fetchAppointments();
  }, [isInitialized, isAuthenticated, user?.role, fetchAppointments, router]);

  useEffect(() => {
    const paymentParam = searchParams.get('payment');
    const orderCode = searchParams.get('orderCode');
    if (paymentParam === 'success' && orderCode && !paymentConfirmedRef.current) {
      paymentConfirmedRef.current = true;
      apiService.confirmPaymentReturn(orderCode)
        .then(() => {
          toast({ title: 'Payment Successful', description: 'Your payment has been confirmed.' });
          fetchAppointments();
          router.replace('/appointments');
        })
        .catch(() => {
          toast({ title: 'Payment Noted', description: 'Payment received. Refreshing your appointments.', variant: 'default' });
          fetchAppointments();
          router.replace('/appointments');
        });
    } else if (paymentParam === 'cancel') {
      toast({ title: 'Payment Cancelled', description: 'Your payment was not completed.', variant: 'destructive' });
      router.replace('/appointments');
    }
  }, [searchParams, fetchAppointments, router, toast]);

  if (!isInitialized || !isAuthenticated) {
    return null;
  }

  const handleCancelRebook = async (aptId: string) => {
    setCancellingRebook(aptId);
    try {
      await apiService.cancelRebookRequest(aptId);
      toast({ title: 'Request Cancelled', description: 'Your rebook request has been withdrawn.' });
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: 'Failed to Cancel',
        description: error?.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancellingRebook(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'COMPLETED':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'REBOOK_PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <AlertCircle className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const STATUS_ORDER: Record<string, number> = { CONFIRMED: 0, PENDING: 1, COMPLETED: 2, CANCELLED: 3 };

  // Separate system-cancelled (doctor deleted) and rebook-pending from normal appointments
  const needsAttention = appointments.filter(isSystemCancelled);
  const rebookPendingApts = appointments.filter(isRebookPending);
  const normalAppointments = appointments.filter(apt => !isSystemCancelled(apt) && !isRebookPending(apt));

  const sortedAppointments = [...normalAppointments].sort((a, b) => {
    if (sortByStatus) {
      const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
    }
    if (sortBy === 'created') {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    }
    const dateDiff = new Date(b.appointmentDate + 'T00:00:00').getTime() - new Date(a.appointmentDate + 'T00:00:00').getTime();
    if (dateDiff !== 0) return dateDiff;
    return (b.appointmentTime ?? '').localeCompare(a.appointmentTime ?? '');
  });

  const filteredAppointments = sortedAppointments.filter(
    apt => (filterStatus === 'ALL' || apt.status === filterStatus) && (filterDate === '' || apt.appointmentDate === filterDate)
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
            <div>
              <h1 className="text-5xl font-bold text-foreground mb-2">
                My Appointments
              </h1>
              <p className="text-lg text-foreground/60">Manage and track your healthcare visits</p>
            </div>
            <Link href="/doctors">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2">
                Book New Appointment
              </Button>
            </Link>
          </div>

          {/* Doctor Unavailable — Needs Attention */}
          {!isLoading && needsAttention.length > 0 && (
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-amber-800">Appointments Requiring Action</h2>
                <span className="ml-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  {needsAttention.length}
                </span>
              </div>
              {needsAttention.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-amber-900">
                      Your appointment with <span className="underline">{apt.doctorName}</span> was cancelled because the doctor is no longer available.
                    </p>
                    <p className="text-sm text-amber-700">
                      {new Date(apt.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{apt.appointmentTime}
                    </p>
                    <p className="text-xs text-amber-600 font-medium">No extra charge — same slot, new doctor</p>
                  </div>
                  <Button
                    onClick={() => router.push(`/doctors?rebookId=${apt.id}`)}
                    className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shrink-0"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Change Doctor
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Rebook Pending — Awaiting Review */}
          {!isLoading && rebookPendingApts.length > 0 && (
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-bold text-amber-800">Awaiting Doctor Approval</h2>
                <span className="ml-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  {rebookPendingApts.length}
                </span>
              </div>
              {rebookPendingApts.map((apt) => (
                <div
                  key={apt.id}
                  className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-amber-900">
                      Rebook request submitted — waiting for{' '}
                      <span className="underline">{apt.pendingDoctorName || `Doctor #${apt.pendingDoctorId}`}</span> to respond
                    </p>
                    <p className="text-sm text-amber-700">
                      {new Date(apt.appointmentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{apt.appointmentTime}
                    </p>
                    <p className="text-xs text-amber-600 font-medium">Original doctor: {apt.doctorName}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      className="border-amber-400 text-amber-800 hover:bg-amber-100"
                      onClick={() => router.push(`/doctors?rebookId=${apt.id}`)}
                    >
                      Change Doctor
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      disabled={cancellingRebook === apt.id}
                      onClick={() => handleCancelRebook(apt.id)}
                    >
                      {cancellingRebook === apt.id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                          Cancelling...
                        </span>
                      ) : (
                        'Cancel Request'
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filter Section */}
          {!isLoading && normalAppointments.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm w-fit">
                <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer"
                >
                  <option value="ALL">All Appointments ({normalAppointments.length})</option>
                  <option value="PENDING">Pending ({normalAppointments.filter(a => a.status === 'PENDING').length})</option>
                  <option value="CONFIRMED">Confirmed ({normalAppointments.filter(a => a.status === 'CONFIRMED').length})</option>
                  <option value="COMPLETED">Completed ({normalAppointments.filter(a => a.status === 'COMPLETED').length})</option>
                  <option value="CANCELLED">Cancelled ({normalAppointments.filter(a => a.status === 'CANCELLED').length})</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm w-fit focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer"
                />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm w-fit">
                <ArrowUpDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'created')}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium cursor-pointer"
                >
                  <option value="created">Newest Created</option>
                  <option value="date">By Appointment Date</option>
                </select>
              </div>

              <button
                onClick={() => setSortByStatus(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm text-sm font-medium transition-all whitespace-nowrap ${
                  sortByStatus
                    ? 'bg-primary text-white border-primary shadow-primary/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-base leading-none">↕</span>
                By Status
                {sortByStatus && (
                  <span className="text-[10px] opacity-80 font-normal ml-0.5">
                    (Confirmed → Pending → ...)
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Appointments List */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-foreground/60 mt-4 text-lg">Loading your appointments...</p>
            </div>
          ) : normalAppointments.length === 0 && needsAttention.length === 0 && rebookPendingApts.length === 0 ? (
            <Card className="border-0 shadow-lg bg-muted/30">
              <CardContent className="p-16 text-center">
                <Calendar className="w-20 h-20 mx-auto text-muted-foreground mb-6 opacity-40" />
                <h3 className="text-2xl font-bold text-foreground mb-3">No Appointments Yet</h3>
                <p className="text-foreground/60 mb-8 text-lg">
                  You don&apos;t have any appointments yet. Book your first appointment with a healthcare professional now!
                </p>
                <Link href="/doctors">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3">
                    Browse Doctors
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : normalAppointments.length > 0 && filteredAppointments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold text-slate-700 mb-2">No appointments found</h3>
              <p className="text-slate-500">There are no appointments matching your filters.</p>
              {(filterStatus !== 'ALL' || filterDate !== '') && (
                <Button
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => { setFilterStatus('ALL'); setFilterDate(''); }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAppointments.map((appointment) => (
                <Card key={appointment.id} className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-4 gap-6 p-8">
                      {/* Status */}
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/60 font-semibold uppercase">Status</p>
                        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-medium mb-2 ${getStatusColor(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          <span>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).toLowerCase()}</span>
                        </div>
                        {appointment.paymentStatus === 'PAID' ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-semibold w-fit">
                            <CheckCircle className="w-3 h-3" /> PAID
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold w-fit">
                            <AlertCircle className="w-3 h-3" /> UNPAID
                          </div>
                        )}
                      </div>

                      {/* Date & Time */}
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/60 font-semibold uppercase">Date & Time</p>
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-semibold text-foreground">
                              {new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-foreground/60 flex items-center gap-1 mt-1">
                              <Clock className="w-4 h-4" />
                              {appointment.appointmentTime}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Doctor Info */}
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/60 font-semibold uppercase">Doctor</p>
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-secondary flex-shrink-0 mt-1" />
                          <div>
                            <p className="font-semibold text-foreground">{appointment.doctorName}</p>
                            <p className="text-sm text-foreground/60">{appointment.consultationType}</p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/60 font-semibold uppercase">Actions</p>
                        
                        {appointment.status === 'CONFIRMED' &&
                          appointment.paymentStatus !== 'PAID' &&
                          new Date(appointment.appointmentDate + 'T00:00:00') >= new Date(new Date().toDateString()) && (
                          <Button
                            onClick={() => setSelectedAptToPay(appointment)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white mb-2"
                          >
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay Now
                          </Button>
                        )}

                        <Link href={`/appointments/${appointment.id}`} className="block">
                          <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/10">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedAptToPay && (
        <PaymentModal 
          isOpen={!!selectedAptToPay}
          onClose={() => setSelectedAptToPay(null)}
          appointment={selectedAptToPay}
        />
      )}
    </>
  );
}
