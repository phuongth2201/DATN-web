"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  User as UserIcon,
  Shield,
  CheckCircle,
  Save,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiService } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { AlertCircle } from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Error Alert State
  const [isErrorAlertOpen, setIsErrorAlertOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getAllUsers(page, 10);
      let usersList = [];
      if (Array.isArray(response)) usersList = response;
      else if (Array.isArray(response?.data)) usersList = response.data;
      else if (response?.data?.users) usersList = response.data.users;
      else if (response?.users) usersList = response.users;

      setUsers(usersList);
      if (response?.pagination?.totalPages) setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description: "Failed to load users list.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    const role = user?.role?.toUpperCase();
    if (!isAuthenticated || (role !== "ADMIN" && role !== "ROLE_ADMIN")) {
      router.push("/");
      return;
    }

    fetchUsers();
  }, [isAuthenticated, user?.role, router, page, isInitialized]);

  const filteredUsers = users.filter(
    (u) =>
      (u.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const RequiredMark = () => <span className="text-red-500 ml-1">*</span>;

  const RequiredMessage = ({ message }: { message: string }) => (
    <p className="text-xs font-medium text-red-500 mt-1">{message}</p>
  );

  const updateSelectedUserField = (field: string, value: any) => {
    setSelectedUser((prev: any) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateCreateUser = () => {
    if (!isCreateMode || !selectedUser) return true;

    const errors: Record<string, string> = {};
    if (!(selectedUser.fullName || "").trim()) {
      errors.fullName = "Please enter your full name.";
    }
    if (!(selectedUser.email || "").trim()) {
      errors.email = "Please enter your email.";
    }
    if (!selectedUser.authorities?.[0]) {
      errors.authorities = "Please select a role.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleViewDetails = async (u: any) => {
    try {
      const fullUser = await apiService.getUserById(u.login || u.email);
      setSelectedUser(fullUser);
      setIsEditMode(false);
      setFieldErrors({});
      setIsModalOpen(true);
    } catch (error) {
      setSelectedUser(u);
      setIsEditMode(false);
      setIsCreateMode(false);
      setFieldErrors({});
      setIsModalOpen(true);
    }
  };

  const handleEdit = async (u: any) => {
    try {
      // Fetch full user details to get correct login and other fields
      const fullUser = await apiService.getUserById(u.login || u.email);
      setSelectedUser({ ...fullUser });
    } catch (error) {
      setSelectedUser({ ...u });
    }
    setIsEditMode(true);
    setIsCreateMode(false);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser({
      fullName: "",
      email: "",
      phoneNumber: "",
      authorities: ["ROLE_USER"],
      password: "Hospital@123",
    });
    setIsEditMode(true);
    setIsCreateMode(true);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    if (!validateCreateUser()) return;
    setIsSaving(true);
    try {
      const nameParts = (selectedUser.fullName || "").trim().split(" ");
      const firstName = nameParts[0] || selectedUser.firstName || "";
      const lastName =
        nameParts.slice(1).join(" ") || selectedUser.lastName || "";

      const updateData = {
        ...selectedUser,
        firstName,
        lastName,
        login: selectedUser.login || selectedUser.email.split("@")[0],
      };

      if (isCreateMode) {
        await apiService.createUser(updateData);
        toast({
          title: "User Created",
          description: `Account created. Initial password: ${updateData.password || "Hospital@123"}`,
        });
      } else {
        await apiService.updateUser(updateData);
        toast({
          title: "Success",
          description: "User information updated successfully.",
        });
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      toast({
        title: "Error",
        description: "Failed to update user information.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (u: any) => {
    setUserToDelete(u);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const u = userToDelete;
    setIsDeleteConfirmOpen(false);
    setUserToDelete(null);
    const identifier = u.id || u.login || u.email;
    try {
      await apiService.deleteUser(identifier);
      toast({
        title: "User Deactivated",
        description: "The user account has been deactivated successfully.",
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to delete user:", error);

      // Show beautiful error dialog
      if (error.response?.status === 500 || error.response?.status === 400) {
        setErrorAlertMessage(
          "This user currently has appointments or related data, and cannot be deleted directly!",
        );
      } else {
        setErrorAlertMessage(
          "An error occurred during user deletion. Please try again later.",
        );
      }
      setIsErrorAlertOpen(true);
    }
  };

  const role = user?.role?.toUpperCase();
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!isAuthenticated || (role !== "ADMIN" && role !== "ROLE_ADMIN")) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                User Management
              </h1>
              <p className="text-gray-600">Manage patient and staff accounts</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => fetchUsers()} variant="outline" size="sm">
                Refresh List
              </Button>
              <Button onClick={handleCreate} size="sm">
                Add User
              </Button>
            </div>
          </div>

          {/* Search */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">Search</Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <p className="text-gray-600">Loading users...</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600">No users found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((u) => (
                <Card
                  key={u.id || u.email}
                  className={`hover:shadow-md transition-shadow ${u.activated === false ? "opacity-60 bg-gray-50" : ""}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${u.activated === false ? "bg-gray-200" : "bg-blue-100"}`}>
                          <UserIcon size={24} className={u.activated === false ? "text-gray-400" : "text-blue-600"} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {u.fullName}
                            </h3>
                            {u.authorities?.includes("ROLE_ADMIN") && (
                              <Shield
                                size={16}
                                className="text-amber-500"
                                aria-label="Admin"
                              />
                            )}
                            {u.activated === false ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                                Inactive
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-gray-600 text-sm">
                            <div className="flex items-center gap-1">
                              <Mail size={16} />
                              {u.email}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone size={16} />
                              {u.phoneNumber ||
                                u.phone ||
                                u.mobile ||
                                "No phone"}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            Joined:{" "}
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(u)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(u)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(u)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && users.length > 0 && (
            <div className="flex justify-between items-center mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-gray-600 font-medium">Page {page}</span>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* User Detail/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isCreateMode
                ? "Add New User"
                : isEditMode
                  ? "Edit User"
                  : "User Details"}
            </DialogTitle>
            <DialogDescription>
              {isCreateMode
                ? "Fill out the form below to create a new user."
                : isEditMode
                  ? "Update user information below."
                  : "Detailed information about the user account."}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Full Name{isCreateMode && <RequiredMark />}
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    value={selectedUser.fullName || ""}
                    onChange={(e) =>
                      updateSelectedUserField("fullName", e.target.value)
                    }
                    disabled={!isEditMode}
                    className={
                      fieldErrors.fullName
                        ? "border-red-300 focus-visible:ring-red-200"
                        : ""
                    }
                  />
                  {fieldErrors.fullName && (
                    <RequiredMessage message={fieldErrors.fullName} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email{isCreateMode && <RequiredMark />}
                </Label>
                <div className="col-span-3">
                  <Input
                    id="email"
                    value={selectedUser.email || ""}
                    onChange={(e) =>
                      updateSelectedUserField("email", e.target.value)
                    }
                    disabled={!isEditMode}
                    className={
                      fieldErrors.email
                        ? "border-red-300 focus-visible:ring-red-200"
                        : ""
                    }
                  />
                  {fieldErrors.email && (
                    <RequiredMessage message={fieldErrors.email} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={selectedUser.phoneNumber || ""}
                  onChange={(e) =>
                    updateSelectedUserField("phoneNumber", e.target.value)
                  }
                  disabled={!isEditMode}
                  className="col-span-3"
                />
              </div>
              {!isEditMode && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Status</Label>
                    <div className="col-span-3 flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500" />
                      <span className="text-sm font-medium">
                        Active Account
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Authorities</Label>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {selectedUser.authorities?.map((auth: string) => (
                        <span
                          key={auth}
                          className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100"
                        >
                          {auth}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {isEditMode && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Role{isCreateMode && <RequiredMark />}
                  </Label>
                  <div className="col-span-3">
                    <select
                      value={selectedUser.authorities?.[0] || "ROLE_USER"}
                      onChange={(e) =>
                        updateSelectedUserField("authorities", [e.target.value])
                      }
                      className={`w-full px-3 py-2 border rounded-md ${fieldErrors.authorities ? "border-red-300 focus:ring-red-200" : ""}`}
                    >
                      <option value="ROLE_USER">Patient (ROLE_USER)</option>
                      <option value="ROLE_DOCTOR">Doctor (ROLE_DOCTOR)</option>
                      <option value="ROLE_ADMIN">Admin (ROLE_ADMIN)</option>
                    </select>
                    {fieldErrors.authorities && (
                      <RequiredMessage message={fieldErrors.authorities} />
                    )}
                  </div>
                </div>
              )}
              {isCreateMode && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password{isCreateMode && <RequiredMark />}
                  </Label>
                  <div className="col-span-3 relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={selectedUser.password || ""}
                      onChange={(e) =>
                        updateSelectedUserField("password", e.target.value)
                      }
                      className="font-mono pr-10 w-full"
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {isEditMode ? "Cancel" : "Close"}
            </Button>
            {isEditMode && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
                {!isSaving && <Save size={16} className="ml-2" />}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent className="max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{userToDelete?.fullName || userToDelete?.email}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Beautiful Error Alert Dialog */}
      <AlertDialog open={isErrorAlertOpen} onOpenChange={setIsErrorAlertOpen}>
        <AlertDialogContent className="max-w-[400px] border-red-100 shadow-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <AlertDialogTitle className="text-xl">
                Cannot delete
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-600 py-2 text-base">
              {errorAlertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white font-semibold">
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
