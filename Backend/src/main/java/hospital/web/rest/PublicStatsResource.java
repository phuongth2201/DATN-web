package hospital.web.rest;

import hospital.repository.AppointmentRepository;
import hospital.repository.DoctorRepository;
import hospital.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicStatsResource {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;

    public PublicStatsResource(
        DoctorRepository doctorRepository,
        UserRepository userRepository,
        AppointmentRepository appointmentRepository
    ) {
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalDoctors = doctorRepository.count();
        long totalPatients = userRepository.count();
        long completedAppointments = appointmentRepository
            .findAll()
            .stream()
            .filter(a -> a.getStatus() != null && "COMPLETED".equals(a.getStatus().name()))
            .count();
        long totalAppointments = appointmentRepository.count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalDoctors", totalDoctors);
        stats.put("totalPatients", totalPatients);
        stats.put("completedAppointments", completedAppointments);
        stats.put("totalAppointments", totalAppointments);
        return ResponseEntity.ok(stats);
    }
}
