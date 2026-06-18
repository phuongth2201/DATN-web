package hospital.web.rest;

import hospital.domain.Doctor;
import hospital.domain.Schedule;
import hospital.domain.TimeSlot;
import hospital.repository.DoctorRepository;
import hospital.repository.ScheduleRepository;
import hospital.repository.TimeSlotRepository;
import hospital.repository.UserRepository;
import hospital.security.SecurityUtils;
import hospital.service.dto.PageResponseDTO;
import hospital.service.dto.PaginationDTO;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ScheduleResource {

    private final ScheduleRepository scheduleRepository;
    private final DoctorRepository doctorRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final UserRepository userRepository;

    public ScheduleResource(
        ScheduleRepository scheduleRepository,
        DoctorRepository doctorRepository,
        TimeSlotRepository timeSlotRepository,
        UserRepository userRepository
    ) {
        this.scheduleRepository = scheduleRepository;
        this.doctorRepository = doctorRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/schedules")
    public ResponseEntity<PageResponseDTO<Map<String, Object>>> listSchedules(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(required = false) Long doctorId,
        @RequestParam(required = false) String workDate
    ) {
        List<Schedule> schedules = scheduleRepository.findAll();
        if (doctorId != null) {
            schedules = schedules
                .stream()
                .filter(schedule -> schedule.getDoctor() != null && doctorId.equals(schedule.getDoctor().getId()))
                .toList();
        }
        if (workDate != null && !workDate.isBlank()) {
            LocalDate parsedWorkDate = LocalDate.parse(workDate);
            schedules = schedules.stream().filter(schedule -> parsedWorkDate.equals(schedule.getWorkDate())).toList();
        }

        schedules = schedules
            .stream()
            .sorted(
                Comparator.comparing(Schedule::getWorkDate, Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(
                    Schedule::getStartTime,
                    Comparator.nullsLast(Comparator.naturalOrder())
                )
            )
            .toList();

        Page<Schedule> pageData = new PageImpl<>(
            slice(schedules, page, limit),
            PageRequest.of(Math.max(page - 1, 0), limit),
            schedules.size()
        );
        List<Map<String, Object>> data = pageData.getContent().stream().map(this::toMap).toList();
        return ResponseEntity.ok(
            new PageResponseDTO<>(data, new PaginationDTO(page, limit, pageData.getTotalElements(), pageData.getTotalPages()))
        );
    }

    @GetMapping("/schedules/{id}")
    public ResponseEntity<Map<String, Object>> getSchedule(@PathVariable Long id) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow(() -> new IllegalStateException("Schedule not found"));
        return ResponseEntity.ok(toDetailMap(schedule));
    }

    @PostMapping("/schedules")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<Map<String, Object>> createSchedule(@RequestBody ScheduleRequest request) {
        ensureCanManageSchedule(request.doctorId());
        if (request.endTime() != null && request.startTime() != null && !request.endTime().isAfter(request.startTime())) {
            return ResponseEntity.badRequest().body(Map.of("error", "endTime must be after startTime"));
        }
        Schedule schedule = new Schedule();
        applyRequest(schedule, request);
        scheduleRepository.save(schedule);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDetailMap(schedule));
    }

    @PutMapping("/schedules/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<Map<String, Object>> updateSchedule(@PathVariable Long id, @RequestBody ScheduleRequest request) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow(() -> new IllegalStateException("Schedule not found"));
        ensureCanManageSchedule(request.doctorId());
        if (request.endTime() != null && request.startTime() != null && !request.endTime().isAfter(request.startTime())) {
            return ResponseEntity.badRequest().body(Map.of("error", "endTime must be after startTime"));
        }
        applyRequest(schedule, request);
        scheduleRepository.save(schedule);
        return ResponseEntity.ok(toDetailMap(schedule));
    }

    @DeleteMapping("/schedules/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<Map<String, Object>> deleteSchedule(@PathVariable Long id) {
        Schedule schedule = scheduleRepository.findById(id).orElseThrow(() -> new IllegalStateException("Schedule not found"));
        if (!SecurityUtils.hasCurrentUserAnyOfAuthorities("ROLE_ADMIN") && schedule.getDoctor() != null) {
            ensureCanManageSchedule(schedule.getDoctor().getId());
        }
        scheduleRepository.delete(schedule);
        return ResponseEntity.ok(Map.of("id", id, "message", "Schedule deleted successfully"));
    }

    @GetMapping("/schedules/{scheduleId}/time-slots")
    public ResponseEntity<Map<String, Object>> listTimeSlotsBySchedule(@PathVariable Long scheduleId) {
        Schedule schedule = scheduleRepository.findById(scheduleId).orElseThrow(() -> new IllegalStateException("Schedule not found"));
        List<Map<String, Object>> slots = timeSlotRepository
            .findByScheduleIdOrderBySlotTimeAsc(scheduleId)
            .stream()
            .map(this::slotToMap)
            .toList();
        return ResponseEntity.ok(Map.of("schedule", toMap(schedule), "data", slots));
    }

    @PostMapping("/schedules/{scheduleId}/time-slots")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_DOCTOR')")
    public ResponseEntity<Map<String, Object>> createTimeSlotForSchedule(
        @PathVariable Long scheduleId,
        @RequestBody TimeSlotRequest request
    ) {
        Schedule schedule = scheduleRepository.findById(scheduleId).orElseThrow(() -> new IllegalStateException("Schedule not found"));
        if (schedule.getDoctor() != null) {
            ensureCanManageSchedule(schedule.getDoctor().getId());
        }
        if (request.slotTime() != null && schedule.getStartTime() != null && schedule.getEndTime() != null) {
            if (request.slotTime().isBefore(schedule.getStartTime()) || request.slotTime().isAfter(schedule.getEndTime())) {
                return ResponseEntity.badRequest().body(Map.of("error", "slotTime must be within schedule working hours"));
            }
        }
        TimeSlot timeSlot = new TimeSlot();
        timeSlot.setSchedule(schedule);
        timeSlot.setSlotTime(request.slotTime());
        timeSlot.setBooked(Optional.ofNullable(request.booked()).orElse(false));
        timeSlotRepository.save(timeSlot);
        return ResponseEntity.status(HttpStatus.CREATED).body(slotToMap(timeSlot));
    }

    private void ensureCanManageSchedule(Long doctorId) {
        if (SecurityUtils.hasCurrentUserAnyOfAuthorities("ROLE_ADMIN")) return;
        String email = SecurityUtils.getCurrentUserLogin()
            .flatMap(userRepository::findOneByLogin)
            .map(u -> u.getEmail())
            .orElseThrow(() -> new IllegalStateException("Unauthorized"));
        Doctor currentDoctor = doctorRepository.findByEmail(email).orElse(null);
        if (currentDoctor == null || !currentDoctor.getId().equals(doctorId)) {
            throw new IllegalStateException("Unauthorized: cannot manage another doctor's schedule");
        }
    }

    private void applyRequest(Schedule schedule, ScheduleRequest request) {
        Doctor doctor = doctorRepository.findById(request.doctorId()).orElseThrow(() -> new IllegalStateException("Doctor not found"));
        schedule.setDoctor(doctor);
        schedule.setWorkDate(request.workDate());
        schedule.setStartTime(request.startTime());
        schedule.setEndTime(request.endTime());
    }

    private Map<String, Object> toMap(Schedule schedule) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", schedule.getId());
        map.put("doctorId", schedule.getDoctor() != null ? schedule.getDoctor().getId() : null);
        map.put("doctorName", schedule.getDoctor() != null ? schedule.getDoctor().getFullName() : null);
        map.put("workDate", schedule.getWorkDate());
        map.put("startTime", schedule.getStartTime());
        map.put("endTime", schedule.getEndTime());
        map.put("timeSlotCount", schedule.getId() != null ? timeSlotRepository.countByScheduleId(schedule.getId()) : 0);
        return map;
    }

    private Map<String, Object> toDetailMap(Schedule schedule) {
        Map<String, Object> map = toMap(schedule);
        List<Map<String, Object>> slots = timeSlotRepository
            .findByScheduleIdOrderBySlotTimeAsc(schedule.getId())
            .stream()
            .map(this::slotToMap)
            .toList();
        map.put("timeSlots", slots);
        return map;
    }

    private Map<String, Object> slotToMap(TimeSlot timeSlot) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", timeSlot.getId());
        map.put("scheduleId", timeSlot.getSchedule() != null ? timeSlot.getSchedule().getId() : null);
        map.put("workDate", timeSlot.getSchedule() != null ? timeSlot.getSchedule().getWorkDate() : null);
        map.put("slotTime", timeSlot.getSlotTime());
        map.put("booked", timeSlot.getBooked());
        return map;
    }

    private <T> List<T> slice(List<T> items, int page, int limit) {
        int fromIndex = Math.min(Math.max(page - 1, 0) * limit, items.size());
        int toIndex = Math.min(fromIndex + limit, items.size());
        return fromIndex >= toIndex ? List.of() : items.subList(fromIndex, toIndex);
    }

    public record ScheduleRequest(Long doctorId, LocalDate workDate, LocalTime startTime, LocalTime endTime) {}

    public record TimeSlotRequest(LocalTime slotTime, Boolean booked) {}
}
