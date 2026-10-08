"""
assemble_nguhanh_son.py — Ghép hợp nhất các Module 3D Ngũ Hành Sơn (Master Assembly)
Quy trình lắp ráp modular chuẩn studio:
  1. Nạp Module Địa hình 5 Ngọn Núi (mountains-terrain.blend) làm nền tảng.
  2. Ghép Module Tháp Xá Lợi (thap-xa-loi.blend) lên Mũi đá Đông Thủy Sơn (X = 86m, Y = 8m, Z = 16m).
  3. Ghép Module Chùa Linh Ứng (chua-linh-ung.blend) lên Thềm chùa (X = 68m, Y = -28m, Z = 12m, Yaw = 0.35 rad).
  4. Ghép Module Động Huyền Không (dong-huyen-khong.blend) vào Hốc vách đá (X = -12m, Y = -32m, Z = 8m).
  5. Ghép Module Vọng Hải Đài (vong-hai-dai.blend) lên Đỉnh Thượng Thai (Z = 126m) & Vọng Giang Đài lên Đỉnh Hạ Thai (Z = 107m).
  6. Xuất file master nguhanh-son.blend và nguhanh-son.glb đồng thời copy sang Web.
"""

import bpy
import math
import mathutils
import os
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

MASTER_BLEND_OUT = os.path.join(SCRIPT_DIR, "nguhanh-son.blend")
GLB_OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "exported", "nguhanh-son")
GLB_OUT_PATH = os.path.join(GLB_OUT_DIR, "nguhanh-son.glb")
WEB_GLB_DIR = os.path.join(PROJECT_ROOT, "web", "public", "models", "nguhanh-son")
WEB_GLB_PATH = os.path.join(WEB_GLB_DIR, "nguhanh-son.glb")
WEB_MODULES_DIR = os.path.join(WEB_GLB_DIR, "modules")
PREVIEW_PNG_PATH = os.path.join(GLB_OUT_DIR, "assembly_preview.png")


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)


def import_blend_objects(blend_file_path, prefix="", translation=(0, 0, 0), rotation_z=0.0):
    """Nạp tất cả Mesh Object từ một file .blend và áp dụng phép tịnh tiến/xoay vị trí"""
    with bpy.data.libraries.load(blend_file_path, link=False) as (data_from, data_to):
        data_to.objects = [name for name in data_from.objects]

    imported_objs = []
    trans_mat = mathutils.Matrix.Translation(translation)
    rot_mat = mathutils.Matrix.Rotation(rotation_z, 4, 'Z')
    xform = trans_mat @ rot_mat

    for obj in data_to.objects:
        if obj is not None:
            bpy.context.scene.collection.objects.link(obj)
            if prefix:
                obj.name = f"{prefix}_{obj.name}"
            # Áp dụng ma trận biến đổi vị trí lắp ghép
            obj.matrix_world = xform @ obj.matrix_world
            imported_objs.append(obj)

    return imported_objs


def assemble():
    print("=" * 70)
    print("BẮT ĐẦU LẮP RÁP QUẦN THỂ NGŨ HÀNH SƠN TỪ CÁC MODULE ĐỘC LẬP")
    print("=" * 70)

    clean_scene()

    # 1. Nạp Địa hình 5 Ngọn Núi & Hạ Tầng
    terrain_blend = os.path.join(SCRIPT_DIR, "mountains-terrain", "mountains-terrain.blend")
    print("1. Nạp Module Địa hình Núi...")
    import_blend_objects(terrain_blend, prefix="mt", translation=(0, 0, 0))

    # 2. Nạp Tháp Xá Lợi 7 Tầng lên Mũi đá Đông Thủy Sơn
    stupa_blend = os.path.join(SCRIPT_DIR, "thap-xa-loi", "thap-xa-loi.blend")
    print("2. Lắp ghép Tháp Xá Lợi lên Mũi đá Đông Thủy Sơn (86m, 8m, 16m)...")
    import_blend_objects(stupa_blend, prefix="stupa", translation=(86.0, 8.0, 16.0))

    # 3. Nạp Chùa Linh Ứng Cổ Tự lên Thềm Chùa
    temple_blend = os.path.join(SCRIPT_DIR, "chua-linh-ung", "chua-linh-ung.blend")
    print("3. Lắp ghép Chùa Linh Ứng lên Thềm Chùa (68m, -28m, 12m)...")
    import_blend_objects(temple_blend, prefix="temple", translation=(68.0, -28.0, 12.0), rotation_z=0.35)

    # 4. Nạp Động Huyền Không vào Vách Đá Tây Nam
    cave_blend = os.path.join(SCRIPT_DIR, "dong-huyen-khong", "dong-huyen-khong.blend")
    print("4. Lắp ghép Động Huyền Không vào Vách Đá Tây Nam (-12m, -32m, 8m)...")
    import_blend_objects(cave_blend, prefix="cave", translation=(-12.0, -32.0, 8.0))

    # 5. Nạp Vọng Hải Đài (Đỉnh Thượng Thai 126m) & Vọng Giang Đài (Đỉnh Hạ Thai 107m)
    pavilion_blend = os.path.join(SCRIPT_DIR, "vong-hai-dai", "vong-hai-dai.blend")
    print("5. Lắp ghép Vọng Hải Đài & Vọng Giang Đài lên 2 đỉnh Thủy Sơn...")
    import_blend_objects(pavilion_blend, prefix="vhd", translation=(14.0, 18.0, 126.0))
    import_blend_objects(pavilion_blend, prefix="vgd", translation=(-36.0, -14.0, 107.0))

    # 6. Lưu file Master .blend
    os.makedirs(os.path.dirname(MASTER_BLEND_OUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=MASTER_BLEND_OUT)
    print(f"-> Đã lưu Master .blend tại: {MASTER_BLEND_OUT}")

    # 7. Render ảnh Preview toàn cảnh lắp ráp
    try:
        bpy.context.scene.world = bpy.data.worlds.new('World')
        bpy.context.scene.world.use_nodes = True
        bg = bpy.context.scene.world.node_tree.nodes.get('Background')
        if bg:
            bg.inputs['Color'].default_value = (0.50, 0.68, 0.88, 1.0)
            bg.inputs['Strength'].default_value = 1.0

        cam_data = bpy.data.cameras.new('AsmCam')
        cam = bpy.data.objects.new('AsmCam', cam_data)
        bpy.context.scene.collection.objects.link(cam)
        bpy.context.scene.camera = cam
        cam.location = (210.0, 55.0, 52.0)

        target = bpy.data.objects.new('AsmTarget', None)
        target.location = (65.0, -10.0, 24.0)
        bpy.context.scene.collection.objects.link(target)

        const = cam.constraints.new('TRACK_TO')
        const.target = target
        const.track_axis = 'TRACK_NEGATIVE_Z'
        const.up_axis = 'UP_Y'

        sun_data = bpy.data.lights.new('AsmSun', 'SUN')
        sun = bpy.data.objects.new('AsmSun', sun_data)
        bpy.context.scene.collection.objects.link(sun)
        sun.data.energy = 4.0
        sun.location = (220.0, -80.0, 140.0)

        bpy.context.scene.render.resolution_x = 1280
        bpy.context.scene.render.resolution_y = 720
        bpy.context.scene.render.filepath = PREVIEW_PNG_PATH
        bpy.ops.render.render(write_still=True)
        print(f"-> Đã render Assembly preview tại: {PREVIEW_PNG_PATH}")
    except Exception as e:
        print(f"Warning: Render preview failed: {e}")

    # 8. Export glTF Master .glb
    os.makedirs(GLB_OUT_DIR, exist_ok=True)
    os.makedirs(WEB_GLB_DIR, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT_PATH,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export Master GLB tại: {GLB_OUT_PATH}")

    shutil.copy2(GLB_OUT_PATH, WEB_GLB_PATH)
    print(f"-> Đã copy Master GLB sang Web: {WEB_GLB_PATH}")

    # Đồng bộ các module .glb riêng lẻ sang Web (theo từng thư mục riêng)
    sub_modules = [
        ("thap-xa-loi", "thap-xa-loi.glb"),
        ("chua-linh-ung", "chua-linh-ung.glb"),
        ("dong-huyen-khong", "dong-huyen-khong.glb"),
        ("vong-hai-dai", "vong-hai-dai.glb"),
        ("mountains-terrain", "mountains-terrain.glb"),
    ]
    for sub_dir, mod_name in sub_modules:
        src_mod = os.path.join(SCRIPT_DIR, sub_dir, mod_name)
        if os.path.exists(src_mod):
            dst_sub_dir = os.path.join(WEB_GLB_DIR, sub_dir)
            os.makedirs(dst_sub_dir, exist_ok=True)
            shutil.copy2(src_mod, os.path.join(dst_sub_dir, mod_name))
            print(f"   + Đã đồng bộ {sub_dir}/{mod_name} sang Web")

    print("=" * 70)
    print("HOÀN TẤT LẮP RÁP QUẦN THỂ NGŨ HÀNH SƠN MODULAR THÀNH CÔNG 100%!")
    print("=" * 70)


if __name__ == "__main__":
    assemble()
