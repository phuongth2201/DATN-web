package hospital.web.rest;

import hospital.domain.Appointment;
import hospital.domain.Payment;
import hospital.domain.User;
import hospital.repository.AppointmentRepository;
import hospital.repository.PaymentRepository;
import hospital.repository.UserRepository;
import hospital.security.SecurityUtils;
import hospital.service.dto.PageResponseDTO;
import hospital.service.dto.PaginationDTO;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;

@RestController
@RequestMapping("/api")
public class PaymentResource {

    private final PaymentRepository paymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final PayOS payOS;

    public PaymentResource(
        PaymentRepository paymentRepository,
        AppointmentRepository appointmentRepository,
        UserRepository userRepository,
        PayOS payOS
    ) {
        this.paymentRepository = paymentRepository;
        this.appointmentRepository = appointmentRepository;
        this.userRepository = userRepository;
        this.payOS = payOS;
    }

    @PostMapping("/payments/process")
    public ResponseEntity<Map<String, Object>> process(@RequestBody ProcessPaymentRequest request) {
        User user = currentUser();
        Appointment appointment = appointmentRepository
            .findById(request.appointmentId())
            .orElseThrow(() -> new IllegalStateException("Appointment not found"));
        if (appointment.getUser() == null || !appointment.getUser().getLogin().equalsIgnoreCase(user.getLogin())) {
            throw new IllegalStateException("Unauthorized");
        }
        if (request.amount() == null || request.amount() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than 0");
        }
        Payment payment = new Payment();
        payment.setUser(user);
        payment.setAppointment(appointment);
        payment.setAmount(request.amount());
        payment.setPaymentMethod(request.paymentMethod());
        payment.setStatus("PENDING");
        payment.setTransactionId("TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase());
        payment.setCreatedAt(Instant.now());
        paymentRepository.save(payment);

        try {
            CreatePaymentLinkRequest paymentData = CreatePaymentLinkRequest.builder()
                .orderCode(appointment.getId())
                .amount(request.amount().longValue())
                .description("Kham benh " + appointment.getId())
                .returnUrl("http://localhost:3000/appointments?payment=success")
                .cancelUrl("http://localhost:3000/appointments?payment=cancel")
                .build();
                
            CreatePaymentLinkResponse res = payOS.paymentRequests().create(paymentData);
            
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("paymentId", payment.getId());
            result.put("checkoutUrl", res.getCheckoutUrl());
            result.put("qrCode", res.getQrCode());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/payments/payos-webhook")
    public ResponseEntity<Map<String, String>> payosWebhook(@RequestBody com.fasterxml.jackson.databind.JsonNode request) {
        try {
            // Lấy data từ webhook của PayOS
            com.fasterxml.jackson.databind.JsonNode data = request.get("data");
            if (data != null && data.has("orderCode")) {
                // orderCode chính là appointmentId mà chúng ta gửi lên PayOS lúc tạo link
                long appointmentId = data.get("orderCode").asLong();
                Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
                
                if (appointment != null) {
                    // Tự động gạch nợ (đổi trạng thái sang PAID)
                    appointment.setPaymentStatus("PAID");
                    appointmentRepository.save(appointment);
                    System.out.println("✅ Tự động gạch nợ thành công cho Lịch khám: " + appointmentId);
                }
            }
            // Luôn trả về 200 OK để PayOS biết là mình đã nhận được, tránh bị gọi lại nhiều lần
            return ResponseEntity.ok(Map.of("success", "true"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(Map.of("success", "true"));
        }
    }

    @GetMapping("/payments")
    public ResponseEntity<PageResponseDTO<Map<String, Object>>> list(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int limit,
        @RequestParam(required = false) String status,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String sortOrder
    ) {
        String login = currentLogin();
        List<Payment> payments = paymentRepository.findByUserLoginOrderByCreatedAtDesc(login);
        if (status != null && !status.isBlank()) {
            payments = payments.stream().filter(p -> p.getStatus() != null && p.getStatus().equalsIgnoreCase(status)).toList();
        }
        payments = payments
            .stream()
            .sorted((a, b) -> "asc".equalsIgnoreCase(sortOrder) ? compare(a, b, sortBy) : compare(b, a, sortBy))
            .toList();
        Page<Payment> pageData = new PageImpl<>(
            slice(payments, page, limit),
            PageRequest.of(Math.max(page - 1, 0), limit),
            payments.size()
        );
        List<Map<String, Object>> data = pageData.getContent().stream().map(this::toMap).toList();
        return ResponseEntity.ok(
            new PageResponseDTO<>(data, new PaginationDTO(page, limit, pageData.getTotalElements(), pageData.getTotalPages()))
        );
    }

    private User currentUser() {
        return userRepository.findOneByLogin(currentLogin()).orElseThrow(() -> new IllegalStateException("User not found"));
    }

    private String currentLogin() {
        return SecurityUtils.getCurrentUserLogin().orElseThrow(() -> new IllegalStateException("Unauthorized"));
    }

    private Map<String, Object> toMap(Payment payment) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", payment.getId());
        map.put("appointmentId", payment.getAppointment() != null ? payment.getAppointment().getId() : null);
        map.put(
            "doctorName",
            payment.getAppointment() != null && payment.getAppointment().getDoctor() != null
                ? payment.getAppointment().getDoctor().getFullName()
                : null
        );
        map.put("amount", payment.getAmount());
        map.put("paymentMethod", payment.getPaymentMethod());
        map.put("status", payment.getStatus());
        map.put("transactionId", payment.getTransactionId());
        map.put("createdAt", payment.getCreatedAt());
        return map;
    }

    private <T> List<T> slice(List<T> items, int page, int limit) {
        int fromIndex = Math.min(Math.max(page - 1, 0) * limit, items.size());
        int toIndex = Math.min(fromIndex + limit, items.size());
        return fromIndex >= toIndex ? List.of() : items.subList(fromIndex, toIndex);
    }

    private int compare(Payment left, Payment right, String sortBy) {
        if ("amount".equalsIgnoreCase(sortBy)) {
            return Long.compare(left.getAmount() == null ? 0L : left.getAmount(), right.getAmount() == null ? 0L : right.getAmount());
        }
        if ("status".equalsIgnoreCase(sortBy)) {
            return String.valueOf(left.getStatus()).compareToIgnoreCase(String.valueOf(right.getStatus()));
        }
        return left.getCreatedAt() == null || right.getCreatedAt() == null ? 0 : left.getCreatedAt().compareTo(right.getCreatedAt());
    }

    public record ProcessPaymentRequest(
        Long appointmentId,
        Long amount,
        String paymentMethod,
        String cardNumber,
        String cardHolder,
        String expiryDate,
        String cvv
    ) {}
}
