# Quy trình export Blender -> glTF cho Three.js

Để tất cả địa danh khi ghép vào map tổng không bị lệch tỉ lệ, sai hướng, hoặc sai gốc tọa độ, mọi file `.blend` phải tuân theo quy ước dưới đây trước khi export.

## 1. Quy ước chung trong Blender

- **Đơn vị:** Metric, Unit Scale = 1.0 (1 Blender unit = 1 mét thật). Vào `Scene Properties > Units > Unit System: Metric`. Luôn dựng model theo đúng mét thật, KHÔNG tự thu nhỏ theo tỉ lệ map (1:100) trong Blender — việc thu nhỏ xảy ra ở runtime, xem mục 1.1.
- **Trục toạ độ:** Blender dùng Z-up, Three.js/glTF dùng Y-up. Không cần tự xoay model, bộ export glTF của Blender tự quy đổi Z-up -> Y-up.
- **Gốc toạ độ (Origin):** Đặt gốc object (`Object > Set Origin`) tại điểm tham chiếu thực tế của địa danh (ví dụ: chân cầu, tâm quảng trường, điểm dễ xác định trên bản đồ/ảnh vệ tinh). Đây chính là điểm sẽ được đặt vào `scenePosition` tính từ GPS, nên nếu đặt origin lệch khỏi điểm bạn dùng để lấy toạ độ GPS, model sẽ hiển thị lệch vị trí trong scene.
- **Scale:** Apply All Transforms (`Ctrl+A > All Transforms`) trước khi export, đảm bảo Scale = (1,1,1) trên mọi object.
- **Tên object/mesh:** đặt tiếng Anh không dấu, dạng kebab-case, có tiền tố tên địa danh. Ví dụ: `cau-rong_deck`, `cau-rong_dragon-head`.

## 1.1. Hệ quy chiếu toạ độ của toàn bộ map (QUAN TRỌNG)

Toạ độ vị trí của từng địa danh trong scene tổng (`scenePosition` trong `data/landmarks.json`) **không được tính tay**. Quy trình chuẩn:

1. Gốc toạ độ `(0, 0, 0)` của scene được định nghĩa trong `data/map-config.json` (`origin.lat/lng`), hiện là chân Cầu Rồng.
2. **Scale 1:100** (`map-config.json > scale.metersPerUnit = 100`): 1 unit scene = 100 mét thật. Áp dụng ĐỀU cho cả khoảng cách giữa các địa danh và kích thước model, để người dùng di chuyển giữa các địa danh gần nhau hơn (map hoạt động như một mô hình thu nhỏ/diorama của Đà Nẵng, không mô phỏng đúng tỉ lệ người thật 1:1). Ví dụ: khoảng cách thật Cầu Rồng - Bà Nà Hills là ~25.6km, trong scene chỉ còn ~256 unit (~256m).
3. Trục: `+X` = hướng Đông, `+Z` = hướng Nam, `+Y` = độ cao (elevation).
4. Mỗi khi thêm địa danh mới hoặc sửa toạ độ GPS, chạy lại:
   ```bash
   node scripts/compute-scene-positions.mjs
   ```
   Script này đọc GPS trong `data/landmarks.json`, tự tính `scenePosition` theo đúng config (đã chia theo `metersPerUnit`), ghi đè lại file (và đồng bộ sang `web/public/data/landmarks.json`).
5. **Khi dựng model trong Blender, KHÔNG thu nhỏ model theo tỉ lệ 1:100.** Luôn dựng đúng mét thật (Unit Scale = 1.0, mục 1). Phép thu nhỏ 1:100 chỉ áp dụng ở runtime, khi `Landmark.js` load model vào scene tổng (`object3D.scale.setScalar(1 / metersPerUnit)`), dựa trên cùng giá trị `metersPerUnit` trong `map-config.json`. Nhờ vậy file `.blend` luôn giữ đúng tỉ lệ thật, dễ đối chiếu với ảnh thực tế, và nếu sau này đổi `metersPerUnit` thì không phải dựng lại model.
6. Mỗi khi dựng model trong Blender, chỉ cần đặt gốc `(0,0,0)` trong file `.blend` của riêng địa danh đó (đặt tại điểm tham chiếu như mô tả ở mục 1). `LandmarkLoader.js` sẽ tự dịch và scale model tới đúng `scenePosition`/kích thước khi load vào scene tổng.
7. Độ cao (`elevationMeters`) hiện **không** tính từ GPS vì cần dữ liệu địa hình thật (DEM). Đây là field riêng lưu MÉT THẬT, ổn định, không bị ghi đè bởi script (khác với `scenePosition` là output đã chia scale, bị ghi đè mỗi lần chạy). Với địa danh ở mực nước biển (Cầu Rồng, biển Mỹ Khê...), để `elevationMeters: 0` là hợp lý. Với địa danh ở cao (Bà Nà Hills ~1487m), đặt `elevationMeters: 1487`, script sẽ tự quy đổi thành `scenePosition.y = 14.87` theo tỉ lệ 1:100.

## 2. Vật liệu & Texture

- Dùng **Principled BSDF** cho mọi vật liệu (chuẩn PBR, glTF export hỗ trợ tốt nhất).
- Texture lưu dạng `.jpg` (ảnh màu/albedo, không cần alpha) hoặc `.png` (có alpha/transparency).
- Kích thước texture khuyến nghị: 2048x2048 cho chi tiết chính, 1024x1024 hoặc nhỏ hơn cho chi tiết phụ, để tối ưu dung lượng tải trên web.

## 3. Thiết lập Export (File > Export > glTF 2.0)

| Mục | Giá trị |
|---|---|
| Format | `glTF Binary (.glb)` |
| Include > Selected Objects | Bật nếu chỉ export 1 phần, tắt nếu export cả scene |
| Transform > +Y Up | Bật (mặc định) |
| Geometry > Apply Modifiers | Bật |
| Geometry > UVs / Normals / Tangents | Bật |
| Compression | Bật Draco nếu model nặng (>10MB), để giảm dung lượng tải |

## 4. Đặt tên và vị trí file export

Export ra đúng đường dẫn:

```
assets/exported/<ten-dia-danh>/<ten-dia-danh>.glb
```

Sau đó copy sang:

```
web/public/models/<ten-dia-danh>/<ten-dia-danh>.glb
```

## 5. Kiểm tra sau khi export

- Mở thử file `.glb` bằng [glTF Viewer online](https://gltf-viewer.donmccurdy.com/) để kiểm tra texture, tỉ lệ hiển thị đúng trước khi đưa vào Three.js.
- Kiểm tra dung lượng file, nếu quá 20-30MB nên nén thêm texture hoặc bật Draco compression.
