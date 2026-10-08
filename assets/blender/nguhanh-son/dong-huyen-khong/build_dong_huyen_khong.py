"""
build_dong_huyen_khong.py — Dựng 3D Động Huyền Không (Ngũ Hành Sơn)
Module độc lập:
  - Hang động tâm linh kỳ vĩ nhất trong lòng Thủy Sơn:
    * Cổng vòm đá tự nhiên bước vào hang.
    * Bậc thang đá uốn lượn đi xuống sàn hang (Walkable interior).
    * Vòm hang đá lớn với các dải thạch nhũ (stalactites) buông rủ.
    * Tượng Phật Thích Ca đá cẩm thạch trắng Non Nước tĩnh tọa trên tòa sen cao 4.5m tạc vào vách đá.
    * Giếng trời tự nhiên (Skylight) trên đỉnh vòm hang rọi luồng sáng thiêng liêng (God Ray).
    * Bàn thờ Quan Âm, lư hương đá và hốc đèn đá.
  - Tọa độ gốc (0, 0, 0) tại cửa vào vòm hang.
"""

import bpy
import bmesh
import math
import mathutils
import os

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_OUT = os.path.join(MODULE_DIR, "dong-huyen-khong.blend")
GLB_OUT = os.path.join(MODULE_DIR, "dong-huyen-khong.glb")


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)


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
    mats["cave_rock"] = make_material("dhk_cave_rock", (0.32, 0.30, 0.28), roughness=0.90)
    mats["stalactite"] = make_material("dhk_stalactite", (0.48, 0.45, 0.40), roughness=0.75)
    mats["stone_stairs"] = make_material("dhk_stone_stairs", (0.55, 0.53, 0.50), roughness=0.80)
    mats["white_marble"] = make_material("dhk_white_marble", (0.92, 0.92, 0.90), roughness=0.28)
    mats["gold_accent"] = make_material("dhk_gold_accent", (0.95, 0.80, 0.20), metallic=0.90, roughness=0.20)
    mats["god_ray"] = make_material("dhk_god_ray", (1.0, 0.96, 0.80), roughness=0.1,
                                    emission_color=(1.0, 0.95, 0.78), emission_strength=3.5)
    mats["lantern"] = make_material("dhk_lantern", (0.98, 0.22, 0.10), roughness=0.3,
                                    emission_color=(1.0, 0.25, 0.08), emission_strength=4.5)
    return mats


def build_cave():
    clean_scene()
    mats = build_materials()

    bm_cave = bmesh.new()
    bm_stairs = bmesh.new()
    bm_buddha = bmesh.new()
    bm_stalactites = bmesh.new()
    bm_ray = bmesh.new()
    bm_lanterns = bmesh.new()

    # =========================================================================
    # 1. CỔNG VÒM ĐÁ BƯỚC VÀO HANG (CAVE PORTAL AT Y = 0, Z = 0)
    # =========================================================================
    # Cổng vòm đá tự nhiên
    bmesh.ops.create_cone(
        bm_cave, cap_ends=False, radius1=7.0, radius2=6.0, depth=10.0, segments=16,
        matrix=mathutils.Matrix.Translation((0.0, 4.0, 3.5)) @
               mathutils.Matrix.Rotation(math.pi * 0.5, 4, 'X')
    )

    # =========================================================================
    # 2. BẬC THANG ĐÁ DẪN XUỐNG SÀN HANG (WALKABLE STAIRS Y = 0..16, Z = 0..-4.0)
    # =========================================================================
    num_steps = 18
    for st in range(num_steps):
        prog = st / float(num_steps)
        step_y = 2.0 + prog * 14.0
        step_z = -prog * 4.5
        bmesh.ops.create_cube(
            bm_stairs, size=1.0,
            matrix=mathutils.Matrix.Translation((0.0, step_y, step_z)) @
                   mathutils.Matrix.Diagonal((4.5, 0.85, 0.35, 1.0))
        )

    # Sàn lòng hang phẳng rộng lớn (Y = 16..38, Z = -4.5m)
    bmesh.ops.create_cube(
        bm_stairs, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, 27.0, -4.6)) @
               mathutils.Matrix.Diagonal((26.0, 22.0, 0.3, 1.0))
    )

    # =========================================================================
    # 3. VÒM HANG ĐÁ TỰ NHIÊN RỘNG LỚN (VAULTED CAVERN DOME)
    # =========================================================================
    # Vòm đá bao bọc lòng hang
    bmesh.ops.create_icosphere(
        bm_cave, subdivisions=2, radius=18.0,
        matrix=mathutils.Matrix.Translation((0.0, 26.0, 4.0)) @
               mathutils.Matrix.Diagonal((1.3, 1.2, 1.1, 1.0))
    )

    # THẠCH NHŨ ĐÁ VÔI BUÔNG RỦ TỪ TRẦN HANG (STALACTITES)
    stalactite_spots = [
        (-6.0, 20.0, 12.0, 3.5), (-3.0, 24.0, 14.0, 4.2), (4.0, 22.0, 13.0, 3.8),
        (7.0, 28.0, 11.5, 4.0), (-7.0, 32.0, 10.0, 3.2), (2.0, 34.0, 12.5, 4.5),
        (-5.0, 16.0, 8.0, 2.8), (6.0, 17.0, 8.5, 3.0)
    ]
    for sx, sy, sz, sh in stalactite_spots:
        bmesh.ops.create_cone(
            bm_stalactites, cap_ends=True, radius1=0.75, radius2=0.05, depth=sh, segments=8,
            matrix=mathutils.Matrix.Translation((sx, sy, sz - sh * 0.5))
        )

    # =========================================================================
    # 4. TƯỢNG PHẬT THÍCH CA ĐÁ CẨM THẠCH TRẮNG & BAN THỜ (BUDDHA SHRINE)
    # =========================================================================
    # Vị trí tọa lạc trang nghiêm tại vách sau lòng hang (Y = 32m, Z = -2.5m)
    bx, by, bz = 0.0, 32.0, -4.5

    # Bệ đá chạm hoa sen 2 tầng
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=3.8, radius2=3.4, depth=1.4, segments=16,
        matrix=mathutils.Matrix.Translation((bx, by, bz + 0.7))
    )
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=3.0, radius2=3.5, depth=1.0, segments=16,
        matrix=mathutils.Matrix.Translation((bx, by, bz + 1.9))
    )

    # Thân tượng Phật ngồi kiết già
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=2.6, radius2=1.4, depth=3.2, segments=12,
        matrix=mathutils.Matrix.Translation((bx, by, bz + 4.0))
    )
    # Ngực & vai cà sa
    bmesh.ops.create_icosphere(
        bm_buddha, subdivisions=2, radius=1.6,
        matrix=mathutils.Matrix.Translation((bx, by, bz + 5.7)) @
               mathutils.Matrix.Diagonal((1.3, 0.9, 1.0, 1.0))
    )
    # Đầu tượng & tóc xoắn nhục kế Ushnisha
    bmesh.ops.create_icosphere(
        bm_buddha, subdivisions=2, radius=1.0,
        matrix=mathutils.Matrix.Translation((bx, by, bz + 7.3))
    )
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=0.42, radius2=0.08, depth=0.8, segments=8,
        matrix=mathutils.Matrix.Translation((bx, by, bz + 8.4))
    )

    # Bàn thờ lễ & Lư hương đá trước tượng Phật
    bmesh.ops.create_cube(
        bm_stairs, size=1.0,
        matrix=mathutils.Matrix.Translation((bx, by - 4.2, bz + 0.7)) @
               mathutils.Matrix.Diagonal((5.0, 1.8, 1.4, 1.0))
    )
    bmesh.ops.create_cone(
        bm_buddha, cap_ends=True, radius1=0.8, radius2=1.0, depth=1.0, segments=8,
        matrix=mathutils.Matrix.Translation((bx, by - 4.2, bz + 1.9))
    )

    # =========================================================================
    # 5. GIẾNG TRỜI VÀ LUỒNG SÁNG THIÊNG LIÊNG (SKYLIGHT & GOD RAY)
    # =========================================================================
    # Vòng mở giếng trời trên trần hang (Z = 16.5m)
    bmesh.ops.create_cone(
        bm_cave, cap_ends=False, radius1=2.8, radius2=3.6, depth=5.0, segments=16,
        matrix=mathutils.Matrix.Translation((bx, by - 2.0, 17.0))
    )

    # Luồng sáng hình nón rọi thẳng xuống bàn thờ và tượng Phật
    ray_top_z = 18.0
    ray_h = 22.0
    bmesh.ops.create_cone(
        bm_ray, cap_ends=False, radius1=1.8, radius2=6.5, depth=ray_h, segments=20,
        matrix=mathutils.Matrix.Translation((bx, by - 1.5, bz + ray_h * 0.5))
    )

    # Các ngọn nến và đèn lồng hốc đá lung linh
    for lx, ly, lz in [(-8.0, 22.0, -3.2), (8.0, 22.0, -3.2), (-9.0, 30.0, -2.5), (9.0, 30.0, -2.5)]:
        bmesh.ops.create_cube(
            bm_lanterns, size=0.5,
            matrix=mathutils.Matrix.Translation((lx, ly, lz))
        )

    # =========================================================================
    # XUẤT CÁC MESH & LƯU FILE
    # =========================================================================
    export_parts = [
        ("cave", bm_cave, mats["cave_rock"]),
        ("stairs", bm_stairs, mats["stone_stairs"]),
        ("buddha", bm_buddha, mats["white_marble"]),
        ("stalactites", bm_stalactites, mats["stalactite"]),
        ("god_ray", bm_ray, mats["god_ray"]),
        ("lanterns", bm_lanterns, mats["lantern"]),
    ]

    for name, bm, mat in export_parts:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"dhk_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"dhk_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)

    # Lưu .blend
    os.makedirs(MODULE_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"-> Đã lưu module Động Huyền Không tại: {BLEND_OUT}")

    # Export .glb
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export GLB Động Huyền Không tại: {GLB_OUT}")


if __name__ == "__main__":
    build_cave()
