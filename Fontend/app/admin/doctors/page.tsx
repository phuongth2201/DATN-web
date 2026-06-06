'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star, Edit, Eye, UserCheck, UserX, Save, X } from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminDoctorsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isConflictAlertOpen, setIsConflictAlertOpen] = useState(false);
  const [doctorToDelete, setDoctorToDelete] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mapDoctorData = (d: any) => {
    if (!d) return d;
    // Handle nested doctor object if it exists (some APIs wrap it)
    const data = d.doctor || d;
    
    return {
      ...data,
      id: String(data.id),
      fullName: data.fullName || data.name || (data.user ? `${data.user.firstName} ${data.user.lastName}` : 'Unknown Doctor'),
      specialtyId: data.specialtyId || data.specialty?.id || data.specialty_id || undefined,
      hospitalId: data.hospitalId || data.hospital?.id || data.hospital_id || undefined,
      specialization: data.specialization || data.specialtyName || (typeof data.specialty === 'object' ? data.specialty?.name : data.specialty) || data.specialty || 'N/A',
      yearsOfExperience: Number(data.yearsOfExperience || data.experience || data.years_of_experience || data.yearsExperience || 0),
      consultationFee: Number(data.consultationFee || data.price || data.consultation_fee || data.fee || 0),
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : (data.active !== undefined ? data.active : (data.activated !== undefined ? data.activated : true)),
      qualification: data.qualification || data.license || data.license_number || data.degree || data.certificate || 'N/A',
      rating: Number(data.rating || data.averageRating || data.average_rating || 0)
    };
  };

  useEffect(() => {
    if (!isInitialized) return;
    const role = user?.role?.toUpperCase();
    if (!isAuthenticated || (role !== 'ADMIN' && role !== 'ROLE_ADMIN')) {
      return;
    }

    const fetchInitialData = async () => {
      try {
        const [docsRes, specsRes, hospsRes] = await Promise.all([
          apiService.getAllDoctors(page, 10),
          apiService.getSpecialties(),
          apiService.getHospitals()
        ]);

        let docsList = [];
        if (Array.isArray(docsRes)) docsList = docsRes;
        else if (Array.isArray(docsRes?.data)) docsList = docsRes.data;
        else if (docsRes?.data?.doctors) docsList = docsRes.data.doctors;
        else if (docsRes?.doctors) docsList = docsRes.doctors;
        
        const mappedDocs = docsList.map(mapDoctorData);
        setDoctors(mappedDocs);
        setSpecialties(Array.isArray(specsRes.data) ? specsRes.data : specsRes);
        setHospitals(Array.isArray(hospsRes.data) ? hospsRes.data : hospsRes);

        // Background Enrichment: Fetch full details for each doctor to get missing fields
        mappedDocs.forEach(async (doc: any) => {
          try {
            const fullDetail = await apiService.getDoctorById(doc.id);
            const enrichedDoc = mapDoctorData(fullDetail?.data || fullDetail);
            setDoctors(prev => prev.map(d => d.id === doc.id ? enrichedDoc : d));
          } catch (e) {
            console.warn(`Failed to enrich doctor ${doc.id}`);
          }
        });
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [isAuthenticated, user?.role, router, page]);


  const handleEdit = async (doctor: any) => {
    try {
      // Fetch full doctor details to get specialtyId, hospitalId, etc.
      const fullDoctor = await apiService.getDoctorById(doctor.id);
      setSelectedDoctor(mapDoctorData(fullDoctor));
    } catch (error) {
      console.warn('Failed to fetch full doctor details, using list data:', error);
      setSelectedDoctor({ ...doctor });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDoctor) return;
    setIsSaving(true);
    try {
      const response = await apiService.updateDoctor(selectedDoctor.id, selectedDoctor);
      const updatedDoc = response.doctor || selectedDoctor;
      
      setDoctors(
        doctors.map((d) =>
          d.id === selectedDoctor.id ? mapDoctorData(updatedDoc) : d
        )
      );
      toast({
        title: 'Success',
        description: response.message || 'Doctor profile updated successfully.',
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Failed to update doctor:', error);
      const message = error.response?.data?.message || 'Failed to update doctor information.';
      toast({
        title: 'Update Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, currentStatus: boolean) => {
    try {
      const fullDetail = await apiService.getDoctorById(id);
      const doctorData = fullDetail?.data || fullDetail;
      
      // Find specialtyId by name if it's missing (since detail API returns specialty as string)
      let sId = doctorData.specialtyId;
      if (!sId && doctorData.specialty) {
        const specName = typeof doctorData.specialty === 'object' ? doctorData.specialty.name : doctorData.specialty;
        const foundSpec = specialties.find(s => s.name === specName || s.vietnamName === specName);
        if (foundSpec) sId = foundSpec.id;
      }

      const response = await apiService.updateDoctor(id, { 
        ...doctorData,
        specialtyId: sId,
        active: !currentStatus 
      });
      
      // If we are deactivating, remove from the current list as requested
      if (currentStatus) { // currentStatus is true, so we are turning it to false (Deactivating)
        setDoctors(doctors.filter(d => d.id !== id));
        toast({
          title: 'Doctor Hidden',
          description: 'Doctor has been deactivated and hidden from the list.',
        });
      } else {
        // If activating (though they might be hidden), update the data
        const updatedDoc = response.doctor || { ...mapDoctorData(doctorData), isAvailable: true };
        setDoctors(doctors.map((d) => d.id === id ? mapDoctorData(updatedDoc) : d));
      }
    } catch (error: any) {
      console.error('Failed to update doctor status:', error);
      toast({
        title: 'Update Failed',
        description: error.response?.data?.message || 'Failed to update doctor status.',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = async () => {
    if (!doctorToDelete) return;
    try {
      await apiService.deleteDoctor(doctorToDelete.id);
      setDoctors(doctors.filter((d) => d.id !== doctorToDelete.id));
      toast({
        title: 'Thành công',
        description: 'Bác sĩ đã được xóa khỏi hệ thống.',
      });
      setIsDeleteAlertOpen(false);
    } catch (error: any) {
      console.error('Failed to delete doctor:', error);
      setIsDeleteAlertOpen(false);
      
      if (error.response?.status === 409) {
        setIsConflictAlertOpen(true);
      } else {
        toast({
          title: 'Lỗi khi xóa',
          description: error.response?.data?.message || 'Đã có lỗi xảy ra khi xóa bác sĩ.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = (doctor: any) => {
    setDoctorToDelete(doctor);
    setIsDeleteAlertOpen(true);
  };

  const filteredDoctors = doctors.filter(
    (d) =>
      (d.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.specialization || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const role = user?.role?.toUpperCase();
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!isAuthenticated || (role !== 'ADMIN' && role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Doctor Management
            </h1>
            <p className="text-gray-600">Manage doctor profiles and availability</p>
          </div>

          {/* Search */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Search by name or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Doctors Table */}
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">Loading doctors...</p>
              </CardContent>
            </Card>
          ) : filteredDoctors.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">No doctors found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => (
                <Card key={doctor.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-semibold text-lg">
                            {doctor.fullName}
                          </h3>
                          <span className="text-blue-600 font-medium">
                            {doctor.specialization}
                          </span>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                              doctor.isAvailable
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {doctor.isAvailable ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <p className="text-gray-600">Qualification</p>
                            <p className="font-medium">{doctor.qualification}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Experience</p>
                            <p className="font-medium">
                              {doctor.yearsOfExperience} years
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Fee</p>
                            <p className="font-medium">
                              ${doctor.consultationFee}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Rating</p>
                            <div className="flex items-center gap-1">
                              <Star size={16} className="fill-yellow-400 text-yellow-400" />
                              <p className="font-medium">{doctor.rating || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/doctors/${doctor.id}`)}>
                          <Eye size={16} className="mr-1" /> View Profile
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(doctor)}>
                          <Edit size={16} className="mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            doctor.isAvailable ? 'destructive' : 'default'
                          }
                          className={doctor.isAvailable ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : 'bg-green-600 hover:bg-green-700 text-white'}
                          onClick={() =>
                            handleStatusUpdate(doctor.id, doctor.isAvailable)
                          }
                        >
                          {doctor.isAvailable ? (
                            <><UserX size={16} className="mr-1" /> Deactivate</>
                          ) : (
                            <><UserCheck size={16} className="mr-1" /> Activate</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleDelete(doctor)}
                        >
                          <X size={16} className="mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && doctors.length > 0 && (
            <div className="flex justify-between items-center mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-gray-600">Page {page}</span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Edit Doctor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Doctor Profile</DialogTitle>
            <DialogDescription>
              Update information for Dr. {selectedDoctor?.fullName}
            </DialogDescription>
          </DialogHeader>

          {selectedDoctor && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Full Name</Label>
                <Input
                  id="name"
                  value={selectedDoctor.fullName || ''}
                  onChange={(e) => setSelectedDoctor({ ...selectedDoctor, fullName: e.target.value })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="specialty" className="text-right">Specialty</Label>
                <div className="col-span-3">
                  <Select 
                    value={String(selectedDoctor.specialtyId || '')} 
                    onValueChange={(val) => setSelectedDoctor({ ...selectedDoctor, specialtyId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hospital" className="text-right">Hospital</Label>
                <div className="col-span-3">
                  <Select 
                    value={String(selectedDoctor.hospitalId || '')} 
                    onValueChange={(val) => setSelectedDoctor({ ...selectedDoctor, hospitalId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select hospital" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((h) => (
                        <SelectItem key={h.id} value={String(h.id)}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="experience" className="text-right">Experience (Years)</Label>
                <Input
                  id="experience"
                  type="number"
                  value={selectedDoctor.yearsOfExperience || 0}
                  onChange={(e) => setSelectedDoctor({ ...selectedDoctor, yearsOfExperience: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Consultation Fee ($)</Label>
                <Input
                  id="price"
                  type="number"
                  value={selectedDoctor.consultationFee || 0}
                  onChange={(e) => setSelectedDoctor({ ...selectedDoctor, consultationFee: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="bio" className="text-right pt-2">Biography</Label>
                <Textarea
                  id="bio"
                  value={selectedDoctor.bio || ''}
                  onChange={(e) => setSelectedDoctor({ ...selectedDoctor, bio: e.target.value })}
                  className="col-span-3 h-32"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
              {!isSaving && <Save size={16} className="ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bác sĩ?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa bác sĩ <span className="font-bold text-gray-900">{doctorToDelete?.fullName}</span>? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict / Cannot Delete Alert */}
      <AlertDialog open={isConflictAlertOpen} onOpenChange={setIsConflictAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Không thể xóa bác sĩ</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Bác sĩ <span className="font-bold">{doctorToDelete?.fullName}</span> hiện đang có dữ liệu liên quan trong hệ thống 
                (lịch hẹn, hồ sơ bệnh án hoặc đánh giá).
              </p>
              <p className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800">
                <strong>Giải pháp:</strong> Hệ thống yêu cầu giữ lại thông tin này để phục vụ báo cáo. 
                Bạn hãy sử dụng nút <strong className="text-red-600">"Deactivate"</strong> để ẩn bác sĩ khỏi danh sách thay vì xóa hoàn toàn.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsConflictAlertOpen(false)}>
              Đã hiểu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
