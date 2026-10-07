# Da Nang City Map Project

Dự án dựng lại thành phố Đà Nẵng theo hướng chi tiết, chân thực nhất có thể, phục vụ mục đích học tập và nghiên cứu. Đây là nền tảng cho các giai đoạn phát triển tiếp theo (web tương tác, tích hợp dữ liệu thời tiết thời gian thực, và xa hơn là một trải nghiệm game thế giới mở quảng bá du lịch).

## Giai đoạn hiện tại

Dựng chi tiết từng địa danh nổi bật của Đà Nẵng bằng **Blender**, export sang **glTF/GLB**, rồi hiển thị trong một bản đồ 3D tương tác trên web bằng **Three.js**.

## Cấu trúc thư mục

```
PersonalProject/
├── assets/
│   ├── blender/        # File nguồn .blend cho từng địa danh (KHÔNG dùng trực tiếp trong web)
│   ├── references/     # Ảnh thực tế dùng để đối chiếu khi dựng model
│   ├── textures/       # Texture dùng chung hoặc riêng từng địa danh
│   └── exported/       # File .glb đã export, Three.js load trực tiếp từ đây
├── data/
│   ├── map-config.json  # Gốc toạ độ (origin GPS), tỉ lệ map (1:100), quy ước trục -> dùng để quy đổi GPS sang scene
│   └── landmarks.json  # Metadata địa danh: tọa độ GPS thật, vị trí trong scene (tự tính), mô tả...
├── scripts/
│   └── compute-scene-positions.mjs  # Tự tính scenePosition từ GPS theo map-config.json, không tính tay
├── docs/
│   └── blender-export-guide.md  # Quy trình export Blender -> glTF chuẩn hoá
└── web/                 # Project Three.js (dùng Vite)
```

## Quy trình làm việc cho mỗi địa danh mới

1. Copy `assets/blender/_template/template.blend` thành `assets/blender/<ten-dia-danh>/<ten-dia-danh>.blend`.
2. Thu thập ảnh thực tế vào `assets/references/<ten-dia-danh>/` để đối chiếu khi dựng model.
3. Dựng model trong Blender theo đúng tỉ lệ mét thật (xem `docs/blender-export-guide.md`).
4. Export ra `assets/exported/<ten-dia-danh>/<ten-dia-danh>.glb`.
5. Thêm metadata địa danh vào `data/landmarks.json` (tên, tọa độ GPS thật, mô tả, đường dẫn model). KHÔNG tự điền `scenePosition` tay.
6. Chạy `node scripts/compute-scene-positions.mjs` để tự tính `scenePosition` từ GPS theo `data/map-config.json`.
7. Copy file `.glb` vào `web/public/models/<ten-dia-danh>/` để Three.js load được.
8. Copy lại `data/landmarks.json` sang `web/public/data/landmarks.json` (web app đọc metadata từ đường dẫn này lúc runtime) — bước này script ở mục 6 đã tự làm, chỉ cần làm tay nếu bạn sửa landmarks.json theo cách khác.

## Chạy web app (Three.js)

```bash
cd web
npm install
npm run dev
```

## Danh sách địa danh dự kiến (giai đoạn 1)

- Cầu Rồng (`cau-rong`)
- Bà Nà Hills (`ba-na-hills`)
- Ngũ Hành Sơn (`nguhanh-son`)
- Biển Mỹ Khê (`my-khe-beach`)
