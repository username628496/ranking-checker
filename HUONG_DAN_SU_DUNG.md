# Hướng Dẫn Sử Dụng - Công Cụ Kiểm Tra Ranking

## 🎯 Tổng Quan

Công cụ kiểm tra ranking Google đã được thiết kế lại với **4 trang chính**, mỗi trang có chức năng riêng biệt:

1. **Single Keyword Check** - Kiểm tra từ khóa đơn lẻ
2. **Bulk Keyword Check (Top 30)** - Kiểm tra hàng loạt từ khóa
3. **API Settings** - Cài đặt API Key và tùy chọn
4. **History / Logs** - Lịch sử kiểm tra

---

## 🚀 Cài Đặt Lần Đầu

### Yêu Cầu
- Node.js 18+
- Python 3.8+
- API Key từ Serper.dev (miễn phí 2,500 lượt/tháng)

### Bước 1: Cài Đặt Backend

```bash
cd backend

# Tạo môi trường ảo
python3 -m venv venv
source venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt

# Tạo file .env và thêm API key
echo "SERPER_API_KEY=your_api_key_here" > .env

# Chạy server
python app.py
```

Backend sẽ chạy tại: `http://localhost:8001`

### Bước 2: Cài Đặt Frontend

```bash
cd frontend

# Cài đặt thư viện
npm install

# Chạy development server
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

### Bước 3: Truy Cập Ứng Dụng

Mở trình duyệt và truy cập: `http://localhost:5173`

---

## 📖 Hướng Dẫn Sử Dụng Từng Trang

### Trang 1: Single Keyword Check (Kiểm Tra Đơn Lẻ)

**Chức năng:** Kiểm tra thứ hạng của từ khóa với domain cụ thể

**Cách sử dụng:**

1. Nhập từ khóa (mỗi từ khóa trên một dòng):
   ```
   thiết kế website
   seo website
   marketing online
   ```

2. Nhập domain (mỗi domain trên một dòng):
   ```
   example.com
   competitor.com
   yoursite.vn
   ```

3. Chọn thiết bị:
   - Desktop (máy tính)
   - Mobile (điện thoại)

4. Chọn khu vực:
   - Toàn quốc (Vietnam)
   - Hà Nội
   - TP. Hồ Chí Minh
   - Đà Nẵng

5. Nhấn **"Bắt đầu kiểm tra"**

6. Xem kết quả:
   - Thanh tiến trình cập nhật real-time
   - Top 10 highlights (kết quả nổi bật)
   - Bảng kết quả đầy đủ

7. Lưu template để dùng lại sau

**Tips:**
- Hệ thống tự động kiểm tra redirect (www, https)
- Kết quả được lưu vào lịch sử tự động
- Có thể sử dụng template đã lưu để tiết kiệm thời gian

---

### Trang 2: Bulk Keyword Check (Kiểm Tra Hàng Loạt)

**Chức năng:** Xem top 30 domain xếp hạng cho mỗi từ khóa

**Cách sử dụng:**

1. Nhập danh sách từ khóa (mỗi từ trên một dòng):
   ```
   mua laptop
   sửa máy tính
   phụ kiện điện thoại
   ```

2. Chọn khu vực và thiết bị

3. Nhấn **"Bắt đầu kiểm tra"**

4. Kết quả hiển thị:
   - Mỗi từ khóa có bảng riêng
   - Top 30 domain với vị trí, tiêu đề
   - Sắp xếp theo thứ hạng

5. Xuất CSV:
   - Nhấn **"Xuất CSV"**
   - File tải về có format: `bulk-check-[timestamp].csv`

**Ứng dụng:**
- Phân tích đối thủ cạnh tranh
- Đánh giá độ khó của từ khóa
- Nghiên cứu SERP (Search Engine Results Page)
- Tìm cơ hội từ khóa mới

**Lưu ý:**
- Mỗi từ khóa tốn 1 lượt API call
- Kiểm tra nhiều từ khóa cùng lúc tiết kiệm thời gian
- Kết quả không lưu vào history (chỉ xuất CSV)

---

### Trang 3: API Settings (Cài Đặt API)

**Chức năng:** Cấu hình API key và các tùy chọn mặc định

**Cách sử dụng:**

#### 1. Cấu hình API Key

**Lấy API Key miễn phí:**
1. Truy cập: https://serper.dev
2. Đăng ký tài khoản
3. Lấy API key (2,500 lượt tìm kiếm miễn phí/tháng)

**Nhập API Key:**
1. Paste API key vào ô "Serper.dev API Key"
2. Nhấn **"Kiểm tra API Key"** để xác thực
3. ✅ thành công → Màu xanh
4. ❌ thất bại → Màu đỏ

**Xóa API Key:**
- Nhấn **"Xóa API Key"** để xóa khỏi trình duyệt

#### 2. Cài Đặt Chung

**Khu vực mặc định:**
- Chọn khu vực thường dùng
- Áp dụng cho các trang khác

**Thiết bị mặc định:**
- Desktop hoặc Mobile
- Tự động chọn khi mở form

**Thời gian chờ tối đa:**
- 5-60 giây
- Thời gian chờ mỗi request API
- Khuyến nghị: 15 giây

**Số luồng xử lý đồng thời:**
- 1-20 luồng
- Càng nhiều → càng nhanh
- ⚠️ Quá nhiều có thể vượt rate limit
- Khuyến nghị: 6 luồng

#### 3. Lưu Cài Đặt

Nhấn **"Lưu cài đặt"** → Thông báo thành công

**Quan trọng:**
- 🔒 API key lưu trên trình duyệt (localStorage)
- 🔒 KHÔNG gửi lên server
- 🔒 Chỉ bạn nhìn thấy
- 💡 Nếu không nhập API key → dùng key server (share với user khác)

---

### Trang 4: History / Logs (Lịch Sử)

**Chức năng:** Xem lại tất cả lần kiểm tra đã thực hiện

**Cách sử dụng:**

#### 1. Tìm Kiếm

**Tìm theo từ khóa/domain:**
- Nhập vào ô "Tìm kiếm theo từ khóa hoặc domain"
- Hệ thống tự động lọc kết quả

#### 2. Bộ Lọc

**Khu vực:**
- Tất cả
- Toàn quốc
- Hà Nội
- TP.HCM
- Đà Nẵng

**Thiết bị:**
- Tất cả
- Desktop
- Mobile

**Khoảng thời gian:**
- Từ ngày: Chọn ngày bắt đầu
- Đến ngày: Chọn ngày kết thúc

#### 3. Xem Kết Quả

Bảng hiển thị:
- Ngày giờ kiểm tra
- Từ khóa
- Domain
- Vị trí (badge màu sắc)
- Khu vực
- Thiết bị

**Màu sắc vị trí:**
- 🟢 Vị trí 1-3: Xanh lá
- 🔵 Vị trí 4-10: Xanh dương
- 🟡 Vị trí 11-30: Vàng
- ⚪ Không có/Ngoài top: Xám

#### 4. Xuất CSV

1. Áp dụng bộ lọc
2. Nhấn **"Xuất CSV"**
3. File tải về: `ranking-history-[timestamp].csv`

**Ứng dụng:**
- Theo dõi thay đổi ranking theo thời gian
- Kiểm tra hiệu quả SEO
- Báo cáo cho khách hàng
- Phân tích xu hướng

---

## 💡 Tips & Tricks

### 1. Tối Ưu Hiệu Suất

**Sử dụng API Key riêng:**
- Tránh chia sẻ rate limit
- Kiểm soát chi phí
- Nhanh hơn

**Batch checking:**
- Trang 1: Kiểm tra nhiều cặp keyword-domain cùng lúc
- Trang 2: Kiểm tra nhiều keyword để xem top 30

**Lưu template:**
- Tạo template cho khách hàng
- Tái sử dụng nhanh chóng
- Chia sẻ với team

### 2. Kịch Bản Sử Dụng Thực Tế

**Kịch bản 1: Kiểm tra ranking định kỳ cho khách hàng**
1. Tạo template với danh sách từ khóa + domain khách hàng
2. Mỗi tuần chọn template → chạy
3. Vào History → lọc theo domain khách → xuất CSV
4. Gửi báo cáo cho khách hàng

**Kịch bản 2: Nghiên cứu từ khóa mới**
1. Vào Trang 2 (Bulk Check)
2. Nhập danh sách từ khóa candidate
3. Xem top 30 domains
4. Đánh giá độ khó, chọn từ khóa phù hợp

**Kịch bản 3: Tracking cạnh tranh**
1. Tạo template: keyword của mình + domain đối thủ
2. Chạy hàng tuần
3. Theo dõi vị trí đối thủ tăng/giảm
4. Điều chỉnh chiến lược SEO

### 3. Xử Lý Lỗi Thường Gặp

**Lỗi: "Serper API error"**
- Kiểm tra API key
- Kiểm tra credit còn lại
- Thử lại sau vài phút

**Lỗi: "Connection timeout"**
- Tăng thời gian chờ trong Settings
- Kiểm tra kết nối internet

**Không tìm thấy ranking:**
- Domain có thể không nằm trong top 100
- Thử các khu vực khác
- Kiểm tra keyword chính xác

---

## 🎨 Giao Diện

### Theme (Giao Diện)

**Light Mode (Sáng):**
- Nền trắng, dễ đọc ban ngày
- Tiết kiệm pin (OLED)

**Dark Mode (Tối):**
- Nền đen, dễ nhìn ban đêm
- Giảm mỏi mắt

**Chuyển đổi:**
- Nhấn nút Light/Dark ở header
- Tự động lưu lựa chọn

### Responsive Design

**Desktop:**
- Bảng rộng, nhiều cột
- Sidebar đầy đủ

**Tablet:**
- Layout linh hoạt
- Scroll ngang cho bảng

**Mobile:**
- Stack layout
- Touch-friendly buttons
- Swipe navigation

---

## 🔐 Bảo Mật & Quyền Riêng Tư

### Dữ Liệu Lưu Trữ

**LocalStorage (Trình duyệt):**
- API Key
- Theme preference
- Default settings

**Server Database:**
- Templates
- Rank history
- Tracking configs

**Không lưu:**
- Password (chưa có tính năng login)
- Payment info
- Personal info

### Best Practices

1. **Không chia sẻ API key:**
   - Mỗi người nên có key riêng
   - Không commit vào Git

2. **Backup dữ liệu:**
   - Xuất CSV định kỳ
   - Lưu templates quan trọng

3. **Xóa cache khi cần:**
   - Settings → Clear API Key
   - Browser → Clear site data

---

## ❓ Câu Hỏi Thường Gặp (FAQ)

### Q1: Có giới hạn số lượt kiểm tra không?

**A:** Phụ thuộc API key:
- Server key: Share với user khác, có giới hạn
- Personal key: 2,500 lượt/tháng (free) hoặc trả phí

### Q2: Kết quả có chính xác không?

**A:**
- Sử dụng Serper API (Google official data provider)
- Kết quả phụ thuộc vào:
  - Khu vực địa lý
  - Thiết bị (desktop/mobile)
  - Thời điểm kiểm tra
- SERP luôn thay đổi → nên kiểm tra định kỳ

### Q3: Tại sao không tìm thấy ranking?

**A:**
- Domain chỉ tìm trong top 100
- Nếu không có → hiển thị "N/A"
- Thử:
  - Các khu vực khác
  - Device khác
  - Keyword khác

### Q4: Có thể tracking tự động không?

**A:**
- Hiện có tính năng tracking (dùng TrackingPage.tsx cũ)
- Phiên bản mới chưa tích hợp
- Roadmap: Thêm auto-tracking vào History page

### Q5: Xuất dữ liệu định dạng nào?

**A:**
- Hiện tại: CSV
- Tương lai: Excel, PDF, JSON

---

## 📞 Hỗ Trợ

### Báo Lỗi
- Tạo issue trên GitHub
- Mô tả chi tiết lỗi
- Attach screenshot nếu có

### Yêu Cầu Tính Năng
- GitHub issues với label "enhancement"
- Mô tả use case cụ thể

### Tài Liệu Kỹ Thuật
- Xem `MULTI_PAGE_IMPLEMENTATION.md`
- Inline comments trong code

---

## 🚀 Cập Nhật Mới

### Version 2.0.0 (05/02/2025)

**Tính năng mới:**
- ✨ 4 trang riêng biệt với tab navigation
- ✨ Bulk Check (Top 30 domains)
- ✨ API Settings với localStorage
- ✨ History với bộ lọc nâng cao
- ✨ CSV export

**Cải tiến:**
- 🎨 Giao diện mới, hiện đại
- ⚡ Performance tối ưu
- 📱 Responsive tốt hơn

**Giữ nguyên:**
- ✅ Single check (Trang 1)
- ✅ Template system
- ✅ Real-time streaming
- ✅ Theme support

---

**Copyright © 2025 AE SEO1**

**Được xây dựng với ❤️ từ Việt Nam**
