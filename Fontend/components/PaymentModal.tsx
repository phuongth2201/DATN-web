'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Wallet, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  X, 
  QrCode,
  AlertCircle
} from 'lucide-react';
import { useAppointmentStore } from '@/stores/appointmentStore';
import { useToast } from '@/hooks/use-toast';
import { useNotificationStore } from '@/stores/notificationStore';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
}

const PAYMENT_METHODS = [
  { id: 'vnpay', name: 'VNPay', icon: Wallet, color: 'bg-blue-50 text-blue-600', description: 'Pay via VNPay gateway' },
  { id: 'momo', name: 'Momo', icon: QrCode, color: 'bg-pink-50 text-pink-600', description: 'Momo E-Wallet' },
  { id: 'transfer', name: 'Bank Transfer (QR)', icon: CreditCard, color: 'bg-indigo-50 text-indigo-600', description: 'Scan QR code (Zero fees)' },
];

export function PaymentModal({ isOpen, onClose, appointment }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'selection' | 'qr_code' | 'processing' | 'success'>('selection');
  const [countdown, setCountdown] = useState(15);
  
  const { processPayment } = useAppointmentStore();
  const { addNotification } = useNotificationStore();
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'qr_code' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (step === 'qr_code' && countdown === 0) {
      executePayment();
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handlePay = async () => {
    if (!selectedMethod) return;
    
    if (selectedMethod === 'transfer' || selectedMethod === 'momo') {
      setStep('qr_code');
      return;
    }
    
    await executePayment();
  };

  const executePayment = async () => {
    setIsProcessing(true);
    setStep('processing');
    
    try {
      // Call real payment API to save to DB and get checkoutUrl from backend
      await processPayment(appointment.id, selectedMethod.toUpperCase());
      
      // The processPayment store already has a redirect: window.location.href = response.checkoutUrl;
      // So here we just wait for the redirect.
    } catch (error) {
      toast({ title: 'Error', description: 'Payment failed, please try again', variant: 'destructive' });
      setStep('selection');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={step !== 'processing' ? onClose : undefined}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        
        {/* Header (Dynamic) */}
        <div className={`p-8 pb-6 transition-colors duration-500 ${step === 'success' ? 'bg-emerald-500' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-black tracking-tight ${step === 'success' ? 'text-white' : 'text-slate-900'}`}>
              {step === 'selection' && 'Choose Payment Method'}
              {step === 'qr_code' && 'Scan QR Code'}
              {step === 'processing' && 'Securing Connection...'}
              {step === 'success' && 'Payment Complete'}
            </h2>
            {step !== 'processing' && (
              <button 
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${step === 'success' ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <X size={20} />
              </button>
            )}
          </div>
          {step === 'selection' && (
            <p className="text-slate-500 font-medium mt-1">Transaction ID: #{String(appointment.id).toUpperCase()}</p>
          )}
        </div>

        <CardContent className="p-8 pt-0">
          {step === 'selection' && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
                    <p className="text-3xl font-black text-slate-900">5.000 đ</p>
                    <p className="text-xs text-slate-400 line-through">{Number(appointment.price || 500000).toLocaleString('en-US')} đ</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultation</span>
                    <p className="text-sm font-bold text-slate-700">{appointment.doctorName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl w-fit">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Secure Payment</span>
                </div>
              </div>

              {/* Methods Grid */}
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all border-2 text-left group ${
                        selectedMethod === method.id 
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl transition-transform group-hover:scale-110 ${method.color}`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{method.name}</p>
                        <p className="text-xs text-slate-500">{method.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedMethod === method.id ? 'border-primary bg-primary' : 'border-slate-200'
                      }`}>
                        {selectedMethod === method.id && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Button 
                onClick={handlePay}
                disabled={!selectedMethod}
                className="w-full h-16 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
              >
                Next
              </Button>
            </div>
          )}

          {step === 'qr_code' && (
            <div className="py-8 flex flex-col items-center text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {selectedMethod === 'momo' ? 'Scan MoMo QR' : 'Scan QR code to pay'}
              </h3>
              <p className="text-sm text-slate-500">
                {selectedMethod === 'momo' ? 'Use MoMo app to scan the code' : 'Use your banking app to scan the QR code'}
              </p>
              
              <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 mb-6 relative">
                {selectedMethod === 'momo' ? (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=2|99|0394116490|||0|0|5000|Payment for appointment ${appointment.id}|`} 
                    alt="MoMo QR Code" 
                    className="w-64 h-64 object-contain rounded-2xl"
                  />
                ) : (
                  <img 
                    src={`https://img.vietqr.io/image/970422-0123456789-compact2.png?amount=5000&addInfo=Thanh toan lich kham ${appointment.id}&accountName=BENH VIEN DA KHOA`} 
                    alt="VietQR Code" 
                    className="w-64 h-64 object-contain rounded-2xl"
                  />
                )}
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-400 opacity-0 animate-in fade-in duration-1000 delay-1000">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
                  <p className="text-emerald-700 font-bold text-sm bg-white/80 px-3 py-1 rounded-full">Awaiting payment ({countdown}s)</p>
                </div>
              </div>

              <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl mb-8 text-sm text-left">
                <p><strong>Note:</strong> Keep the transfer content exactly as shown. The system will automatically confirm upon successful transfer.</p>
              </div>

              <div className="flex w-full gap-4">
                <Button 
                  onClick={() => setStep('selection')}
                  variant="outline"
                  className="w-1/3 h-14 rounded-2xl border-slate-200"
                >
                  Back
                </Button>
                <Button 
                  onClick={executePayment}
                  className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  I have transferred the money
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="relative mb-8">
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={32} className="text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Processing Payment</h3>
              <p className="text-slate-500 max-w-[240px] font-medium leading-relaxed">
                Please do not close this window or refresh the page.
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-8 animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Sweet Success!</h3>
              <p className="text-slate-500 max-w-[280px] font-medium leading-relaxed mb-10">
                Your payment was processed successfully. We've sent a confirmation to your notifications.
              </p>
              <Button 
                onClick={onClose}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Return to Appointment
              </Button>
            </div>
          )}
        </CardContent>

        <div className="bg-slate-50 px-8 py-4 flex justify-center gap-6 items-center border-t border-slate-100">
          <div className="flex items-center gap-1.5 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">PCI DSS Compliant</span>
          </div>
          <div className="flex items-center gap-1.5 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
            <AlertCircle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}