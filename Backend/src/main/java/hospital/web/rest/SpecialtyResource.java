package hospital.web.rest;

import hospital.domain.Specialty;
import hospital.repository.DoctorRepository;
import hospital.repository.SpecialtyRepository;
import hospital.service.dto.SpecialtyDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SpecialtyResource {

    private final SpecialtyRepository specialtyRepository;
    private final DoctorRepository doctorRepository;

    public SpecialtyResource(SpecialtyRepository specialtyRepository, DoctorRepository doctorRepository) {
        this.specialtyRepository = specialtyRepository;
        this.doctorRepository = doctorRepository;
    }

    @GetMapping("/specialties")
    public ResponseEntity<Map<String, Object>> listSpecialties() {
        List<SpecialtyDTO> data = specialtyRepository.findAll().stream().map(this::toDto).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/admin/specialties")
    public ResponseEntity<Map<String, Object>> listSpecialtiesAdmin() {
        List<SpecialtyDTO> data = specialtyRepository.findAll().stream().map(this::toDto).toList();
        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/admin/specialties/{id}")
    public ResponseEntity<Map<String, Object>> getSpecialty(@PathVariable Long id) {
        Specialty specialty = specialtyRepository.findById(id).orElseThrow(() -> new IllegalStateException("Specialty not found"));
        return ResponseEntity.ok(Map.of("data", toDto(specialty)));
    }

    @PostMapping("/admin/specialties")
    public ResponseEntity<Map<String, Object>> createSpecialty(@Valid @RequestBody SpecialtyRequest request) {
        Specialty specialty = new Specialty();
        applyRequest(specialty, request);
        Specialty saved = specialtyRepository.save(specialty);
        return ResponseEntity.status(HttpStatus.CREATED).body(
            Map.of(
                "message",
                "Chuyên khoa đã được thêm mới",
                "data",
                toDto(saved)
            )
        );
    }

    @PutMapping("/admin/specialties/{id}")
    public ResponseEntity<Map<String, Object>> updateSpecialty(@PathVariable Long id, @Valid @RequestBody SpecialtyRequest request) {
        Specialty specialty = specialtyRepository.findById(id).orElseThrow(() -> new IllegalStateException("Specialty not found"));
        applyRequest(specialty, request);
        Specialty saved = specialtyRepository.save(specialty);
        return ResponseEntity.ok(
            Map.of(
                "message",
                "Chuyên khoa đã được cập nhật",
                "data",
                toDto(saved)
            )
        );
    }

    @DeleteMapping("/admin/specialties/{id}")
    public ResponseEntity<Map<String, Object>> deleteSpecialty(@PathVariable Long id) {
        Specialty specialty = specialtyRepository.findById(id).orElseThrow(() -> new IllegalStateException("Specialty not found"));
        try {
            specialtyRepository.delete(specialty);
            specialtyRepository.flush();
            return ResponseEntity.ok(Map.of("message", "Chuyên khoa đã được xóa", "id", id));
        } catch (DataIntegrityViolationException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of(
                    "error",
                    "Không thể xóa chuyên khoa vì còn dữ liệu liên quan",
                    "code",
                    "SPECIALTY_DELETE_CONFLICT"
                )
            );
        }
    }

    private SpecialtyDTO toDto(Specialty specialty) {
        SpecialtyDTO dto = new SpecialtyDTO();
        dto.setId(specialty.getId());
        dto.setName(specialty.getName());
        dto.setVietnamName(specialty.getVietnamName());
        dto.setIcon(specialty.getIcon());
        dto.setDescription(specialty.getDescription());
        dto.setDoctorCount(
            (int) doctorRepository
                .findAll()
                .stream()
                .filter(d -> d.getSpecialty() != null && d.getSpecialty().getId().equals(specialty.getId()))
                .count()
        );
        return dto;
    }

    private void applyRequest(Specialty specialty, SpecialtyRequest request) {
        specialty.setName(request.name().trim());
        specialty.setVietnamName(request.vietnamName());
        specialty.setIcon(request.icon());
        specialty.setDescription(request.description());
    }

    public record SpecialtyRequest(
        @NotBlank String name,
        String vietnamName,
        String icon,
        String description
    ) {}
}
