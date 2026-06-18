'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar } from 'lucide-react';

export function DoctorUnavailableModal() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, user } = useAuthStore();
  const { notifications, fetchNotifications, markAsRead, isInitialized: notifInitialized } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Fetch notifications once auth is ready (for patients only)
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;
    const role = user?.role?.toUpperCase();
    if (role === 'ADMIN' || role === 'ROLE_ADMIN' || role === 'DOCTOR' || role === 'ROLE_DOCTOR') return;
    if (!notifInitialized) {
      fetchNotifications(1);
    }
  }, [isAuthenticated, isInitialized, notifInitialized, user?.role]);

  const pendingNotifs = notifications.filter(
    (n) => n.type === 'DOCTOR_UNAVAILABLE' && !n.isRead
  );

  // Show modal whenever there are unread DOCTOR_UNAVAILABLE notifications
  useEffect(() => {
    if (pendingNotifs.length > 0 && !open) {
      setOpen(true);
      setCurrentIdx(0);
    }
  }, [pendingNotifs.length]);

  if (!open || pendingNotifs.length === 0) return null;

  const current = pendingNotifs[currentIdx];
  if (!current) return null;

  const isLast = currentIdx >= pendingNotifs.length - 1;

  const handleDismiss = async () => {
    await markAsRead(current.id);
    if (!isLast) {
      setCurrentIdx((i) => i + 1);
    } else {
      setOpen(false);
    }
  };

  // Primary: replace doctor on the existing appointment (same slot, no extra charge)
  const handleChangeDoctor = async () => {
    await markAsRead(current.id);
    setOpen(false);
    router.push(`/doctors?rebookId=${current.relatedId}`);
  };

  // Secondary: start a completely fresh booking
  const handleBookNew = async () => {
    await markAsRead(current.id);
    setOpen(false);
    router.push('/doctors');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[520px]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Doctor Unavailable</DialogTitle>
          </div>
          {pendingNotifs.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Notification {currentIdx + 1} of {pendingNotifs.length}
            </p>
          )}
        </DialogHeader>

        <DialogDescription asChild>
          <div className="space-y-4 py-2">
            <p className="text-foreground text-sm leading-relaxed">{current.message}</p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">No extra charge for changing doctors</p>
              <p>
                We will update your existing appointment with the new doctor — same date and time, no additional payment required.
              </p>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="gap-2 mt-2 flex-col sm:flex-row items-center">
          <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            {isLast ? 'Dismiss' : 'Next notification'}
          </Button>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <Button onClick={handleChangeDoctor} className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              Change Doctor for This Appointment
            </Button>
            <button
              type="button"
              onClick={handleBookNew}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 text-center mt-0.5"
            >
              Or book a completely new appointment
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
