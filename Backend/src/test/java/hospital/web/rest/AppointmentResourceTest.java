package hospital.web.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import hospital.domain.Appointment;
import hospital.domain.Doctor;
import hospital.domain.Hospital;
import hospital.domain.User;
import hospital.domain.enumeration.AppointmentStatus;
import hospital.repository.AppointmentRepository;
import hospital.repository.DoctorRepository;
import hospital.repository.HospitalRepository;
import hospital.repository.UserRepository;
import hospital.service.NotificationService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class AppointmentResourceTest {

    @Mock
    AppointmentRepository appointmentRepository;

    @Mock
    DoctorRepository doctorRepository;

    @Mock
    HospitalRepository hospitalRepository;

    @Mock
    UserRepository userRepository;

    @Mock
    NotificationService notificationService;

    @InjectMocks
    AppointmentResource appointmentResource;

    private User patientUser;
    private Doctor testDoctor;
    private Appointment testAppointment;

    @BeforeEach
    void setUp() {
        patientUser = new User();
        patientUser.setId(1L);
        patientUser.setLogin("patient1");
        patientUser.setEmail("patient1@test.com");

        testDoctor = new Doctor();
        testDoctor.setId(10L);
        testDoctor.setEmail("doctor@test.com");
        testDoctor.setFullName("Dr. House");
        testDoctor.setPrice(200_000L);
        testDoctor.setHospital(new Hospital());

        testAppointment = new Appointment();
        testAppointment.setId(1L);
        testAppointment.setUser(patientUser);
        testAppointment.setDoctor(testDoctor);
        testAppointment.setAppointmentDate(LocalDate.now().plusDays(3));
        testAppointment.setAppointmentTime(LocalTime.of(9, 0));

        // Simulate patient logged in
        var auth = new UsernamePasswordAuthenticationToken(
            "patient1",
            "password",
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_PATIENT"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        when(userRepository.findOneByLogin("patient1")).thenReturn(Optional.of(patientUser));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ─── cancelAppointment: state machine ────────────────────────────────────

    @Test
    void cancelAppointment_whenAlreadyCancelled_throwsIllegalState() {
        testAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(testAppointment));

        assertThatThrownBy(() -> appointmentResource.cancelAppointment(1L, null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("already cancelled");
    }

    @Test
    void cancelAppointment_whenCompleted_throwsIllegalState() {
        testAppointment.setStatus(AppointmentStatus.COMPLETED);
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(testAppointment));

        assertThatThrownBy(() -> appointmentResource.cancelAppointment(1L, null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("completed");
    }

    // ─── updateAppointment: state machine ────────────────────────────────────

    @Test
    void updateAppointment_whenCancelled_throwsIllegalState() {
        testAppointment.setStatus(AppointmentStatus.CANCELLED);
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(testAppointment));

        var request = new AppointmentResource.UpdateAppointmentRequest(
            LocalDate.now().plusDays(2),
            "09:00"
        );

        assertThatThrownBy(() -> appointmentResource.updateAppointment(1L, request))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("cancelled");
    }

    @Test
    void updateAppointment_whenCompleted_throwsIllegalState() {
        testAppointment.setStatus(AppointmentStatus.COMPLETED);
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(testAppointment));

        var request = new AppointmentResource.UpdateAppointmentRequest(
            LocalDate.now().plusDays(2),
            "09:00"
        );

        assertThatThrownBy(() -> appointmentResource.updateAppointment(1L, request))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("completed");
    }

    // ─── createAppointment: date & time validation ────────────────────────────

    @Test
    void createAppointment_withPastDate_throwsIllegalState() {
        var request = new AppointmentResource.CreateAppointmentRequest(
            10L, null,
            LocalDate.now().minusDays(1),
            "09:00", "checkup", null
        );

        assertThatThrownBy(() -> appointmentResource.createAppointment(request))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("future");
    }

    @Test
    void createAppointment_withTimeBeforeBusinessHours_throwsIllegalState() {
        when(doctorRepository.findById(10L)).thenReturn(Optional.of(testDoctor));

        var request = new AppointmentResource.CreateAppointmentRequest(
            10L, null,
            LocalDate.now().plusDays(1),
            "07:30", "checkup", null
        );

        assertThatThrownBy(() -> appointmentResource.createAppointment(request))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("08:00");
    }

    @Test
    void createAppointment_withTimeAfterBusinessHours_throwsIllegalState() {
        when(doctorRepository.findById(10L)).thenReturn(Optional.of(testDoctor));

        var request = new AppointmentResource.CreateAppointmentRequest(
            10L, null,
            LocalDate.now().plusDays(1),
            "17:00", "checkup", null
        );

        assertThatThrownBy(() -> appointmentResource.createAppointment(request))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("16:30");
    }

    // ─── availableSlots: CANCELLED appointments do not block slots ───────────

    @Test
    @SuppressWarnings("unchecked")
    void availableSlots_cancelledAppointmentFreesSlot() {
        Appointment cancelled = new Appointment();
        cancelled.setId(99L);
        cancelled.setAppointmentTime(LocalTime.of(9, 0));
        cancelled.setStatus(AppointmentStatus.CANCELLED);

        when(doctorRepository.findById(10L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByDoctorIdAndAppointmentDate(10L, LocalDate.now().plusDays(1)))
            .thenReturn(List.of(cancelled));

        var response = appointmentResource.availableSlots(
            10L, LocalDate.now().plusDays(1), LocalDate.now().plusDays(1)
        );

        assertThat(response.getBody()).isNotNull();
        List<Map<String, Object>> slots = response.getBody().getAvailableSlots();
        List<String> daySlots = (List<String>) slots.get(0).get("slots");

        // 09:00 should still be available — cancelled booking doesn't block the slot
        assertThat(daySlots).contains("09:00");
    }

    @Test
    @SuppressWarnings("unchecked")
    void availableSlots_confirmedAppointmentBlocksSlot() {
        Appointment confirmed = new Appointment();
        confirmed.setId(100L);
        confirmed.setAppointmentTime(LocalTime.of(9, 0));
        confirmed.setStatus(AppointmentStatus.CONFIRMED);

        when(doctorRepository.findById(10L)).thenReturn(Optional.of(testDoctor));
        when(appointmentRepository.findByDoctorIdAndAppointmentDate(10L, LocalDate.now().plusDays(1)))
            .thenReturn(List.of(confirmed));

        var response = appointmentResource.availableSlots(
            10L, LocalDate.now().plusDays(1), LocalDate.now().plusDays(1)
        );

        List<Map<String, Object>> slots = response.getBody().getAvailableSlots();
        List<String> daySlots = (List<String>) slots.get(0).get("slots");

        // 09:00 must NOT appear — an active confirmed appointment occupies the slot
        assertThat(daySlots).doesNotContain("09:00");
    }

    // ─── ensureCanAccess: unauthorized user cannot access appointment ─────────

    @Test
    void getAppointment_byUnauthorizedUser_throwsIllegalState() {
        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setLogin("other");
        testAppointment.setUser(otherUser);
        testAppointment.setStatus(AppointmentStatus.PENDING);

        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(testAppointment));

        assertThatThrownBy(() -> appointmentResource.getAppointment(1L))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Unauthorized");
    }
}
