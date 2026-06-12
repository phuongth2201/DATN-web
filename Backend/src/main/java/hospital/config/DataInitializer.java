package hospital.config;

import hospital.domain.Doctor;
import hospital.domain.Hospital;
import hospital.domain.Specialty;
import hospital.repository.DoctorRepository;
import hospital.repository.HospitalRepository;
import hospital.repository.SpecialtyRepository;
import hospital.domain.enumeration.AppointmentStatus;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final DoctorRepository doctorRepository;
    private final HospitalRepository hospitalRepository;
    private final SpecialtyRepository specialtyRepository;
    private final hospital.repository.AppointmentRepository appointmentRepository;

    public DataInitializer(
        DoctorRepository doctorRepository,
        HospitalRepository hospitalRepository,
        SpecialtyRepository specialtyRepository,
        hospital.repository.AppointmentRepository appointmentRepository
    ) {
        this.doctorRepository = doctorRepository;
        this.hospitalRepository = hospitalRepository;
        this.specialtyRepository = specialtyRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (doctorRepository.findByEmail("doctor@example.com").isEmpty()) {
            System.out.println(">>> SEEDING DUMMY DATA FOR DOCTOR <<<");
            
            // Create specialties
            Specialty cardio = new Specialty();
            cardio.setName("Cardiology");
            cardio.setVietnamName("Tim mạch");
            cardio.setDescription("Khám và điều trị các bệnh lý tim mạch");
            cardio.setIcon("Heart");
            cardio = specialtyRepository.save(cardio);

            Specialty neuro = new Specialty();
            neuro.setName("Neurology");
            neuro.setVietnamName("Thần kinh");
            neuro.setDescription("Chuyên khoa nội thần kinh");
            neuro.setIcon("Brain");
            neuro = specialtyRepository.save(neuro);

            Specialty derma = new Specialty();
            derma.setName("Dermatology");
            derma.setVietnamName("Da liễu");
            derma.setDescription("Khám và điều trị bệnh ngoài da");
            derma.setIcon("Sun");
            derma = specialtyRepository.save(derma);

            // Create Hospital
            Hospital hospital = new Hospital();
            hospital.setName("Bệnh viện Đa khoa Quốc tế");
            hospital.setAddress("Hà Nội");
            hospital.setPhone("0123456789");
            hospital.setEmail("contact@hospital.com");
            hospital = hospitalRepository.save(hospital);

            // Create Doctors
            Doctor doc1 = new Doctor();
            doc1.setFullName("Bác sĩ Nguyễn Văn A");
            doc1.setEmail("doctor@example.com"); // Login account
            doc1.setPhoneNumber("0987654321");
            doc1.setBio("Chuyên gia tim mạch hàng đầu với 10 năm kinh nghiệm.");
            doc1.setExperience(10);
            doc1.setPrice(500000L);
            doc1.setRating(4.8);
            doc1.setSpecialty(cardio);
            doc1.setHospital(hospital);
            doc1 = doctorRepository.save(doc1);

            Doctor doc2 = new Doctor();
            doc2.setFullName("Bác sĩ Trần Thị B");
            doc2.setEmail("tranb@example.com");
            doc2.setPhoneNumber("0912345678");
            doc2.setBio("Bác sĩ chuyên khoa Thần kinh, tu nghiệp tại Pháp.");
            doc2.setExperience(7);
            doc2.setPrice(400000L);
            doc2.setRating(4.5);
            doc2.setSpecialty(neuro);
            doc2.setHospital(hospital);
            doc2 = doctorRepository.save(doc2);

            Doctor doc3 = new Doctor();
            doc3.setFullName("Bác sĩ Lê Hoàng C");
            doc3.setEmail("lehc@example.com");
            doc3.setPhoneNumber("0909090909");
            doc3.setBio("Chuyên gia Da liễu, điều trị mụn và thẩm mỹ da.");
            doc3.setExperience(5);
            doc3.setPrice(300000L);
            doc3.setRating(4.9);
            doc3.setSpecialty(derma);
            doc3.setHospital(hospital);
            doc3 = doctorRepository.save(doc3);

            // Seed a dummy appointment for this doctor
            hospital.domain.User patient = new hospital.domain.User();
            patient.setId(2L); // 2 is typically the ID of the 'user' account in JHipster fake data

            hospital.domain.Appointment appointment = new hospital.domain.Appointment();
            appointment.setUser(patient);
            appointment.setDoctor(doc1);
            appointment.setHospital(hospital);
            appointment.setAppointmentDate(java.time.LocalDate.now().plusDays(1));
            appointment.setAppointmentTime(java.time.LocalTime.of(9, 30));
            appointment.setStatus(AppointmentStatus.PENDING);
            appointment.setReason("Đau đầu, chóng mặt");
            appointment.setNotes("Bệnh nhân có tiền sử huyết áp cao");
            appointment.setPrice(doc1.getPrice());
            appointment.setPaymentStatus("UNPAID");

            appointmentRepository.save(appointment);
            
            System.out.println(">>> SEEDING COMPLETED <<<");
        }
    }
}
