'use client';

import { useEffect, useState, Suspense } from 'react';
import { useDoctorStore } from '@/stores/doctorStore';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MapPin, Award, Stethoscope, Search, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

function DoctorsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rebookId = searchParams.get('rebookId');
  const { toast } = useToast();

  const { doctors, isLoading, searchDoctors } = useDoctorStore();
  const [specialization, setSpecialization] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [rebooking, setRebooking] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await apiService.getSpecialties();
        if (res?.data) setSpecializations(res.data);
      } catch (error) {
        console.error('Failed to fetch specialties:', error);
      }
    };
    fetchSpecialties();
  }, []);

  useEffect(() => {
    searchDoctors({ keyword: '', specialization: '', minRating: 0 });
  }, [searchDoctors]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchDoctors({ keyword, specialization, minRating });
  };

  const handleRebook = async (doctorId: string | number) => {
    if (!rebookId) return;
    setRebooking(String(doctorId));
    try {
      await apiService.rebookAppointment(rebookId, doctorId);
      toast({
        title: 'Request Submitted',
        description: 'Your rebook request has been sent for review. You will be notified once the doctor approves or rejects it.',
      });
      router.push('/appointments');
    } catch (error: any) {
      toast({
        title: 'Failed to Submit Request',
        description: error?.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRebooking(null);
    }
  };

  const formatDoctorName = (name: string) => {
    if (!name) return 'Dr.';
    return /^dr\.?\s/i.test(name) ? name : `Dr. ${name}`;
  };

  const nameInitial = (name: string) => {
    if (!name) return 'D';
    const stripped = name.replace(/^dr\.?\s+/i, '');
    return stripped.charAt(0).toUpperCase();
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 py-12">

          {/* Rebook Banner */}
          {rebookId && (
            <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Selecting a replacement doctor</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Click <strong>Select This Doctor</strong> on any card below to update your existing appointment. Same date and time — no extra charge.
                </p>
              </div>
              <button
                onClick={() => router.push('/appointments')}
                className="flex items-center gap-1 text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-foreground mb-3">
              {rebookId ? 'Choose a New Doctor' : 'Find Your Perfect Doctor'}
            </h1>
            <p className="text-xl text-foreground/60 max-w-2xl">
              {rebookId
                ? 'Select any available doctor below to replace your cancelled appointment'
                : 'Search and book appointments with qualified healthcare professionals'}
            </p>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-lg mb-12">
            <CardContent className="p-8">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="grid md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground block">Search</label>
                    <input
                      type="text"
                      placeholder="Doctor name..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground block">Medical Specialty</label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary transition"
                    >
                      <option value="">All Specialties</option>
                      {specializations.map((spec) => (
                        <option key={spec.id || spec.name} value={spec.name}>
                          {spec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground block">Minimum Rating</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={minRating}
                        onChange={(e) => setMinRating(parseFloat(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm font-semibold text-primary min-w-12">{minRating}★</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground block">&nbsp;</label>
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3">
                      <Search className="w-4 h-4 mr-2" />
                      Search Doctors
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Doctors List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-foreground/60 mt-4">Loading doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <Card className="border-0 shadow-md bg-muted/30">
              <CardContent className="p-12 text-center">
                <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-foreground/60 text-lg">No doctors found. Try adjusting your filters.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="border-0 shadow-md hover:shadow-xl transition-shadow overflow-hidden group">
                  <CardContent className="p-0">
                    {/* Doctor Header */}
                    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 text-center border-b">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full mx-auto mb-4 flex items-center justify-center text-white shadow-md">
                        <span className="text-3xl font-bold">{nameInitial(doctor.fullName)}</span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-1">{formatDoctorName(doctor.fullName)}</h3>
                      <p className="text-primary font-semibold">{doctor.specialization}</p>
                    </div>

                    {/* Doctor Info */}
                    <div className="p-6 space-y-4">
                      <div className="space-y-3 text-sm">
                        {doctor.qualification && (
                          <div className="flex items-start gap-3">
                            <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-foreground/60 text-xs">Qualification</p>
                              <p className="font-medium text-foreground">{doctor.qualification}</p>
                            </div>
                          </div>
                        )}
                        {doctor.yearsOfExperience && (
                          <div className="flex items-start gap-3">
                            <Stethoscope className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-foreground/60 text-xs">Experience</p>
                              <p className="font-medium text-foreground">{doctor.yearsOfExperience} years</p>
                            </div>
                          </div>
                        )}
                        {doctor.consultationFee && (
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-foreground/60 text-xs">Consultation Fee</p>
                              <p className="font-medium text-foreground">${doctor.consultationFee}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {doctor.rating && (
                        <div className="flex items-center gap-2 py-3 border-t border-border">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                className={i < Math.floor(doctor.rating!) ? 'fill-accent text-accent' : 'text-muted-foreground'}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{doctor.rating.toFixed(1)}</span>
                        </div>
                      )}

                      {/* Button: Select for rebook OR normal profile link */}
                      {rebookId ? (
                        <Button
                          className="w-full mt-2"
                          onClick={() => handleRebook(doctor.id!)}
                          disabled={rebooking === String(doctor.id)}
                        >
                          {rebooking === String(doctor.id) ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Updating...
                            </span>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Select This Doctor
                            </>
                          )}
                        </Button>
                      ) : (
                        <Link href={`/doctors/${doctor.id}`} className="block">
                          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-2">
                            View Profile & Book
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    }>
      <DoctorsPageInner />
    </Suspense>
  );
}
