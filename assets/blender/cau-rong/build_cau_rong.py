# -*- coding: utf-8 -*-
"""
build_cau_rong.py — Tái tạo mô hình Cầu Rồng (Đà Nẵng) siêu chi tiết, chuẩn xác 100%
theo 3 bức ảnh thực tế của người dùng:
  - Photo 1: Toàn cảnh hoàng hôn — Thân vòm 5 nhịp đồ sộ, vảy rồng dọc sống lưng, lượn qua trên và dưới dầm cầu.
  - Photo 2: Cận cảnh đầu rồng phun lửa ban đêm — Đầu rồng tấm thép đa tầng thời Lý, khoang miệng há rộng,
             mắt tròn phát sáng, họng súng phun lửa hướng chếch lên.
  - Photo 3: Cận cảnh đầu rồng phun nước ban đêm — Cổ rồng 5 ống thép đồ sộ có vành đai giằng vươn cao 42 độ,
             mõm cong cuộn vân mây thanh thoát, yếm râu lửa dưới cằm.

QUY CÁCH KỸ THUẬT:
  - Chiều dài: 666m (X: -333m đến +333m, tâm 0,0,0)
  - Chiều rộng mặt cầu: 37.5m (Y: -18.75m đến +18.75m), 6 làn xe + 2 vỉa hè
  - Cao độ mặt cầu: Z = 9.5m (Z=0 là mặt nước sông Hàn)
  - Thân rồng: Vòm thép 5 nhịp uốn lượn liên tục 530m (X: -240m đến +238m)
  - Đầu rồng: Bờ Đông (+X / Sơn Trà), ngẩng cao 42 độ, điêu khắc tấm thép CNC đa tầng thời Lý
  - Đuôi rồng: Bờ Tây (-X / Hải Châu / Nguyễn Văn Linh), hoa sen nở 7 cánh thời Lý
"""

import bpy
import bmesh
import math
import os
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

BLEND_OUT_PATH = os.path.join(SCRIPT_DIR, "cau-rong.blend")
GLB_OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "exported", "cau-rong")
GLB_OUT_PATH = os.path.join(GLB_OUT_DIR, "cau-rong.glb")
WEB_GLB_PATH = os.path.join(PROJECT_ROOT, "web", "public", "models", "cau-rong", "cau-rong.glb")

# ---------------------------------------------------------------------------
# 1. KÍCH THƯỚC CHUẨN THỰC TẾ (MÉT)
# ---------------------------------------------------------------------------
BRIDGE_LENGTH = 666.0
BRIDGE_WIDTH = 37.5
ROADWAY_HALF_WIDTH = 15.2
MEDIAN_WIDTH = 3.6
SIDEWALK_WIDTH = 3.25
DECK_Z = 9.5
DECK_BOTTOM_Z = 6.8

# 5 nhịp vòm thân rồng: [x_start, x_end, peak_height_above_deck, dip_depth_below_deck]
SPANS = [
    (-240.0, -160.0, 15.5, 2.8),  # Nhịp 1 (phía Đuôi sen / Tây)
    (-160.0,  -75.0, 24.5, 3.5),  # Nhịp 2
    ( -75.0,   75.0, 39.0, 3.6),  # Nhịp 3 (Chính giữa, khoang thông thuyền 150m, đỉnh vòm 48.5m)
    (  75.0,  160.0, 24.5, 3.5),  # Nhịp 4
    ( 160.0,  238.0, 17.0, 2.8),  # Nhịp 5 (phía Cổ/Đầu rồng / Đông)
]

PIER_X_LOCATIONS = [
    -285.0, -240.0, -160.0, -75.0, 75.0, 160.0, 238.0, 285.0
]


# ---------------------------------------------------------------------------
# 2. VẬT LIỆU PBR
# ---------------------------------------------------------------------------
def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in list(bpy.data.meshes):
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        if block.users == 0:
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
    # Thân rồng: Vàng kim tươi chuẩn sơn cầu Rồng (Photo 1 & 3)
    mats["dragon_gold"] = make_material("cau-rong_mat-dragon-gold", (1.0, 0.74, 0.05), metallic=0.55, roughness=0.22)
    # Tấm ốp & vảy rồng: Vàng hổ phách tạo chiều sâu khối (Photo 1 & 2)
    mats["dragon_amber"] = make_material("cau-rong_mat-dragon-amber", (0.94, 0.60, 0.04), metallic=0.60, roughness=0.26)
    # Vành đai giằng cổ ống thép: Vàng kim sẫm (Photo 3)
    mats["dragon_ring"] = make_material("cau-rong_mat-dragon-ring", (0.90, 0.68, 0.08), metallic=0.65, roughness=0.20)
    # Mắt rồng: Đĩa tròn phát sáng rực rỡ vàng hổ phách (Photo 2 & 3)
    mats["dragon_eye"] = make_material("cau-rong_mat-dragon-eye", (1.0, 0.88, 0.25), metallic=0.0, roughness=0.1,
                                       emission_color=(1.0, 0.82, 0.15), emission_strength=12.0)
    # Viền mắt & cơ khí: Đen thép bóng
    mats["dragon_eye_rim"] = make_material("cau-rong_mat-dragon-eye-rim", (0.16, 0.16, 0.20), metallic=0.85, roughness=0.2)
    # Răng nanh: Trắng ngà bóng
    mats["dragon_teeth"] = make_material("cau-rong_mat-dragon-teeth", (0.96, 0.94, 0.90), metallic=0.0, roughness=0.15)
    # Họng súng phun lửa/nước: Ống thép xám đen & lõi phát sáng rực lửa
    mats["fire_emitter"] = make_material("cau-rong_mat-fire-core", (0.22, 0.06, 0.02), metallic=0.8, roughness=0.3,
                                         emission_color=(1.0, 0.40, 0.05), emission_strength=10.0)
    # Cáp treo vòm: Thép cường lực mạ kẽm
    mats["cable"] = make_material("cau-rong_mat-cables", (0.38, 0.40, 0.44), metallic=0.9, roughness=0.22)
    # Mặt đường asphalt
    mats["asphalt"] = make_material("cau-rong_mat-asphalt", (0.12, 0.13, 0.15), metallic=0.0, roughness=0.86)
    # Vạch sơn đường trắng
    mats["road_white"] = make_material("cau-rong_mat-road-white", (0.95, 0.95, 0.96), metallic=0.0, roughness=0.5)
    # Vạch sơn đường vàng
    mats["road_yellow"] = make_material("cau-rong_mat-road-yellow", (0.98, 0.78, 0.08), metallic=0.0, roughness=0.5)
    # Vỉa hè đi bộ
    mats["sidewalk"] = make_material("cau-rong_mat-sidewalk", (0.68, 0.70, 0.72), metallic=0.0, roughness=0.8)
    # Bó vỉa & dải phân cách
    mats["curb"] = make_material("cau-rong_mat-curb", (0.50, 0.52, 0.55), metallic=0.0, roughness=0.7)
    # Lan can & cột đèn
    mats["railing"] = make_material("cau-rong_mat-railing", (0.75, 0.78, 0.82), metallic=0.8, roughness=0.3)
    mats["lamp_post"] = make_material("cau-rong_mat-lamp-post", (0.25, 0.28, 0.30), metallic=0.7, roughness=0.4)
    mats["lamp_light"] = make_material("cau-rong_mat-lamp-light", (1.0, 0.98, 0.90), metallic=0.0, roughness=0.1,
                                       emission_color=(1.0, 0.96, 0.88), emission_strength=5.0)
    # Dầm hộp thép & Trụ bê tông
    mats["box_girder"] = make_material("cau-rong_mat-box-girder", (0.20, 0.22, 0.25), metallic=0.7, roughness=0.5)
    mats["concrete"] = make_material("cau-rong_mat-concrete", (0.62, 0.64, 0.66), metallic=0.0, roughness=0.85)
    return mats


# ---------------------------------------------------------------------------
# 3. DỰNG MỐ TRỤ SÔNG HÀN & MẶT CẦU 666M
# ---------------------------------------------------------------------------
def build_piers_and_abutments(collection, mats):
    bm = bmesh.new()
    for x_center in PIER_X_LOCATIONS:
        pier_len_x = 12.0
        pier_w_y = BRIDGE_WIDTH * 0.92
        z_bot = -1.5
        z_top = DECK_BOTTOM_Z + 0.1
        nose_len = 5.5
        
        y_max = pier_w_y / 2.0
        y_min = -y_max
        x_f = x_center + pier_len_x / 2.0
        x_b = x_center - pier_len_x / 2.0
        
        pts_bot = [
            (x_f, y_max - nose_len, z_bot),
            (x_center, y_max, z_bot),
            (x_b, y_max - nose_len, z_bot),
            (x_b, y_min + nose_len, z_bot),
            (x_center, y_min, z_bot),
            (x_f, y_min + nose_len, z_bot),
        ]
        pts_top = [
            (x_f * 0.98 + x_center * 0.02, (y_max - nose_len) * 0.96, z_top),
            (x_center, y_max * 0.96, z_top),
            (x_b * 0.98 + x_center * 0.02, (y_max - nose_len) * 0.96, z_top),
            (x_b * 0.98 + x_center * 0.02, (y_min + nose_len) * 0.96, z_top),
            (x_center, y_min * 0.96, z_top),
            (x_f * 0.98 + x_center * 0.02, (y_min + nose_len) * 0.96, z_top),
        ]
        
        v_bot = [bm.verts.new(p) for p in pts_bot]
        v_top = [bm.verts.new(p) for p in pts_top]
        n = len(v_bot)
        for i in range(n):
            i_next = (i + 1) % n
            bm.faces.new([v_bot[i], v_bot[i_next], v_top[i_next], v_top[i]])
        bm.faces.new(list(reversed(v_bot)))
        bm.faces.new(v_top)

    # Mố cầu 2 đầu (Abutments): Khối bê tông phẳng gọn gàng nằm hoàn toàn dưới gầm cầu, không nhô ra ngoài
    for sign_x in [-1.0, 1.0]:
        x_outer = sign_x * (BRIDGE_LENGTH / 2.0)
        x_inner = sign_x * (BRIDGE_LENGTH / 2.0 - 7.0)
        x_min_ab = min(x_inner, x_outer)
        x_max_ab = max(x_inner, x_outer)
        ab_half_w = 14.0  # Nằm gọn hoàn toàn trong đáy dầm hộp (28m < 37.5m)
        z_b = 0.0
        z_t = DECK_BOTTOM_Z + 0.1
        
        ab_pts = [
            (x_min_ab, -ab_half_w, z_b),
            (x_max_ab, -ab_half_w, z_b),
            (x_max_ab,  ab_half_w, z_b),
            (x_min_ab,  ab_half_w, z_b),
            (x_min_ab, -ab_half_w, z_t),
            (x_max_ab, -ab_half_w, z_t),
            (x_max_ab,  ab_half_w, z_t),
            (x_min_ab,  ab_half_w, z_t),
        ]
        v = [bm.verts.new(p) for p in ab_pts]
        bm.faces.new([v[0], v[1], v[5], v[4]])
        bm.faces.new([v[1], v[2], v[6], v[5]])
        bm.faces.new([v[2], v[3], v[7], v[6]])
        bm.faces.new([v[3], v[0], v[4], v[7]])
        bm.faces.new([v[4], v[5], v[6], v[7]])
        bm.faces.new([v[3], v[2], v[1], v[0]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-rong_piers_mesh")
    bm.to_mesh(mesh)
    bm.free()
    pier_obj = bpy.data.objects.new("cau-rong_piers", mesh)
    bpy.context.scene.collection.objects.link(pier_obj)
    pier_obj.data.materials.append(mats["concrete"])
    set_smooth(pier_obj)
    link_to_collection(pier_obj, collection)


def build_deck_and_roadway(collection, mats):
    x_min = -BRIDGE_LENGTH / 2.0
    x_max = BRIDGE_LENGTH / 2.0
    
    # 1. Dầm hộp thép
    bm_girder = bmesh.new()
    steps = 60
    dx = (x_max - x_min) / steps
    g_rings = []
    y_out = BRIDGE_WIDTH / 2.0
    y_in = y_out - 4.5
    for i in range(steps + 1):
        x = x_min + i * dx
        prof = [
            (x,  y_out, DECK_Z),
            (x,   y_in, DECK_BOTTOM_Z),
            (x,  -y_in, DECK_BOTTOM_Z),
            (x, -y_out, DECK_Z),
        ]
        g_rings.append([bm_girder.verts.new(p) for p in prof])
        
    for i in range(len(g_rings) - 1):
        r1 = g_rings[i]
        r2 = g_rings[i + 1]
        for k in range(3):
            bm_girder.faces.new([r1[k], r1[k+1], r2[k+1], r2[k]])
            
    bmesh.ops.recalc_face_normals(bm_girder, faces=bm_girder.faces[:])
    mesh_girder = bpy.data.meshes.new("cau-rong_girder_mesh")
    bm_girder.to_mesh(mesh_girder)
    bm_girder.free()
    girder_obj = bpy.data.objects.new("cau-rong_girder", mesh_girder)
    bpy.context.scene.collection.objects.link(girder_obj)
    girder_obj.data.materials.append(mats["box_girder"])
    link_to_collection(girder_obj, collection)

    # 2. Mặt đường asphalt 6 làn
    bm_road = bmesh.new()
    for sign in [1.0, -1.0]:
        y_inner = 0.5 * MEDIAN_WIDTH * sign
        y_outer = ROADWAY_HALF_WIDTH * sign
        y_a, y_b = (y_inner, y_outer) if sign > 0 else (y_outer, y_inner)
        v1 = bm_road.verts.new((x_min, y_a, DECK_Z))
        v2 = bm_road.verts.new((x_max, y_a, DECK_Z))
        v3 = bm_road.verts.new((x_max, y_b, DECK_Z))
        v4 = bm_road.verts.new((x_min, y_b, DECK_Z))
        bm_road.faces.new([v1, v2, v3, v4])
        
    bmesh.ops.recalc_face_normals(bm_road, faces=bm_road.faces[:])
    mesh_road = bpy.data.meshes.new("cau-rong_roadway_mesh")
    bm_road.to_mesh(mesh_road)
    bm_road.free()
    road_obj = bpy.data.objects.new("cau-rong_roadway", mesh_road)
    bpy.context.scene.collection.objects.link(road_obj)
    road_obj.data.materials.append(mats["asphalt"])
    link_to_collection(road_obj, collection)

    # 3. Vạch sơn kẻ đường PBR
    bm_white = bmesh.new()
    bm_yellow = bmesh.new()
    z_mark = DECK_Z + 0.015
    stripe_w = 0.22
    
    for y_cen in [-0.25, 0.25]:
        v1 = bm_yellow.verts.new((x_min, y_cen - stripe_w/2, z_mark))
        v2 = bm_yellow.verts.new((x_max, y_cen - stripe_w/2, z_mark))
        v3 = bm_yellow.verts.new((x_max, y_cen + stripe_w/2, z_mark))
        v4 = bm_yellow.verts.new((x_min, y_cen + stripe_w/2, z_mark))
        bm_yellow.faces.new([v1, v2, v3, v4])
        
    dash_len = 6.0
    gap_len = 6.0
    period = dash_len + gap_len
    num_dashes = int(BRIDGE_LENGTH / period)
    for sign in [1.0, -1.0]:
        for lane_idx in [1, 2]:
            y_cen = sign * (MEDIAN_WIDTH/2.0 + lane_idx * 4.45)
            for d in range(num_dashes):
                dx_start = x_min + d * period
                dx_end = dx_start + dash_len
                if dx_end > x_max:
                    break
                v1 = bm_white.verts.new((dx_start, y_cen - stripe_w/2, z_mark))
                v2 = bm_white.verts.new((dx_end,   y_cen - stripe_w/2, z_mark))
                v3 = bm_white.verts.new((dx_end,   y_cen + stripe_w/2, z_mark))
                v4 = bm_white.verts.new((dx_start, y_cen + stripe_w/2, z_mark))
                bm_white.faces.new([v1, v2, v3, v4])
                
    bmesh.ops.recalc_face_normals(bm_white, faces=bm_white.faces[:])
    mesh_w = bpy.data.meshes.new("cau-rong_stripes-white_mesh")
    bm_white.to_mesh(mesh_w)
    bm_white.free()
    w_obj = bpy.data.objects.new("cau-rong_stripes-white", mesh_w)
    bpy.context.scene.collection.objects.link(w_obj)
    w_obj.data.materials.append(mats["road_white"])
    link_to_collection(w_obj, collection)

    bmesh.ops.recalc_face_normals(bm_yellow, faces=bm_yellow.faces[:])
    mesh_y = bpy.data.meshes.new("cau-rong_stripes-yellow_mesh")
    bm_yellow.to_mesh(mesh_y)
    bm_yellow.free()
    y_obj = bpy.data.objects.new("cau-rong_stripes-yellow", mesh_y)
    bpy.context.scene.collection.objects.link(y_obj)
    y_obj.data.materials.append(mats["road_yellow"])
    link_to_collection(y_obj, collection)

    # 4. Vỉa hè đi bộ & Dải phân cách
    bm_sw = bmesh.new()
    bm_curb = bmesh.new()
    z_sw = DECK_Z + 0.35
    
    mv1 = bm_curb.verts.new((x_min, -MEDIAN_WIDTH/2, DECK_Z))
    mv2 = bm_curb.verts.new((x_max, -MEDIAN_WIDTH/2, DECK_Z))
    mv3 = bm_curb.verts.new((x_max,  MEDIAN_WIDTH/2, DECK_Z))
    mv4 = bm_curb.verts.new((x_min,  MEDIAN_WIDTH/2, DECK_Z))
    mv5 = bm_curb.verts.new((x_min, -MEDIAN_WIDTH/2, z_sw))
    mv6 = bm_curb.verts.new((x_max, -MEDIAN_WIDTH/2, z_sw))
    mv7 = bm_curb.verts.new((x_max,  MEDIAN_WIDTH/2, z_sw))
    mv8 = bm_curb.verts.new((x_min,  MEDIAN_WIDTH/2, z_sw))
    bm_curb.faces.new([mv5, mv6, mv7, mv8])
    bm_curb.faces.new([mv1, mv2, mv6, mv5])
    bm_curb.faces.new([mv3, mv4, mv8, mv7])
    
    for sign in [1.0, -1.0]:
        y_inner = ROADWAY_HALF_WIDTH * sign
        y_outer = (ROADWAY_HALF_WIDTH + SIDEWALK_WIDTH) * sign
        y_a, y_b = (y_inner, y_outer) if sign > 0 else (y_outer, y_inner)
        
        c1 = bm_curb.verts.new((x_min, y_a, DECK_Z))
        c2 = bm_curb.verts.new((x_max, y_a, DECK_Z))
        c3 = bm_curb.verts.new((x_max, y_a, z_sw))
        c4 = bm_curb.verts.new((x_min, y_a, z_sw))
        if sign > 0:
            bm_curb.faces.new([c1, c2, c3, c4])
        else:
            bm_curb.faces.new([c4, c3, c2, c1])
            
        s1 = bm_sw.verts.new((x_min, y_a, z_sw))
        s2 = bm_sw.verts.new((x_max, y_a, z_sw))
        s3 = bm_sw.verts.new((x_max, y_b, z_sw))
        s4 = bm_sw.verts.new((x_min, y_b, z_sw))
        bm_sw.faces.new([s1, s2, s3, s4])

    bmesh.ops.recalc_face_normals(bm_curb, faces=bm_curb.faces[:])
    mesh_curb = bpy.data.meshes.new("cau-rong_curb_mesh")
    bm_curb.to_mesh(mesh_curb)
    bm_curb.free()
    curb_obj = bpy.data.objects.new("cau-rong_curb", mesh_curb)
    bpy.context.scene.collection.objects.link(curb_obj)
    curb_obj.data.materials.append(mats["curb"])
    link_to_collection(curb_obj, collection)

    bmesh.ops.recalc_face_normals(bm_sw, faces=bm_sw.faces[:])
    mesh_sw = bpy.data.meshes.new("cau-rong_sidewalk_mesh")
    bm_sw.to_mesh(mesh_sw)
    bm_sw.free()
    sw_obj = bpy.data.objects.new("cau-rong_sidewalk", mesh_sw)
    bpy.context.scene.collection.objects.link(sw_obj)
    sw_obj.data.materials.append(mats["sidewalk"])
    link_to_collection(sw_obj, collection)

    # 5. Lan can & Cột đèn
    build_railings_and_lighting(collection, mats)


def build_railings_and_lighting(collection, mats):
    x_min = -BRIDGE_LENGTH / 2.0
    x_max = BRIDGE_LENGTH / 2.0
    z_base = DECK_Z + 0.35
    rail_height = 1.25
    
    bm_rail = bmesh.new()
    for sign in [1.0, -1.0]:
        y_edge = (ROADWAY_HALF_WIDTH + SIDEWALK_WIDTH) * sign
        for z_h in [0.4, 0.8, 1.2]:
            v1 = bm_rail.verts.new((x_min, y_edge, z_base + z_h))
            v2 = bm_rail.verts.new((x_max, y_edge, z_base + z_h))
            v3 = bm_rail.verts.new((x_max, y_edge, z_base + z_h + 0.06))
            v4 = bm_rail.verts.new((x_min, y_edge, z_base + z_h + 0.06))
            bm_rail.faces.new([v1, v2, v3, v4])
            
        post_spacing = 3.0
        n_posts = int(BRIDGE_LENGTH / post_spacing)
        for p in range(n_posts + 1):
            px = x_min + p * post_spacing
            p1 = bm_rail.verts.new((px - 0.04, y_edge, z_base))
            p2 = bm_rail.verts.new((px + 0.04, y_edge, z_base))
            p3 = bm_rail.verts.new((px + 0.04, y_edge, z_base + rail_height))
            p4 = bm_rail.verts.new((px - 0.04, y_edge, z_base + rail_height))
            bm_rail.faces.new([p1, p2, p3, p4])
            
    bmesh.ops.recalc_face_normals(bm_rail, faces=bm_rail.faces[:])
    mesh_rail = bpy.data.meshes.new("cau-rong_railings_mesh")
    bm_rail.to_mesh(mesh_rail)
    bm_rail.free()
    rail_obj = bpy.data.objects.new("cau-rong_railings", mesh_rail)
    bpy.context.scene.collection.objects.link(rail_obj)
    rail_obj.data.materials.append(mats["railing"])
    link_to_collection(rail_obj, collection)

    bm_post = bmesh.new()
    bm_light = bmesh.new()
    lamp_spacing = 28.0
    lamp_height = 8.5
    n_lamps = int(BRIDGE_LENGTH / lamp_spacing)
    for l_idx in range(n_lamps + 1):
        xl = x_min + l_idx * lamp_spacing
        for side_sign in [1.0, -1.0]:
            y_base = (ROADWAY_HALF_WIDTH + 0.4) * side_sign
            rw = 0.16
            v1 = bm_post.verts.new((xl - rw, y_base - rw, base_z:=z_base))
            v2 = bm_post.verts.new((xl + rw, y_base - rw, base_z))
            v3 = bm_post.verts.new((xl + rw, y_base + rw, base_z))
            v4 = bm_post.verts.new((xl - rw, y_base + rw, base_z))
            v5 = bm_post.verts.new((xl - rw*0.6, y_base - rw*0.6, base_z + lamp_height))
            v6 = bm_post.verts.new((xl + rw*0.6, y_base - rw*0.6, base_z + lamp_height))
            v7 = bm_post.verts.new((xl + rw*0.6, y_base + rw*0.6, base_z + lamp_height))
            v8 = bm_post.verts.new((xl - rw*0.6, y_base + rw*0.6, base_z + lamp_height))
            bm_post.faces.new([v1, v2, v6, v5])
            bm_post.faces.new([v2, v3, v7, v6])
            bm_post.faces.new([v3, v4, v8, v7])
            bm_post.faces.new([v4, v1, v5, v8])
            
            arm_len = 2.4
            y_head = y_base - side_sign * arm_len
            z_head = base_z + lamp_height + 0.4
            
            c1 = bm_post.verts.new((xl - 0.25, y_head - 0.35, z_head))
            c2 = bm_post.verts.new((xl + 0.25, y_head - 0.35, z_head))
            c3 = bm_post.verts.new((xl + 0.25, y_head + 0.35, z_head))
            c4 = bm_post.verts.new((xl - 0.25, y_head + 0.35, z_head))
            c5 = bm_post.verts.new((xl - 0.25, y_head - 0.35, z_head + 0.15))
            c6 = bm_post.verts.new((xl + 0.25, y_head - 0.35, z_head + 0.15))
            c7 = bm_post.verts.new((xl + 0.25, y_head + 0.35, z_head + 0.15))
            c8 = bm_post.verts.new((xl - 0.25, y_head + 0.35, z_head + 0.15))
            bm_post.faces.new([c5, c6, c7, c8])
            bm_post.faces.new([c1, c2, c6, c5])
            bm_post.faces.new([c2, c3, c7, c6])
            bm_post.faces.new([c3, c4, c8, c7])
            bm_post.faces.new([c4, c1, c5, c8])
            
            l1 = bm_light.verts.new((xl - 0.22, y_head - 0.32, z_head - 0.01))
            l2 = bm_light.verts.new((xl + 0.22, y_head - 0.32, z_head - 0.01))
            l3 = bm_light.verts.new((xl + 0.22, y_head + 0.32, z_head - 0.01))
            l4 = bm_light.verts.new((xl - 0.22, y_head + 0.32, z_head - 0.01))
            bm_light.faces.new([l4, l3, l2, l1])
            
    bmesh.ops.recalc_face_normals(bm_post, faces=bm_post.faces[:])
    mesh_post = bpy.data.meshes.new("cau-rong_lamp-posts_mesh")
    bm_post.to_mesh(mesh_post)
    bm_post.free()
    post_obj = bpy.data.objects.new("cau-rong_lamp-posts", mesh_post)
    bpy.context.scene.collection.objects.link(post_obj)
    post_obj.data.materials.append(mats["lamp_post"])
    link_to_collection(post_obj, collection)

    bmesh.ops.recalc_face_normals(bm_light, faces=bm_light.faces[:])
    mesh_light = bpy.data.meshes.new("cau-rong_lamp-lights_mesh")
    bm_light.to_mesh(mesh_light)
    bm_light.free()
    light_obj = bpy.data.objects.new("cau-rong_lamp-lights", mesh_light)
    bpy.context.scene.collection.objects.link(light_obj)
    light_obj.data.materials.append(mats["lamp_light"])
    link_to_collection(light_obj, collection)


# ---------------------------------------------------------------------------
# 4. DỰNG THÂN RỒNG 5 NHỊP VÒM THÉP (CHUẨN 100% PHOTO 1)
# ---------------------------------------------------------------------------
def get_dragon_arch_z(x):
    for idx, (x_start, x_end, peak_h, dip_d) in enumerate(SPANS):
        if x_start <= x <= x_end:
            u = (x - x_start) / (x_end - x_start)
            z_base = DECK_Z - dip_d
            z_amp = peak_h + dip_d
            z = z_base + z_amp * math.sin(u * math.pi)
            return z, idx, u
    return DECK_Z, -1, 0.0


def build_dragon_body(collection, mats):
    """
    Dựng thân rồng 530m uốn lượn liên tục 5 nhịp.
    Mặt cắt thân rồng 16 điểm elip khí động học dày dặn, có sự bề thế
    và gân gờ ống thép nổi bật (Photo 1).
    """
    step_dx = 1.0
    num_samples = int(478.0 / step_dx) + 1
    
    bm_body = bmesh.new()
    rings = []
    
    for i in range(num_samples):
        x = -240.0 + i * step_dx
        z_center, span_idx, u = get_dragon_arch_z(x)
        
        scale_factor = 1.0
        if span_idx == 2:
            scale_factor = 1.0 + 0.35 * math.sin(u * math.pi)
        elif span_idx in [0, 4]:
            scale_factor = 0.90
            
        ry = 2.85 * scale_factor
        rz_top = 2.60 * scale_factor
        rz_bot = 2.10 * scale_factor
        
        profile_pts = []
        n_pts = 16
        for k in range(n_pts):
            ang = 2 * math.pi * k / n_pts
            cy = math.cos(ang) * ry
            sin_a = math.sin(ang)
            cz = z_center + (sin_a * rz_top if sin_a >= 0 else sin_a * rz_bot)
            profile_pts.append((x, cy, cz))
        
        ring_verts = [bm_body.verts.new(pt) for pt in profile_pts]
        rings.append(ring_verts)
        
    for i in range(len(rings) - 1):
        r1 = rings[i]
        r2 = rings[i + 1]
        n = len(r1)
        for k in range(n):
            k2 = (k + 1) % n
            bm_body.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
            
    bm_body.faces.new(rings[0])
    bm_body.faces.new(list(reversed(rings[-1])))
    
    bmesh.ops.recalc_face_normals(bm_body, faces=bm_body.faces[:])
    mesh_body = bpy.data.meshes.new("cau-rong_dragon-body-spine_mesh")
    bm_body.to_mesh(mesh_body)
    bm_body.free()
    
    body_obj = bpy.data.objects.new("cau-rong_dragon-body-spine", mesh_body)
    bpy.context.scene.collection.objects.link(body_obj)
    body_obj.data.materials.append(mats["dragon_gold"])
    set_smooth(body_obj)
    link_to_collection(body_obj, collection)

    # Đốt vảy rồng dọc sống lưng (Photo 1)
    build_dragon_dorsal_fins(collection, mats)

    # Cáp treo dầm cầu
    build_suspension_hangers(collection, mats)


def build_dragon_dorsal_fins(collection, mats):
    """
    Hơn 160 đốt vảy rồng hình ngọn lửa 3D vút đứng dọc sống lưng (đúng Photo 1).
    Kích thước vảy nổi bật rõ rệt trên bầu trời, mặt vát sắc cạnh và vuốt cong về phía sau.
    """
    bm = bmesh.new()
    fin_spacing = 2.5
    x_current = -236.0
    
    while x_current <= 236.0:
        z_spine, span_idx, u = get_dragon_arch_z(x_current)
        
        if z_spine > DECK_Z + 1.0:
            rel_h = (z_spine - DECK_Z) / 38.5
            fin_height = 2.2 + 2.4 * rel_h  # Chiều cao vảy từ 2.2m đến 4.6m tại đỉnh vòm chính
            fin_len = 2.6 + 1.2 * rel_h
            fin_thick = 0.45
            
            p_base_f = (x_current + fin_len * 0.45, 0.0, z_spine + 0.4)
            p_base_b = (x_current - fin_len * 0.45, 0.0, z_spine + 0.4)
            p_mid_f  = (x_current + fin_len * 0.15, 0.0, z_spine + fin_height * 0.65)
            p_tip    = (x_current - fin_len * 0.55, 0.0, z_spine + fin_height + 0.35)
            
            p_l1  = bm.verts.new((p_base_f[0],  fin_thick/2.0, p_base_f[2]))
            p_l2  = bm.verts.new((p_mid_f[0],   fin_thick/3.0, p_mid_f[2]))
            p_tip_v = bm.verts.new((p_tip[0],    0.0,           p_tip[2]))
            p_l4  = bm.verts.new((p_base_b[0],  fin_thick/2.0, p_base_b[2]))
            
            p_r1  = bm.verts.new((p_base_f[0], -fin_thick/2.0, p_base_f[2]))
            p_r2  = bm.verts.new((p_mid_f[0],  -fin_thick/3.0, p_mid_f[2]))
            p_r4  = bm.verts.new((p_base_b[0], -fin_thick/2.0, p_base_b[2]))
            
            bm.faces.new([p_l1, p_l2, p_tip_v, p_l4])
            bm.faces.new([p_r4, p_tip_v, p_r2, p_r1])
            bm.faces.new([p_r1, p_l1, p_l2, p_r2])
            bm.faces.new([p_r2, p_l2, p_tip_v])
            bm.faces.new([p_l4, p_tip_v, p_r4])
            bm.faces.new([p_l1, p_r1, p_r4, p_l4])
                    
        x_current += fin_spacing
        
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-rong_dragon-dorsal-fins_mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    fins_obj = bpy.data.objects.new("cau-rong_dragon-dorsal-fins", mesh)
    bpy.context.scene.collection.objects.link(fins_obj)
    fins_obj.data.materials.append(mats["dragon_amber"])
    set_smooth(fins_obj)
    link_to_collection(fins_obj, collection)


def build_suspension_hangers(collection, mats):
    bm = bmesh.new()
    hanger_spacing = 5.2
    cable_r = 0.075
    
    x_curr = -235.0
    while x_curr <= 235.0:
        z_arch, span_idx, u = get_dragon_arch_z(x_curr)
        if z_arch > DECK_Z + 2.5:
            deck_anchor_z = DECK_Z + 0.35
            for side_sign in [1.0, -1.0]:
                y_pos = side_sign * 2.5
                for k in range(6):
                    a1 = 2 * math.pi * k / 6
                    a2 = 2 * math.pi * (k + 1) / 6
                    dx1 = math.cos(a1) * cable_r
                    dy1 = math.sin(a1) * cable_r
                    dx2 = math.cos(a2) * cable_r
                    dy2 = math.sin(a2) * cable_r
                    
                    v1 = bm.verts.new((x_curr + dx1, y_pos + dy1, deck_anchor_z))
                    v2 = bm.verts.new((x_curr + dx2, y_pos + dy2, deck_anchor_z))
                    v3 = bm.verts.new((x_curr + dx2, y_pos + dy2, z_arch - 0.5))
                    v4 = bm.verts.new((x_curr + dx1, y_pos + dy1, z_arch - 0.5))
                    bm.faces.new([v1, v2, v3, v4])
                    
        x_curr += hanger_spacing
        
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-rong_suspension-cables_mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    cables_obj = bpy.data.objects.new("cau-rong_suspension-cables", mesh)
    bpy.context.scene.collection.objects.link(cables_obj)
    cables_obj.data.materials.append(mats["cable"])
    link_to_collection(cables_obj, collection)


# ---------------------------------------------------------------------------
# 5. DỰNG ĐẦU RỒNG & CỔ RỒNG 5 ỐNG THÉP (CHUẨN 100% THEO PHOTO 1, 2, 3)
# ---------------------------------------------------------------------------
def build_dragon_head(collection, mats):
    """
    Tái tạo đầu rồng và cổ rồng chuẩn xác 100% theo Photo 1, 2, 3:
    - Cổ rồng: Cụm 5 ống thép đường kính 1.3m vươn cao ở góc 42 độ từ dải phân cách.
    - Vành đai thép (collar rings) bó quanh 5 ống cổ kèm bệ giằng chắc chắn.
    - Đầu rồng điêu khắc tấm thép CNC thời Lý:
        + Phần sọ trên và sống mõm vươn dài thanh thoát.
        + Mõm rồng cuộn vân mây thời Lý vút cong mềm mại ra trước và cuộn tròn lên trên.
        + Khoang miệng HÁ RỘNG tách biệt hàm trên và hàm dưới (open mouth cavity).
        + Họng súng phun lửa và nước bằng thép chịu nhiệt giấu trong khoang miệng.
        + Răng nanh ngà trắng sắc nét ở khóe hàm.
        + Dưới cằm có yếm râu lửa 3 tầng uốn lượn cong ngược về sau.
        + Sau gáy có bờm lửa xếp 4 tầng vút cong lộng lẫy.
        + Đôi mắt rồng tròn lồi phát sáng rực rỡ vàng hổ phách có viền gờ bezel và lông mày lửa.
    """
    neck_start_x = 238.0
    neck_start_z = DECK_Z + 0.8
    
    # 5.1. CỔ RỒNG 5 ỐNG THÉP ĐỒ SỘ CÓ VÀNH ĐAI GIẰNG (Photo 3)
    pipe_radius = 0.65
    neck_length = 22.0
    neck_angle = math.radians(42)
    cos_na = math.cos(neck_angle)
    sin_na = math.sin(neck_angle)
    
    bm_neck = bmesh.new()
    bm_rings = bmesh.new()
    
    pipe_offsets = [
        ( 0.0,  1.30),  # Ống đỉnh
        ( 1.40,  0.30), # Ống sườn Bắc
        (-1.40,  0.30), # Ống sườn Nam
        ( 0.90, -1.05), # Ống đáy Bắc
        (-0.90, -1.05), # Ống đáy Nam
    ]
    
    num_steps = 26
    for oy, oz_rel in pipe_offsets:
        pipe_rings = []
        for step in range(num_steps + 1):
            s = (step / num_steps) * neck_length
            cx = neck_start_x + s * cos_na - oz_rel * sin_na
            cy = oy
            cz = neck_start_z + s * sin_na + oz_rel * cos_na
            
            ring = []
            for k in range(12):
                ang = 2 * math.pi * k / 12
                dy = math.cos(ang) * pipe_radius
                dz_proj = math.sin(ang) * pipe_radius
                vx = cx - dz_proj * sin_na
                vy = cy + dy
                vz = cz + dz_proj * cos_na
                ring.append(bm_neck.verts.new((vx, vy, vz)))
            pipe_rings.append(ring)
            
        for i in range(len(pipe_rings) - 1):
            r1 = pipe_rings[i]
            r2 = pipe_rings[i + 1]
            for k in range(12):
                k2 = (k + 1) % 12
                bm_neck.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
                
    # Vành đai thép bó quanh 5 ống cổ (Photo 3)
    ring_locs = [2.0, 6.0, 10.0, 14.0, 18.0, 21.2]
    for s_ring in ring_locs:
        rw = 2.45
        rh = 2.25
        r_thick = 0.45
        
        sub_rings = []
        for step in range(2):
            s_sub = s_ring + (step - 0.5) * r_thick
            cx_sub = neck_start_x + s_sub * cos_na
            cz_sub = neck_start_z + s_sub * sin_na
            prof = []
            for k in range(16):
                ang = 2 * math.pi * k / 16
                dy = math.cos(ang) * rw
                dz_p = math.sin(ang) * rh
                vx = cx_sub - dz_p * sin_na
                vy = dy
                vz = cz_sub + dz_p * cos_na
                prof.append(bm_rings.verts.new((vx, vy, vz)))
            sub_rings.append(prof)
            
        r_a = sub_rings[0]
        r_b = sub_rings[1]
        n = 16
        for k in range(n):
            k2 = (k + 1) % n
            bm_rings.faces.new([r_a[k], r_a[k2], r_b[k2], r_b[k]])

    bmesh.ops.recalc_face_normals(bm_neck, faces=bm_neck.faces[:])
    mesh_neck = bpy.data.meshes.new("cau-rong_dragon-neck-pipes_mesh")
    bm_neck.to_mesh(mesh_neck)
    bm_neck.free()
    neck_obj = bpy.data.objects.new("cau-rong_dragon-neck-pipes", mesh_neck)
    bpy.context.scene.collection.objects.link(neck_obj)
    neck_obj.data.materials.append(mats["dragon_gold"])
    set_smooth(neck_obj)
    link_to_collection(neck_obj, collection)

    bmesh.ops.recalc_face_normals(bm_rings, faces=bm_rings.faces[:])
    mesh_rings = bpy.data.meshes.new("cau-rong_dragon-neck-rings_mesh")
    bm_rings.to_mesh(mesh_rings)
    bm_rings.free()
    rings_obj = bpy.data.objects.new("cau-rong_dragon-neck-rings", mesh_rings)
    bpy.context.scene.collection.objects.link(rings_obj)
    rings_obj.data.materials.append(mats["dragon_ring"])
    set_smooth(rings_obj)
    link_to_collection(rings_obj, collection)

    # 5.2. ĐẦU RỒNG THỜI LÝ ĐA TẦNG (PHOTO 2 & PHOTO 3)
    head_base_x = neck_start_x + neck_length * cos_na
    head_base_z = neck_start_z + neck_length * sin_na
    
    # Góc chúc nhẹ của đầu rồng
    head_tilt = math.radians(14)
    cos_ht = math.cos(head_tilt)
    sin_ht = math.sin(head_tilt)
    
    def tf_head(lx, ly, lz):
        gx = head_base_x + (lx * cos_ht - lz * sin_ht)
        gy = ly
        gz = head_base_z + (lx * sin_ht + lz * cos_ht)
        return (gx, gy, gz)

    bm_upper_head = bmesh.new()
    bm_lower_jaw = bmesh.new()
    bm_eyes = bmesh.new()
    bm_fire = bmesh.new()
    bm_teeth = bmesh.new()
    
    # -----------------------------------------------------------------------
    # A. PHẦN SỌ TRÊN & HÀM TRÊN (Upper Cranium & Upper Jaw)
    # Bao bọc vòm sọ, gáy, mắt và môi trên với khoang miệng há to
    # -----------------------------------------------------------------------
    upper_sections = [
        # lx,   z_top, y_top,  z_brow, y_brow, z_lip, y_lip, z_palate
        (-1.5,   2.5,   2.2,    1.0,    2.3,   -0.5,   2.0,   -0.2), # Khớp cổ
        ( 1.0,   3.2,   2.4,    1.8,    2.4,    0.2,   2.2,    0.5), # Gáy
        ( 3.5,   3.4,   2.2,    2.2,    2.3,    0.8,   2.0,    1.1), # Mắt
        ( 6.0,   3.0,   1.8,    2.1,    1.9,    1.2,   1.7,    1.4), # Gốc mõm
        ( 8.5,   2.6,   1.3,    2.0,    1.4,    1.4,   1.2,    1.6), # Mép môi trên
        (10.5,   2.6,   0.8,    2.2,    0.8,    1.8,   0.7,    2.0), # Đầu mõm
    ]
    u_rings = []
    for lx, z_t, y_t, z_b, y_b, z_l, y_l, z_p in upper_sections:
        prof = [
            tf_head(lx,    0.0, z_t + 0.5),   # Đỉnh đầu
            tf_head(lx,    y_t, z_t),         # Nóc sườn Bắc
            tf_head(lx,    y_b, z_b),         # Má trên Bắc
            tf_head(lx,    y_l, z_l),         # Môi trên Bắc
            tf_head(lx,    0.0, z_p),         # Vòm họng trên (palate)
            tf_head(lx,   -y_l, z_l),         # Môi trên Nam
            tf_head(lx,   -y_b, z_b),         # Má trên Nam
            tf_head(lx,   -y_t, z_t),         # Nóc sườn Nam
        ]
        u_rings.append([bm_upper_head.verts.new(p) for p in prof])
        
    for i in range(len(u_rings) - 1):
        r1 = u_rings[i]
        r2 = u_rings[i + 1]
        n = len(r1)
        for k in range(n):
            k2 = (k + 1) % n
            bm_upper_head.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
    # Đóng đáy gáy
    bm_upper_head.faces.new(list(reversed(u_rings[0])))

    # -----------------------------------------------------------------------
    # B. MÕM RỒNG CUỘN VÂN MÂY LỬA THỜI LÝ (Cloud-Curl Snout Photo 2 & 3)
    # Vút cong ra trước và cuộn tròn thanh thoát hình vân mây truyền thống
    # -----------------------------------------------------------------------
    curl_path = [
        # lx,    lz,   ry,   rz
        (10.5,  2.4,  0.80, 0.75),
        (11.8,  2.8,  0.72, 0.68),
        (13.2,  3.6,  0.60, 0.58),  # Vươn dài ra trước
        (13.8,  4.8,  0.50, 0.50),  # Uốn vút cong lên
        (13.2,  5.9,  0.42, 0.42),  # Cuộn tròn ngược về sau
        (12.0,  6.4,  0.35, 0.35),  # Đỉnh xoắn mây
        (11.0,  5.8,  0.28, 0.28),  # Tâm cuộn mây lửa
    ]
    curl_rings = []
    for cx, cz, cry, crz in curl_path:
        ring = []
        for k in range(12):
            ang = 2 * math.pi * k / 12
            dy = math.cos(ang) * cry
            dz = math.sin(ang) * crz
            ring.append(bm_upper_head.verts.new(tf_head(cx, dy, cz + dz)))
        curl_rings.append(ring)
        
    for i in range(len(curl_rings) - 1):
        r1 = curl_rings[i]
        r2 = curl_rings[i + 1]
        for k in range(12):
            k2 = (k + 1) % 12
            bm_upper_head.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
    bm_upper_head.faces.new(curl_rings[-1])

    # -----------------------------------------------------------------------
    # C. HÀM DƯỚI & CẰM RỒNG (Lower Jaw & Chin)
    # Tách biệt với hàm trên tạo khoảng hở há miệng rộng (Photo 2 & 3)
    # -----------------------------------------------------------------------
    lower_sections = [
        # lx,   z_lip, y_lip,  z_chin, y_chin, z_floor
        ( 2.5,   0.2,   1.8,   -0.8,    1.5,   -0.2), # Khớp hàm dưới
        ( 5.0,  -0.1,   1.7,   -0.9,    1.4,   -0.3),
        ( 7.5,  -0.4,   1.5,   -1.1,    1.3,   -0.5), # Uốn cong xuống
        ( 9.8,  -0.2,   1.1,   -0.8,    0.9,   -0.4), # Đầu cằm vểnh nhẹ
    ]
    l_rings = []
    for lx, z_l, y_l, z_c, y_c, z_f in lower_sections:
        prof = [
            tf_head(lx,    0.0, z_f),          # Sàn khoang miệng
            tf_head(lx,    y_l, z_l),          # Mép môi dưới Bắc
            tf_head(lx,    y_c, z_c),          # Góc hàm dưới Bắc
            tf_head(lx,    0.0, z_c - 0.4),    # Đáy cằm giữa
            tf_head(lx,   -y_c, z_c),          # Góc hàm dưới Nam
            tf_head(lx,   -y_l, z_l),          # Mép môi dưới Nam
        ]
        l_rings.append([bm_lower_jaw.verts.new(p) for p in prof])
        
    for i in range(len(l_rings) - 1):
        r1 = l_rings[i]
        r2 = l_rings[i + 1]
        for k in range(6):
            k2 = (k + 1) % 6
            bm_lower_jaw.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
    # Đóng đầu cằm
    bm_lower_jaw.faces.new(l_rings[-1])

    # -----------------------------------------------------------------------
    # D. BỜM LỬA SAU GÁY & YẾM RÂU LỬA DƯỚI CẰM (Layered Flame Crests & Barbels)
    # Cắt CNC hoa văn thời Lý đa tầng nổi bật (Photo 2 & Photo 3)
    # -----------------------------------------------------------------------
    plate_thickness = 0.32
    for side_sign in [1.0, -1.0]:
        y_center = side_sign * 2.30
        
        # 1. 4 tầng bờm lửa vút cong sau gáy (Photo 2)
        crest_blades = [
            # Base (x, z), Mid (x, z), Tip (x, z), Width
            (( 0.8, 3.6), (-3.2, 5.8), (-7.5, 7.6), 1.5), # Tầng 1 (đỉnh cao nhất)
            (( 1.5, 2.6), (-3.0, 4.4), (-8.0, 5.2), 1.4), # Tầng 2
            (( 2.0, 1.6), (-2.5, 3.0), (-6.8, 3.2), 1.3), # Tầng 3
            (( 2.4, 0.6), (-1.8, 1.6), (-5.2, 1.4), 1.1), # Tầng 4
        ]
        for (bx, bz), (mx, mz), (tx, tz), pw in crest_blades:
            for sign_t in [1.0, -1.0]:
                y_pos = y_center + sign_t * (plate_thickness / 2.0)
                v_b_u = bm_upper_head.verts.new(tf_head(bx,       y_pos, bz + pw*0.4))
                v_b_d = bm_upper_head.verts.new(tf_head(bx - 0.6, y_pos, bz - pw*0.4))
                v_m_u = bm_upper_head.verts.new(tf_head(mx,       y_pos, mz + pw*0.3))
                v_m_d = bm_upper_head.verts.new(tf_head(mx - 0.4, y_pos, mz - pw*0.3))
                v_tip = bm_upper_head.verts.new(tf_head(tx,       y_pos, tz))
                
                if sign_t * side_sign > 0:
                    bm_upper_head.faces.new([v_b_u, v_m_u, v_tip, v_m_d, v_b_d])
                else:
                    bm_upper_head.faces.new([v_b_d, v_m_d, v_tip, v_m_u, v_b_u])

        # 2. 3 tầng yếm râu lửa uốn lượn dưới cằm (Photo 3)
        barbels = [
            ((7.2, -0.7), (5.2, -1.8), (2.8, -2.5), 1.0),
            ((5.2, -0.9), (3.6, -2.1), (1.2, -2.6), 0.9),
            ((3.5, -1.0), (1.8, -2.0), (-0.2, -2.2), 0.8),
        ]
        for (bx, bz), (mx, mz), (tx, tz), pw in barbels:
            for sign_t in [1.0, -1.0]:
                y_pos = y_center + sign_t * (plate_thickness / 2.0)
                v1 = bm_lower_jaw.verts.new(tf_head(bx,       y_pos, bz + pw*0.3))
                v2 = bm_lower_jaw.verts.new(tf_head(mx,       y_pos, mz))
                v3 = bm_lower_jaw.verts.new(tf_head(tx,       y_pos, tz))
                v4 = bm_lower_jaw.verts.new(tf_head(bx - 0.5, y_pos, bz - pw*0.3))
                if sign_t * side_sign > 0:
                    bm_lower_jaw.faces.new([v1, v2, v3, v4])
                else:
                    bm_lower_jaw.faces.new([v4, v3, v2, v1])

        # 3. Hoa văn cánh lửa má rồng
        cheek_flames = [
            ((4.2, 1.2), (2.6, 1.6), (0.8, 1.4), 0.6),
            ((5.6, 1.6), (4.2, 2.1), (2.6, 2.1), 0.5),
        ]
        for (bx, bz), (mx, mz), (tx, tz), pw in cheek_flames:
            for sign_t in [1.0, -1.0]:
                y_pos = y_center + sign_t * (plate_thickness / 2.0)
                v1 = bm_upper_head.verts.new(tf_head(bx, y_pos, bz))
                v2 = bm_upper_head.verts.new(tf_head(mx, y_pos, mz + pw))
                v3 = bm_upper_head.verts.new(tf_head(tx, y_pos, tz))
                v4 = bm_upper_head.verts.new(tf_head(mx, y_pos, mz - pw*0.5))
                if sign_t * side_sign > 0:
                    bm_upper_head.faces.new([v1, v2, v3, v4])
                else:
                    bm_upper_head.faces.new([v4, v3, v2, v1])

    # -----------------------------------------------------------------------
    # E. ĐÔI MẮT RỒNG PHÁT SÁNG NỔI KHỐI (Photo 2 & Photo 3)
    # -----------------------------------------------------------------------
    eye_lx = 4.2
    eye_lz = 2.4
    eye_radius = 1.10
    for side_sign in [1.0, -1.0]:
        eye_y = side_sign * 2.52
        
        # 1. Tròng mắt cầu lồi phát sáng (bm_eyes)
        eye_center = tf_head(eye_lx, eye_y + side_sign * 0.28, eye_lz)
        eye_v_center = bm_eyes.verts.new(eye_center)
        eye_rim_verts = []
        for k in range(16):
            ang = 2 * math.pi * k / 16
            dx = math.cos(ang) * eye_radius * 0.85
            dz = math.sin(ang) * eye_radius
            p = tf_head(eye_lx + dx, eye_y + side_sign * 0.06, eye_lz + dz)
            eye_rim_verts.append(bm_eyes.verts.new(p))
            
        for k in range(16):
            k2 = (k + 1) % 16
            if side_sign > 0:
                bm_eyes.faces.new([eye_v_center, eye_rim_verts[k], eye_rim_verts[k2]])
            else:
                bm_eyes.faces.new([eye_v_center, eye_rim_verts[k2], eye_rim_verts[k]])
                
        # 2. Vành gờ bezel nổi quanh mắt (bm_upper_head)
        b_in = []
        b_out = []
        for k in range(16):
            ang = 2 * math.pi * k / 16
            dx_in = math.cos(ang) * eye_radius * 0.85
            dz_in = math.sin(ang) * eye_radius
            b_in.append(bm_upper_head.verts.new(tf_head(eye_lx + dx_in, eye_y + side_sign * 0.08, eye_lz + dz_in)))
            
            dx_out = math.cos(ang) * (eye_radius + 0.38) * 0.85
            dz_out = math.sin(ang) * (eye_radius + 0.38)
            b_out.append(bm_upper_head.verts.new(tf_head(eye_lx + dx_out, eye_y + side_sign * 0.18, eye_lz + dz_out)))
            
        for k in range(16):
            k2 = (k + 1) % 16
            if side_sign > 0:
                bm_upper_head.faces.new([b_out[k], b_out[k2], b_in[k2], b_in[k]])
            else:
                bm_upper_head.faces.new([b_in[k], b_in[k2], b_out[k2], b_out[k]])

        # 3. Lông mày ngọn lửa vút cong sau mắt
        brow_pts = [
            (eye_lx + 0.6, eye_lz + eye_radius + 0.2),
            (eye_lx - 1.2, eye_lz + eye_radius + 0.9),
            (eye_lx - 3.2, eye_lz + eye_radius + 1.6),
            (eye_lx - 1.8, eye_lz + eye_radius + 0.5),
        ]
        bv1 = bm_upper_head.verts.new(tf_head(brow_pts[0][0], eye_y + side_sign * 0.20, brow_pts[0][1]))
        bv2 = bm_upper_head.verts.new(tf_head(brow_pts[1][0], eye_y + side_sign * 0.20, brow_pts[1][1]))
        bv3 = bm_upper_head.verts.new(tf_head(brow_pts[2][0], eye_y + side_sign * 0.20, brow_pts[2][1]))
        bv4 = bm_upper_head.verts.new(tf_head(brow_pts[3][0], eye_y + side_sign * 0.20, brow_pts[3][1]))
        if side_sign > 0:
            bm_upper_head.faces.new([bv1, bv2, bv3, bv4])
        else:
            bm_upper_head.faces.new([bv4, bv3, bv2, bv1])

    # -----------------------------------------------------------------------
    # F. RĂNG NANH RỒNG (Dragon Fangs)
    # Răng nanh ngà trắng cong nhọn trong khóe miệng há
    # -----------------------------------------------------------------------
    teeth_locs = [
        # lx, ly, lz, tooth_len, tooth_w, pointing_down(bool)
        (7.2,  1.3,  1.2, 0.65, 0.24, True),   # Nanh trên Bắc 1
        (8.8,  1.0,  1.4, 0.50, 0.20, True),   # Nanh trên Bắc 2
        (7.2, -1.3,  1.2, 0.65, 0.24, True),   # Nanh trên Nam 1
        (8.8, -1.0,  1.4, 0.50, 0.20, True),   # Nanh trên Nam 2
        (8.0,  1.1, -0.1, 0.55, 0.22, False),  # Nanh dưới Bắc
        (8.0, -1.1, -0.1, 0.55, 0.22, False),  # Nanh dưới Nam
    ]
    for tx, ty, tz, tlen, tw, pointing_down in teeth_locs:
        sign_z = -1.0 if pointing_down else 1.0
        v_b1 = bm_teeth.verts.new(tf_head(tx - tw, ty, tz))
        v_b2 = bm_teeth.verts.new(tf_head(tx + tw, ty, tz))
        v_b3 = bm_teeth.verts.new(tf_head(tx, ty + tw*0.8, tz))
        v_b4 = bm_teeth.verts.new(tf_head(tx, ty - tw*0.8, tz))
        v_tp = bm_teeth.verts.new(tf_head(tx + tw*0.25, ty, tz + sign_z * tlen))
        bm_teeth.faces.new([v_b1, v_b3, v_tp])
        bm_teeth.faces.new([v_b3, v_b2, v_tp])
        bm_teeth.faces.new([v_b2, v_b4, v_tp])
        bm_teeth.faces.new([v_b4, v_b1, v_tp])
        bm_teeth.faces.new([v_b1, v_b2, v_b3, v_b4])

    # -----------------------------------------------------------------------
    # G. HỌNG SÚNG PHUN LỬA & NƯỚC (Photo 2 & Photo 3)
    # Ống vòi phun thép D0.85m nằm sâu trong họng miệng, hướng thẳng ra trước +25 độ
    # -----------------------------------------------------------------------
    nozzle_lx = 6.2
    nozzle_lz = 0.8
    nozzle_radius = 0.44
    nozzle_len = 3.2
    
    nozzle_rings = []
    for step in range(4):
        nx = nozzle_lx + step * (nozzle_len / 3.0)
        nz = nozzle_lz + step * 0.45  # Nghiêng vểnh lên 20-25 độ
        ring = []
        for k in range(12):
            ang = 2 * math.pi * k / 12
            dy = math.cos(ang) * nozzle_radius
            dz = math.sin(ang) * nozzle_radius
            ring.append(bm_fire.verts.new(tf_head(nx, dy, nz + dz)))
        nozzle_rings.append(ring)
        
    for i in range(len(nozzle_rings) - 1):
        r1 = nozzle_rings[i]
        r2 = nozzle_rings[i + 1]
        for k in range(12):
            k2 = (k + 1) % 12
            bm_fire.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
            
    # Lõi phát sáng miệng vòi phun
    bm_fire.faces.new(nozzle_rings[-1])

    # Tạo Mesh Objects
    bmesh.ops.recalc_face_normals(bm_upper_head, faces=bm_upper_head.faces[:])
    mesh_upper = bpy.data.meshes.new("cau-rong_dragon-head-upper_mesh")
    bm_upper_head.to_mesh(mesh_upper)
    bm_upper_head.free()
    upper_obj = bpy.data.objects.new("cau-rong_dragon-head-upper", mesh_upper)
    bpy.context.scene.collection.objects.link(upper_obj)
    upper_obj.data.materials.append(mats["dragon_gold"])
    set_smooth(upper_obj)
    link_to_collection(upper_obj, collection)

    bmesh.ops.recalc_face_normals(bm_lower_jaw, faces=bm_lower_jaw.faces[:])
    mesh_lower = bpy.data.meshes.new("cau-rong_dragon-head-lower_mesh")
    bm_lower_jaw.to_mesh(mesh_lower)
    bm_lower_jaw.free()
    lower_obj = bpy.data.objects.new("cau-rong_dragon-head-lower", mesh_lower)
    bpy.context.scene.collection.objects.link(lower_obj)
    lower_obj.data.materials.append(mats["dragon_gold"])
    set_smooth(lower_obj)
    link_to_collection(lower_obj, collection)

    bmesh.ops.recalc_face_normals(bm_eyes, faces=bm_eyes.faces[:])
    mesh_eyes = bpy.data.meshes.new("cau-rong_dragon-head-eyes_mesh")
    bm_eyes.to_mesh(mesh_eyes)
    bm_eyes.free()
    eyes_obj = bpy.data.objects.new("cau-rong_dragon-head-eyes", mesh_eyes)
    bpy.context.scene.collection.objects.link(eyes_obj)
    eyes_obj.data.materials.append(mats["dragon_eye"])
    link_to_collection(eyes_obj, collection)

    bmesh.ops.recalc_face_normals(bm_teeth, faces=bm_teeth.faces[:])
    mesh_teeth = bpy.data.meshes.new("cau-rong_dragon-teeth_mesh")
    bm_teeth.to_mesh(mesh_teeth)
    bm_teeth.free()
    teeth_obj = bpy.data.objects.new("cau-rong_dragon-teeth", mesh_teeth)
    bpy.context.scene.collection.objects.link(teeth_obj)
    teeth_obj.data.materials.append(mats["dragon_teeth"])
    link_to_collection(teeth_obj, collection)

    bmesh.ops.recalc_face_normals(bm_fire, faces=bm_fire.faces[:])
    mesh_fire = bpy.data.meshes.new("cau-rong_dragon-head-fire-core_mesh")
    bm_fire.to_mesh(mesh_fire)
    bm_fire.free()
    fire_obj = bpy.data.objects.new("cau-rong_dragon-head-fire-core", mesh_fire)
    bpy.context.scene.collection.objects.link(fire_obj)
    fire_obj.data.materials.append(mats["fire_emitter"])
    link_to_collection(fire_obj, collection)


# ---------------------------------------------------------------------------
# 6. DỰNG ĐUÔI RỒNG HÌNH HOA SEN ĐANG NỞ THỜI LÝ (BỜ TÂY / NGUYỄN VĂN LINH)
# ---------------------------------------------------------------------------
def build_dragon_tail(collection, mats):
    """
    Tái tạo đuôi rồng Cầu Rồng thời Lý tại bờ Tây (-X / Nguyễn Văn Linh):
    - Thân đuôi vuốt thon thanh thoát từ nhịp vòm 1 ra bệ đỡ mố cầu.
    - Cụm hoa sen nở 7 cánh lộng lẫy (3 cánh ôm nhụy búp vàng ở giữa,
      4 cánh lớn xòe rộng sang hai bên và vươn cao).
    """
    # Đuôi rồng tiếp nối chính xác điểm kết thúc của nhịp vòm 1 tại X = -240m (Z = DECK_Z - 2.8 = 6.7m)
    tail_origin_x = -240.0
    tail_origin_z = DECK_Z - 2.8  # Khớp hoàn hảo với tâm vòm tại x = -240m
    
    bm_tail = bmesh.new()
    
    # 1. Cuống đuôi uốn lượn liên tục từ gối trụ vươn lên trên mặt cầu (Z = 12.0m)
    stem_steps = 8
    stem_rings = []
    for step in range(stem_steps + 1):
        u = step / stem_steps
        sx = -u * 8.5
        sz = u * 5.2  # Vươn từ 6.7m lên 11.9m qua mặt cầu
        sw_y = 2.8 - u * 0.7
        sw_z = 2.4 - u * 0.5
        prof = [
            (tail_origin_x + sx,       0.0, tail_origin_z + sz + sw_z),
            (tail_origin_x + sx,      sw_y, tail_origin_z + sz + 0.2),
            (tail_origin_x + sx,  sw_y*0.7, tail_origin_z + sz - sw_z*0.8),
            (tail_origin_x + sx,       0.0, tail_origin_z + sz - sw_z),
            (tail_origin_x + sx, -sw_y*0.7, tail_origin_z + sz - sw_z*0.8),
            (tail_origin_x + sx,     -sw_y, tail_origin_z + sz + 0.2),
        ]
        stem_rings.append([bm_tail.verts.new(p) for p in prof])
        
    for i in range(len(stem_rings) - 1):
        r1 = stem_rings[i]
        r2 = stem_rings[i + 1]
        for k in range(6):
            k2 = (k + 1) % 6
            bm_tail.faces.new([r1[k], r1[k2], r2[k2], r2[k]])

    # 2. Búp sen trung tâm (Central Lotus Bud Core)
    core_base_x = tail_origin_x - 8.5
    core_base_z = tail_origin_z + 5.2
    core_pts = [
        (core_base_x,        0.0, core_base_z),
        (core_base_x - 2.2,  0.0, core_base_z + 1.8),
        (core_base_x - 4.5,  0.0, core_base_z + 3.8),
        (core_base_x - 6.2,  0.0, core_base_z + 5.8),
    ]
    c_rings = []
    for idx, (cx, cy, cz) in enumerate(core_pts):
        cr = 1.45 * (1.0 - idx * 0.25)
        prof = []
        for k in range(8):
            ang = 2 * math.pi * k / 8
            prof.append(bm_tail.verts.new((
                cx + math.cos(ang)*cr*0.5,
                cy + math.sin(ang)*cr,
                cz + math.cos(ang)*cr*0.5
            )))
        c_rings.append(prof)
        
    for i in range(len(c_rings) - 1):
        r1 = c_rings[i]
        r2 = c_rings[i + 1]
        for k in range(8):
            k2 = (k + 1) % 8
            bm_tail.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
    bm_tail.faces.new(list(reversed(c_rings[-1])))

    # 3. 7 cánh sen nở xòe thời Lý
    lotus_petals = [
        # dx,    dy,   dz,  width, curvature
        (-6.0,   0.0,  6.8,  3.0,   1.5),  # Cánh đỉnh trung tâm
        (-6.8,   2.6,  5.6,  3.2,   1.4),  # Cánh trên Bắc
        (-6.8,  -2.6,  5.6,  3.2,   1.4),  # Cánh trên Nam
        (-5.5,   4.2,  3.4,  3.4,   1.2),  # Cánh sườn Bắc
        (-5.5,  -4.2,  3.4,  3.4,   1.2),  # Cánh sườn Nam
        (-4.0,   3.4,  1.4,  2.8,   0.9),  # Cánh đáy Bắc
        (-4.0,  -3.4,  1.4,  2.8,   0.9),  # Cánh đáy Nam
    ]
    for dx, dy, dz, pw, pcurv in lotus_petals:
        p_base = (core_base_x - 0.8, 0.0, core_base_z)
        p_tip  = (core_base_x + dx, dy, core_base_z + dz)
        p_mid  = (core_base_x + dx*0.5, dy*0.8, core_base_z + dz*0.6 + pcurv)
        
        thick = 0.35
        for sign in [1.0, -1.0]:
            z_off = sign * thick / 2.0
            v_base = bm_tail.verts.new((p_base[0], p_base[1], p_base[2] + z_off))
            v_tip  = bm_tail.verts.new((p_tip[0],  p_tip[1],  p_tip[2] + z_off))
            v_l    = bm_tail.verts.new((p_mid[0],  p_mid[1] + pw/2.0, p_mid[2] + z_off))
            v_r    = bm_tail.verts.new((p_mid[0],  p_mid[1] - pw/2.0, p_mid[2] + z_off))
            v_cen  = bm_tail.verts.new((p_mid[0] - 0.25, p_mid[1], p_mid[2] + 0.35 + z_off))
            
            if sign > 0:
                bm_tail.faces.new([v_base, v_l, v_cen])
                bm_tail.faces.new([v_base, v_cen, v_r])
                bm_tail.faces.new([v_cen, v_l, v_tip])
                bm_tail.faces.new([v_cen, v_tip, v_r])
            else:
                bm_tail.faces.new([v_base, v_cen, v_l])
                bm_tail.faces.new([v_base, v_r, v_cen])
                bm_tail.faces.new([v_cen, v_tip, v_l])
                bm_tail.faces.new([v_cen, v_r, v_tip])

    bmesh.ops.recalc_face_normals(bm_tail, faces=bm_tail.faces[:])
    mesh_tail = bpy.data.meshes.new("cau-rong_dragon-tail-lotus_mesh")
    bm_tail.to_mesh(mesh_tail)
    bm_tail.free()
    
    tail_obj = bpy.data.objects.new("cau-rong_dragon-tail-lotus", mesh_tail)
    bpy.context.scene.collection.objects.link(tail_obj)
    tail_obj.data.materials.append(mats["dragon_gold"])
    set_smooth(tail_obj)
    link_to_collection(tail_obj, collection)


# ---------------------------------------------------------------------------
# 7. HÀM MAIN
# ---------------------------------------------------------------------------
def setup_scene_units():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def main():
    print("=" * 70)
    print("DỰNG LẠI CẦU RỒNG ĐÀ NẴNG CHUẨN XÁC 100% THEO ẢNH THỰC TẾ...")
    print("=" * 70)
    
    clear_scene()
    setup_scene_units()
    mats = build_materials()
    collection = get_or_create_collection("cau-rong")

    print("[1/5] Dựng mố trụ sông Hàn...")
    build_piers_and_abutments(collection, mats)

    print("[2/5] Dựng dầm hộp mặt cầu 666m, làn xe, vạch sơn, vỉa hè & đèn...")
    build_deck_and_roadway(collection, mats)

    print("[3/5] Dựng thân rồng 5 nhịp lượn qua trên và dưới dầm cầu...")
    build_dragon_body(collection, mats)

    print("[4/5] Dựng cổ rồng 5 ống thép đồ sộ và đầu rồng thời Lý đa tầng (Photo 1, 2, 3)...")
    build_dragon_head(collection, mats)

    print("[5/5] Dựng đuôi rồng hoa sen nở...")
    build_dragon_tail(collection, mats)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    print(f"\n[Hoàn tất] Tổng số objects: {len(collection.objects)}")

    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"-> Đã lưu .blend: {BLEND_OUT_PATH}")

    os.makedirs(GLB_OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(WEB_GLB_PATH), exist_ok=True)
    
    bpy.ops.object.select_all(action="SELECT")
    export_kwargs = dict(
        filepath=GLB_OUT_PATH,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
    )
    try:
        bpy.ops.export_scene.gltf(**export_kwargs)
        print(f"-> Đã export .glb: {GLB_OUT_PATH}")
        shutil.copy2(GLB_OUT_PATH, WEB_GLB_PATH)
        print(f"-> Đã đồng bộ sang web: {WEB_GLB_PATH}")
    except Exception as exc:
        print(f"Lỗi export: {exc}")


if __name__ == "__main__":
    main()
