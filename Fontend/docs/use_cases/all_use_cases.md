# 2.2 Mô tả usecase 

2.2.1 Mô tả usecase Đăng ký tài khoản
    1. Tên usecase: Đăng ký tài khoản 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng đăng ký tài khoản mới 
    3. Luồng các sự kiện 
	3.1 Luồng cơ bản
    1) Use case này bắt đầu khi người dùng kích vào nút “Đăng ký” trên trang chủ hoặc trang đăng nhập. Hệ thống hiển thị form đăng ký tài khoản lên màn hình. 
    2) Người dùng nhập đầy đủ thông tin gồm: tên đăng nhập, mật khẩu, email, số điện thoại và nhấn nút “Đăng ký”. 
    3) Hệ thống kiểm tra tính hợp lệ của dữ liệu và lưu thông tin vào bảng USERS trong cơ sở dữ liệu. 
    4) Hệ thống hiển thị thông báo đăng ký thành công và chuyển sang màn hình đăng nhập. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bước 2, nếu tên đăng nhập đã tồn tại, hệ thống hiển thị thông báo lỗi và yêu cầu người dùng nhập lại. 
    2) Nếu email không hợp lệ hoặc đã được sử dụng, hệ thống hiển thị thông báo lỗi. 
    3) Nếu mật khẩu không đúng định dạng (quá ngắn hoặc thiếu ký tự), hệ thống yêu cầu nhập lại. 
    4) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    5) Các yêu cầu đặc biệt: Không có 
    6) Tiền điều kiện: Không có 
    7) Hậu điều kiện: Tài khoản mới được lưu trong hệ thống 
    8) Điểm mở rộng: Không 

2.2.2 Mô tả usecase Đăng nhập 
    1. Tên usecase: Đăng nhập 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng đăng nhập vào hệ thống 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng kích vào nút “Đăng nhập” trên trang chủ hoặc trang đăng ký. Hệ thống hiển thị form đăng nhập lên màn hình. 
    2) Người dùng nhập tên đăng nhập và mật khẩu và nhấn nút “Đăng nhập”. 
    3) Hệ thống kiểm tra thông tin đăng nhập với dữ liệu trong bảng USERS. 
    4) Hệ thống hiển thị trang chính của hệ thống nếu đăng nhập thành công. Use case kết thúc. 
	3.2 Luồng rẽ nhánh
    1) Tại bước 2, nếu người dùng nhập sai tên đăng nhập hoặc mật khẩu, hệ thống hiển thị thông báo lỗi và yêu cầu nhập lại. 
    2) Nếu tài khoản bị khóa hoặc không tồn tại, hệ thống hiển thị thông báo lỗi. 
    3) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    4) Các yêu cầu đặc biệt: Không có 
    5) Tiền điều kiện: Người dùng đã có tài khoản 
    6) Hậu điều kiện: Người dùng đăng nhập thành công vào hệ thống 
    7) Điểm mở rộng: Không có 

2.2.3 Mô tả usecase Tìm kiếm bác sĩ
    1. Tên usecase: Tìm kiếm bác sĩ 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng tìm kiếm bác sĩ theo tên hoặc chuyên khoa 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng nhập từ khóa vào ô tìm kiếm trên trang chủ. 
    2) Người dùng nhấn nút “Tìm kiếm”. 
    3) Hệ thống truy vấn dữ liệu từ bảng DOCTOR theo từ khóa nhập vào. 
    4) Hệ thống hiển thị danh sách các bác sĩ phù hợp lên màn hình. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bước 3, nếu không tìm thấy bác sĩ phù hợp, hệ thống hiển thị thông báo “Không tìm thấy bác sĩ”. 
    2) Nếu người dùng không nhập từ khóa, hệ thống yêu cầu nhập thông tin tìm kiếm. 
    3) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    4) Các yêu cầu đặc biệt: Không có 
    5) Tiền điều kiện: Không có 
    6) Hậu điều kiện: Hiển thị danh sách bác sĩ 
    7) Điểm mở rộng: Không có 

2.2.4 Mô tả usecase Xem danh sách bác sĩ
    1. Tên usecase: Xem danh sách bác sĩ 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng xem danh sách các bác sĩ trong hệ thống 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng truy cập vào chức năng “Danh sách bác sĩ”. 
    2) Hệ thống lấy dữ liệu từ bảng DOCTOR trong cơ sở dữ liệu. 
    3) Hệ thống hiển thị danh sách bác sĩ gồm tên, chuyên khoa và thông tin cơ bản lên màn hình. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bước 2, nếu không có bác sĩ nào trong hệ thống, hệ thống hiển thị thông báo “Chưa có bác sĩ”. 
    2) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    3) Các yêu cầu đặc biệt: Không có 
    4) Tiền điều kiện: Không có 
    5) Hậu điều kiện: Hiển thị danh sách bác sĩ 
    6) Điểm mở rộng: Không có 

2.2.5 Mô tả usecase Xem thông tin bác sĩ
    1. Tên usecase: Xem thông tin bác sĩ 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng xem chi tiết thông tin của bác sĩ 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng kích vào một bác sĩ trong danh sách. 
    2) Hệ thống lấy thông tin chi tiết của bác sĩ từ bảng DOCTOR. 
    3) Hệ thống hiển thị thông tin gồm tên, chuyên khoa, kinh nghiệm, lịch làm việc và mô tả. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bước 2, nếu không tìm thấy thông tin bác sĩ, hệ thống hiển thị thông báo lỗi. 
    2) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    3) Các yêu cầu đặc biệt: Không có 
    4) Tiền điều kiện: Không có 
    5) Hậu điều kiện: Hiển thị chi tiết bác sĩ 
    6) Điểm mở rộng: Không có 

2.2.6 Mô tả usecase Đặt lịch khám
    1. Tên usecase: Đặt lịch khám 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng đặt lịch khám với bác sĩ 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng kích vào nút “Đặt lịch” tại trang thông tin bác sĩ. 
    2) Hệ thống hiển thị form đặt lịch gồm ngày, giờ và thông tin bệnh. 
    3) Người dùng nhập thông tin và nhấn nút “Xác nhận”. 
    4) Hệ thống kiểm tra dữ liệu và lưu lịch khám vào bảng APPOINTMENT. 
    5) Hệ thống hiển thị thông báo đặt lịch thành công. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bước 3, nếu người dùng nhập thiếu thông tin, hệ thống yêu cầu nhập lại. 
    2) Nếu thời gian đã được đặt trước đó, hệ thống yêu cầu chọn thời gian khác. 
    3) Nếu người dùng chưa đăng nhập, hệ thống yêu cầu đăng nhập trước khi đặt lịch. 
    4) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    5) Các yêu cầu đặc biệt: Không có 
    6) Tiền điều kiện: Người dùng đã đăng nhập 
    7) Hậu điều kiện: Lịch khám được lưu trong hệ thống 
    8) Điểm mở rộng: Không có 

2.2.7 Mô tả usecase Quản lý lịch khám
    1. Tên usecase: Quản lý lịch khám 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng xem và hủy lịch khám 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng truy cập vào mục “Lịch khám của tôi”. 
    2) Hệ thống lấy dữ liệu từ bảng APPOINTMENT và hiển thị danh sách lịch khám. 
    3) Người dùng chọn một lịch khám để xem chi tiết hoặc hủy lịch. 
    4) Khi người dùng chọn hủy, hệ thống xóa lịch khám khỏi cơ sở dữ liệu và cập nhật lại danh sách. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bước 2, nếu không có lịch khám nào, hệ thống hiển thị thông báo “Chưa có lịch khám”. 
    2) Nếu người dùng không xác nhận hủy, hệ thống giữ nguyên dữ liệu. 
    3) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    4) Các yêu cầu đặc biệt: Không có 
    5) Tiền điều kiện: Người dùng đã đăng nhập 
    6) Hậu điều kiện: Lịch khám được cập nhật 
    7) Điểm mở rộng: Không có 

2.2.8 Mô tả usecase Quản lý người dùng (Admin)
    1. Tên usecase: Quản lý người dùng 
    2. Mô tả vắn tắt : Usecase này cho phép quản trị viên quản lý tài khoản người dùng 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi admin truy cập vào chức năng “Quản lý người dùng”. Hệ thống hiển thị danh sách tài khoản từ bảng USERS. 
    2) Admin có thể thực hiện thêm, sửa, xóa hoặc xem chi tiết tài khoản. 
    3) Khi thêm hoặc sửa, hệ thống lưu dữ liệu vào bảng USERS. 
    4) Khi xóa, hệ thống yêu cầu xác nhận và xóa dữ liệu khỏi hệ thống. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Nếu nhập thông tin không hợp lệ, hệ thống hiển thị thông báo lỗi. 
    2) Nếu admin hủy thao tác, hệ thống quay lại danh sách. 
    3) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi và use case kết thúc. 
    4) Các yêu cầu đặc biệt: Chỉ admin được phép thực hiện 
    5) Tiền điều kiện: Admin đã đăng nhập 
    6) Hậu điều kiện: Dữ liệu USERS được cập nhật 
    7) Điểm mở rộng: Không có

2.2.9 Mô tả usecase Quản lý bác sĩ (Admin)
    1. Tên usecase: Quản lý bác sĩ 
    2. Mô tả vắn tắt : Usecase này cho phép quản trị viên quản lý danh sách bác sĩ 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi admin truy cập vào chức năng “Quản lý bác sĩ”. Hệ thống hiển thị danh sách bác sĩ từ bảng DOCTOR. 
    2) Admin có thể thực hiện thêm, sửa, xóa hoặc xem chi tiết hồ sơ bác sĩ. 
    3) Hệ thống kiểm tra dữ liệu và cập nhật bảng DOCTOR. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Nếu thông tin nhập bị thiếu, hệ thống yêu cầu nhập lại. 
    2) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi. 
    3) Các yêu cầu đặc biệt: Chỉ admin được phép thực hiện 
    4) Tiền điều kiện: Admin đã đăng nhập 
    5) Hậu điều kiện: Dữ liệu DOCTOR được cập nhật 
    6) Điểm mở rộng: Không có

2.2.10 Mô tả usecase Quản lý chuyên khoa (Admin)
    1. Tên usecase: Quản lý chuyên khoa 
    2. Mô tả vắn tắt : Usecase này cho phép quản trị viên quản lý các chuyên khoa 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi admin truy cập chức năng “Quản lý chuyên khoa”. Hệ thống hiển thị danh sách từ bảng SPECIALTY. 
    2) Admin thực hiện thêm, sửa hoặc xóa chuyên khoa. 
    3) Hệ thống lưu thay đổi vào cơ sở dữ liệu. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống báo lỗi. 
    2) Các yêu cầu đặc biệt: Chỉ admin được phép thực hiện 
    3) Tiền điều kiện: Admin đã đăng nhập 
    4) Hậu điều kiện: Dữ liệu chuyên khoa được cập nhật 
    5) Điểm mở rộng: Không có

2.2.11 Mô tả usecase Thống kê hệ thống (Admin)
    1. Tên usecase: Thống kê hệ thống 
    2. Mô tả vắn tắt : Usecase này cho phép quản trị viên xem báo cáo thống kê 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi admin truy cập vào chức năng “Thống kê”. 
    2) Hệ thống truy vấn dữ liệu từ các bảng APPOINTMENT, DOCTOR, USERS. 
    3) Hệ thống hiển thị biểu đồ và số liệu thống kê lên màn hình. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống hiển thị thông báo lỗi. 
    2) Các yêu cầu đặc biệt: Chỉ admin được phép thực hiện 
    3) Tiền điều kiện: Admin đã đăng nhập 
    4) Hậu điều kiện: Hiển thị báo cáo thống kê 
    5) Điểm mở rộng: Không có

2.2.12 Mô tả usecase Đánh giá bác sĩ
    1. Tên usecase: Đánh giá bác sĩ 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng đánh giá và nhận xét bác sĩ sau khi khám 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng chọn một lịch khám đã hoàn thành. 
    2) Hệ thống hiển thị form đánh giá gồm số sao và nội dung nhận xét. 
    3) Người dùng nhập thông tin và nhấn nút “Gửi”. 
    4) Hệ thống lưu đánh giá vào bảng REVIEW và cập nhật điểm trung bình của bác sĩ. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Nếu chưa nhập điểm đánh giá, hệ thống yêu cầu nhập lại. 
    2) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống báo lỗi. 
    3) Các yêu cầu đặc biệt: Không có 
    4) Tiền điều kiện: Lịch khám đã ở trạng thái hoàn thành 
    5) Hậu điều kiện: Đánh giá được lưu thành công 
    6) Điểm mở rộng: Không có

2.2.13 Mô tả usecase Xem hồ sơ bệnh án
    1. Tên usecase: Xem hồ sơ bệnh án 
    2. Mô tả vắn tắt : Usecase này cho phép người dùng xem lại kết quả khám bệnh 
    3. Luồng các sự kiện
	3.1 Luồng cơ bản 
    1) Use case này bắt đầu khi người dùng truy cập vào mục “Hồ sơ bệnh án”. 
    2) Hệ thống lấy dữ liệu từ bảng MEDICAL_RECORD liên quan đến người dùng. 
    3) Hệ thống hiển thị danh sách kết quả khám và đơn thuốc. Use case kết thúc. 
3.2 Luồng rẽ nhánh
    1) Nếu không có hồ sơ nào, hệ thống báo “Chưa có hồ sơ bệnh án”. 
    2) Tại bất kỳ thời điểm nào, nếu không kết nối được với cơ sở dữ liệu, hệ thống báo lỗi. 
    3) Các yêu cầu đặc biệt: Không có 
    4) Tiền điều kiện: Người dùng đã đăng nhập 
    5) Hậu điều kiện: Hiển thị danh sách hồ sơ bệnh án 
    6) Điểm mở rộng: Không có
