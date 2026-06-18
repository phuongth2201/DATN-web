'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { apiService } from '@/services/api';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Stethoscope, Building, BadgeDollarSign, Activity, FileText } from 'lucide-react';

export default function DoctorOnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { toast } = useToast();
  
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    bio: '',
    experience: '',
    price: '',
    license: '',
    specialtyId: '',
    hospitalId: ''
  });

  useEffect(() => {
    if (!isInitialized) return;
    
    // Check if user is a DOCTOR
    const role = user?.role?.toUpperCase();
    if (!isAuthenticated || (role !== 'DOCTOR' && role !== 'ROLE_DOCTOR')) {
      router.push('/');
      return;
    }

    const checkExistingProfile = async () => {
      try {
        const profile = await apiService.getCurrentDoctor();
        // If profile exists and has ID, redirect to dashboard
        if (profile && profile.id) {
          router.push('/doctor-dashboard');
          return;
        }
      } catch (error: any) {
        // If 404, it means they don't have a profile yet (which is correct for onboarding)
        if (error.response?.status !== 404) {
          console.error('Error checking profile', error);
        }
      }
      
      // Load specialties and hospitals for the dropdowns
      try {
        const [specs, hosps] = await Promise.all([
          apiService.getSpecialties(),
          apiService.getHospitals()
        ]);
        setSpecialties(specs?.data || []);
        setHospitals(hosps?.data || []);
      } catch (error) {
        console.error('Failed to load form data', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingProfile();
  }, [isInitialized, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.specialtyId || !formData.hospitalId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a Specialty and a Hospital.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName || undefined,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio,
        experience: parseInt(formData.experience) || 0,
        price: parseInt(formData.price) || 0,
        license: formData.license,
        specialtyId: parseInt(formData.specialtyId),
        hospitalId: parseInt(formData.hospitalId)
      };

      await apiService.createDoctorOnboarding(payload);
      
      toast({
        title: 'Welcome aboard!',
        description: 'Your doctor profile has been created successfully.',
      });
      
      // Navigate to dashboard
      router.push('/doctor-dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Complete Your Profile</h1>
            <p className="text-slate-600">Please provide your professional details to start accepting appointments.</p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Stethoscope className="h-6 w-6 text-blue-400" />
                Doctor Onboarding
              </CardTitle>
              <CardDescription className="text-slate-300">
                This information will be visible to patients when they book an appointment.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      name="fullName"
                      placeholder="Dr. John Doe (Leave blank to use account name)" 
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input 
                      id="phoneNumber" 
                      name="phoneNumber"
                      placeholder="0987654321" 
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="specialtyId" className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" /> Medical Specialty
                    </Label>
                    <select
                      id="specialtyId"
                      name="specialtyId"
                      value={formData.specialtyId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Select Specialty --</option>
                      {specialties.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.vietnamName})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hospitalId" className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-500" /> Associated Hospital
                    </Label>
                    <select
                      id="hospitalId"
                      name="hospitalId"
                      value={formData.hospitalId}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Select Hospital --</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input 
                      id="experience" 
                      name="experience"
                      type="number"
                      min="0"
                      placeholder="e.g. 10" 
                      value={formData.experience}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="flex items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 text-green-500" /> Consultation Fee (VND)
                    </Label>
                    <Input 
                      id="price" 
                      name="price"
                      type="number"
                      min="0"
                      step="50000"
                      placeholder="e.g. 500000" 
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" /> Medical License Number
                  </Label>
                  <Input 
                    id="license" 
                    name="license"
                    placeholder="e.g. MED-2023-XYZ" 
                    value={formData.license}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Biography</Label>
                  <Textarea 
                    id="bio" 
                    name="bio"
                    placeholder="Brief description about your expertise, background, and achievements..." 
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                  />
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving Profile...' : 'Complete Onboarding & Go to Dashboard'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
