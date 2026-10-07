"""
build_my_khe_beach.py — Dựng mô hình 3D Biển Mỹ Khê (Đà Nẵng)
Bãi biển được tạp chí Forbes vinh danh là một trong 6 bãi biển quyến rũ nhất hành tinh.

Tỉ lệ chuẩn 1:1 mét thật (Blender Metric Unit Scale = 1.0):
  - Gốc tọa độ (0, 0, 0): Ngã ba Đại lộ Võ Văn Kiệt và đường ven biển Võ Nguyên Giáp / Quảng trường Công viên Biển Đông.
  - Chiều dài dải bờ biển: 700m (Y: -350m đến +350m).
  - Chiều rộng Đông - Tây: 450m (X: -130m đến +320m):
      + X: -130m đến -70m: Dãy khách sạn & resort cao tầng ven biển hướng biển.
      + X: -70m đến -45m: Đại lộ ven biển Võ Nguyên Giáp (4 làn xe, vỉa hè rộng).
      + X: -45m đến -15m: Công viên Biển Đông, quảng trường đá hoa cương & tượng chim bồ câu.
      + X: -15m đến +75m: Bãi cát vàng trắng mịn Mỹ Khê thoai thoải ra mép sóng.
      + X: +75m đến +320m: Mặt biển Đông xanh ngọc bích bao la với các dải sóng biển cuộn bọt trắng.
  - Các chi tiết đặc trưng bờ biển:
      + Hàng dừa nhiệt đới nghiêng bóng mát (thân cong tự nhiên, tán lá xanh mướt).
      + Chòi lá cọ, ô dù bãi biển sắc màu và giường tắm nắng ven bờ.
      + Tháp canh cứu hộ bãi biển bằng gỗ sơn sọc đỏ trắng và phao cứu sinh.
      + Thuyền thúng tre tròn truyền thống của ngư dân Đà Nẵng đỗ trên cát.
      + Ván lướt sóng và sân bóng chuyền bãi biển.
      + Những dải sóng biển uốn lượn trắng xóa vỗ vào bờ.
"""

import bpy
import bmesh
import math
import os
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

BLEND_OUT_PATH = os.path.join(SCRIPT_DIR, "my-khe-beach.blend")
GLB_OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "exported", "my-khe-beach")
GLB_OUT_PATH = os.path.join(GLB_OUT_DIR, "my-khe-beach.glb")
WEB_GLB_DIR = os.path.join(PROJECT_ROOT, "web", "public", "models", "my-khe-beach")
WEB_GLB_PATH = os.path.join(WEB_GLB_DIR, "my-khe-beach.glb")

COAST_LEN = 700.0
HALF_COAST = COAST_LEN / 2.0  # 350m (Y: -350m -> +350m)


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)


def get_or_create_collection(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


def link_to_collection(obj, collection):
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    collection.objects.link(obj)


def set_smooth(obj):
    if obj and obj.data and hasattr(obj.data, "polygons"):
        for p in obj.data.polygons:
            p.use_smooth = True


def make_material(name, base_color, metallic=0.0, roughness=0.5,
                  transmission=0.0, ior=1.45,
                  emission_color=None, emission_strength=0.0):
    if name in bpy.data.materials:
        mat = bpy.data.materials[name]
    else:
        mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")

    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness
    if "Transmission Weight" in bsdf.inputs and transmission > 0:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    elif "Transmission" in bsdf.inputs and transmission > 0:
        bsdf.inputs["Transmission"].default_value = transmission
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = ior

    if emission_color is not None and emission_strength > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission_color, 1.0)
        elif "Emission" in bsdf.inputs:
            bsdf.inputs["Emission"].default_value = (*emission_color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def build_materials():
    mats = {}
    # 1. Cát vàng óng mịn đặc trưng bãi biển Mỹ Khê
    mats["dry_sand"] = make_material("my-khe_mat-dry-sand", (0.92, 0.85, 0.70), metallic=0.0, roughness=0.92)
    # 2. Cát ướt sẫm màu phản chiếu óng ánh ven mép sóng
    mats["wet_sand"] = make_material("my-khe_mat-wet-sand", (0.76, 0.68, 0.54), metallic=0.08, roughness=0.35)
    # 3. Đại dương xanh ngọc bích nước nông (Turquoise)
    mats["ocean_shallow"] = make_material("my-khe_mat-ocean-shallow", (0.05, 0.65, 0.72), metallic=0.1, roughness=0.12, transmission=0.45, ior=1.33)
    # 4. Đại dương xanh thẳm ngoài khơi (Sapphire)
    mats["ocean_deep"] = make_material("my-khe_mat-ocean-deep", (0.02, 0.25, 0.55), metallic=0.15, roughness=0.18, transmission=0.25, ior=1.33)
    # 5. Bọt sóng biển trắng xóa (Wave Foam)
    mats["wave_foam"] = make_material("my-khe_mat-wave-foam", (0.96, 0.98, 1.0), metallic=0.0, roughness=0.5, emission_color=(0.95, 0.98, 1.0), emission_strength=0.35)
    # 6. Nhựa đường đại lộ Võ Nguyên Giáp
    mats["road_asphalt"] = make_material("my-khe_mat-road-asphalt", (0.18, 0.19, 0.20), metallic=0.02, roughness=0.86)
    # 7. Vạch kẻ đường vàng & trắng
    mats["stripe_yellow"] = make_material("my-khe_mat-stripe-yellow", (0.95, 0.80, 0.10), roughness=0.5)
    mats["stripe_white"] = make_material("my-khe_mat-stripe-white", (0.92, 0.93, 0.95), roughness=0.5)
    # 8. Vỉa hè đá granite hoa cương & quảng trường
    mats["promenade"] = make_material("my-khe_mat-promenade", (0.80, 0.82, 0.84), metallic=0.02, roughness=0.72)
    # 9. Thảm cỏ xanh công viên Biển Đông
    mats["grass"] = make_material("my-khe_mat-grass", (0.20, 0.52, 0.24), roughness=0.88)
    # 10. Thân cây dừa xơ nâu
    mats["palm_trunk"] = make_material("my-khe_mat-palm-trunk", (0.38, 0.28, 0.20), roughness=0.9)
    # 11. Tán lá dừa xanh nhiệt đới
    mats["palm_leaves"] = make_material("my-khe_mat-palm-leaves", (0.14, 0.55, 0.18), roughness=0.6)
    # 12. Gỗ chòi lá, tháp canh & giường nằm
    mats["wood"] = make_material("my-khe_mat-wood", (0.58, 0.42, 0.26), roughness=0.78)
    # 13. Mái lá cọ / rơm vàng khô
    mats["thatch"] = make_material("my-khe_mat-thatch", (0.78, 0.65, 0.38), roughness=0.95)
    # 14. Vải dù bãi biển sắc màu (Đỏ, Xanh ngọc, Vàng)
    mats["umbrella_red"] = make_material("my-khe_mat-umbrella-red", (0.88, 0.18, 0.18), roughness=0.6)
    mats["umbrella_blue"] = make_material("my-khe_mat-umbrella-blue", (0.12, 0.55, 0.85), roughness=0.6)
    mats["umbrella_yellow"] = make_material("my-khe_mat-umbrella-yellow", (0.95, 0.82, 0.15), roughness=0.6)
    # 15. Thuyền thúng tre nan nứa (xanh dương viền nan)
    mats["coracle_hull"] = make_material("my-khe_mat-coracle-hull", (0.28, 0.24, 0.20), roughness=0.85)
    mats["coracle_rim"] = make_material("my-khe_mat-coracle-rim", (0.10, 0.42, 0.72), roughness=0.45)
    # 16. Khách sạn & resort ven biển (tường trắng kem & kính biển)
    mats["hotel_facade"] = make_material("my-khe_mat-hotel-facade", (0.92, 0.90, 0.88), roughness=0.65)
    mats["hotel_glass"] = make_material("my-khe_mat-hotel-glass", (0.18, 0.48, 0.65), metallic=0.88, roughness=0.1)
    # 17. Phao cứu sinh đỏ trắng
    mats["lifesaver"] = make_material("my-khe_mat-lifesaver", (0.92, 0.20, 0.15), roughness=0.4)
    return mats


# ---------------------------------------------------------------------------
# 1. ĐỊA HÌNH BỜ BIỂN, BÃI CÁT VÀNG & ĐÁY BIỂN (COASTAL TERRAIN)
# ---------------------------------------------------------------------------
def build_coastal_terrain(collection, mats):
    bm = bmesh.new()

    # Dải địa hình từ Tây sang Đông:
    # X: -130m (sau dãy resort) -> -45m (đại lộ) -> -15m (quảng trường) -> +55m (bãi cát khô)
    # -> +85m (mép nước) -> +320m (đáy biển Đông)
    x_profiles = [
        (-135.0, 3.8),   # Sau khách sạn
        ( -75.0, 3.8),   # Mép Tây đại lộ
        ( -45.0, 3.6),   # Mép Đông đại lộ
        ( -15.0, 3.4),   # Mép quảng trường / bắt đầu bãi cát
        (  15.0, 2.5),   # Bãi cát khô cao
        (  50.0, 1.2),   # Bãi cát khô thoai thoải
        (  75.0, 0.2),   # Bờ cát ướt mép sóng
        (  95.0, -0.6),  # Nước ngập cạn (mép sóng vỗ)
        ( 145.0, -2.2),  # Biển thoai thoải
        ( 220.0, -4.5),  # Biển sâu ngoài khơi
        ( 320.0, -6.8),  # Đáy biển xa bờ
    ]

    steps_y = 35
    dy = COAST_LEN / steps_y
    grid_verts = []

    for iy in range(steps_y + 1):
        y = -HALF_COAST + iy * dy
        # Độ lượn sóng tự nhiên nhẹ của đường bờ biển biển Mỹ Khê
        curve_offset = math.sin(y * 0.018) * 6.5 + math.cos(y * 0.04) * 2.8
        row = []
        for x_base, z_base in x_profiles:
            x_act = x_base + (curve_offset if x_base > 0 else 0)
            z_act = z_base
            # Sóng cát nhấp nhô nhẹ trên bãi cát
            if 0 < x_base < 75.0:
                z_act += math.sin(x_base * 0.1 + y * 0.05) * 0.08
            row.append(bm.verts.new((x_act, y, z_act)))
        grid_verts.append(row)

    # Tạo các mặt lưới
    num_x = len(x_profiles)
    for iy in range(steps_y):
        for ix in range(num_x - 1):
            v1 = grid_verts[iy][ix]
            v2 = grid_verts[iy + 1][ix]
            v3 = grid_verts[iy + 1][ix + 1]
            v4 = grid_verts[iy][ix + 1]
            bm.faces.new([v1, v2, v3, v4])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("my-khe_sand-terrain_mesh")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("my-khe_sand-terrain", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mats["dry_sand"])
    set_smooth(obj)
    link_to_collection(obj, collection)

    # Dải cát ướt ven sóng biển (Wet Sand Ribbon)
    bm_wet = bmesh.new()
    for iy in range(steps_y):
        y1 = -HALF_COAST + iy * dy
        y2 = -HALF_COAST + (iy + 1) * dy
        curv1 = math.sin(y1 * 0.018) * 6.5 + math.cos(y1 * 0.04) * 2.8
        curv2 = math.sin(y2 * 0.018) * 6.5 + math.cos(y2 * 0.04) * 2.8

        w1 = bm_wet.verts.new(( 65.0 + curv1, y1, 0.42))
        w2 = bm_wet.verts.new(( 65.0 + curv2, y2, 0.42))
        w3 = bm_wet.verts.new(( 92.0 + curv2, y2, -0.45))
        w4 = bm_wet.verts.new(( 92.0 + curv1, y1, -0.45))
        bm_wet.faces.new([w1, w2, w3, w4])

    bmesh.ops.recalc_face_normals(bm_wet, faces=bm_wet.faces[:])
    mesh_wet = bpy.data.meshes.new("my-khe_wet-sand_mesh")
    bm_wet.to_mesh(mesh_wet)
    bm_wet.free()
    obj_wet = bpy.data.objects.new("my-khe_wet-sand", mesh_wet)
    bpy.context.scene.collection.objects.link(obj_wet)
    obj_wet.data.materials.append(mats["wet_sand"])
    set_smooth(obj_wet)
    link_to_collection(obj_wet, collection)


# ---------------------------------------------------------------------------
# 2. ĐẠI LỘ VEN BIỂN VÕ NGUYÊN GIÁP & CÔNG VIÊN BIỂN ĐÔNG
# ---------------------------------------------------------------------------
def build_boulevard_and_park(collection, mats):
    bm_road = bmesh.new()
    bm_stripes = bmesh.new()
    bm_park = bmesh.new()

    # 1. Mặt đường đại lộ Võ Nguyên Giáp (X: -70m đến -48m, rộng 22m, Z = 3.82m)
    r1 = bm_road.verts.new((-70.0, -HALF_COAST, 3.82))
    r2 = bm_road.verts.new((-70.0,  HALF_COAST, 3.82))
    r3 = bm_road.verts.new((-48.0,  HALF_COAST, 3.82))
    r4 = bm_road.verts.new((-48.0, -HALF_COAST, 3.82))
    bm_road.faces.new([r1, r2, r3, r4])

    # Vạch tim đường vàng đôi & vạch phân làn trắng
    for z_side in [-0.25, 0.25]:
        v1 = bm_stripes.verts.new((-59.0 + z_side, -HALF_COAST, 3.825))
        v2 = bm_stripes.verts.new((-59.0 + z_side,  HALF_COAST, 3.825))
        v3 = bm_stripes.verts.new((-59.0 + z_side + 0.18,  HALF_COAST, 3.825))
        v4 = bm_stripes.verts.new((-59.0 + z_side + 0.18, -HALF_COAST, 3.825))
        bm_stripes.faces.new([v1, v2, v3, v4])

    for lane_x in [-64.5, -53.5]:
        num_d = int(COAST_LEN / 12.0)
        for d in range(num_d):
            y_s = -HALF_COAST + d * 12.0
            y_e = y_s + 6.0
            d1 = bm_stripes.verts.new((lane_x - 0.1, y_s, 3.825))
            d2 = bm_stripes.verts.new((lane_x - 0.1, y_e, 3.825))
            d3 = bm_stripes.verts.new((lane_x + 0.1, y_e, 3.825))
            d4 = bm_stripes.verts.new((lane_x + 0.1, y_s, 3.825))
            bm_stripes.faces.new([d1, d2, d3, d4])

    # 2. Quảng trường Công viên Biển Đông & Lối dạo bộ lát đá (X: -48m đến -15m)
    p1 = bm_park.verts.new((-48.0, -HALF_COAST, 3.85))
    p2 = bm_park.verts.new((-48.0,  HALF_COAST, 3.85))
    p3 = bm_park.verts.new((-15.0,  HALF_COAST, 3.45))
    p4 = bm_park.verts.new((-15.0, -HALF_COAST, 3.45))
    bm_park.faces.new([p1, p2, p3, p4])

    # Thảm cỏ xanh xen kẽ các bồn hoa công viên
    num_lawns = 12
    lawn_len = COAST_LEN / num_lawns
    for i in range(num_lawns):
        y_c = -HALF_COAST + i * lawn_len + lawn_len * 0.5
        g1 = bm_park.verts.new((-44.0, y_c - 16.0, 3.86))
        g2 = bm_park.verts.new((-44.0, y_c + 16.0, 3.86))
        g3 = bm_park.verts.new((-22.0, y_c + 16.0, 3.65))
        g4 = bm_park.verts.new((-22.0, y_c - 16.0, 3.65))
        bm_park.faces.new([g1, g2, g3, g4])

    bmesh.ops.recalc_face_normals(bm_road, faces=bm_road.faces[:])
    mesh_r = bpy.data.meshes.new("my-khe_boulevard_mesh")
    bm_road.to_mesh(mesh_r)
    bm_road.free()
    obj_r = bpy.data.objects.new("my-khe_boulevard", mesh_r)
    bpy.context.scene.collection.objects.link(obj_r)
    obj_r.data.materials.append(mats["road_asphalt"])
    link_to_collection(obj_r, collection)

    bmesh.ops.recalc_face_normals(bm_stripes, faces=bm_stripes.faces[:])
    mesh_s = bpy.data.meshes.new("my-khe_stripes_mesh")
    bm_stripes.to_mesh(mesh_s)
    bm_stripes.free()
    obj_s = bpy.data.objects.new("my-khe_stripes", mesh_s)
    bpy.context.scene.collection.objects.link(obj_s)
    obj_s.data.materials.append(mats["stripe_yellow"])
    link_to_collection(obj_s, collection)

    bmesh.ops.recalc_face_normals(bm_park, faces=bm_park.faces[:])
    mesh_p = bpy.data.meshes.new("my-khe_park-plaza_mesh")
    bm_park.to_mesh(mesh_p)
    bm_park.free()
    obj_p = bpy.data.objects.new("my-khe_park-plaza", mesh_p)
    bpy.context.scene.collection.objects.link(obj_p)
    obj_p.data.materials.append(mats["promenade"])
    link_to_collection(obj_p, collection)


# ---------------------------------------------------------------------------
# 3. RẶNG DỪA NHIỆT ĐỚI NGHIÊNG BÓNG MÁT (COCONUT PALMS)
# ---------------------------------------------------------------------------
def build_coconut_palms(collection, mats):
    bm_trunks = bmesh.new()
    bm_leaves = bmesh.new()

    # Vị trí các hàng dừa: dọc lối dạo bộ và bãi cát trên (X: -35m đến +10m)
    palm_locations = []
    num_palms = 48
    for i in range(num_palms):
        y_pos = -HALF_COAST + 15.0 + (i / num_palms) * (COAST_LEN - 30.0)
        # 2 hàng dừa
        x_pos1 = -28.0 + math.sin(i * 1.5) * 4.0
        x_pos2 = -5.0 + math.cos(i * 1.8) * 8.0
        palm_locations.append((x_pos1, y_pos, 3.6))
        palm_locations.append((x_pos2, y_pos + 6.0, 3.0))

    for px, py, pz in palm_locations:
        # 1. Thân dừa uốn cong tự nhiên hướng ra phía biển (+X)
        trunk_h = 7.5 + math.sin(px + py) * 1.5
        lean_angle = 0.15 + (px / 50.0) * 0.15 # Nghiêng nhẹ ra biển
        steps = 8
        r_bot = 0.32
        r_top = 0.20

        t_rings = []
        for s in range(steps + 1):
            t = s / steps
            zh = pz + t * trunk_h
            # Đường cong parabol của thân dừa
            lean_x = px + math.sin(t * math.pi * 0.5) * lean_angle * trunk_h
            lean_y = py + math.sin(t * 1.2) * 0.4
            rad = r_bot * (1.0 - t * 0.4)

            ring = []
            for a in range(6):
                ang = a * (2 * math.pi / 6)
                rx = lean_x + math.cos(ang) * rad
                ry = lean_y + math.sin(ang) * rad
                ring.append(bm_trunks.verts.new((rx, ry, zh)))
            t_rings.append(ring)

        for s in range(steps):
            for a in range(6):
                a2 = (a + 1) % 6
                bm_trunks.faces.new([t_rings[s][a], t_rings[s][a2], t_rings[s+1][a2], t_rings[s+1][a]])

        # 2. Tán lá dừa xòe rộng (Crown of Fronds)
        crown_top = t_rings[-1]
        top_cx = sum(v.co.x for v in crown_top) / 6.0
        top_cy = sum(v.co.y for v in crown_top) / 6.0
        top_cz = sum(v.co.z for v in crown_top) / 6.0

        num_fronds = 9
        frond_len = 4.2
        for f in range(num_fronds):
            f_ang = f * (2 * math.pi / num_fronds) + (px * 0.1)
            # Tàu lá dừa cong vòm xuống
            f_end_x = top_cx + math.cos(f_ang) * frond_len
            f_end_y = top_cy + math.sin(f_ang) * frond_len
            f_end_z = top_cz - 1.2

            f_mid_x = top_cx + math.cos(f_ang) * (frond_len * 0.55)
            f_mid_y = top_cy + math.sin(f_ang) * (frond_len * 0.55)
            f_mid_z = top_cz + 0.55

            fw = 0.65
            perp_x = -math.sin(f_ang) * fw
            perp_y =  math.cos(f_ang) * fw

            v_root = bm_leaves.verts.new((top_cx, top_cy, top_cz))
            v_mid1 = bm_leaves.verts.new((f_mid_x - perp_x, f_mid_y - perp_y, f_mid_z))
            v_mid2 = bm_leaves.verts.new((f_mid_x + perp_x, f_mid_y + perp_y, f_mid_z))
            v_tip  = bm_leaves.verts.new((f_end_x, f_end_y, f_end_z))

            bm_leaves.faces.new([v_root, v_mid1, v_tip])
            bm_leaves.faces.new([v_root, v_tip, v_mid2])

    bmesh.ops.recalc_face_normals(bm_trunks, faces=bm_trunks.faces[:])
    mesh_t = bpy.data.meshes.new("my-khe_palm-trunks_mesh")
    bm_trunks.to_mesh(mesh_t)
    bm_trunks.free()
    obj_t = bpy.data.objects.new("my-khe_palm-trunks", mesh_t)
    bpy.context.scene.collection.objects.link(obj_t)
    obj_t.data.materials.append(mats["palm_trunk"])
    link_to_collection(obj_t, collection)

    bmesh.ops.recalc_face_normals(bm_leaves, faces=bm_leaves.faces[:])
    mesh_l = bpy.data.meshes.new("my-khe_palm-leaves_mesh")
    bm_leaves.to_mesh(mesh_l)
    bm_leaves.free()
    obj_l = bpy.data.objects.new("my-khe_palm-leaves", mesh_l)
    bpy.context.scene.collection.objects.link(obj_l)
    obj_l.data.materials.append(mats["palm_leaves"])
    link_to_collection(obj_l, collection)


# ---------------------------------------------------------------------------
# 4. Ô DÙ BÃI BIỂN, GIƯỜNG TẮM NẮNG & THÁP CỨU HỘ & THUYỀN THÚNG
# ---------------------------------------------------------------------------
def build_beach_amenities(collection, mats):
    bm_wood = bmesh.new()
    bm_umb_red = bmesh.new()
    bm_umb_blue = bmesh.new()
    bm_umb_yellow = bmesh.new()
    bm_coracle = bmesh.new()
    bm_rim = bmesh.new()

    # A. CÁC DÃY Ô DÙ BÃI BIỂN & GIƯỜNG NẰM PHƠI NẮNG (X: 18m đến 48m)
    num_clusters = 14
    for c in range(num_clusters):
        y_cen = -HALF_COAST + 35.0 + c * (COAST_LEN - 70.0) / num_clusters
        for row in range(3):
            x_u = 22.0 + row * 12.0
            # Cao độ bãi cát tại vị trí ô
            z_u = 2.4 - row * 0.55

            # Cột chống ô dù
            v1 = bm_wood.verts.new((x_u - 0.05, y_cen - 0.05, z_u))
            v2 = bm_wood.verts.new((x_u + 0.05, y_cen - 0.05, z_u))
            v3 = bm_wood.verts.new((x_u + 0.05, y_cen + 0.05, z_u))
            v4 = bm_wood.verts.new((x_u - 0.05, y_cen + 0.05, z_u))
            v5 = bm_wood.verts.new((x_u, y_cen, z_u + 2.4))
            bm_wood.faces.new([v1, v2, v5])
            bm_wood.faces.new([v2, v3, v5])
            bm_wood.faces.new([v3, v4, v5])
            bm_wood.faces.new([v4, v1, v5])

            # Tán nón ô dù sắc màu
            bm_target = [bm_umb_red, bm_umb_blue, bm_umb_yellow][(c + row) % 3]
            r_umb = 1.85
            apex = bm_target.verts.new((x_u, y_cen, z_u + 2.55))
            steps_u = 8
            u_ring = []
            for k in range(steps_u):
                ang = k * (2 * math.pi / steps_u)
                ux = x_u + math.cos(ang) * r_umb
                uy = y_cen + math.sin(ang) * r_umb
                u_ring.append(bm_target.verts.new((ux, uy, z_u + 1.85)))
            for k in range(steps_u):
                k2 = (k + 1) % steps_u
                bm_target.faces.new([apex, u_ring[k], u_ring[k2]])

            # Giường tắm nắng dưới bóng râm
            for side in [-1.0, 1.0]:
                yb = y_cen + side * 1.1
                b1 = bm_wood.verts.new((x_u - 1.0, yb - 0.35, z_u + 0.28))
                b2 = bm_wood.verts.new((x_u + 0.9, yb - 0.35, z_u + 0.28))
                b3 = bm_wood.verts.new((x_u + 0.9, yb + 0.35, z_u + 0.28))
                b4 = bm_wood.verts.new((x_u - 1.0, yb + 0.35, z_u + 0.28))
                bm_wood.faces.new([b1, b2, b3, b4])

    # B. THÁP CANH CỨU HỘ BÃI BIỂN (LIFEGUARD TOWERS)
    # Đặt 4 tháp gỗ quan sát bờ biển tại X ≈ 52m (gần mép nước)
    tower_positions = [
        (50.0, -220.0, 1.1),
        (52.0,  -70.0, 1.0),
        (51.0,   80.0, 1.0),
        (50.0,  230.0, 1.1),
    ]

    for tx, ty, tz in tower_positions:
        tw_w = 2.4
        tw_h = 4.2
        # 4 chân tháp
        posts = [
            (tx - tw_w/2, ty - tw_w/2),
            (tx + tw_w/2, ty - tw_w/2),
            (tx + tw_w/2, ty + tw_w/2),
            (tx - tw_w/2, ty + tw_w/2),
        ]
        top_posts = [
            (tx - tw_w*0.4, ty - tw_w*0.4),
            (tx + tw_w*0.4, ty - tw_w*0.4),
            (tx + tw_w*0.4, ty + tw_w*0.4),
            (tx - tw_w*0.4, ty + tw_w*0.4),
        ]
        for (px, py), (tpx, tpy) in zip(posts, top_posts):
            p1 = bm_wood.verts.new((px - 0.08, py - 0.08, tz))
            p2 = bm_wood.verts.new((px + 0.08, py - 0.08, tz))
            p3 = bm_wood.verts.new((tpx + 0.08, tpy + 0.08, tz + tw_h))
            p4 = bm_wood.verts.new((tpx - 0.08, tpy + 0.08, tz + tw_h))
            bm_wood.faces.new([p1, p2, p3, p4])

        # Sàn quan sát trên cao
        s1 = bm_wood.verts.new((tx - tw_w*0.45, ty - tw_w*0.45, tz + tw_h))
        s2 = bm_wood.verts.new((tx + tw_w*0.45, ty - tw_w*0.45, tz + tw_h))
        s3 = bm_wood.verts.new((tx + tw_w*0.45, ty + tw_w*0.45, tz + tw_h))
        s4 = bm_wood.verts.new((tx - tw_w*0.45, ty + tw_w*0.45, tz + tw_h))
        bm_wood.faces.new([s1, s2, s3, s4])

        # Mái che chòi canh đỏ trắng
        apex_t = bm_umb_red.verts.new((tx, ty, tz + tw_h + 1.8))
        m1 = bm_umb_red.verts.new((tx - tw_w*0.55, ty - tw_w*0.55, tz + tw_h + 0.9))
        m2 = bm_umb_red.verts.new((tx + tw_w*0.55, ty - tw_w*0.55, tz + tw_h + 0.9))
        m3 = bm_umb_red.verts.new((tx + tw_w*0.55, ty + tw_w*0.55, tz + tw_h + 0.9))
        m4 = bm_umb_red.verts.new((tx - tw_w*0.55, ty + tw_w*0.55, tz + tw_h + 0.9))
        bm_umb_red.faces.new([apex_t, m1, m2])
        bm_umb_red.faces.new([apex_t, m2, m3])
        bm_umb_red.faces.new([apex_t, m3, m4])
        bm_umb_red.faces.new([apex_t, m4, m1])

    # C. THUYỀN THÚNG TRE TRÒN TRUYỀN THỐNG ĐÀ NẴNG (ROUND CORACLE BOATS)
    # Đặt những chiếc thúng tròn của ngư dân đỗ trên bãi cát ven mép sóng (X ≈ 56m)
    coracle_positions = [
        (56.0, -180.0, 0.9), (58.0, -175.0, 0.8), (55.0, -168.0, 0.9),
        (54.0,  -40.0, 0.9), (57.0,  -35.0, 0.8), (56.0,  -30.0, 0.9), (58.0, -25.0, 0.8),
        (55.0,  110.0, 0.9), (57.0,  115.0, 0.8), (54.0,  122.0, 0.9),
        (56.0,  270.0, 0.9), (58.0,  275.0, 0.8),
    ]

    for cx, cy, cz in coracle_positions:
        r_boat = 1.35
        depth = 0.85
        steps_c = 14
        b_base = bm_coracle.verts.new((cx, cy, cz + 0.05))

        mid_ring = []
        rim_ring = []
        for k in range(steps_c):
            ang = k * (2 * math.pi / steps_c)
            # Vòng giữa
            mx = cx + math.cos(ang) * (r_boat * 0.75)
            my = cy + math.sin(ang) * (r_boat * 0.75)
            mid_ring.append(bm_coracle.verts.new((mx, my, cz + depth * 0.45)))
            # Vành thúng
            rx = cx + math.cos(ang) * r_boat
            ry = cy + math.sin(ang) * r_boat
            rim_ring.append(bm_coracle.verts.new((rx, ry, cz + depth)))

            # Vành tròn xanh viền ngoài (Rim on bm_rim)
            vx1 = cx + math.cos(ang) * (r_boat + 0.08)
            vy1 = cy + math.sin(ang) * (r_boat + 0.08)
            vx2 = cx + math.cos(ang) * (r_boat - 0.04)
            vy2 = cy + math.sin(ang) * (r_boat - 0.04)
            # rim vertices
            rv1 = bm_rim.verts.new((vx1, vy1, cz + depth - 0.05))
            rv2 = bm_rim.verts.new((vx1, vy1, cz + depth + 0.05))
            rv3 = bm_rim.verts.new((vx2, vy2, cz + depth + 0.05))
            rv4 = bm_rim.verts.new((vx2, vy2, cz + depth - 0.05))
            bm_rim.faces.new([rv1, rv2, rv3, rv4])

        for k in range(steps_c):
            k2 = (k + 1) % steps_c
            bm_coracle.faces.new([b_base, mid_ring[k], mid_ring[k2]])
            bm_coracle.faces.new([mid_ring[k], rim_ring[k], rim_ring[k2], mid_ring[k2]])

        # Thanh đòn ngang để chèo thuyền
        th1 = bm_wood.verts.new((cx - r_boat*0.88, cy - 0.12, cz + depth - 0.08))
        th2 = bm_wood.verts.new((cx + r_boat*0.88, cy - 0.12, cz + depth - 0.08))
        th3 = bm_wood.verts.new((cx + r_boat*0.88, cy + 0.12, cz + depth - 0.08))
        th4 = bm_wood.verts.new((cx - r_boat*0.88, cy + 0.12, cz + depth - 0.08))
        bm_wood.faces.new([th1, th2, th3, th4])

    # Build meshes
    bmesh.ops.recalc_face_normals(bm_wood, faces=bm_wood.faces[:])
    mesh_w = bpy.data.meshes.new("my-khe_beach-wood_mesh")
    bm_wood.to_mesh(mesh_w)
    bm_wood.free()
    obj_w = bpy.data.objects.new("my-khe_beach-wood", mesh_w)
    bpy.context.scene.collection.objects.link(obj_w)
    obj_w.data.materials.append(mats["wood"])
    link_to_collection(obj_w, collection)

    # Ô dù đỏ, xanh, vàng
    for bm_u, name, mat_name in [
        (bm_umb_red, "my-khe_umb-red", "umbrella_red"),
        (bm_umb_blue, "my-khe_umb-blue", "umbrella_blue"),
        (bm_umb_yellow, "my-khe_umb-yellow", "umbrella_yellow")
    ]:
        bmesh.ops.recalc_face_normals(bm_u, faces=bm_u.faces[:])
        m = bpy.data.meshes.new(f"{name}_mesh")
        bm_u.to_mesh(m)
        bm_u.free()
        o = bpy.data.objects.new(name, m)
        bpy.context.scene.collection.objects.link(o)
        o.data.materials.append(mats[mat_name])
        link_to_collection(o, collection)

    bmesh.ops.recalc_face_normals(bm_coracle, faces=bm_coracle.faces[:])
    mesh_c = bpy.data.meshes.new("my-khe_coracles_mesh")
    bm_coracle.to_mesh(mesh_c)
    bm_coracle.free()
    obj_c = bpy.data.objects.new("my-khe_coracles", mesh_c)
    bpy.context.scene.collection.objects.link(obj_c)
    obj_c.data.materials.append(mats["coracle_hull"])
    link_to_collection(obj_c, collection)

    bmesh.ops.recalc_face_normals(bm_rim, faces=bm_rim.faces[:])
    mesh_r = bpy.data.meshes.new("my-khe_coracle-rims_mesh")
    bm_rim.to_mesh(mesh_r)
    bm_rim.free()
    obj_r = bpy.data.objects.new("my-khe_coracle-rims", mesh_r)
    bpy.context.scene.collection.objects.link(obj_r)
    obj_r.data.materials.append(mats["coracle_rim"])
    link_to_collection(obj_r, collection)


# ---------------------------------------------------------------------------
# 5. MẶT BIỂN ĐÔNG & CÁC DẢI SÓNG BIỂN CUỘN BỌT TRẮNG (OCEAN WAVES)
# ---------------------------------------------------------------------------
def build_ocean_and_waves(collection, mats):
    bm_water = bmesh.new()
    bm_foam = bmesh.new()

    # 1. Mặt biển nước nông và ngoài khơi (X: 72m đến 320m)
    steps_x = 20
    steps_y = 35
    dx = (320.0 - 72.0) / steps_x
    dy = COAST_LEN / steps_y

    water_grid = []
    for iy in range(steps_y + 1):
        y = -HALF_COAST + iy * dy
        curv = math.sin(y * 0.018) * 6.5 + math.cos(y * 0.04) * 2.8
        row = []
        for ix in range(steps_x + 1):
            x = 72.0 + ix * dx + (curv * (1.0 - ix / steps_x))
            # Sóng biển nhấp nhô 3D
            wave_h = math.sin(x * 0.08 + y * 0.05) * 0.28 + math.cos(x * 0.15) * 0.15
            row.append(bm_water.verts.new((x, y, wave_h)))
        water_grid.append(row)

    for iy in range(steps_y):
        for ix in range(steps_x):
            v1 = water_grid[iy][ix]
            v2 = water_grid[iy + 1][ix]
            v3 = water_grid[iy + 1][ix + 1]
            v4 = water_grid[iy][ix + 1]
            bm_water.faces.new([v1, v2, v3, v4])

    # 2. Các dải sóng biển cuộn bờ với bọt trắng xóa (Breaking Wave Foam Ribbons)
    # 4 đợt sóng song song tiến dần vào bờ cát
    wave_distances = [82.0, 118.0, 168.0, 235.0]
    for w_idx, base_dist in enumerate(wave_distances):
        foam_w = 4.5 + w_idx * 1.5
        crest_h = 0.55 - w_idx * 0.08

        for iy in range(steps_y):
            y1 = -HALF_COAST + iy * dy
            y2 = -HALF_COAST + (iy + 1) * dy
            curv1 = math.sin(y1 * 0.018) * 6.5 + math.cos(y1 * 0.04) * 2.8
            curv2 = math.sin(y2 * 0.018) * 6.5 + math.cos(y2 * 0.04) * 2.8

            xw1 = base_dist + curv1
            xw2 = base_dist + curv2

            # Dải bọt sóng cuộn nhô cao
            f1 = bm_foam.verts.new((xw1 - foam_w * 0.6, y1, crest_h * 0.6))
            f2 = bm_foam.verts.new((xw2 - foam_w * 0.6, y2, crest_h * 0.6))
            f3 = bm_foam.verts.new((xw2 + foam_w * 0.4, y2, crest_h + 0.15))
            f4 = bm_foam.verts.new((xw1 + foam_w * 0.4, y1, crest_h + 0.15))
            bm_foam.faces.new([f1, f2, f3, f4])

    bmesh.ops.recalc_face_normals(bm_water, faces=bm_water.faces[:])
    mesh_w = bpy.data.meshes.new("my-khe_ocean-water_mesh")
    bm_water.to_mesh(mesh_w)
    bm_water.free()
    obj_w = bpy.data.objects.new("my-khe_ocean-water", mesh_w)
    bpy.context.scene.collection.objects.link(obj_w)
    obj_w.data.materials.append(mats["ocean_shallow"])
    set_smooth(obj_w)
    link_to_collection(obj_w, collection)

    bmesh.ops.recalc_face_normals(bm_foam, faces=bm_foam.faces[:])
    mesh_f = bpy.data.meshes.new("my-khe_wave-foam_mesh")
    bm_foam.to_mesh(mesh_f)
    bm_foam.free()
    obj_f = bpy.data.objects.new("my-khe_wave-foam", mesh_f)
    bpy.context.scene.collection.objects.link(obj_f)
    obj_f.data.materials.append(mats["wave_foam"])
    set_smooth(obj_f)
    link_to_collection(obj_f, collection)


# ---------------------------------------------------------------------------
# 6. DÃY KHÁCH SẠN & RESORT VEN BIỂN (COASTAL HOTELS & RESORTS)
# ---------------------------------------------------------------------------
def build_coastal_resorts(collection, mats):
    bm_hotel = bmesh.new()
    bm_glass = bmesh.new()

    # Dãy cao ốc phía Tây đường Võ Nguyên Giáp (X: -125m đến -78m)
    hotels = [
        # x, y, width, depth, height
        (-102.0, -280.0, 38.0, 48.0, 58.0), # Muong Thanh Luxury Danang style
        (-105.0, -210.0, 32.0, 42.0, 72.0), # Khách sạn tháp kính 25 tầng
        (-100.0, -145.0, 44.0, 50.0, 48.0), # Resort hướng biển
        (-104.0,  -80.0, 36.0, 45.0, 85.0), # A La Carte Beach Hotel style
        (-108.0,  -15.0, 40.0, 48.0, 65.0), # Khách sạn quảng trường biển
        (-102.0,   55.0, 35.0, 42.0, 92.0), # Tháp cao tầng 30 tầng
        (-106.0,  125.0, 42.0, 52.0, 55.0), # Danang Beach Condotel
        (-100.0,  195.0, 38.0, 44.0, 78.0), # Luxury Hotel
        (-105.0,  265.0, 45.0, 48.0, 60.0), # Beachfront Resort
    ]

    for hx, hy, hw, hd, hh in hotels:
        z_base = 3.8
        # Khối thân khách sạn
        v1 = bm_hotel.verts.new((hx - hw/2, hy - hd/2, z_base))
        v2 = bm_hotel.verts.new((hx + hw/2, hy - hd/2, z_base))
        v3 = bm_hotel.verts.new((hx + hw/2, hy + hd/2, z_base))
        v4 = bm_hotel.verts.new((hx - hw/2, hy + hd/2, z_base))
        v5 = bm_hotel.verts.new((hx - hw/2, hy - hd/2, z_base + hh))
        v6 = bm_hotel.verts.new((hx + hw/2, hy - hd/2, z_base + hh))
        v7 = bm_hotel.verts.new((hx + hw/2, hy + hd/2, z_base + hh))
        v8 = bm_hotel.verts.new((hx - hw/2, hy + hd/2, z_base + hh))

        bm_hotel.faces.new([v1, v2, v6, v5])
        bm_hotel.faces.new([v2, v3, v7, v6])
        bm_hotel.faces.new([v3, v4, v8, v7])
        bm_hotel.faces.new([v4, v1, v5, v8])
        bm_hotel.faces.new([v5, v6, v7, v8])

        # Mặt kính ban công hướng thẳng ra biển Đông (+X)
        gw = hw * 0.85
        gh = hh * 0.78
        g1 = bm_glass.verts.new((hx + hw/2 + 0.15, hy - hd*0.42, z_base + hh*0.12))
        g2 = bm_glass.verts.new((hx + hw/2 + 0.15, hy + hd*0.42, z_base + hh*0.12))
        g3 = bm_glass.verts.new((hx + hw/2 + 0.15, hy + hd*0.42, z_base + hh*0.90))
        g4 = bm_glass.verts.new((hx + hw/2 + 0.15, hy - hd*0.42, z_base + hh*0.90))
        bm_glass.faces.new([g1, g2, g3, g4])

    bmesh.ops.recalc_face_normals(bm_hotel, faces=bm_hotel.faces[:])
    mesh_h = bpy.data.meshes.new("my-khe_resorts_mesh")
    bm_hotel.to_mesh(mesh_h)
    bm_hotel.free()
    obj_h = bpy.data.objects.new("my-khe_resorts", mesh_h)
    bpy.context.scene.collection.objects.link(obj_h)
    obj_h.data.materials.append(mats["hotel_facade"])
    link_to_collection(obj_h, collection)

    bmesh.ops.recalc_face_normals(bm_glass, faces=bm_glass.faces[:])
    mesh_g = bpy.data.meshes.new("my-khe_resort-glass_mesh")
    bm_glass.to_mesh(mesh_g)
    bm_glass.free()
    obj_g = bpy.data.objects.new("my-khe_resort-glass", mesh_g)
    bpy.context.scene.collection.objects.link(obj_g)
    obj_g.data.materials.append(mats["hotel_glass"])
    link_to_collection(obj_g, collection)


# ---------------------------------------------------------------------------
# MAIN BUILD & EXPORT
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("DỰNG 3D BIỂN MỸ KHÊ ĐÀ NẴNG (BLENDER 4.2 LTS) - CÁT TRẮNG VÀ SÓNG BIỂN")
    print("=" * 70)

    clean_scene()
    coll = get_or_create_collection("MyKheBeach")
    mats = build_materials()

    print("1. Dựng địa hình bờ biển, bãi cát vàng mịn & đáy biển...")
    build_coastal_terrain(coll, mats)

    print("2. Dựng đại lộ ven biển Võ Nguyên Giáp & Công viên Biển Đông...")
    build_boulevard_and_park(coll, mats)

    print("3. Dựng rặng dừa nhiệt đới nghiêng bóng mát...")
    build_coconut_palms(coll, mats)

    print("4. Dựng ô dù bãi biển, giường nằm, tháp cứu hộ & thuyền thúng Đà Nẵng...")
    build_beach_amenities(coll, mats)

    print("5. Dựng mặt biển Đông & các dải sóng biển cuộn bọt trắng...")
    build_ocean_and_waves(coll, mats)

    print("6. Dựng dãy resort & khách sạn ven biển...")
    build_coastal_resorts(coll, mats)

    # Lưu .blend
    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"-> Đã lưu .blend tại: {BLEND_OUT_PATH}")

    # Export glTF .glb
    os.makedirs(GLB_OUT_DIR, exist_ok=True)
    os.makedirs(WEB_GLB_DIR, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT_PATH,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export GLB tại: {GLB_OUT_PATH}")

    shutil.copy2(GLB_OUT_PATH, WEB_GLB_PATH)
    print(f"-> Đã copy sang Web: {WEB_GLB_PATH}")

    print("=" * 70)
    print("HOÀN THÀNH XÂY DỰNG BIỂN MỸ KHÊ 100%!")
    print("=" * 70)


if __name__ == "__main__":
    main()
