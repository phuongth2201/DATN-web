'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Plus, Search, Trash2, Save, X, Activity, Info } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function AdminSpecialtiesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const { toast } = useToast();
  
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isConflictAlertOpen, setIsConflictAlertOpen] = useState(false);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<any>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  useEffect(() => {
    if (!isInitialized) return;
    const role = user?.role?.toUpperCase();
    if (!isAuthenticated || (role !== 'ADMIN' && role !== 'ROLE_ADMIN')) {
      router.push('/');
      return;
    }

    fetchSpecialties();
  }, [isAuthenticated, user?.role, router, isInitialized]);

  const fetchSpecialties = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getAllSpecialtiesAdmin();
      setSpecialties(Array.isArray(response.data) ? response.data : response);
    } catch (error) {
      console.error('Failed to fetch specialties:', error);
      toast({
        title: 'Error',
        description: 'Failed to load specialties list.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setSelectedSpecialty({
      name: '',
      vietnamName: '',
      icon: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (specialty: any) => {
    setModalMode('edit');
    setSelectedSpecialty({ ...specialty });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedSpecialty.name) {
      toast({
        title: 'Validation Error',
        description: 'English Name is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (modalMode === 'add') {
        const response = await apiService.createSpecialty(selectedSpecialty);
        toast({
          title: 'Success',
          description: response.message || 'Specialty added successfully.',
        });
      } else {
        const response = await apiService.updateSpecialty(selectedSpecialty.id, selectedSpecialty);
        toast({
          title: 'Success',
          description: response.message || 'Specialty updated successfully.',
        });
      }
      setIsModalOpen(false);
      fetchSpecialties();
    } catch (error: any) {
      console.error('Failed to save specialty:', error);
      toast({
        title: 'Operation Failed',
        description: error.response?.data?.message || 'An error occurred while saving.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (specialty: any) => {
    setSpecialtyToDelete(specialty);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!specialtyToDelete) return;
    try {
      await apiService.deleteSpecialty(specialtyToDelete.id);
      toast({
        title: 'Deleted',
        description: 'Specialty has been removed.',
      });
      setIsDeleteAlertOpen(false);
      fetchSpecialties();
    } catch (error: any) {
      console.error('Failed to delete specialty:', error);
      setIsDeleteAlertOpen(false);
      if (error.response?.status === 409 || error.response?.data?.code === 'SPECIALTY_DELETE_CONFLICT') {
        setIsConflictAlertOpen(true);
      } else {
        toast({
          title: 'Delete Failed',
          description: error.response?.data?.message || 'Failed to delete specialty.',
          variant: 'destructive',
        });
      }
    }
  };

  const filteredSpecialties = Array.isArray(specialties) ? specialties.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.vietnamName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const role = user?.role?.toUpperCase();
  if (!isInitialized || !isAuthenticated || (role !== 'ADMIN' && role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                Specialty <span className="text-blue-600">Management</span>
              </h1>
              <p className="text-slate-500 font-medium">Configure medical specialties and departments</p>
            </div>
            <Button 
              onClick={handleAdd}
              className="rounded-2xl h-12 px-6 shadow-xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 font-bold"
            >
              <Plus className="w-5 h-5 mr-2" /> Add New Specialty
            </Button>
          </div>

          {/* Search & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="md:col-span-2 border-0 shadow-sm overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400 ml-2" />
                <Input
                  placeholder="Search by name or Vietnamese name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 focus-visible:ring-0 shadow-none text-lg placeholder:text-slate-400"
                />
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-blue-600 text-white">
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Total Specialties</p>
                  <p className="text-3xl font-black">{specialties.length}</p>
                </div>
                <Activity size={40} className="text-blue-400/50" />
              </CardContent>
            </Card>
          </div>

          {/* Specialties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-sm animate-pulse h-48" />
              ))}
            </div>
          ) : filteredSpecialties.length === 0 ? (
            <Card className="border-0 shadow-sm py-20 text-center">
              <CardContent>
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={32} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No specialties found</h3>
                <p className="text-slate-500">Try adjusting your search or add a new specialty.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpecialties.map((specialty) => (
                <Card key={specialty.id} className="border-0 shadow-sm hover:shadow-md transition-all group">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                        {specialty.icon || '🏥'}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(specialty)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(specialty)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-black text-slate-900">{specialty.name}</CardTitle>
                    <p className="text-blue-600 font-bold text-sm uppercase tracking-wide">{specialty.vietnamName}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-4 h-10">
                      {specialty.description || 'No description available.'}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">
                          ID: {specialty.id}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                        <Activity size={16} className="text-emerald-500" />
                        <span>{specialty.doctorCount || 0}</span>
                        <span className="text-xs text-slate-400 font-medium">Doctors</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {modalMode === 'add' ? 'Add New Specialty' : 'Edit Specialty'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {modalMode === 'add' 
                ? 'Fill in the details to create a new medical department.' 
                : `Updating information for ${selectedSpecialty?.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedSpecialty && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-bold text-slate-700">English Name *</Label>
                  <Input
                    id="name"
                    value={selectedSpecialty.name}
                    onChange={(e) => setSelectedSpecialty({ ...selectedSpecialty, name: e.target.value })}
                    className="rounded-xl border-slate-200 h-11 focus:ring-blue-600"
                    placeholder="e.g. Cardiology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vietnamName" className="text-sm font-bold text-slate-700">Vietnamese Name</Label>
                  <Input
                    id="vietnamName"
                    value={selectedSpecialty.vietnamName}
                    onChange={(e) => setSelectedSpecialty({ ...selectedSpecialty, vietnamName: e.target.value })}
                    className="rounded-xl border-slate-200 h-11 focus:ring-blue-600"
                    placeholder="vd: Tim mạch"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon" className="text-sm font-bold text-slate-700">Icon (Emoji or URL)</Label>
                <div className="flex gap-2">
                  <Input
                    id="icon"
                    value={selectedSpecialty.icon}
                    onChange={(e) => setSelectedSpecialty({ ...selectedSpecialty, icon: e.target.value })}
                    className="rounded-xl border-slate-200 h-11 focus:ring-blue-600"
                    placeholder="e.g. ❤️, 🧠, 🦷"
                  />
                  <div className="w-11 h-11 flex items-center justify-center bg-slate-100 rounded-xl text-2xl">
                    {selectedSpecialty.icon || '🏥'}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-bold text-slate-700">Description</Label>
                <Textarea
                  id="description"
                  value={selectedSpecialty.description}
                  onChange={(e) => setSelectedSpecialty({ ...selectedSpecialty, description: e.target.value })}
                  className="rounded-xl border-slate-200 h-32 focus:ring-blue-600 resize-none"
                  placeholder="Tell us about this specialty..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold h-11 px-6">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="rounded-xl h-11 px-8 shadow-lg shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {isSaving ? 'Saving...' : (modalMode === 'add' ? 'Create Specialty' : 'Save Changes')}
              {!isSaving && <Save size={18} className="ml-2" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-3xl border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Are you sure you want to delete <span className="font-bold text-slate-900">{specialtyToDelete?.name}</span>? 
              This action will remove the department from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              Yes, Delete Specialty
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Conflict Alert */}
      <AlertDialog open={isConflictAlertOpen} onOpenChange={setIsConflictAlertOpen}>
        <AlertDialogContent className="rounded-3xl border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 text-xl font-black flex items-center gap-2">
              <Info className="w-6 h-6" /> Cannot Delete Specialty
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-slate-700">
                The specialty <span className="font-bold">{specialtyToDelete?.name}</span> cannot be deleted because it is currently linked to 
                <span className="font-bold text-blue-600"> {specialtyToDelete?.doctorCount} active doctors</span>.
              </p>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-800 text-sm">
                <strong>Solution:</strong> Please reassign or deactivate all doctors associated with this specialty before attempting to delete it.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsConflictAlertOpen(false)} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold">
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
