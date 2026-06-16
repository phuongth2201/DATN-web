'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useAppointmentStore } from '@/stores/appointmentStore';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle, CreditCard, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { PaymentModal } from '@/components/PaymentModal';
import { useState } from 'react';

export default function AppointmentsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { appointments, isLoading, fetchAppointments } = useAppointmentStore();
  const { toast } = useToast();
  const [selectedAptToPay, setSelectedAptToPay] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'created'>('date');

  useEffect(() => {
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
  }, [isAuthenticated, user?.role, fetchAppointments, router]);

  if (!isAuthenticated) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'COMPLETED':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'CANCELLED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
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

  const sortedAppointments = [...appointments].sort((a, b) => {
    if (sortBy === 'created') {
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    }
    // 'date': sort by appointmentDate desc, then time desc
    const dateDiff = new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime();
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

          {/* Filter Section */}
          {!isLoading && appointments.length > 0 && (
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide flex-1">
                {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => (
                  <Button
                    key={status}
                    variant={filterStatus === status ? 'default' : 'outline'}
                    onClick={() => setFilterStatus(status)}
                    className={`rounded-full px-6 transition-all whitespace-nowrap ${filterStatus === status ? 'bg-primary text-white shadow-md' : 'bg-white hover:bg-slate-50'}`}
                  >
                    {status === 'ALL' ? 'All Appointments' : status.charAt(0) + status.slice(1).toLowerCase()}
                  </Button>
                ))}
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
                  <option value="date">By Appointment Date</option>
                  <option value="created">Newest Created</option>
                </select>
              </div>
            </div>
          )}

          {/* Appointments List */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-foreground/60 mt-4 text-lg">Loading your appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
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
          ) : filteredAppointments.length === 0 ? (
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
                        
                        {appointment.status === 'CONFIRMED' && appointment.paymentStatus !== 'PAID' && (
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
