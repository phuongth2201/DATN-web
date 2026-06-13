'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppointmentStore } from '@/stores/appointmentStore';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileText,
  Check,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function DoctorAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;
  const { isAuthenticated, user } = useAuthStore();
  const {
    currentAppointment,
    isLoading,
    getAppointmentById,
  } = useAppointmentStore();
  const { toast } = useToast();

  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({ diagnosis: '', treatment: '', notes: '' });
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Verify user is doctor
    if (user?.role?.toUpperCase() !== 'ROLE_DOCTOR' && user?.role?.toUpperCase() !== 'DOCTOR') {
      router.push('/dashboard');
      return;
    }
    getAppointmentById(appointmentId);
  }, [appointmentId, isAuthenticated, user, getAppointmentById, router]);

  useEffect(() => {
    if (currentAppointment?.status === 'COMPLETED') {
      apiService.getMedicalRecords(1, 100).then((res) => {
        const records = Array.isArray(res) ? res : res.data || [];
        const record = records.find((r: any) => String(r.appointmentId) === String(currentAppointment.id));
        if (record) setMedicalRecord(record);
      }).catch(console.error);
    }
  }, [currentAppointment]);

  const formatAMPM = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${ampm}`;
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await apiService.updateAppointmentStatus(appointmentId, newStatus);
      toast({
        title: 'Status Updated',
        description: `Appointment marked as ${newStatus}`,
      });
      getAppointmentById(appointmentId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveMedicalRecord = async () => {
    if (!recordForm.diagnosis || !recordForm.treatment) {
      toast({ title: 'Error', description: 'Please fill in diagnosis and treatment.', variant: 'destructive' });
      return;
    }
    
    setIsSubmittingRecord(true);
    try {
      await apiService.createMedicalRecord({
        appointmentId: Number(currentAppointment?.id),
        diagnosis: recordForm.diagnosis,
        treatment: recordForm.treatment,
        notes: recordForm.notes,
        userId: Number(currentAppointment?.patientId || currentAppointment?.user?.id)
      });

      // Mark appointment as completed after saving record
      await apiService.updateAppointmentStatus(appointmentId, 'COMPLETED');

      toast({
        title: 'Success',
        description: 'Medical record saved and appointment completed.',
      });
      setIsRecordModalOpen(false);
      getAppointmentById(appointmentId);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save medical record.', variant: 'destructive' });
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50/50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (!currentAppointment) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50/50 flex flex-col justify-center items-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Appointment Not Found</h2>
          <Button onClick={() => router.push('/doctor-dashboard')}>Back to Dashboard</Button>
        </div>
      </>
    );
  }

  const patientIdentifier = currentAppointment.patientName || `Patient #${currentAppointment.patientId || String(currentAppointment.id).split('-')[1] || currentAppointment.id}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/doctor-dashboard')}
            className="mb-4 hover:bg-slate-200"
          >
            ← Back to Dashboard
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Appointment Details
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                ID: {currentAppointment.id} 
                <Badge variant={currentAppointment.status === 'COMPLETED' ? 'default' : currentAppointment.status === 'CANCELLED' ? 'destructive' : 'secondary'}>
                  {currentAppointment.status}
                </Badge>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Patient Info Card */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <UserIcon className="text-blue-600" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                    {patientIdentifier.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{patientIdentifier}</h3>
                    <p className="text-slate-500">Regular Patient</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Info Card */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-xl">Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Date</p>
                      <p className="font-semibold text-slate-800">
                        {new Date(currentAppointment.appointmentDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Time</p>
                      <p className="font-semibold text-slate-800">
                        {formatAMPM(currentAppointment.appointmentTime)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-t pt-6">
                  <MapPin size={24} className="text-indigo-600 mt-1" />
                  <div>
                    <p className="text-sm text-slate-500">Consultation Type</p>
                    <p className="font-semibold text-slate-800">
                      {currentAppointment.consultationType || 'General Consultation'}
                    </p>
                  </div>
                </div>

                {currentAppointment.symptoms && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">
                      Reason for Visit / Symptoms
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700">
                      <p>{currentAppointment.symptoms}</p>
                    </div>
                  </div>
                )}
                
                {currentAppointment.notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">
                      Patient Notes
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700">
                      <p>{currentAppointment.notes}</p>
                    </div>
                  </div>
                )}

                {/* Medical Record display if completed */}
                {medicalRecord && (
                  <div className="mt-6 border-t pt-6 border-blue-100">
                    <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Medical Record (Diagnosis & Treatment)
                    </h3>
                    <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 space-y-4">
                      <div>
                        <p className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wide">Diagnosis</p>
                        <p className="text-slate-800 whitespace-pre-wrap">{medicalRecord.diagnosis}</p>
                      </div>
                      <div className="h-px bg-blue-100 w-full my-2"></div>
                      <div>
                        <p className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wide">Treatment Plan / Prescription</p>
                        <p className="text-slate-800 whitespace-pre-wrap">{medicalRecord.treatment}</p>
                      </div>
                      {medicalRecord.notes && (
                        <>
                          <div className="h-px bg-blue-100 w-full my-2"></div>
                          <div>
                            <p className="text-sm font-bold text-blue-600 mb-1 uppercase tracking-wide">Doctor Notes</p>
                            <p className="text-slate-800 whitespace-pre-wrap">{medicalRecord.notes}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Actions */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm rounded-2xl sticky top-24">
              <CardHeader className="bg-slate-50 border-b rounded-t-2xl">
                <CardTitle className="text-lg font-bold text-slate-800">Doctor Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {currentAppointment.status === 'PENDING' && (
                  <>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-6"
                      onClick={() => handleUpdateStatus('CONFIRMED')}
                    >
                      <Check className="mr-2" size={18} />
                      Approve Appointment
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 py-6"
                      onClick={() => handleUpdateStatus('CANCELLED')}
                    >
                      <X className="mr-2" size={18} />
                      Reject Appointment
                    </Button>
                  </>
                )}

                {currentAppointment.status === 'CONFIRMED' && (
                  <>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setIsRecordModalOpen(true)}
                      disabled={currentAppointment.paymentStatus !== 'PAID'}
                      title={currentAppointment.paymentStatus !== 'PAID' ? 'Patient must pay before you can complete the appointment' : ''}
                    >
                      <FileText className="mr-2" size={18} />
                      {currentAppointment.paymentStatus !== 'PAID' ? 'Awaiting Payment' : 'Add Record & Complete'}
                    </Button>
                    {currentAppointment.paymentStatus !== 'PAID' && (
                      <p className="text-xs text-center text-amber-600 mt-2 font-medium">
                        Patient must pay the consultation fee first.
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 mt-4"
                      onClick={() => handleUpdateStatus('CANCELLED')}
                    >
                      Cancel Appointment
                    </Button>
                  </>
                )}

                {currentAppointment.status === 'COMPLETED' && (
                  <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <Check className="mx-auto text-emerald-500 mb-2" size={32} />
                    <p className="font-bold text-emerald-700">Appointment Completed</p>
                    <p className="text-sm text-emerald-600 mt-1">Medical record has been saved.</p>
                  </div>
                )}

                {currentAppointment.status === 'CANCELLED' && (
                  <div className="text-center p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <X className="mx-auto text-rose-500 mb-2" size={32} />
                    <p className="font-bold text-rose-700">Appointment Cancelled</p>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Payment Status:</span>
                    <span className={`font-semibold ${currentAppointment.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {currentAppointment.paymentStatus || 'UNPAID'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-bold text-slate-800">
                      {currentAppointment.price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentAppointment.price) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Medical Record Modal */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Add Medical Record</DialogTitle>
            <DialogDescription className="text-slate-500">
              Provide diagnosis and treatment details to complete this appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="diagnosis" className="text-slate-700 font-semibold">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                placeholder="Patient's condition or illness..."
                value={recordForm.diagnosis}
                onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                className="bg-slate-50/50 border-slate-200 focus:border-blue-500 rounded-xl min-h-[100px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="treatment" className="text-slate-700 font-semibold">Treatment Plan / Prescription</Label>
              <Textarea
                id="treatment"
                placeholder="Prescribed medications, recommended actions..."
                value={recordForm.treatment}
                onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                className="bg-slate-50/50 border-slate-200 focus:border-blue-500 rounded-xl min-h-[100px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-slate-700 font-semibold">Doctor Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional advice or internal notes..."
                value={recordForm.notes}
                onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                className="bg-slate-50/50 border-slate-200 focus:border-blue-500 rounded-xl min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRecordModalOpen(false)} className="rounded-xl border-slate-200">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMedicalRecord} 
              disabled={isSubmittingRecord}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmittingRecord ? 'Saving...' : 'Save Record & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
