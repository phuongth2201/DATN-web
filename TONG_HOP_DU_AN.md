# TỔNG HỢP LUỒNG DỰ ÁN & CÁC CHỨC NĂNG ĐÃ HOÀN THÀNH
*Dự án: Hệ thống Đặt lịch Khám Bệnh Trực tuyến (Web Đặt Lịch Khám)*

---

## 1. CÁC ROLE (VAI TRÒ) VÀ LUỒNG HOẠT ĐỘNG 

### 🧑‍🦱 Bệnh Nhân (Patient / `ROLE_USER`)
- **Tìm kiếm Bác sĩ:** Trang chủ và trang danh sách bác sĩ cho phép lọc theo chuyên khoa, đánh giá, kinh nghiệm. Xem chi tiết hồ sơ bác sĩ.
- **Đặt lịch khám (Booking):**
  - Chặn chọn ngày trong quá khứ (tự động tính múi giờ Local Time +07:00).
  - Tự động vô hiệu hóa (disabled) các khung giờ đã trôi qua trong ngày hôm nay.
  - Chọn hình thức: Khám Online / Khám Trực tiếp.
- **Quản lý Lịch hẹn (My Appointments):**
  - Xem danh sách, lọc theo trạng thái (Pending, Confirmed, Completed, Cancelled) và lọc theo ngày.
  - **Tự động Hủy (Cancel):** Bệnh nhân có thể tự hủy lịch kèm lý do ngay cả khi lịch đang ở trạng thái **PENDING**.
  - **Dời lịch (Reschedule):** Xin đổi sang giờ khác/ngày khác.
- **Thanh toán (Payment):** Khi Bác sĩ xác nhận lịch (**CONFIRMED**), bệnh nhân có thể thanh toán qua cổng **PayOS**. Webhook tự động cập nhật trạng thái thành **PAID**.
- **Xem Bệnh Án Điện Tử:** Sau khi khám xong (Trạng thái **COMPLETED**), bệnh nhân có thể xem chi tiết **Chẩn đoán (Diagnosis)** và **Phác đồ điều trị (Treatment)** do bác sĩ kê.

### 👨‍⚕️ Bác Sĩ (Doctor / `ROLE_DOCTOR`)
- **Đăng nhập & Điều hướng:** Menu tự động nhận diện Role. Ẩn các menu của bệnh nhân để tránh gây rối, hiển thị nút **Doctor Dashboard**. Chặn và tự động điều hướng (redirect) nếu bác sĩ cố vào trang của bệnh nhân.
- **Quản lý Lịch hẹn (Doctor Dashboard):**
  - Hiển thị danh sách lịch chờ Duyệt (Pending). Bác sĩ có quyền **Approve** (Chuyển sang Confirmed) hoặc **Decline** (Hủy lịch).
  - Quản lý lịch đã nhận (Scheduled).
- **Khám bệnh & Viết Bệnh án:**
  - Bấm nút **Complete** để kết thúc buổi khám.
  - Pop-up xuất hiện yêu cầu điền Bệnh án (Diagnosis) và Đơn thuốc (Treatment Plan).
  - Lưu vào DB và hệ thống tự đẩy Bệnh án về màn hình của Bệnh nhân.

### 👑 Quản Trị Viên (Admin / `ROLE_ADMIN`)
- **Admin Panel:** Có một Dashboard riêng để kiểm soát toàn bộ hệ thống.
- **Quản lý User & Doctor:** Xem danh sách, phân quyền, phê duyệt tài khoản bác sĩ.

---

## 2. NHỮNG TÍNH NĂNG VÀ BUG ĐÃ FIX THÀNH CÔNG (GIAI ĐOẠN CUỐI)
1. **Tích hợp Webhook PayOS:** Nối luồng thanh toán thực tế thay vì mock data. Frontend điều hướng chuẩn sang trang thanh toán của PayOS.
2. **Lọc dữ liệu:** Thêm bộ lọc Trạng thái và Ngày tháng cho trang My Appointments của Bệnh nhân để dễ quản lý.
3. **Fix Bug Timezone (Lỗi quá khứ):** Xử lý dứt điểm tình trạng User dùng `new Date()` bị sai múi giờ (chọn được ngày hôm qua) bằng cách tính đúng bù trừ (offset) Local Time.
4. **Chặn Giờ (Past Slots):** Các nút khung giờ trong quá khứ (ví dụ 08:30 sáng của ngày hôm nay khi hiện tại đã là 09:00) sẽ tự động bị gạch ngang và vô hiệu hóa.
5. **UI/UX Menu Bác sĩ:** Trải nghiệm phân quyền chuẩn. Bác sĩ chỉ thấy duy nhất Doctor Dashboard thay vì bị lẫn lộn giữa màn hình Quản lý và màn hình Bệnh nhân.
6. **Bệnh Án Điện Tử (Medical Records):** Thông luồng từ lúc Bác sĩ khám xong (tạo bệnh án) đến lúc Bệnh nhân nhận được và đọc bệnh án.

---

*Báo cáo được tổng hợp tự động để bàn giao.*
