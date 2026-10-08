"""
build_nguhanh_son.py — Dựng 3D Danh Thắng Ngũ Hành Sơn (Marble Mountains, Đà Nẵng)
Bản dựng hoàn thiện đỉnh cao, chuẩn thực tế:
  - 5 ngọn núi: Thủy Sơn (125m), Kim Sơn (85m), Mộc Sơn (75m), Hỏa Sơn (88m & 72m), Thổ Sơn (65m).
  - Vách đá Karst faceted tương phản tự nhiên, khe nứt và tầng đá trầm tích.
  - Tháp Xá Lợi 7 tầng bát giác cao 28m tọa lạc trên Mũi đá Đông Thủy Sơn (lộ thiên 100%, nhìn ra biển).
  - Chùa Linh Ứng Cổ Tự mái ngói đỏ cong vút, sân đình và bậc thang đá kết nối.
  - Động Huyền Không với cửa vòm mở, tượng Phật Thích Ca cẩm thạch trắng và luồng sáng giếng trời.
  - Vọng Hải Đài & Vọng Giang Đài trên các đỉnh cao ngắm biển Đông và sông Cổ Cò.
  - Hạ tầng cảnh quan duyên hải: Đại lộ Trường Sa, Sông Cổ Cò và Làng đá Non Nước.
"""

import bpy
import bmesh
import math
import mathutils
import os
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

BLEND_OUT_PATH = os.path.join(SCRIPT_DIR, "nguhanh-son.blend")
GLB_OUT_DIR = os.path.join(PROJECT_ROOT, "assets", "exported", "nguhanh-son")
GLB_OUT_PATH = os.path.join(GLB_OUT_DIR, "nguhanh-son.glb")
WEB_GLB_DIR = os.path.join(PROJECT_ROOT, "web", "public", "models", "nguhanh-son")
WEB_GLB_PATH = os.path.join(WEB_GLB_DIR, "nguhanh-son.glb")
PREVIEW_PNG_PATH = os.path.join(GLB_OUT_DIR, "render_preview.png")


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
    # 1. Vách đá vôi karst sẫm màu phong hóa (Weathered Dark Karst Cliff)
    mats["karst_cliff"] = make_material("nhs_mat-karst-cliff", (0.24, 0.23, 0.22), metallic=0.04, roughness=0.92)
    # 2. Đá karst tầng xám ấm (Warm Stratified Limestone)
    mats["karst_rock"] = make_material("nhs_mat-karst-rock", (0.38, 0.36, 0.33), metallic=0.05, roughness=0.88)
    # 3. Gờ đá cẩm thạch trắng sáng Non Nước (White Marble Vein)
    mats["marble_vein"] = make_material("nhs_mat-marble-vein", (0.86, 0.85, 0.82), metallic=0.08, roughness=0.55)
    # 4. Thảm rừng mưa nhiệt đới xanh thẫm phủ đỉnh (Deep Rainforest Canopy)
    mats["rainforest"] = make_material("nhs_mat-rainforest", (0.06, 0.22, 0.08), metallic=0.02, roughness=0.85)
    # 5. Cây bụi triền núi xanh non (Karst Shrub)
    mats["shrub"] = make_material("nhs_mat-shrub", (0.12, 0.32, 0.10), metallic=0.02, roughness=0.80)
    # 6. Mái ngói lưu ly xanh ngọc Tháp Xá Lợi (Jade Stupa Roof)
    mats["stupa_roof"] = make_material("nhs_mat-stupa-roof", (0.09, 0.38, 0.30), metallic=0.18, roughness=0.32)
    # 7. Thân Tháp Xá Lợi đá hoa cương vàng ngà (Ancient Stupa Ochre Stone)
    mats["stupa_wall"] = make_material("nhs_mat-stupa-wall", (0.75, 0.68, 0.54), metallic=0.06, roughness=0.68)
    # 8. Đỉnh bảo tháp vàng thếp (Golden Spire)
    mats["gold_spire"] = make_material("nhs_mat-gold-spire", (0.96, 0.80, 0.18), metallic=0.92, roughness=0.20)
    # 9. Đèn lồng đỏ chiếu sáng (Lantern Glow)
    mats["lantern_glow"] = make_material("nhs_mat-lantern-glow", (0.98, 0.22, 0.10), roughness=0.3,
                                         emission_color=(1.0, 0.28, 0.10), emission_strength=5.0)
    # 10. Mái ngói chùa Linh Ứng đỏ gạch (Terracotta Temple Roof)
    mats["temple_roof"] = make_material("nhs_mat-temple-roof", (0.68, 0.16, 0.10), metallic=0.05, roughness=0.52)
    # 11. Gỗ lim cột đình chùa (Dark Temple Timber)
    mats["temple_wood"] = make_material("nhs_mat-temple-wood", (0.22, 0.14, 0.10), metallic=0.02, roughness=0.75)
    # 12. Tượng Phật Thích Ca đá cẩm thạch trắng (Non Nuoc White Marble Buddha)
    mats["white_marble"] = make_material("nhs_mat-white-marble", (0.92, 0.92, 0.90), metallic=0.06, roughness=0.30)
    # 13. Luồng sáng giếng trời Động Huyền Không (Celestial God Ray)
    mats["god_ray"] = make_material("nhs_mat-god-ray", (1.0, 0.96, 0.82), roughness=0.1,
                                    emission_color=(1.0, 0.95, 0.78), emission_strength=3.0)
    # 14. Bờ cát duyên hải Non Nước (Coastal Sand Plain)
    mats["sand_base"] = make_material("nhs_mat-sand-base", (0.75, 0.69, 0.56), roughness=0.92)
    # 15. Đại lộ Trường Sa nhựa đường (Highway Asphalt)
    mats["road_asphalt"] = make_material("nhs_mat-road-asphalt", (0.18, 0.19, 0.20), roughness=0.88)
    # 16. Vạch kẻ đường vàng
    mats["stripe_yellow"] = make_material("nhs_mat-stripe-yellow", (0.95, 0.80, 0.10), roughness=0.5)
    # 17. Sông Cổ Cò uốn lượn (Co Co River Water)
    mats["river_water"] = make_material("nhs_mat-river-water", (0.05, 0.26, 0.36), metallic=0.15, roughness=0.18,
                                        transmission=0.6, ior=1.33)
    # 18. Quảng trường đá Non Nước & sân chùa
    mats["plaza_stone"] = make_material("nhs_mat-plaza-stone", (0.55, 0.55, 0.52), roughness=0.75)
    return mats


# ---------------------------------------------------------------------------
# 1. HÀM DỰNG KHỐI NÚI KARST VỚI CÁC VÁCH ĐỨNG & RÃNH NỨT TỰ NHIÊN
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# 2. XÂY DỰNG 5 NGỌN NÚI NGŨ HÀNH SƠN
# ---------------------------------------------------------------------------
def build_karst_mountains(collection, mats):
    bm_cliff = bmesh.new()
    bm_rock = bmesh.new()
    bm_terrace = bmesh.new()
    bm_canopy = bmesh.new()

    # =========================================================================
    # 1. THỦY SƠN (TRUNG TÂM & LỚN NHẤT — CAO 125M)
    # =========================================================================
    # Đỉnh Thượng Thai (Phía Đông, cao 125m)
    create_faceted_karst_peak(bm_cliff, center_x=12.0, center_y=16.0, base_rx=56.0, base_ry=60.0, top_r=12.0,
                              height=125.0, tiers=28, segments=32, noise_mag=0.24, peak_drift=(10.0, 8.0),
                              ribs=5)

    # Đỉnh Hạ Thai (Phía Tây Thủy Sơn, cao 106m)
    create_faceted_karst_peak(bm_rock, center_x=-38.0, center_y=-14.0, base_rx=50.0, base_ry=54.0, top_r=10.0,
                              height=106.0, tiers=24, segments=28, noise_mag=0.22, peak_drift=(-8.0, -6.0),
                              ribs=4)

    # Dải đá yên ngựa kết nối 2 đỉnh (cao 76m)
    create_faceted_karst_peak(bm_cliff, center_x=-12.0, center_y=2.0, base_rx=36.0, base_ry=40.0, top_r=9.0,
                              height=76.0, tiers=18, segments=24, noise_mag=0.20, peak_drift=(0.0, 2.0),
                              ribs=4)

    # THỀM ĐÁ MŨI ĐÔNG (EASTERN PROMONTORY TERRACE) CHO THÁP XÁ LỢI:
    # Nằm vững chãi ở X = 60m .. 105m, Y = -10m .. 26m, cao Z = 16m
    bmesh.ops.create_cone(
        bm_terrace, cap_ends=True, radius1=32.0, radius2=28.0, depth=16.0, segments=16,
        matrix=mathutils.Matrix.Translation((82.0, 8.0, 8.0)) @
               mathutils.Matrix.Diagonal((1.25, 1.0, 1.0, 1.0))
    )

    # THỀM ĐÁ CHÙA LINH ỨNG (TEMPLE TERRACE):
    # Nằm ở X = 48m .. 88m, Y = -48m .. -16m, cao Z = 12m
    bmesh.ops.create_cone(
        bm_terrace, cap_ends=True, radius1=26.0, radius2=23.0, depth=12.0, segments=16,
        matrix=mathutils.Matrix.Translation((66.0, -28.0, 6.0)) @
               mathutils.Matrix.Diagonal((1.2, 1.1, 1.0, 1.0))
    )

    # =========================================================================
    # 2. KIM SƠN (PHÍA TÂY BÊN SÔNG CỔ CÒ — CAO 85M)
    # =========================================================================
    create_faceted_karst_peak(bm_rock, center_x=-145.0, center_y=-25.0, base_rx=46.0, base_ry=48.0, top_r=8.0,
                              height=85.0, tiers=22, segments=26, noise_mag=0.20, peak_drift=(-6.0, 5.0),
                              ribs=4)

    # =========================================================================
    # 3. MỘC SƠN (PHÍA ĐÔNG NAM SÁT BIỂN — CAO 75M)
    # =========================================================================
    create_faceted_karst_peak(bm_cliff, center_x=135.0, center_y=-55.0, base_rx=36.0, base_ry=40.0, top_r=7.0,
                              height=75.0, tiers=20, segments=24, noise_mag=0.25, peak_drift=(8.0, -5.0),
                              ribs=3)

    # =========================================================================
    # 4. HỎA SƠN (DƯƠNG HỎA SƠN 88M & ÂM HỎA SƠN 72M)
    # =========================================================================
    create_faceted_karst_peak(bm_cliff, center_x=-80.0, center_y=-125.0, base_rx=42.0, base_ry=45.0, top_r=8.0,
                              height=88.0, tiers=22, segments=24, noise_mag=0.22, peak_drift=(5.0, 6.0),
                              ribs=4)
    create_faceted_karst_peak(bm_rock, center_x=-120.0, center_y=-145.0, base_rx=36.0, base_ry=38.0, top_r=7.0,
                              height=72.0, tiers=18, segments=22, noise_mag=0.20, peak_drift=(-5.0, -4.0),
                              ribs=4)

    # =========================================================================
    # 5. THỔ SƠN (PHÍA BẮC — CAO 65M)
    # =========================================================================
    create_faceted_karst_peak(bm_rock, center_x=-45.0, center_y=135.0, base_rx=52.0, base_ry=58.0, top_r=11.0,
                              height=65.0, tiers=18, segments=26, noise_mag=0.18, peak_drift=(8.0, 5.0),
                              ribs=4)

    # THẢM RỪNG NHIỆT ĐỚI PHỦ ĐỈNH NÚI VÀ GỜ ĐÁ
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

    for name, bm, mat in [
        ("karst_cliff", bm_cliff, mats["karst_cliff"]),
        ("karst_rock", bm_rock, mats["karst_rock"]),
        ("karst_terrace", bm_terrace, mats["karst_rock"]),
        ("forest_canopy", bm_canopy, mats["rainforest"]),
    ]:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"nhs_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"nhs_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)
        link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 3. DỰNG THÁP XÁ LỢI 7 TẦNG BÁT GIÁC (HERO PAGODA - CAO 28M)
# ---------------------------------------------------------------------------
def build_thap_xa_loi(collection, mats):
    """
    Tháp Xá Lợi 7 tầng bát giác cao 28m trên Mũi đá Đông Thủy Sơn (Z = 16.0m).
    Vị trí: X = 86.0m, Y = 8.0m.
    Lộ thiên 100%, nhìn thẳng ra biển Non Nước và Đại lộ Trường Sa.
    """
    tx, ty, tz = 86.0, 8.0, 16.0

    bm_stupa = bmesh.new()
    bm_roofs = bmesh.new()
    bm_gold = bmesh.new()
    bm_lanterns = bmesh.new()

    # Bệ thềm đá chân tháp 2 tầng bát giác (Plaza Platform)
    bmesh.ops.create_cone(
        bm_stupa, cap_ends=True, radius1=13.0, radius2=12.5, depth=1.8, segments=8,
        matrix=mathutils.Matrix.Translation((tx, ty, tz + 0.9))
    )
    bmesh.ops.create_cone(
        bm_stupa, cap_ends=True, radius1=11.0, radius2=10.5, depth=1.4, segments=8,
        matrix=mathutils.Matrix.Translation((tx, ty, tz + 2.5))
    )

    num_tiers = 7
    cur_z = tz + 3.2
    r_body = 8.0

    for t in range(num_tiers):
        h_body = 2.6 - t * 0.12
        r_roof = r_body * 1.45

        # Thân tầng bát giác (tường đá màu vàng ngà cổ kính)
        bmesh.ops.create_cone(
            bm_stupa, cap_ends=True, radius1=r_body, radius2=r_body * 0.93, depth=h_body, segments=8,
            matrix=mathutils.Matrix.Translation((tx, ty, cur_z + h_body * 0.5))
        )

        # Cửa vòm cuốn / cửa sổ gỗ lim 8 mặt
        for a in range(8):
            ang = a * math.pi * 0.25
            dx = math.cos(ang) * (r_body * 0.95)
            dy = math.sin(ang) * (r_body * 0.95)
            bmesh.ops.create_cube(
                bm_gold, size=0.4,
                matrix=mathutils.Matrix.Translation((tx + dx, ty + dy, cur_z + h_body * 0.5)) @
                       mathutils.Matrix.Diagonal((1.2, 1.2, 2.4, 1.0))
            )

        # Mái ngói cong vút lưu ly xanh ngọc bích
        bmesh.ops.create_cone(
            bm_roofs, cap_ends=True, radius1=r_roof, radius2=0.4, depth=1.0, segments=8,
            matrix=mathutils.Matrix.Translation((tx, ty, cur_z + h_body + 0.5))
        )

        # Đèn lồng đỏ chiếu sáng 8 góc mái
        for a in range(8):
            rad = a * math.pi * 0.25 + 0.196
            lx = tx + math.cos(rad) * (r_roof * 0.95)
            ly = ty + math.sin(rad) * (r_roof * 0.95)
            lz = cur_z + h_body + 0.25
            bmesh.ops.create_cube(
                bm_lanterns, size=0.55,
                matrix=mathutils.Matrix.Translation((lx, ly, lz))
            )

        cur_z += h_body + 1.0
        r_body *= 0.885

    # Đỉnh bảo tháp vàng thếp (Golden Spire & Lotus Finial) vươn lên Z = 45m
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=1.8, radius2=0.08, depth=5.8, segments=8,
        matrix=mathutils.Matrix.Translation((tx, ty, cur_z + 2.9))
    )
    bmesh.ops.create_icosphere(
        bm_gold, subdivisions=2, radius=1.1,
        matrix=mathutils.Matrix.Translation((tx, ty, cur_z + 6.0))
    )

    for name, bm, mat in [
        ("stupa_body", bm_stupa, mats["stupa_wall"]),
        ("stupa_roofs", bm_roofs, mats["stupa_roof"]),
        ("stupa_gold", bm_gold, mats["gold_spire"]),
        ("stupa_lanterns", bm_lanterns, mats["lantern_glow"]),
    ]:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"nhs_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"nhs_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)
        link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 4. DỰNG CHÙA LINH ỨNG CỔ TỰ & CÁC CÔNG TRÌNH VĂN HÓA
# ---------------------------------------------------------------------------
def build_temples_and_shrines(collection, mats):
    bm_temple = bmesh.new()
    bm_roof = bmesh.new()
    bm_pillars = bmesh.new()
    bm_monuments = bmesh.new()

    # 1. Chùa Linh Ứng Non Nước (Tọa lạc trên thềm đá X = 68.0m, Y = -28.0m, Z = 12.0m)
    tx, ty, tz = 68.0, -28.0, 12.0
    w, l, h = 20.0, 26.0, 6.5
    rot_mat = mathutils.Matrix.Rotation(0.35, 4, 'Z')

    # Sân đình & bệ tam cấp lát đá
    bmesh.ops.create_cube(
        bm_monuments, size=1.0,
        matrix=mathutils.Matrix.Translation((tx, ty, tz + 0.6)) @ rot_mat @
               mathutils.Matrix.Diagonal((w + 10.0, l + 12.0, 1.2, 1.0))
    )

    # Chính điện chùa Linh Ứng
    bmesh.ops.create_cube(
        bm_temple, size=1.0,
        matrix=mathutils.Matrix.Translation((tx, ty, tz + 1.2 + h * 0.5)) @ rot_mat @
               mathutils.Matrix.Diagonal((w, l, h, 1.0))
    )

    # Mái ngói 2 tầng cong vút màu đỏ gạch
    roof_w, roof_l = w + 5.5, l + 5.5
    # Mái dưới
    bmesh.ops.create_cone(
        bm_roof, cap_ends=True, radius1=max(roof_w, roof_l) * 0.78, radius2=max(w, l) * 0.45,
        depth=2.0, segments=4,
        matrix=mathutils.Matrix.Translation((tx, ty, tz + 1.2 + h * 0.85)) @ rot_mat
    )
    # Mái trên cong đỉnh
    bmesh.ops.create_cone(
        bm_roof, cap_ends=True, radius1=max(w, l) * 0.56, radius2=0.8,
        depth=2.4, segments=4,
        matrix=mathutils.Matrix.Translation((tx, ty, tz + 1.2 + h + 1.6)) @ rot_mat
    )

    # Hàng cột lim hiên chùa
    for col_fac in [-0.4, 0.0, 0.4]:
        offset = rot_mat @ mathutils.Vector((col_fac * w, l * 0.52, 0))
        bmesh.ops.create_cone(
            bm_pillars, cap_ends=True, radius1=0.55, radius2=0.55, depth=h, segments=8,
            matrix=mathutils.Matrix.Translation((tx + offset.x, ty + offset.y, tz + 1.2 + h * 0.5))
        )

    # Lư hương đá Non Nước trước sân chùa
    lh_offset = rot_mat @ mathutils.Vector((0, l * 0.72, 0))
    bmesh.ops.create_cone(
        bm_monuments, cap_ends=True, radius1=1.8, radius2=2.2, depth=2.0, segments=8,
        matrix=mathutils.Matrix.Translation((tx + lh_offset.x, ty + lh_offset.y, tz + 1.2 + 1.0))
    )

    # Bậc thang đá nối Chùa Linh Ứng lên Tháp Xá Lợi (Mountain Staircase)
    num_steps = 14
    for st in range(num_steps):
        prog = st / float(num_steps)
        sx = 68.0 + prog * (86.0 - 68.0)
        sy = -16.0 + prog * (8.0 - (-16.0))
        sz = 12.0 + prog * 4.0
        bmesh.ops.create_cube(
            bm_monuments, size=1.0,
            matrix=mathutils.Matrix.Translation((sx, sy, sz + 0.2)) @
                   mathutils.Matrix.Diagonal((3.5, 2.0, 0.4, 1.0))
        )

    # 2. Vọng Hải Đài (Lầu lục giác ngắm biển trên đỉnh Thượng Thai, Z = 125m)
    vx, vy, vz = 14.0, 18.0, 126.0
    bmesh.ops.create_cone(
        bm_monuments, cap_ends=True, radius1=5.2, radius2=4.8, depth=1.0, segments=6,
        matrix=mathutils.Matrix.Translation((vx, vy, vz + 0.5))
    )
    bmesh.ops.create_cone(
        bm_roof, cap_ends=True, radius1=6.6, radius2=0.4, depth=2.5, segments=6,
        matrix=mathutils.Matrix.Translation((vx, vy, vz + 4.6))
    )
    for a in range(6):
        ang = a * math.pi / 3.0
        px = vx + math.cos(ang) * 4.2
        py = vy + math.sin(ang) * 4.2
        bmesh.ops.create_cone(
            bm_pillars, cap_ends=True, radius1=0.32, radius2=0.32, depth=3.6, segments=8,
            matrix=mathutils.Matrix.Translation((px, py, vz + 2.8))
        )

    # 3. Vọng Giang Đài (Lầu lục giác ngắm sông Cổ Cò trên đỉnh Hạ Thai, Z = 106m)
    gx, gy, gz = -36.0, -14.0, 107.0
    bmesh.ops.create_cone(
        bm_monuments, cap_ends=True, radius1=4.8, radius2=4.5, depth=1.0, segments=6,
        matrix=mathutils.Matrix.Translation((gx, gy, gz + 0.5))
    )
    bmesh.ops.create_cone(
        bm_roof, cap_ends=True, radius1=6.2, radius2=0.4, depth=2.4, segments=6,
        matrix=mathutils.Matrix.Translation((gx, gy, gz + 4.5))
    )
    for a in range(6):
        ang = a * math.pi / 3.0
        px = gx + math.cos(ang) * 3.8
        py = gy + math.sin(ang) * 3.8
        bmesh.ops.create_cone(
            bm_pillars, cap_ends=True, radius1=0.30, radius2=0.30, depth=3.5, segments=8,
            matrix=mathutils.Matrix.Translation((px, py, gz + 2.7))
        )

    for name, bm, mat in [
        ("temple_walls", bm_temple, mats["stupa_wall"]),
        ("temple_roofs", bm_roof, mats["temple_roof"]),
        ("temple_pillars", bm_pillars, mats["temple_wood"]),
        ("monuments", bm_monuments, mats["plaza_stone"]),
    ]:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"nhs_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"nhs_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)
        link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 5. DỰNG ĐỘNG HUYỀN KHÔNG & TƯỢNG PHẬT ĐÁ NON NƯỚC (CAVERN & BUDDHA)
# ---------------------------------------------------------------------------
def build_huyen_khong_cave(collection, mats):
    cx, cy, cz = -12.0, -32.0, 8.0

    bm_cave = bmesh.new()
    bm_buddha = bmesh.new()
    bm_ray = bmesh.new()

    # Vòm cửa hang tự nhiên mở ra ngoài vách đá
    bmesh.ops.create_cone(
        bm_cave, cap_ends=False, radius1=8.5, radius2=6.8, depth=14.0, segments=16,
        matrix=mathutils.Matrix.Translation((cx, cy, cz + 4.5)) @
               mathutils.Matrix.Rotation(math.pi * 0.5, 4, 'X')
    )

    # 1. Tòa sen đá cẩm thạch trắng (Lotus Pedestal)
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=4.2, radius2=3.8, depth=1.6, segments=16,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + 0.8))
    )
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=3.4, radius2=4.0, depth=1.0, segments=16,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + 2.1))
    )

    # 2. Tượng Phật Thích Ca ngồi kiết già (Seated Buddha)
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=3.0, radius2=1.7, depth=4.0, segments=12,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + 4.5))
    )
    bmesh.ops.create_icosphere(
        bm_buddha, subdivisions=2, radius=1.9,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + 6.6)) @
               mathutils.Matrix.Diagonal((1.3, 0.9, 1.0, 1.0))
    )
    bmesh.ops.create_icosphere(
        bm_buddha, subdivisions=2, radius=1.2,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + 8.5))
    )
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=0.5, radius2=0.08, depth=0.8, segments=8,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + 9.8))
    )

    # 3. Phễu luồng sáng thiêng liêng từ giếng trời rọi xuống (God Ray)
    ray_h = 28.0
    bmesh.ops.create_cone(
        bm_ray, cap_ends=False, radius1=1.5, radius2=6.0, depth=ray_h, segments=20,
        matrix=mathutils.Matrix.Translation((cx, cy + 5.0, cz + ray_h * 0.5 + 1.0))
    )

    for name, bm, mat in [
        ("cave_interior", bm_cave, mats["karst_rock"]),
        ("buddha_statue", bm_buddha, mats["white_marble"]),
        ("god_ray_beam", bm_ray, mats["god_ray"]),
    ]:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"nhs_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"nhs_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)
        link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# 6. DỰNG NỀN CẢNH QUAN & HẠ TẦNG (LANDSCAPE & INFRASTRUCTURE)
# ---------------------------------------------------------------------------
def build_landscape_context(collection, mats):
    bm_terrain = bmesh.new()
    bm_road = bmesh.new()
    bm_river = bmesh.new()
    bm_village = bmesh.new()

    # 1. Nền cồn cát duyên hải hữu cơ (Organic coastal skirt)
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

            v = bm_terrain.verts.new((px, py, pz))
            row.append(v)
        grid_verts.append(row)

    for iy in range(ny - 1):
        for ix in range(nx - 1):
            v1 = grid_verts[iy][ix]
            v2 = grid_verts[iy][ix + 1]
            v3 = grid_verts[iy + 1][ix + 1]
            v4 = grid_verts[iy + 1][ix]
            f = bm_terrain.faces.new([v1, v2, v3, v4])
            f.smooth = True

    # 2. Đại lộ Trường Sa (Phía Đông, X = 115m, dài 440m)
    road_x = 115.0
    road_w = 18.0
    bmesh.ops.create_grid(
        bm_road, x_segments=2, y_segments=20, size=1.0,
        matrix=mathutils.Matrix.Translation((road_x, -10.0, 1.1)) @
               mathutils.Matrix.Diagonal((road_w * 0.5, 220.0, 1.0, 1.0))
    )

    # 3. Dòng Sông Cổ Cò (Phía Tây, X = -205m)
    river_w = 32.0
    bmesh.ops.create_grid(
        bm_river, x_segments=2, y_segments=20, size=1.0,
        matrix=mathutils.Matrix.Translation((-205.0, -10.0, 0.35)) @
               mathutils.Matrix.Diagonal((river_w * 0.5, 220.0, 1.0, 1.0))
    )

    # 4. Làng nghề điêu khắc đá Non Nước với các cụm tượng cẩm thạch trưng bày
    statue_spots = [
        (102.0, -25.0), (105.0, -45.0), (100.0, -65.0), (104.0, -85.0),
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

    for name, bm, mat in [
        ("sand_terrain", bm_terrain, mats["sand_base"]),
        ("truong_sa_road", bm_road, mats["road_asphalt"]),
        ("co_co_river", bm_river, mats["river_water"]),
        ("craft_village", bm_village, mats["white_marble"]),
    ]:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"nhs_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"nhs_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)
        link_to_collection(obj, collection)


# ---------------------------------------------------------------------------
# MAIN BUILD & EXPORT
# ---------------------------------------------------------------------------
def main():
    print("=" * 70)
    print("DỰNG 3D NGŨ HÀNH SƠN (BLENDER 4.2 LTS) - HOÀN THIỆN ĐỈNH CAO")
    print("=" * 70)

    clean_scene()
    coll = get_or_create_collection("NguHanhSon")
    mats = build_materials()

    print("1. Dựng 5 ngọn núi đá vôi karst sừng sững (Thủy, Kim, Mộc, Hỏa, Thổ)...")
    build_karst_mountains(coll, mats)

    print("2. Dựng Tháp Xá Lợi 7 tầng bát giác cao 28m trên Mũi đá Đông Thủy Sơn...")
    build_thap_xa_loi(coll, mats)

    print("3. Dựng Chùa Linh Ứng cổ tự, Vọng Hải Đài & Vọng Giang Đài...")
    build_temples_and_shrines(coll, mats)

    print("4. Dựng Động Huyền Không & Tượng Phật đá cẩm thạch trắng Non Nước...")
    build_huyen_khong_cave(coll, mats)

    print("5. Dựng nền duyên hải hữu cơ, Đại lộ Trường Sa, Sông Cổ Cò & Làng nghề đá...")
    build_landscape_context(coll, mats)

    # Lưu file .blend nguồn
    os.makedirs(os.path.dirname(BLEND_OUT_PATH), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT_PATH)
    print(f"-> Đã lưu .blend tại: {BLEND_OUT_PATH}")

    # Export glTF .glb chuẩn web
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
    print("HOÀN THÀNH XÂY DỰNG NGŨ HÀNH SƠN 100% THÀNH CÔNG!")
    print("=" * 70)


if __name__ == "__main__":
    main()
