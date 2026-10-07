"""
build_cau_song_han.py — Dựng mô hình 3D Cầu Sông Hàn (Đà Nẵng)
Cây cầu quay đầu tiên tại Việt Nam, kết nối quận Hải Châu và quận Sơn Trà.

Tỉ lệ chuẩn 1:1 mét thật, nối liền hoàn hảo 2 bờ sông Hàn:
  - Chiều dài toàn cầu: 630m (X: -315m đến +315m) kết nối trực tiếp vào đường Lê Duẩn (bờ Tây)
    và đường Phạm Văn Đồng (bờ Đông), không để lại bất kỳ khoảng hở nào trên mặt nước.
  - Chiều rộng: 12.9m (lòng đường 8.5m + 2 vỉa hè bộ hành 2.2m)
  - Cao độ mặt cầu: Z = 7.2m
  - Trụ tháp quay trung tâm (Central Swing Pier): Bệ tròn D=14m giữa lòng sông
  - Tháp cáp chữ A (A-frame Pylon): Cao 25.3m từ mặt cầu (Z: 7.2m -> 32.5m)
  - Nhịp quay dầm giàn thép (Swing Truss): Dài 122.8m (X: -61.4m -> +61.4m)
  - 14 nhịp dẫn dầm bê tông trên các trụ cầu chữ V (7 trụ bờ Tây, 7 trụ bờ Đông)
  - Dây văng tỏa quạt 2 tầng đối xứng
"""

import bpy
import bmesh
import math
import os
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

BLEND_OUT_PATH = os.path.join(SCRIPT_DIR, "cau-song-han.blend")
GLB_OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "exported", "cau-song-han")
GLB_OUT_PATH = os.path.join(GLB_OUT_DIR, "cau-song-han.glb")
WEB_GLB_DIR = os.path.join(PROJECT_ROOT, "web", "public", "models", "cau-song-han")
WEB_GLB_PATH = os.path.join(WEB_GLB_DIR, "cau-song-han.glb")

BRIDGE_LENGTH = 630.0
BRIDGE_HALF_LEN = BRIDGE_LENGTH / 2.0  # 315.0m (vượt qua mép bờ kè 279m, tiếp đất vững chắc vào mạng lưới phố)
BRIDGE_WIDTH = 12.9
ROAD_WIDTH = 8.5
SIDEWALK_WIDTH = 2.2
DECK_Z = 7.2
SWING_SPAN_LEN = 122.8
SWING_HALF_LEN = SWING_SPAN_LEN / 2.0  # 61.4m

# 14 trụ cầu dẫn chữ V (7 bờ Tây, 7 bờ Đông)
PIER_X_LOCATIONS = [
    -280.0, -244.0, -208.0, -172.0, -136.0, -100.0, -64.0,
      64.0,  100.0,  136.0,  172.0,  208.0,  244.0,  280.0
]


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
    # Bê tông mố trụ xám sáng (roughness cao, không bị lóa specular)
    mats["concrete"] = make_material("cau-song-han_mat-concrete", (0.76, 0.78, 0.80), metallic=0.02, roughness=0.85)
    # Trụ tháp chữ A màu trắng ngà thanh thoát
    mats["pylon"] = make_material("cau-song-han_mat-pylon", (0.90, 0.92, 0.94), metallic=0.15, roughness=0.45)
    # Dầm thép nhịp quay màu xanh lam thép đặc trưng
    mats["steel_truss"] = make_material("cau-song-han_mat-steel-truss", (0.24, 0.40, 0.52), metallic=0.75, roughness=0.35)
    # Mặt đường asphalt
    mats["road"] = make_material("cau-song-han_mat-road", (0.18, 0.19, 0.20), metallic=0.0, roughness=0.88)
    # Vạch kẻ đường vàng
    mats["road_stripe"] = make_material("cau-song-han_mat-road-stripe", (0.95, 0.82, 0.12), metallic=0.0, roughness=0.5)
    # Vỉa hè đi bộ
    mats["sidewalk"] = make_material("cau-song-han_mat-sidewalk", (0.68, 0.70, 0.72), metallic=0.0, roughness=0.75)
    # Lan can bảo vệ màu xanh ngọc biển
    mats["railing"] = make_material("cau-song-han_mat-railing", (0.12, 0.52, 0.62), metallic=0.5, roughness=0.35)
    # Cáp văng bọc polyethylen trắng
    mats["cables"] = make_material("cau-song-han_mat-cables", (0.94, 0.95, 0.98), metallic=0.2, roughness=0.3)
    # Đèn tín hiệu đỉnh tháp đỏ nhẹ nhàng
    mats["beacon"] = make_material("cau-song-han_mat-beacon", (0.9, 0.15, 0.1), emission_color=(0.9, 0.15, 0.1), emission_strength=1.0)
    return mats


# ---------------------------------------------------------------------------
# 1. TRỤ QUAY TRUNG TÂM (CENTRAL SWING PIER)
# ---------------------------------------------------------------------------
def build_central_swing_pier(collection, mats):
    bm = bmesh.new()
    
    r_base = 8.5
    z_bot = -2.0
    z_mid = 3.0
    steps = 28
    
    b_ring = []
    m_ring = []
    for i in range(steps):
        ang = 2 * math.pi * i / steps
        dx = math.cos(ang) * r_base
        dy = math.sin(ang) * r_base
        b_ring.append(bm.verts.new((dx, dy, z_bot)))
        m_ring.append(bm.verts.new((dx, dy, z_mid)))
        
    for i in range(steps):
        i2 = (i + 1) % steps
        bm.faces.new([b_ring[i], b_ring[i2], m_ring[i2], m_ring[i]])
        
    r_top = 6.8
    z_top = 6.5
    t_ring = []
    for i in range(steps):
        ang = 2 * math.pi * i / steps
        dx = math.cos(ang) * r_top
        dy = math.sin(ang) * r_top
        t_ring.append(bm.verts.new((dx, dy, z_top)))
        
    for i in range(steps):
        i2 = (i + 1) % steps
        bm.faces.new([m_ring[i], m_ring[i2], t_ring[i2], t_ring[i]])
    bm.faces.new(t_ring)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-song-han_central-pier_mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("cau-song-han_central-pier", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mats["concrete"])
    set_smooth(obj)
    link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 2. THÁP CÁP CHỮ A (A-FRAME PYLON)
# ---------------------------------------------------------------------------
def build_a_frame_pylon(collection, mats):
    bm = bmesh.new()
    
    foot_y = 5.6
    top_z = 32.5
    deck_level_z = DECK_Z
    pylon_w = 1.4
    pylon_l = 1.8
    
    for sign_y in [1.0, -1.0]:
        z_start = deck_level_z - 1.2
        y_start = sign_y * foot_y
        
        v_b1 = bm.verts.new((-pylon_l/2, y_start - pylon_w/2, z_start))
        v_b2 = bm.verts.new(( pylon_l/2, y_start - pylon_w/2, z_start))
        v_b3 = bm.verts.new(( pylon_l/2, y_start + pylon_w/2, z_start))
        v_b4 = bm.verts.new((-pylon_l/2, y_start + pylon_w/2, z_start))
        
        y_top = sign_y * 0.65
        v_t1 = bm.verts.new((-pylon_l*0.4, y_top - pylon_w*0.35, top_z))
        v_t2 = bm.verts.new(( pylon_l*0.4, y_top - pylon_w*0.35, top_z))
        v_t3 = bm.verts.new(( pylon_l*0.4, y_top + pylon_w*0.35, top_z))
        v_t4 = bm.verts.new((-pylon_l*0.4, y_top + pylon_w*0.35, top_z))
        
        bm.faces.new([v_b1, v_b2, v_t2, v_t1])
        bm.faces.new([v_b2, v_b3, v_t3, v_t2])
        bm.faces.new([v_b3, v_b4, v_t4, v_t3])
        bm.faces.new([v_b4, v_b1, v_t1, v_t4])
        
    cap_top_z = top_z + 1.8
    c1 = bm.verts.new((-pylon_l*0.45, -1.2, top_z - 0.2))
    c2 = bm.verts.new(( pylon_l*0.45, -1.2, top_z - 0.2))
    c3 = bm.verts.new(( pylon_l*0.45,  1.2, top_z - 0.2))
    c4 = bm.verts.new((-pylon_l*0.45,  1.2, top_z - 0.2))
    
    c5 = bm.verts.new((-pylon_l*0.3, -0.6, cap_top_z))
    c6 = bm.verts.new(( pylon_l*0.3, -0.6, cap_top_z))
    c7 = bm.verts.new(( pylon_l*0.3,  0.6, cap_top_z))
    c8 = bm.verts.new((-pylon_l*0.3,  0.6, cap_top_z))
    
    bm.faces.new([c1, c2, c6, c5])
    bm.faces.new([c2, c3, c7, c6])
    bm.faces.new([c3, c4, c8, c7])
    bm.faces.new([c4, c1, c5, c8])
    bm.faces.new([c5, c6, c7, c8])
    
    # Dầm giằng ngang chữ A ở độ cao Z = 19.5m
    cross_z = 19.5
    cross_h = 1.3
    cross_w = 1.2
    cr1 = bm.verts.new((-cross_w/2, -foot_y*0.45, cross_z - cross_h/2))
    cr2 = bm.verts.new(( cross_w/2, -foot_y*0.45, cross_z - cross_h/2))
    cr3 = bm.verts.new(( cross_w/2,  foot_y*0.45, cross_z - cross_h/2))
    cr4 = bm.verts.new((-cross_w/2,  foot_y*0.45, cross_z - cross_h/2))
    cr5 = bm.verts.new((-cross_w/2, -foot_y*0.45, cross_z + cross_h/2))
    cr6 = bm.verts.new(( cross_w/2, -foot_y*0.45, cross_z + cross_h/2))
    cr7 = bm.verts.new(( cross_w/2,  foot_y*0.45, cross_z + cross_h/2))
    cr8 = bm.verts.new((-cross_w/2,  foot_y*0.45, cross_z + cross_h/2))
    
    bm.faces.new([cr1, cr2, cr6, cr5])
    bm.faces.new([cr2, cr3, cr7, cr6])
    bm.faces.new([cr3, cr4, cr8, cr7])
    bm.faces.new([cr4, cr1, cr5, cr8])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-song-han_pylon_mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("cau-song-han_pylon", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mats["pylon"])
    set_smooth(obj)
    link_to_collection(obj, collection)

    # Đèn cảnh báo hàng không đỉnh tháp
    bm_b = bmesh.new()
    bmesh.ops.create_uvsphere(bm_b, u_segments=8, v_segments=6, radius=0.35)
    bmesh.ops.translate(bm_b, verts=bm_b.verts, vec=(0, 0, cap_top_z + 0.45))
    mesh_b = bpy.data.meshes.new("cau-song-han_beacon_mesh")
    bm_b.to_mesh(mesh_b)
    bm_b.free()
    obj_b = bpy.data.objects.new("cau-song-han_pylon-beacon", mesh_b)
    bpy.context.scene.collection.objects.link(obj_b)
    obj_b.data.materials.append(mats["beacon"])
    link_to_collection(obj_b, collection)


# ---------------------------------------------------------------------------
# 3. DÂY VĂNG (STAY CABLES)
# ---------------------------------------------------------------------------
def build_stay_cables(collection, mats):
    bm = bmesh.new()
    cable_r = 0.08
    steps = 6
    
    anchor_pairs = [
        (13.5, 23.0),
        (25.0, 25.2),
        (37.0, 27.4),
        (49.0, 29.5),
        (59.5, 31.2),
    ]
    
    for sign_x in [1.0, -1.0]:
        for sign_y in [1.0, -1.0]:
            y_deck = sign_y * (ROAD_WIDTH / 2.0 + 0.3)
            y_tower = sign_y * 0.75
            
            for x_dist, z_tower in anchor_pairs:
                x_deck = sign_x * x_dist
                x_tow = sign_x * 0.25
                
                p_start = (x_tow, y_tower, z_tower)
                p_end = (x_deck, y_deck, DECK_Z + 0.45)
                
                dx = p_end[0] - p_start[0]
                dy = p_end[1] - p_start[1]
                dz = p_end[2] - p_start[2]
                
                nx = -dy
                ny = dx
                nlen = math.hypot(nx, ny) or 1.0
                nx /= nlen
                ny /= nlen
                
                r1 = []
                r2 = []
                for k in range(steps):
                    ang = 2 * math.pi * k / steps
                    ox = math.cos(ang) * cable_r
                    oy = math.sin(ang) * cable_r
                    
                    r1.append(bm.verts.new((p_start[0] + ox*nx, p_start[1] + ox*ny, p_start[2] + oy)))
                    r2.append(bm.verts.new((p_end[0] + ox*nx,   p_end[1] + ox*ny,   p_end[2] + oy)))
                    
                for k in range(steps):
                    k2 = (k + 1) % steps
                    bm.faces.new([r1[k], r1[k2], r2[k2], r2[k]])
                    
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-song-han_cables_mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("cau-song-han_cables", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mats["cables"])
    link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 4. DẦM THÉP NHỊP QUAY (SWING TRUSS GIRDER)
# ---------------------------------------------------------------------------
def build_swing_truss(collection, mats):
    bm = bmesh.new()
    
    girder_depth = 2.4
    flange_w = 1.1
    web_t = 0.28
    
    for sign_y in [1.0, -1.0]:
        y_pos = sign_y * 4.6
        z_top = DECK_Z - 0.2
        z_bot = z_top - girder_depth
        
        v1 = bm.verts.new((-SWING_HALF_LEN, y_pos - flange_w/2, z_top))
        v2 = bm.verts.new(( SWING_HALF_LEN, y_pos - flange_w/2, z_top))
        v3 = bm.verts.new(( SWING_HALF_LEN, y_pos + flange_w/2, z_top))
        v4 = bm.verts.new((-SWING_HALF_LEN, y_pos + flange_w/2, z_top))
        
        v5 = bm.verts.new((-SWING_HALF_LEN, y_pos - flange_w/2, z_bot))
        v6 = bm.verts.new(( SWING_HALF_LEN, y_pos - flange_w/2, z_bot))
        v7 = bm.verts.new(( SWING_HALF_LEN, y_pos + flange_w/2, z_bot))
        v8 = bm.verts.new((-SWING_HALF_LEN, y_pos + flange_w/2, z_bot))
        
        bm.faces.new([v1, v2, v3, v4])
        bm.faces.new([v5, v8, v7, v6])
        bm.faces.new([v1, v5, v6, v2])
        bm.faces.new([v2, v6, v7, v3])
        bm.faces.new([v3, v7, v8, v4])
        bm.faces.new([v4, v8, v5, v1])
        
        num_bays = 14
        bay_w = SWING_SPAN_LEN / num_bays
        for b in range(num_bays):
            x1 = -SWING_HALF_LEN + b * bay_w
            x2 = x1 + bay_w
            tw = 0.18
            tv1 = bm.verts.new((x1 - tw, y_pos - tw, z_bot))
            tv2 = bm.verts.new((x1 + tw, y_pos - tw, z_bot))
            tv3 = bm.verts.new((x2 + tw, y_pos + tw, z_top))
            tv4 = bm.verts.new((x2 - tw, y_pos + tw, z_top))
            bm.faces.new([tv1, tv2, tv3, tv4])
            
    for step in range(25):
        x_cross = -SWING_HALF_LEN + step * (SWING_SPAN_LEN / 24.0)
        z_cross = DECK_Z - 0.2 - girder_depth * 0.75
        fb_w = 0.35
        fb_h = 0.7
        b1 = bm.verts.new((x_cross - fb_w/2, -4.6, z_cross - fb_h/2))
        b2 = bm.verts.new((x_cross + fb_w/2, -4.6, z_cross - fb_h/2))
        b3 = bm.verts.new((x_cross + fb_w/2,  4.6, z_cross - fb_h/2))
        b4 = bm.verts.new((x_cross - fb_w/2,  4.6, z_cross - fb_h/2))
        b5 = bm.verts.new((x_cross - fb_w/2, -4.6, z_cross + fb_h/2))
        b6 = bm.verts.new((x_cross + fb_w/2, -4.6, z_cross + fb_h/2))
        b7 = bm.verts.new((x_cross + fb_w/2,  4.6, z_cross + fb_h/2))
        b8 = bm.verts.new((x_cross - fb_w/2,  4.6, z_cross + fb_h/2))
        bm.faces.new([b1, b2, b6, b5])
        bm.faces.new([b2, b3, b7, b6])
        bm.faces.new([b3, b4, b8, b7])
        bm.faces.new([b4, b1, b5, b8])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new("cau-song-han_swing-truss_mesh")
    bm.to_mesh(mesh)
    bm.free()
    
    obj = bpy.data.objects.new("cau-song-han_swing-truss", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mats["steel_truss"])
    link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 5. TRỤ CẦU DẪN & DẦM BÊ TÔNG 2 ĐẦU (APPROACH PIERS & GIRDERS)
# ---------------------------------------------------------------------------
def build_approach_piers_and_girders(collection, mats):
    bm_piers = bmesh.new()
    bm_girders = bmesh.new()
    
    for px in PIER_X_LOCATIONS:
        bw = 11.5
        bl = 4.2
        v1 = bm_piers.verts.new((px - bl/2, -bw/2, -2.0))
        v2 = bm_piers.verts.new((px + bl/2, -bw/2, -2.0))
        v3 = bm_piers.verts.new((px + bl/2,  bw/2, -2.0))
        v4 = bm_piers.verts.new((px - bl/2,  bw/2, -2.0))
        v5 = bm_piers.verts.new((px - bl/2, -bw/2,  1.5))
        v6 = bm_piers.verts.new((px + bl/2, -bw/2,  1.5))
        v7 = bm_piers.verts.new((px + bl/2,  bw/2,  1.5))
        v8 = bm_piers.verts.new((px - bl/2,  bw/2,  1.5))
        bm_piers.faces.new([v1, v2, v6, v5])
        bm_piers.faces.new([v2, v3, v7, v6])
        bm_piers.faces.new([v3, v4, v8, v7])
        bm_piers.faces.new([v4, v1, v5, v8])
        bm_piers.faces.new([v5, v6, v7, v8])
        
        for sign_y in [1.0, -1.0]:
            cy = sign_y * 3.4
            cw = 2.4
            cl = 2.2
            c_top_w = 2.0
            p1 = bm_piers.verts.new((px - cl/2, cy - cw/2, 1.5))
            p2 = bm_piers.verts.new((px + cl/2, cy - cw/2, 1.5))
            p3 = bm_piers.verts.new((px + cl/2, cy + cw/2, 1.5))
            p4 = bm_piers.verts.new((px - cl/2, cy + cw/2, 1.5))
            p5 = bm_piers.verts.new((px - cl/2*0.85, cy - c_top_w/2, 5.8))
            p6 = bm_piers.verts.new((px + cl/2*0.85, cy - c_top_w/2, 5.8))
            p7 = bm_piers.verts.new((px + cl/2*0.85, cy + c_top_w/2, 5.8))
            p8 = bm_piers.verts.new((px - cl/2*0.85, cy + c_top_w/2, 5.8))
            bm_piers.faces.new([p1, p2, p6, p5])
            bm_piers.faces.new([p2, p3, p7, p6])
            bm_piers.faces.new([p3, p4, p8, p7])
            bm_piers.faces.new([p4, p1, p5, p8])
            
        cap_l = 3.2
        cap_w = 12.2
        k1 = bm_piers.verts.new((px - cap_l/2, -cap_w/2, 5.8))
        k2 = bm_piers.verts.new((px + cap_l/2, -cap_w/2, 5.8))
        k3 = bm_piers.verts.new((px + cap_l/2,  cap_w/2, 5.8))
        k4 = bm_piers.verts.new((px - cap_l/2,  cap_w/2, 5.8))
        k5 = bm_piers.verts.new((px - cap_l/2, -cap_w/2, 6.6))
        k6 = bm_piers.verts.new((px + cap_l/2, -cap_w/2, 6.6))
        k7 = bm_piers.verts.new((px + cap_l/2,  cap_w/2, 6.6))
        k8 = bm_piers.verts.new((px - cap_l/2,  cap_w/2, 6.6))
        bm_piers.faces.new([k1, k2, k6, k5])
        bm_piers.faces.new([k2, k3, k7, k6])
        bm_piers.faces.new([k3, k4, k8, k7])
        bm_piers.faces.new([k4, k1, k5, k8])
        bm_piers.faces.new([k5, k6, k7, k8])
        
    # 2. Dầm bê tông các nhịp dẫn kéo dài từ bờ Tây (-315m) đến nhịp quay và sang bờ Đông (+315m)
    approach_ranges = [
        (-BRIDGE_HALF_LEN, -SWING_HALF_LEN),
        ( SWING_HALF_LEN,  BRIDGE_HALF_LEN)
    ]
    for x_a, x_b in approach_ranges:
        g_w = 11.8
        z_t = DECK_Z - 0.15
        z_b = 6.6
        g1 = bm_girders.verts.new((x_a, -g_w/2, z_b))
        g2 = bm_girders.verts.new((x_b, -g_w/2, z_b))
        g3 = bm_girders.verts.new((x_b,  g_w/2, z_b))
        g4 = bm_girders.verts.new((x_a,  g_w/2, z_b))
        g5 = bm_girders.verts.new((x_a, -g_w/2, z_t))
        g6 = bm_girders.verts.new((x_b, -g_w/2, z_t))
        g7 = bm_girders.verts.new((x_b,  g_w/2, z_t))
        g8 = bm_girders.verts.new((x_a,  g_w/2, z_t))
        bm_girders.faces.new([g1, g2, g6, g5])
        bm_girders.faces.new([g2, g3, g7, g6])
        bm_girders.faces.new([g3, g4, g8, g7])
        bm_girders.faces.new([g4, g1, g5, g8])
        bm_girders.faces.new([g1, g4, g3, g2])

    # 3. Mố cầu 2 đầu đặt gọn gàng hoàn toàn dưới gầm cầu (X: ±309m đến ±315m)
    for sign_x in [1.0, -1.0]:
        x_outer = sign_x * BRIDGE_HALF_LEN
        x_inner = sign_x * (BRIDGE_HALF_LEN - 6.0)
        x_min_ab = min(x_inner, x_outer)
        x_max_ab = max(x_inner, x_outer)
        ab_w = 12.0  # Nằm gọn trong lòng mặt cầu 12.9m
        z_b = 0.0
        z_t = DECK_Z - 0.2
        a1 = bm_piers.verts.new((x_min_ab, -ab_w/2, z_b))
        a2 = bm_piers.verts.new((x_max_ab, -ab_w/2, z_b))
        a3 = bm_piers.verts.new((x_max_ab,  ab_w/2, z_b))
        a4 = bm_piers.verts.new((x_min_ab,  ab_w/2, z_b))
        a5 = bm_piers.verts.new((x_min_ab, -ab_w/2, z_t))
        a6 = bm_piers.verts.new((x_max_ab, -ab_w/2, z_t))
        a7 = bm_piers.verts.new((x_max_ab,  ab_w/2, z_t))
        a8 = bm_piers.verts.new((x_min_ab,  ab_w/2, z_t))
        bm_piers.faces.new([a1, a2, a6, a5])
        bm_piers.faces.new([a2, a3, a7, a6])
        bm_piers.faces.new([a3, a4, a8, a7])
        bm_piers.faces.new([a4, a1, a5, a8])
        bm_piers.faces.new([a5, a6, a7, a8])

    bmesh.ops.recalc_face_normals(bm_piers, faces=bm_piers.faces[:])
    mesh_p = bpy.data.meshes.new("cau-song-han_approach-piers_mesh")
    bm_piers.to_mesh(mesh_p)
    bm_piers.free()
    
    obj_p = bpy.data.objects.new("cau-song-han_approach-piers", mesh_p)
    bpy.context.scene.collection.objects.link(obj_p)
    obj_p.data.materials.append(mats["concrete"])
    set_smooth(obj_p)
    link_to_collection(obj_p, collection)

    bmesh.ops.recalc_face_normals(bm_girders, faces=bm_girders.faces[:])
    mesh_g = bpy.data.meshes.new("cau-song-han_approach-girders_mesh")
    bm_girders.to_mesh(mesh_g)
    bm_girders.free()
    
    obj_g = bpy.data.objects.new("cau-song-han_approach-girders", mesh_g)
    bpy.context.scene.collection.objects.link(obj_g)
    obj_g.data.materials.append(mats["concrete"])
    link_to_collection(obj_g, collection)


# ---------------------------------------------------------------------------
# 6. MẶT CẦU, VỈA HÈ & LAN CAN (ROAD DECK, SIDEWALKS & RAILINGS)
# ---------------------------------------------------------------------------
def build_deck_and_railings(collection, mats):
    bm_road = bmesh.new()
    bm_stripe = bmesh.new()
    bm_sidewalk = bmesh.new()
    bm_railing = bmesh.new()
    
    deck_z = DECK_Z
    road_half_w = ROAD_WIDTH / 2.0  # 4.25m
    sw_half_w = SIDEWALK_WIDTH      # 2.2m
    
    r1 = bm_road.verts.new((-BRIDGE_HALF_LEN, -road_half_w, deck_z))
    r2 = bm_road.verts.new(( BRIDGE_HALF_LEN, -road_half_w, deck_z))
    r3 = bm_road.verts.new(( BRIDGE_HALF_LEN,  road_half_w, deck_z))
    r4 = bm_road.verts.new((-BRIDGE_HALF_LEN,  road_half_w, deck_z))
    bm_road.faces.new([r1, r2, r3, r4])
    
    stripe_w = 0.18
    stripe_len = 5.0
    stripe_gap = 3.5
    num_stripes = int(BRIDGE_LENGTH / (stripe_len + stripe_gap))
    for s in range(num_stripes):
        sx1 = -BRIDGE_HALF_LEN + s * (stripe_len + stripe_gap)
        sx2 = sx1 + stripe_len
        if sx2 < BRIDGE_HALF_LEN:
            sv1 = bm_stripe.verts.new((sx1, -stripe_w/2, deck_z + 0.005))
            sv2 = bm_stripe.verts.new((sx2, -stripe_w/2, deck_z + 0.005))
            sv3 = bm_stripe.verts.new((sx2,  stripe_w/2, deck_z + 0.005))
            sv4 = bm_stripe.verts.new((sx1,  stripe_w/2, deck_z + 0.005))
            bm_stripe.faces.new([sv1, sv2, sv3, sv4])
            
    sw_z = deck_z + 0.25
    for sign_y in [1.0, -1.0]:
        y_inner = sign_y * road_half_w
        y_outer = sign_y * (road_half_w + sw_half_w)
        
        sw1 = bm_sidewalk.verts.new((-BRIDGE_HALF_LEN, y_inner, sw_z))
        sw2 = bm_sidewalk.verts.new(( BRIDGE_HALF_LEN, y_inner, sw_z))
        sw3 = bm_sidewalk.verts.new(( BRIDGE_HALF_LEN, y_outer, sw_z))
        sw4 = bm_sidewalk.verts.new((-BRIDGE_HALF_LEN, y_outer, sw_z))
        if sign_y > 0:
            bm_sidewalk.faces.new([sw1, sw2, sw3, sw4])
        else:
            bm_sidewalk.faces.new([sw4, sw3, sw2, sw1])
            
        k1 = bm_sidewalk.verts.new((-BRIDGE_HALF_LEN, y_inner, deck_z))
        k2 = bm_sidewalk.verts.new(( BRIDGE_HALF_LEN, y_inner, deck_z))
        if sign_y > 0:
            bm_sidewalk.faces.new([k1, k2, sw2, sw1])
        else:
            bm_sidewalk.faces.new([sw1, sw2, k2, k1])
            
        rail_y = y_outer - sign_y * 0.1
        rail_h = 1.15
        
        tr1 = bm_railing.verts.new((-BRIDGE_HALF_LEN, rail_y - 0.06, sw_z + rail_h))
        tr2 = bm_railing.verts.new(( BRIDGE_HALF_LEN, rail_y - 0.06, sw_z + rail_h))
        tr3 = bm_railing.verts.new(( BRIDGE_HALF_LEN, rail_y + 0.06, sw_z + rail_h))
        tr4 = bm_railing.verts.new((-BRIDGE_HALF_LEN, rail_y + 0.06, sw_z + rail_h))
        bm_railing.faces.new([tr1, tr2, tr3, tr4])
        
        mr1 = bm_railing.verts.new((-BRIDGE_HALF_LEN, rail_y - 0.04, sw_z + rail_h*0.5))
        mr2 = bm_railing.verts.new(( BRIDGE_HALF_LEN, rail_y - 0.04, sw_z + rail_h*0.5))
        mr3 = bm_railing.verts.new(( BRIDGE_HALF_LEN, rail_y + 0.04, sw_z + rail_h*0.5))
        mr4 = bm_railing.verts.new((-BRIDGE_HALF_LEN, rail_y + 0.04, sw_z + rail_h*0.5))
        bm_railing.faces.new([mr1, mr2, mr3, mr4])
        
        num_posts = int(BRIDGE_LENGTH / 3.0)
        for p in range(num_posts + 1):
            px = -BRIDGE_HALF_LEN + p * 3.0
            if px <= BRIDGE_HALF_LEN:
                pw = 0.08
                pv1 = bm_railing.verts.new((px - pw, rail_y - pw, sw_z))
                pv2 = bm_railing.verts.new((px + pw, rail_y - pw, sw_z))
                pv3 = bm_railing.verts.new((px + pw, rail_y + pw, sw_z))
                pv4 = bm_railing.verts.new((px - pw, rail_y + pw, sw_z))
                pv5 = bm_railing.verts.new((px - pw, rail_y - pw, sw_z + rail_h))
                pv6 = bm_railing.verts.new((px + pw, rail_y - pw, sw_z + rail_h))
                pv7 = bm_railing.verts.new((px + pw, rail_y + pw, sw_z + rail_h))
                pv8 = bm_railing.verts.new((px - pw, rail_y + pw, sw_z + rail_h))
                bm_railing.faces.new([pv1, pv2, pv6, pv5])
                bm_railing.faces.new([pv2, pv3, pv7, pv6])
                bm_railing.faces.new([pv3, pv4, pv8, pv7])
                bm_railing.faces.new([pv4, pv1, pv5, pv8])

    bmesh.ops.recalc_face_normals(bm_road, faces=bm_road.faces[:])
    mesh_r = bpy.data.meshes.new("cau-song-han_road-deck_mesh")
    bm_road.to_mesh(mesh_r)
    bm_road.free()
    obj_r = bpy.data.objects.new("cau-song-han_road-deck", mesh_r)
    bpy.context.scene.collection.objects.link(obj_r)
    obj_r.data.materials.append(mats["road"])
    link_to_collection(obj_r, collection)

    bmesh.ops.recalc_face_normals(bm_stripe, faces=bm_stripe.faces[:])
    mesh_s = bpy.data.meshes.new("cau-song-han_road-stripes_mesh")
    bm_stripe.to_mesh(mesh_s)
    bm_stripe.free()
    obj_s = bpy.data.objects.new("cau-song-han_road-stripes", mesh_s)
    bpy.context.scene.collection.objects.link(obj_s)
    obj_s.data.materials.append(mats["road_stripe"])
    link_to_collection(obj_s, collection)

    bmesh.ops.recalc_face_normals(bm_sidewalk, faces=bm_sidewalk.faces[:])
    mesh_w = bpy.data.meshes.new("cau-song-han_sidewalks_mesh")
    bm_sidewalk.to_mesh(mesh_w)
    bm_sidewalk.free()
    obj_w = bpy.data.objects.new("cau-song-han_sidewalks", mesh_w)
    bpy.context.scene.collection.objects.link(obj_w)
    obj_w.data.materials.append(mats["sidewalk"])
    link_to_collection(obj_w, collection)

    bmesh.ops.recalc_face_normals(bm_railing, faces=bm_railing.faces[:])
    mesh_rail = bpy.data.meshes.new("cau-song-han_railings_mesh")
    bm_railing.to_mesh(mesh_rail)
    bm_railing.free()
    obj_rail = bpy.data.objects.new("cau-song-han_railings", mesh_rail)
    bpy.context.scene.collection.objects.link(obj_rail)
    obj_rail.data.materials.append(mats["railing"])
    link_to_collection(obj_rail, collection)


# ---------------------------------------------------------------------------
# MAIN BUILD & EXPORT PIPELINE
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("DỰNG 3D CẦU SÔNG HÀN ĐÀ NẴNG (BLENDER 4.2 LTS) - SPAN TOÀN BỘ 2 BỜ")
    print("=" * 70)
    
    clean_scene()
    collection = get_or_create_collection("cau-song-han")
    mats = build_materials()
    
    print("1. Dựng trụ quay trung tâm...")
    build_central_swing_pier(collection, mats)
    
    print("2. Dựng tháp cáp chữ A (A-frame pylon)...")
    build_a_frame_pylon(collection, mats)
    
    print("3. Dựng chùm dây văng...")
    build_stay_cables(collection, mats)
    
    print("4. Dựng dầm thép nhịp quay...")
    build_swing_truss(collection, mats)
    
    print("5. Dựng trụ cầu dẫn & dầm bê tông (14 nhịp dẫn)...")
    build_approach_piers_and_girders(collection, mats)
    
    print("6. Dựng mặt cầu, vỉa hè & lan can (630m nối 2 bờ)...")
    build_deck_and_railings(collection, mats)
    
    os.makedirs(SCRIPT_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"-> Đã lưu .blend tại: {BLEND_OUT_PATH}")
    
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
    print("HOÀN THÀNH XÂY DỰNG CẦU SÔNG HÀN NỐI 2 BỜ 100%!")
    print("=" * 70)


if __name__ == "__main__":
    main()
