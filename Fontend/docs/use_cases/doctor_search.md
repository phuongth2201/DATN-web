### 2.2.3 Mô tả usecase Tìm kiếm bác sĩ

1.  **Tên usecase:** Tìm kiếm bác sĩ
2.  **Mô tả vắn tắt:** Usecase này cho phép người dùng tìm kiếm bác sĩ theo tên hoặc chuyên khoa.
3.  **Luồng các sự kiện:**
    *   **3.1 Luồng cơ bản:**
        1.  Use case này bắt đầu khi người dùng nhập từ khóa vào ô tìm kiếm trên trang chủ.
        2.  Người dùng nhấn nút “Tìm kiếm”.
        3.  Hệ thống truy vấn dữ liệu từ bảng `DOCTOR` theo từ khóa nhập vào.
        4.  Hệ thống hiển thị danh sách các bác sĩ phù hợp lên màn hình. Use case kết thúc.
    *   **3.2 Luồng rẽ nhánh:**
        1.  Tại bước 3, nếu không tìm thấy bác sĩ phù hợp, hệ thống hiển thị thông báo “Không tìm thấy bác sĩ”.
        2.  Nếu người dùng không nhập từ khóa, hệ thống yêu cầu nhập thông tin tìm kiếm.
        3.  Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc.
4.  **Các yêu cầu đặc biệt:** Không có
5.  **Tiền điều kiện:** Không có
6.  **Hậu điều kiện:** Hiển thị danh sách bác sĩ
7.  **Điểm mở rộng:** Không có
