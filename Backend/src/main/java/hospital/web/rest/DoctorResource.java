package hospital.web.rest;

import hospital.domain.Doctor;
import hospital.domain.Review;
import hospital.repository.AppointmentRepository;
import hospital.repository.DoctorRepository;
import hospital.repository.HospitalRepository;
import hospital.repository.ReviewRepository;
import hospital.repository.SpecialtyRepository;
import hospital.repository.UserRepository;
import hospital.security.SecurityUtils;
import hospital.service.dto.PageResponseDTO;
import hospital.service.dto.PaginationDTO;
import hospital.service.dto.SpecialtyDTO;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DoctorResource {

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final SpecialtyRepository specialtyRepository;
    private final HospitalRepository hospitalRepository;

    public DoctorResource(
        DoctorRepository doctorRepository,
        AppointmentRepository appointmentRepository,
        ReviewRepository reviewRepository,
        UserRepository userRepository,
        SpecialtyRepository specialtyRepository,
        HospitalRepository hospitalRepository
    ) {
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
        this.specialtyRepository = specialtyRepository;
        this.hospitalRepository = hospitalRepository;
    }

    @GetMapping("/doctors")
    public ResponseEntity<PageResponseDTO<Map<String, Object>>> getDoctors(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(required = false) String specialty,
        @RequestParam(required = false) Double minRating,
        @RequestParam(required = false) Long maxPrice,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "rating") String sortBy,
        @RequestParam(defaultValue = "desc") String sortOrder
    ) {
        Specification<Doctor> spec = Specification.where(null);
        if (specialty != null && !specialty.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("specialty").get("name")), specialty.toLowerCase()));
        }
        if (minRating != null && minRating > 0) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("rating"), minRating));
        }
        if (maxPrice != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice));
        }
        if (search != null && !search.isBlank()) {
            String like = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) ->
                cb.or(
                    cb.like(cb.lower(root.get("fullName")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("hospital").get("name")), like),
                    cb.like(cb.lower(root.get("specialty").get("name")), like)
                )
            );
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(sortOrder) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Page<Doctor> doctorPage = doctorRepository.findAll(spec, PageRequest.of(Math.max(page - 1, 0), limit, Sort.by(direction, sortBy)));
        List<Map<String, Object>> data = doctorPage.getContent().stream().map(this::toSummary).toList();
        return ResponseEntity.ok(
            new PageResponseDTO<>(data, new PaginationDTO(page, limit, doctorPage.getTotalElements(), doctorPage.getTotalPages()))
        );
    }

    @GetMapping("/doctors/{id}")
    public ResponseEntity<Map<String, Object>> getDoctor(@PathVariable Long id) {
        Doctor doctor = doctorRepository.findById(id).orElseThrow(() -> new IllegalStateException("Doctor not found"));
        Map<String, Object> response = toDetail(doctor);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/doctors/me")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<Map<String, Object>> getCurrentDoctor() {
        String login = SecurityUtils.getCurrentUserLogin().orElseThrow(() -> new IllegalStateException("User not logged in"));
        hospital.domain.User user = userRepository.findOneByLogin(login).orElseThrow(() -> new IllegalStateException("User not found"));

        Optional<Doctor> doctorOpt = doctorRepository.findByEmail(user.getEmail());
        if (doctorOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toDetail(doctorOpt.orElseThrow()));
    }

    @PostMapping("/doctors/onboarding")
    @PreAuthorize("hasAuthority('ROLE_DOCTOR')")
    public ResponseEntity<Map<String, Object>> onboardDoctor(@Valid @RequestBody OnboardingRequest request) {
        String login = SecurityUtils.getCurrentUserLogin().orElseThrow(() -> new IllegalStateException("User not logged in"));
        hospital.domain.User user = userRepository.findOneByLogin(login).orElseThrow(() -> new IllegalStateException("User not found"));

        if (doctorRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Hồ sơ bác sĩ cho email này đã tồn tại"));
        }

        Doctor doctor = new Doctor();
        doctor.setEmail(user.getEmail());
        doctor.setFullName(request.fullName() != null ? request.fullName() : user.getFirstName() + " " + user.getLastName());
        doctor.setPhoneNumber(request.phoneNumber());
        doctor.setBio(request.bio());
        doctor.setExperience(request.experience());
        doctor.setPrice(request.price());
        doctor.setLicense(request.license());

        if (request.specialtyId() != null) {
            specialtyRepository.findById(request.specialtyId()).ifPresent(doctor::setSpecialty);
        }
        if (request.hospitalId() != null) {
            hospitalRepository.findById(request.hospitalId()).ifPresent(doctor::setHospital);
        }

        doctor.setRating(5.0); // Default rating
        doctor.setReviewCount(0);

        Doctor saved = doctorRepository.save(doctor);
        return ResponseEntity.ok(Map.of("message", "Hồ sơ bác sĩ đã được tạo thành công", "doctor", toDetail(saved)));
    }

    public record OnboardingRequest(
        String fullName,
        String phoneNumber,
        String bio,
        Integer experience,
        Long price,
        String license,
        Long specialtyId,
        Long hospitalId
    ) {}

    private Map<String, Object> toSummary(Doctor doctor) {
        Map<String, Object> hospital = new LinkedHashMap<>();
        if (doctor.getHospital() != null) {
            hospital.put("id", doctor.getHospital().getId());
            hospital.put("name", doctor.getHospital().getName());
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", doctor.getId());
        map.put("fullName", doctor.getFullName());
        map.put("specialty", doctor.getSpecialty() != null ? doctor.getSpecialty().getName() : null);
        map.put("hospital", hospital);
        map.put("bio", doctor.getBio());
        map.put("avatar", doctor.getAvatar());
        map.put("experience", doctor.getExperience());
        map.put("price", doctor.getPrice());
        map.put("rating", doctor.getRating());
        map.put("reviewCount", doctor.getReviewCount());
        map.put("isAvailable", true);
        map.put("availableSlots", 12);
        return map;
    }

    private Map<String, Object> toDetail(Doctor doctor) {
        Map<String, Object> hospital = new LinkedHashMap<>();
        if (doctor.getHospital() != null) {
            hospital.put("id", doctor.getHospital().getId());
            hospital.put("name", doctor.getHospital().getName());
            hospital.put("address", doctor.getHospital().getAddress());
            hospital.put("phone", doctor.getHospital().getPhone());
        }
        List<Map<String, Object>> reviews = reviewRepository.findByDoctorId(doctor.getId()).stream().map(this::toReviewMap).toList();

        List<Map<String, Object>> availableTime = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            LocalDate date = LocalDate.now().plusDays(i);
            List<String> slots = generateDailySlots(date, doctor.getId());
            Map<String, Object> slotMap = new LinkedHashMap<>();
            slotMap.put("date", date.toString());
            slotMap.put("slots", slots);
            availableTime.add(slotMap);
        }

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", doctor.getId());
        map.put("fullName", doctor.getFullName());
        map.put("email", doctor.getEmail());
        map.put("specialty", doctor.getSpecialty() != null ? doctor.getSpecialty().getName() : null);
        map.put("bio", doctor.getBio());
        map.put("avatar", doctor.getAvatar());
        map.put("experience", doctor.getExperience());
        map.put("license", doctor.getLicense());
        map.put("price", doctor.getPrice());
        map.put("rating", doctor.getRating());
        map.put("reviewCount", doctor.getReviewCount());
        map.put("hospital", hospital);
        map.put("availableTime", availableTime);
        map.put("reviews", reviews);
        return map;
    }

    private List<String> generateDailySlots(LocalDate date, Long doctorId) {
        List<String> baseSlots = List.of("08:00", "08:30", "09:00", "09:30", "10:00", "14:00", "14:30", "15:00", "15:30", "16:00");
        List<String> booked = appointmentRepository
            .findByDoctorIdAndAppointmentDate(doctorId, date)
            .stream()
            .filter(a -> a.getAppointmentTime() != null)
            .map(a -> {
                String timeStr = a.getAppointmentTime().toString();
                return timeStr.length() >= 5 ? timeStr.substring(0, 5) : timeStr;
            })
            .toList();
        return baseSlots.stream().filter(slot -> !booked.contains(slot)).toList();
    }

    private Map<String, Object> toReviewMap(Review review) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", review.getId());
        map.put("userId", review.getUser() != null ? review.getUser().getId() : null);
        map.put("userName", review.getUser() != null ? review.getUser().getFirstName() : null);
        map.put("rating", review.getRating());
        map.put("comment", review.getComment());
        map.put("createdAt", review.getCreatedAt());
        return map;
    }
}
