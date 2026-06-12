# Kế Hoạch Chi Tiết: Bổ Sung Tác Nhân Bác Sĩ (ROLE_DOCTOR)

Tài liệu này mô tả chi tiết các bước cần thực hiện, các file cần chỉnh sửa và thời gian ước lượng để hoàn thành việc tích hợp vai trò **Bác sĩ** thực tế (thay vì dữ liệu giả lập) cho hệ thống **MedBook**.

---

## 🎯 Mục Tiêu
1. **Đăng nhập:** Bác sĩ có thể đăng nhập bằng tài khoản có quyền `ROLE_DOCTOR`.
2. **Xem & Duyệt lịch khám:** Bác sĩ xem danh sách bệnh nhân đặt lịch hẹn riêng của mình, duyệt (Approve) hoặc từ chối (Decline) lịch hẹn trực tiếp trên cơ sở dữ liệu thực tế.
3. **Nhập hồ sơ bệnh án:** Khi kết thúc khám (Mark Complete), hiển thị giao diện nhập thông tin bệnh án (Chẩn đoán, điều trị, ghi chú) và lưu vào cơ sở dữ liệu.

---

## 📋 Chi Tiết Các Công Việc & Thời Gian Hoàn Thành

### Phần 1: Cấu hình Cơ sở dữ liệu & Phân quyền Backend
| Bước | Chi tiết công việc | Các file cần chỉnh sửa | Thời gian |
| :--- | :--- | :--- | :--- |
| **1.1** | **Cập nhật Database Schema & Dữ liệu mẫu:**<br>- Thêm bản ghi `ROLE_DOCTOR` vào bảng `jhi_authority`.<br>- Tạo một tài khoản bác sĩ mẫu trong `jhi_user` (ví dụ: `doctor`, mật khẩu mã hóa BCrypt).<br>- Tạo liên kết trong bảng `jhi_user_authority` cho tài khoản trên.<br>- Thêm 1 bản ghi bác sĩ tương ứng trong bảng `doctor` có email trùng với tài khoản user trên. | - `backend_dump.sql`<br>- `Backend/src/main/resources/config/liquibase/data/authority.csv` | **30 phút** |
| **1.2** | **Cập nhật Hằng số Quyền (Java):**<br>- Định nghĩa thêm `ROLE_DOCTOR` trong hằng số bảo mật của dự án. | - `Backend/src/main/java/hospital/security/AuthoritiesConstants.java` | **10 phút** |
| **1.3** | **Cấu hình Security Filter Chain:**<br>- Cho phép tài khoản `ROLE_DOCTOR` có quyền gọi các API cập nhật trạng thái lịch khám vốn trước đây chỉ dành cho `ROLE_ADMIN` (endpoint `/api/admin/appointments/**`). | - `Backend/src/main/java/hospital/config/SecurityConfiguration.java` | **20 phút** |

---

### Phần 2: Cập nhật API & Logic Nghiệp vụ Backend
| Bước | Chi tiết công việc | Các file cần chỉnh sửa | Thời gian |
| :--- | :--- | :--- | :--- |
| **2.1** | **Bổ sung truy vấn trong Repository:**<br>- Thêm phương thức tìm kiếm bác sĩ theo email đăng nhập: `findByEmail(String email)`.<br>- Thêm phương thức tìm lịch khám theo ID bác sĩ: `findByDoctorId(Long doctorId)`. | - `Backend/src/main/java/hospital/repository/DoctorRepository.java`<br>- `Backend/src/main/java/hospital/repository/AppointmentRepository.java` | **20 phút** |
| **2.2** | **Cập nhật API Lấy Lịch Hẹn (`GET /api/appointments`):**<br>- Kiểm tra quyền của người dùng hiện tại.<br>- Nếu người dùng có quyền `ROLE_DOCTOR`, lấy thông tin bác sĩ tương ứng qua email và chỉ trả về danh sách lịch hẹn của riêng bác sĩ đó (thay vì trả về lịch hẹn của bệnh nhân). | - `Backend/src/main/java/hospital/web/rest/AppointmentResource.java` | **40 phút** |

---

### Phần 3: Cập nhật Giao diện & Tích hợp Frontend
| Bước | Chi tiết công việc | Các file cần chỉnh sửa | Thời gian |
| :--- | :--- | :--- | :--- |
| **3.1** | **Tắt Mock Data & Cấu hình Env:**<br>- Chuyển chế độ kết nối về API Spring Boot thật. | - `Fontend/.env.local` | **5 phút** |
| **3.2** | **Xử lý Điều Hướng Đăng Nhập:**<br>- Đảm bảo sau khi đăng nhập thành công với role `ROLE_DOCTOR` hoặc `DOCTOR`, trang web tự động chuyển hướng về `/doctor-dashboard`. | - `Fontend/app/login/page.tsx` | **10 phút** |
| **3.3** | **Xây dựng Form Nhập Bệnh Án:**<br>- Thiết kế thêm một Modal Dialog nhập thông tin bệnh án (Chẩn đoán, Đơn thuốc/Điều trị, Ghi chú) khi bác sĩ nhấn nút *"Mark Complete"*.<br>- Gửi request `POST /api/medical-records` để lưu bệnh án vào cơ sở dữ liệu thật sau khi hoàn thành. | - `Fontend/app/doctor-dashboard/page.tsx` | **60 phút** |
| **3.4** | **Kiểm thử Liên kết (Integration Testing):**<br>- Đăng nhập tài khoản bác sĩ thật.<br>- Duyệt/Từ chối lịch hẹn.<br>- Kết thúc lịch hẹn & nhập bệnh án.<br>- Đăng nhập tài khoản bệnh nhân để xác nhận bệnh án đã hiển thị đúng. | - Thực hiện thủ công trên trình duyệt | **30 phút** |

---

## ⏱️ Tổng Kết Thời Gian Ước Tính
* **Tổng thời gian phát triển:** **225 phút (khoảng 3 giờ 45 phút)**.
* **Kế hoạch triển khai:** Có thể hoàn thành và bàn giao chạy thử ngay trong **nửa ngày làm việc**.

---

## 🛠️ Hướng dẫn Kiểm tra sau khi hoàn thành
Sau khi thực hiện xong kế hoạch trên, bạn có thể thực hiện kiểm thử theo luồng sau:
1. Đăng nhập bằng tài khoản Bệnh nhân $\rightarrow$ Đặt lịch hẹn với Bác sĩ A.
2. Đăng nhập bằng tài khoản Bác sĩ A $\rightarrow$ Vào Dashboard sẽ thấy lịch hẹn ở trạng thái **Pending Approvals** $\rightarrow$ Nhấn **Approve** (Lịch hẹn chuyển sang trạng thái **Scheduled**).
3. Bác sĩ A khám xong $\rightarrow$ Nhấn **Mark Complete** $\rightarrow$ Form nhập bệnh án hiển thị $\rightarrow$ Nhập chẩn đoán và thuốc $\rightarrow$ Xác nhận.
4. Đăng nhập lại bằng tài khoản Bệnh nhân $\rightarrow$ Vào mục **Medical Records** để xác nhận bệnh án đã hiển thị đúng thông tin bác sĩ kê đơn.
