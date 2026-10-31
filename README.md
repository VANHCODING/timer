# AeroTimer - Modern Speedcubing Timer & CFOP Library

Ứng dụng web Speedcubing Timer & Thư viện công thức CFOP tinh gọn, hiện đại (Single Page Application) lấy cảm hứng từ csTimer nhưng tối giản hóa giao diện, phân chia rõ ràng giữa không gian bấm giờ thi đấu và tra cứu thuật toán, mang lại trải nghiệm mượt mà, phản hồi tức thì và thuật toán chuẩn xác.

---

## 🌟 Tính Năng Nổi Bật

### 1. Phân Tách 2 Workspace Chuyên Biệt
- **Timer Workspace (#timer)**: Không gian bấm giờ tập trung cao độ, không bị phân tâm bởi bảng công thức.
- **CFOP Library (#cfop)**: Thư viện tra cứu & học thuật toán toàn diện theo thứ tự chuẩn **F2L (41 cases)** → **OLL (57 cases)** → **PLL (21 cases)**.

---

### 2. Timer & Chế Độ Luyện Tập
- **WCA Puzzles**: 2x2x2 (9-11 moves), 3x3x3 (19-22 moves chuẩn WCA), 4x4x4 (40-45 moves gồm wide turns).
- **CFOP Training Scrambles**:
  - **OLL Scramble**: Tạo scramble ngẫu nhiên đảo ngược từ 57 case OLL kèm AUF ngẫu nhiên để luyện nhận diện & giải OLL.
  - **PLL Scramble**: Tạo scramble ngẫu nhiên đảo ngược từ 21 case PLL kèm AUF ngẫu nhiên.
- **Cơ Chế Bấm Giờ Chuẩn WCA**:
  - Bấm giờ bằng phím **Space** hoặc **chạm/giữ cảm ứng** trên điện thoại / máy tính bảng.
  - **Hold Delay 0.3s**: Đổi màu trực quan (Đỏ: đang giữ -> Xanh lá: sẵn sàng -> Nhả ra để đếm).
  - Tự động khóa phím Space / Timer khi người dùng đang ở tab tra cứu CFOP để tránh nhảy giờ ngoài ý muốn.
  - **WCA Inspection 15s**: Đếm ngược 15 giây, tích hợp cảnh báo âm thanh bíp Web Audio API ở giây thứ 8 và 12, tự động phạt +2 sau 15s và DNF sau 17s.
- **Thống Kê & Lịch Sử**:
  - Tính toán Best Single, Current, mo3, ao5, ao12, ao50, Session Mean theo chuẩn WCA.
  - Drawer danh sách solves trượt mượt mà, hỗ trợ gắn nhãn +2, DNF, xóa lượt giải.
  - Quản lý đa Session, xuất file **CSV** (tương thích csTimer/Excel) và sao lưu/khôi phục **JSON**.
- **White Cross Solver**:
  - Tích hợp thuật toán IDDFS tìm lời giải White Cross (mặt đáy D) tối ưu (5-8 bước) kèm hướng dẫn từng bước.

---

### 3. Thư Viện Công Thức CFOP Chuyên Sâu
- **F2L (41 Cases)**:
  - 41 công thức riêng biệt, chuẩn hóa finger-trick, không trùng lặp.
  - Minh họa trực quan góc nhìn 3D Isometric chuẩn (Yellow U, White D, Green F, Red R) và sơ đồ 2D Net Cube.
- **OLL (57 Cases)**:
  - Giữ nguyên toàn bộ 57 công thức chuẩn hóa đã import thủ công kèm hình ảnh 2D top-down SVG.
- **PLL (21 Cases)**:
  - 21 trường hợp chuẩn WCA (Ua, Ub, Z, H, Aa, Ab, E, F, Ga, Gb, Gc, Gd, Ja, Jb, Ra, Rb, T, V, Y, Na, Nb).
  - Đóng ngoặc cụm động tác (...), làm nổi bật góc xoay cube (x, y), bổ sung đặc điểm nhận diện (recognition cues).
- **Hiệu Năng & Tối Ưu UX**:
  - Bộ nhớ đệm 3 lớp (3-tier caching) giúp tốc độ tìm kiếm và render đạt 60 FPS (~0.2ms mỗi lượt).
  - Cuộn mượt mà độc lập, phân nhóm rõ ràng (Easy, Medium, Hard / Corner in Slot / Edge in Slot...).

---

## 🚀 Hướng Dẫn Khởi Chạy

Ứng dụng là **Zero-build Single Page Application**, không cần cài đặt build tool nặng:

### Cách 1: Mở trực tiếp
Mở file index.html trực tiếp bằng bất kỳ trình duyệt hiện đại nào (Chrome, Edge, Firefox, Safari).

### Cách 2: Khởi chạy Local Server
`ash
# Dùng Python
python -m http.server 8000

# Hoặc dùng npx serve
npx serve .
`
Truy cập http://127.0.0.1:8000 hoặc http://localhost:3000.

### Cách 3: Chạy Kiểm Thử Tự Động (Unit Tests)
`ash
npm test
`
Chạy toàn bộ 3 test suites:
1. 	est/test-all.js: Kiểm tra Scramble, White Cross Solver và WCA Stats.
2. 	est/test-cfop-diagrams.js: Kiểm tra tính toán hình học 3D, đảo thuật toán và trạng thái Rubik của 41 F2L & 21 PLL.
3. 	est/test-timer-input.js: Kiểm tra bộ điều khiển bàn phím, touch hold delay 300ms và khóa timer ở tab CFOP.

---

## 📁 Cấu Trúc Mã Nguồn

`
speedcubing-timer/
├── index.html              # Main SPA (Timer + CFOP Library + Core logic)
├── css/
│   ├── workspace.css       # Layout 2 workspace (#timer, #cfop), toolbar, scrolling
│   └── cfop-cards.css      # Style card công thức, themes, typography trigger
├── js/
│   ├── cfop-diagrams.js    # Engine vẽ 3D SVG F2L/PLL + Cache 3 lớp
│   └── timer-input.js      # Bộ xử lý sự kiện Touch, Pointer, Keyboard & Hold delay
├── test/
│   ├── test-all.js         # Unit test Scrambler, Cross Solver & Stats trực tiếp từ index.html
│   ├── test-cfop-diagrams.js # Unit test hình học Rubik & công thức CFOP
│   └── test-timer-input.js # Unit test tương tác phím/cảm ứng của Timer
├── docs/
│   └── UI_UX_REVIEW.md     # Báo cáo đánh giá chi tiết UI/UX & hướng dẫn cải tiến
├── package.json            # Cấu hình test script
├── README.md               # Tài liệu dự án
└── .gitignore              # Bỏ qua node_modules, temp files
`

---

## 📄 License
MIT License.
