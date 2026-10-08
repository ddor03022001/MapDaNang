"""
build_mountains_terrain.py — Dựng 3D Quần thể 5 Ngọn Núi Karst & Địa Hình (Ngũ Hành Sơn)
Module độc lập:
  - 5 ngọn núi đá vôi karst sừng sững:
    * Thủy Sơn (125m): 2 đỉnh Thượng Thai & Hạ Thai, các vách đá dựng đứng hiểm trở.
    * Kim Sơn (85m), Mộc Sơn (75m), Hỏa Sơn (88m & 72m), Thổ Sơn (65m).
  - CÁC THỀM ĐÁ CHỜ (FOUNDATION TERRACES) VÀ LỐI MÒN LEO NÚI (CLIMBING TRAILS):
    * Thềm đá Mũi Đông (X = 86m, Y = 8m, Z = 16m) sẵn sàng nhận Tháp Xá Lợi.
    * Thềm đá chùa Linh Ứng (X = 68m, Y = -28m, Z = 12m) sẵn sàng nhận Chùa Linh Ứng.
    * Hốc vách đá Tây Nam (X = -12m, Y = -32m, Z = 8m) đón Động Huyền Không.
    * Đỉnh Thượng Thai (Z = 126m) đón Vọng Hải Đài.
    * Hệ thống bậc thang đá leo núi tạc vào vách đá kết nối từ chân núi lên các danh thắng.
  - Hạ tầng địa lý: Đại lộ Trường Sa 4 làn xe, Sông Cổ Cò và các cụm tượng làng đá Non Nước.
"""

import bpy
import bmesh
import math
import mathutils
import os

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_OUT = os.path.join(MODULE_DIR, "mountains-terrain.blend")
GLB_OUT = os.path.join(MODULE_DIR, "mountains-terrain.glb")


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)


def make_material(name, base_color, metallic=0.0, roughness=0.5,
                  transmission=0.0, ior=1.45):
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
    return mat


def build_materials():
    mats = {}
    mats["karst_cliff"] = make_material("mt_karst_cliff", (0.24, 0.23, 0.22), metallic=0.04, roughness=0.92)
    mats["karst_rock"] = make_material("mt_karst_rock", (0.38, 0.36, 0.33), metallic=0.05, roughness=0.88)
    mats["stone_trail"] = make_material("mt_stone_trail", (0.56, 0.54, 0.50), roughness=0.80)
    mats["rainforest"] = make_material("mt_rainforest", (0.06, 0.22, 0.08), metallic=0.02, roughness=0.85)
    mats["sand_base"] = make_material("mt_sand_base", (0.75, 0.69, 0.56), roughness=0.92)
    mats["road_asphalt"] = make_material("mt_road_asphalt", (0.18, 0.19, 0.20), roughness=0.88)
    mats["river_water"] = make_material("mt_river_water", (0.05, 0.26, 0.36), metallic=0.15, roughness=0.18,
                                        transmission=0.6, ior=1.33)
    mats["white_marble"] = make_material("mt_white_marble", (0.92, 0.92, 0.90), roughness=0.30)
    return mats


def create_faceted_karst_peak(bm, center_x, center_y, base_rx, base_ry, top_r, height,
                              tiers=28, segments=36, noise_mag=0.26, peak_drift=(0, 0), z_base=0.0,
                              ribs=5, strata_freq=22.0, strata_amp=0.04):
    dz = height / float(tiers)
    vert_rings = []

    for it in range(tiers + 1):
        cur_z = z_base + it * dz
        u = it / float(tiers)

        if u < 0.12:
            scale_prof = 1.0 - u * 0.5
        elif u < 0.80:
            scale_prof = 0.94 - (u - 0.12) * 0.52
        else:
            scale_prof = 0.58 - (u - 0.80) * 2.6
        scale_prof = max(0.12, scale_prof)

        drift_x = peak_drift[0] * (u ** 1.5)
        drift_y = peak_drift[1] * (u ** 1.5)

        ring = []
        for s in range(segments):
            angle = (s / float(segments)) * math.pi * 2.0
            rib_factor = 1.0 + math.pow(math.cos(angle * ribs * 0.5 + 0.3), 2.0) * 0.22
            flutes = (math.sin(angle * 3.0 + 0.4) * 0.14 +
                      math.cos(angle * 7.0 - 0.6) * 0.08 +
                      math.sin(angle * 11.0 + 1.2) * 0.04) * noise_mag
            strata = math.sin(u * strata_freq + math.cos(angle * 3.0) * 1.5) * strata_amp

            eff_rx = max(top_r, base_rx * scale_prof * rib_factor * (1.0 + flutes + strata))
            eff_ry = max(top_r, base_ry * scale_prof * rib_factor * (1.0 + flutes + strata))

            px = center_x + drift_x + math.cos(angle) * eff_rx
            py = center_y + drift_y + math.sin(angle) * eff_ry

            v = bm.verts.new((px, py, cur_z))
            ring.append(v)
        vert_rings.append(ring)

    peak_v = bm.verts.new((center_x + peak_drift[0], center_y + peak_drift[1], z_base + height + 2.5))

    for it in range(tiers):
        r1 = vert_rings[it]
        r2 = vert_rings[it + 1]
        for s in range(segments):
            s_next = (s + 1) % segments
            bm.faces.new([r1[s], r1[s_next], r2[s_next], r2[s]])

    top_ring = vert_rings[-1]
    for s in range(segments):
        s_next = (s + 1) % segments
        bm.faces.new([top_ring[s], top_ring[s_next], peak_v])


def build_terrain():
    clean_scene()
    mats = build_materials()

    bm_cliff = bmesh.new()
    bm_rock = bmesh.new()
    bm_terrace = bmesh.new()
    bm_trails = bmesh.new()
    bm_canopy = bmesh.new()
    bm_ground = bmesh.new()
    bm_road = bmesh.new()
    bm_river = bmesh.new()
    bm_village = bmesh.new()

    # =========================================================================
    # 1. THỦY SƠN (125M) & CÁC THỀM ĐÁ CHỜ
    # =========================================================================
    # Đỉnh Thượng Thai (Phía Đông, cao 125m)
    create_faceted_karst_peak(bm_cliff, center_x=12.0, center_y=16.0, base_rx=56.0, base_ry=60.0, top_r=12.0,
                              height=125.0, tiers=28, segments=32, noise_mag=0.24, peak_drift=(10.0, 8.0),
                              ribs=5)

    # Đỉnh Hạ Thai (Phía Tây, cao 106m)
    create_faceted_karst_peak(bm_rock, center_x=-38.0, center_y=-14.0, base_rx=50.0, base_ry=54.0, top_r=10.0,
                              height=106.0, tiers=24, segments=28, noise_mag=0.22, peak_drift=(-8.0, -6.0),
                              ribs=4)

    # Yên ngựa nối 2 đỉnh (cao 76m)
    create_faceted_karst_peak(bm_cliff, center_x=-12.0, center_y=2.0, base_rx=36.0, base_ry=40.0, top_r=9.0,
                              height=76.0, tiers=18, segments=24, noise_mag=0.20, peak_drift=(0.0, 2.0),
                              ribs=4)

    # THỀM ĐÁ MŨI ĐÔNG ĐÓN THÁP XÁ LỢI (X = 86m, Y = 8m, Z = 16m)
    bmesh.ops.create_cone(
        bm_terrace, cap_ends=True, radius1=32.0, radius2=28.0, depth=16.0, segments=16,
        matrix=mathutils.Matrix.Translation((86.0, 8.0, 8.0)) @
               mathutils.Matrix.Diagonal((1.25, 1.0, 1.0, 1.0))
    )

    # THỀM ĐÁ ĐÓN CHÙA LINH ỨNG (X = 68m, Y = -28m, Z = 12m)
    bmesh.ops.create_cone(
        bm_terrace, cap_ends=True, radius1=26.0, radius2=23.0, depth=12.0, segments=16,
        matrix=mathutils.Matrix.Translation((68.0, -28.0, 6.0)) @
               mathutils.Matrix.Diagonal((1.2, 1.1, 1.0, 1.0))
    )

    # BẬC THANG ĐÁ LEO NÚI (CLIMBING STAIR TRAILS FOR CHARACTERS):
    # 1. Đường bậc thang từ chân núi Đông (X = 108m, Y = -28m) lên Chùa Linh Ứng (X = 68m, Y = -28m, Z = 12m)
    trail_1_steps = 22
    for st in range(trail_1_steps):
        prog = st / float(trail_1_steps)
        tx = 108.0 - prog * (108.0 - 68.0)
        ty = -28.0
        tz = prog * 12.0
        bmesh.ops.create_cube(
            bm_trails, size=1.0,
            matrix=mathutils.Matrix.Translation((tx, ty, tz + 0.2)) @
                   mathutils.Matrix.Diagonal((2.2, 4.0, 0.4, 1.0))
        )

    # 2. Đường bậc thang từ Chùa Linh Ứng lên Tháp Xá Lợi (X = 68 -> 86, Y = -28 -> 8, Z = 12 -> 16m)
    trail_2_steps = 18
    for st in range(trail_2_steps):
        prog = st / float(trail_2_steps)
        tx = 68.0 + prog * 18.0
        ty = -28.0 + prog * 36.0
        tz = 12.0 + prog * 4.0
        bmesh.ops.create_cube(
            bm_trails, size=1.0,
            matrix=mathutils.Matrix.Translation((tx, ty, tz + 0.2)) @
                   mathutils.Matrix.Diagonal((3.0, 2.0, 0.4, 1.0))
        )

    # 3. Đường leo núi từ Tháp Xá Lợi lên Đỉnh Thượng Thai / Vọng Hải Đài (Z = 16 -> 125m)
    trail_3_steps = 42
    for st in range(trail_3_steps):
        prog = st / float(trail_3_steps)
        # Uốn lượn men theo vách núi phía Bắc
        ang = prog * math.pi * 1.2
        rad = 50.0 - prog * 28.0
        tx = 12.0 + math.cos(ang) * rad
        ty = 16.0 + math.sin(ang) * rad
        tz = 16.0 + prog * (125.0 - 16.0)
        bmesh.ops.create_cube(
            bm_trails, size=1.0,
            matrix=mathutils.Matrix.Translation((tx, ty, tz + 0.2)) @
                   mathutils.Matrix.Diagonal((2.4, 2.4, 0.5, 1.0))
        )

    # =========================================================================
    # 2. 4 NGỌN NÚI CÒN LẠI (KIM, MỘC, HỎA, THỔ)
    # =========================================================================
    # Kim Sơn (85m bên sông Cổ Cò)
    create_faceted_karst_peak(bm_rock, center_x=-145.0, center_y=-25.0, base_rx=46.0, base_ry=48.0, top_r=8.0,
                              height=85.0, tiers=22, segments=26, noise_mag=0.20, peak_drift=(-6.0, 5.0),
                              ribs=4)

    # Mộc Sơn (75m sát biển)
    create_faceted_karst_peak(bm_cliff, center_x=135.0, center_y=-55.0, base_rx=36.0, base_ry=40.0, top_r=7.0,
                              height=75.0, tiers=20, segments=24, noise_mag=0.25, peak_drift=(8.0, -5.0),
                              ribs=3)

    # Hỏa Sơn (Dương Hỏa Sơn 88m & Âm Hỏa Sơn 72m)
    create_faceted_karst_peak(bm_cliff, center_x=-80.0, center_y=-125.0, base_rx=42.0, base_ry=45.0, top_r=8.0,
                              height=88.0, tiers=22, segments=24, noise_mag=0.22, peak_drift=(5.0, 6.0),
                              ribs=4)
    create_faceted_karst_peak(bm_rock, center_x=-120.0, center_y=-145.0, base_rx=36.0, base_ry=38.0, top_r=7.0,
                              height=72.0, tiers=18, segments=22, noise_mag=0.20, peak_drift=(-5.0, -4.0),
                              ribs=4)

    # Thổ Sơn (65m phía Bắc)
    create_faceted_karst_peak(bm_rock, center_x=-45.0, center_y=135.0, base_rx=52.0, base_ry=58.0, top_r=11.0,
                              height=65.0, tiers=18, segments=26, noise_mag=0.18, peak_drift=(8.0, 5.0),
                              ribs=4)

    # Thảm rừng mưa nhiệt đới
    forest_spots = [
        (18.0, 22.0, 126.0, 14.0), (8.0, 14.0, 123.0, 13.0), (24.0, 10.0, 116.0, 12.0),
        (-44.0, -18.0, 107.0, 13.0), (-32.0, -10.0, 104.0, 12.0),
        (-12.0, 4.0, 78.0, 13.0),
        (-150.0, -22.0, 86.0, 11.0), (-138.0, -28.0, 82.0, 10.0),
        (142.0, -56.0, 76.0, 10.0), (128.0, -50.0, 72.0, 9.0),
        (-76.0, -120.0, 89.0, 11.0), (-122.0, -148.0, 73.0, 9.5),
        (-40.0, 138.0, 66.0, 13.0), (-52.0, 128.0, 62.0, 12.0)
    ]
    for fx, fy, fz, fr in forest_spots:
        bmesh.ops.create_icosphere(bm_canopy, subdivisions=2, radius=fr,
                                   matrix=mathutils.Matrix.Translation((fx, fy, fz)) @
                                          mathutils.Matrix.Diagonal((1.3, 1.3, 0.65, 1.0)))

    # =========================================================================
    # 3. NỀN DUYÊN HẢI, ĐẠI LỘ TRƯỜNG SA, SÔNG CỔ CÒ & LÀNG NGHỀ ĐÁ
    # =========================================================================
    # Lưới cồn cát hữu cơ
    nx, ny = 32, 32
    x_min, x_max = -240.0, 210.0
    y_min, y_max = -240.0, 220.0
    dx = (x_max - x_min) / float(nx - 1)
    dy = (y_max - y_min) / float(ny - 1)

    grid_verts = []
    for iy in range(ny):
        row = []
        py = y_min + iy * dy
        for ix in range(nx):
            px = x_min + ix * dx
            norm_x = (px - (x_min + x_max) * 0.5) / ((x_max - x_min) * 0.5)
            norm_y = (py - (y_min + y_max) * 0.5) / ((y_max - y_min) * 0.5)
            dist_edge = math.sqrt(norm_x * norm_x + norm_y * norm_y)
            dune = (math.sin(px * 0.02) * 1.0 + math.cos(py * 0.025) * 0.8)
            if dist_edge > 0.82:
                fade = max(0.0, 1.0 - (dist_edge - 0.82) / 0.18)
                pz = -0.15 + (dune + 0.6) * fade
            else:
                pz = max(0.1, 0.6 + dune)
            v = bm_ground.verts.new((px, py, pz))
            row.append(v)
        grid_verts.append(row)

    for iy in range(ny - 1):
        for ix in range(nx - 1):
            v1 = grid_verts[iy][ix]
            v2 = grid_verts[iy][ix + 1]
            v3 = grid_verts[iy + 1][ix + 1]
            v4 = grid_verts[iy + 1][ix]
            f = bm_ground.faces.new([v1, v2, v3, v4])
            f.smooth = True

    # Đại lộ Trường Sa
    bmesh.ops.create_grid(
        bm_road, x_segments=2, y_segments=20, size=1.0,
        matrix=mathutils.Matrix.Translation((125.0, -10.0, 1.1)) @
               mathutils.Matrix.Diagonal((9.0, 220.0, 1.0, 1.0))
    )

    # Sông Cổ Cò
    bmesh.ops.create_grid(
        bm_river, x_segments=2, y_segments=20, size=1.0,
        matrix=mathutils.Matrix.Translation((-205.0, -10.0, 0.35)) @
               mathutils.Matrix.Diagonal((16.0, 220.0, 1.0, 1.0))
    )

    # Làng nghề đá Non Nước
    statue_spots = [
        (108.0, -45.0), (105.0, -65.0), (108.0, -85.0),
        (-15.0, -85.0), (-35.0, -95.0), (-65.0, -80.0)
    ]
    for sx, sy in statue_spots:
        bmesh.ops.create_cube(
            bm_village, size=1.0,
            matrix=mathutils.Matrix.Translation((sx, sy, 1.8)) @
                   mathutils.Matrix.Diagonal((3.8, 3.8, 1.5, 1.0))
        )
        bmesh.ops.create_cone(
            bm_village, cap_ends=True, radius1=1.2, radius2=0.3, depth=2.8, segments=8,
            matrix=mathutils.Matrix.Translation((sx, sy, 3.8))
        )

    export_parts = [
        ("cliff", bm_cliff, mats["karst_cliff"]),
        ("rock", bm_rock, mats["karst_rock"]),
        ("terrace", bm_terrace, mats["karst_rock"]),
        ("trails", bm_trails, mats["stone_trail"]),
        ("canopy", bm_canopy, mats["rainforest"]),
        ("ground", bm_ground, mats["sand_base"]),
        ("road", bm_road, mats["road_asphalt"]),
        ("river", bm_river, mats["river_water"]),
        ("village", bm_village, mats["white_marble"]),
    ]

    for name, bm, mat in export_parts:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"mt_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"mt_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)

    os.makedirs(MODULE_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"-> Đã lưu module Địa hình Núi tại: {BLEND_OUT}")

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export GLB Địa hình Núi tại: {GLB_OUT}")


if __name__ == "__main__":
    build_terrain()
