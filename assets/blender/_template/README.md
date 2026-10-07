# Template địa danh

Copy toàn bộ cấu trúc dưới đây sang `assets/blender/<ten-dia-danh>/` khi bắt đầu dựng một địa danh mới:

1. Tạo file `assets/blender/<ten-dia-danh>/<ten-dia-danh>.blend` mới trong Blender, thiết lập theo đúng quy ước tại `docs/blender-export-guide.md`.
2. Tạo thư mục `assets/references/<ten-dia-danh>/` và bỏ ảnh thực tế tham khảo vào đó.
3. Tạo thư mục `assets/textures/<ten-dia-danh>/` nếu địa danh cần texture riêng (không dùng chung từ `assets/textures/shared/`).
4. Sau khi dựng xong, export ra `assets/exported/<ten-dia-danh>/<ten-dia-danh>.glb`.
5. Cập nhật `data/landmarks.json` với thông tin địa danh và đổi `model.status` từ `"pending"` thành `"ready"`.
