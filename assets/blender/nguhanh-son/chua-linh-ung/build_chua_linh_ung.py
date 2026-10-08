"""
build_chua_linh_ung.py — Dựng 3D Chùa Linh Ứng Cổ Tự (Ngũ Hành Sơn)
Module độc lập:
  - Kiến trúc chùa cổ Bắc Bộ & Miền Trung chuẩn mực:
    * Cổng Tam Quan 3 cửa vòm cuốn bước vào sân.
    * Sân chùa lát đá với Lư hương đá Non Nước, Tượng Quán Thế Âm Bồ Tát đá cẩm thạch trắng.
    * Chính Điện có KHÔNG GIAN BÊN TRONG (Walkable Interior):
      - Cửa chính rộng mở để nhân vật có thể bước vào trong.
      - Hàng cột gỗ lim nâng đỡ bộ vì kèo.
      - Bàn thờ Phật Tam Bảo, Tượng Phật Thích Ca, chuông đồng.
    * Mái ngói mũi hài 2 tầng màu đỏ gạch cong vút đầu đao truyền thống.
    * Bờ nóc đắp nổi Lưỡng Long Chầu Nguyệt.
  - Tọa độ gốc (0, 0, 0) tại lối vào Cổng Tam Quan.
"""

import bpy
import bmesh
import math
import mathutils
import os

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_OUT = os.path.join(MODULE_DIR, "chua-linh-ung.blend")
GLB_OUT = os.path.join(MODULE_DIR, "chua-linh-ung.glb")


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
    mats["stone_floor"] = make_material("clu_stone_floor", (0.58, 0.58, 0.55), roughness=0.75)
    mats["wall_yellow"] = make_material("clu_wall_yellow", (0.84, 0.76, 0.54), roughness=0.72)
    mats["timber_dark"] = make_material("clu_timber_dark", (0.22, 0.13, 0.09), roughness=0.70)
    mats["tile_red"] = make_material("clu_tile_red", (0.70, 0.16, 0.09), metallic=0.06, roughness=0.48)
    mats["gold_ornament"] = make_material("clu_gold_ornament", (0.95, 0.80, 0.20), metallic=0.88, roughness=0.22)
    mats["white_marble"] = make_material("clu_white_marble", (0.92, 0.92, 0.90), roughness=0.28)
    mats["lantern"] = make_material("clu_lantern", (0.98, 0.22, 0.10), roughness=0.3,
                                    emission_color=(1.0, 0.25, 0.08), emission_strength=4.5)
    return mats


def build_temple():
    clean_scene()
    mats = build_materials()

    bm_plaza = bmesh.new()
    bm_walls = bmesh.new()
    bm_roofs = bmesh.new()
    bm_timber = bmesh.new()
    bm_marble = bmesh.new()
    bm_gold = bmesh.new()
    bm_lanterns = bmesh.new()

    # =========================================================================
    # 1. CỔNG TAM QUAN (TRIPLE-ARCH ENTRANCE GATE AT Y = 0)
    # =========================================================================
    # Trụ cổng Tam Quan
    gate_pillars = [-6.0, -2.2, 2.2, 6.0]
    for px in gate_pillars:
        bmesh.ops.create_cube(
            bm_walls, size=1.0,
            matrix=mathutils.Matrix.Translation((px, 0.0, 2.8)) @
                   mathutils.Matrix.Diagonal((0.9, 0.9, 5.6, 1.0))
        )
    # Tường nối và vòm cổng
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, 0.0, 4.8)) @
               mathutils.Matrix.Diagonal((12.5, 0.8, 1.6, 1.0))
    )
    # Mái cổng Tam Quan cong vút
    bmesh.ops.create_cone(
        bm_roofs, cap_ends=True, radius1=9.0, radius2=5.0, depth=1.6, segments=4,
        matrix=mathutils.Matrix.Translation((0.0, 0.0, 6.4))
    )
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=0.6, radius2=0.08, depth=1.2, segments=6,
        matrix=mathutils.Matrix.Translation((0.0, 0.0, 7.8))
    )

    # =========================================================================
    # 2. SÂN CHÙA LÁT ĐÁ (WALKABLE COURTYARD - Y = 4m .. 22m)
    # =========================================================================
    # Sân gạch bát tràng / đá phiến
    bmesh.ops.create_cube(
        bm_plaza, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, 12.0, 0.15)) @
               mathutils.Matrix.Diagonal((24.0, 24.0, 0.3, 1.0))
    )

    # Tượng Bồ Tát Quán Thế Âm bằng đá cẩm thạch trắng đứng trên tòa sen giữa sân
    # Bệ sen
    bmesh.ops.create_cone(
        bm_marble, cap_ends=True, radius1=1.4, radius2=1.2, depth=0.6, segments=12,
        matrix=mathutils.Matrix.Translation((0.0, 8.0, 0.6))
    )
    # Thân tượng Phật Bà áo trắng
    bmesh.ops.create_cone(
        bm_marble, cap_ends=True, radius1=0.7, radius2=0.35, depth=2.8, segments=12,
        matrix=mathutils.Matrix.Translation((0.0, 8.0, 2.3))
    )
    bmesh.ops.create_icosphere(
        bm_marble, subdivisions=2, radius=0.35,
        matrix=mathutils.Matrix.Translation((0.0, 8.0, 3.9))
    )

    # Lư hương đồng & đá lớn trước tượng
    bmesh.ops.create_cone(
        bm_marble, cap_ends=True, radius1=0.9, radius2=1.1, depth=1.2, segments=8,
        matrix=mathutils.Matrix.Translation((0.0, 11.5, 0.9))
    )

    # Lan can bao quanh sân chùa
    for side_x in [-11.8, 11.8]:
        bmesh.ops.create_cube(
            bm_plaza, size=1.0,
            matrix=mathutils.Matrix.Translation((side_x, 12.0, 0.65)) @
                   mathutils.Matrix.Diagonal((0.3, 24.0, 0.7, 1.0))
        )

    # =========================================================================
    # 3. CHÍNH ĐIỆN CHÙA LINH ỨNG (MAIN SANCTUARY - Y = 22m .. 38m)
    # =========================================================================
    hall_w = 20.0
    hall_l = 15.0
    hall_h = 6.2
    hall_y = 30.0

    # Nền móng & bậc tam cấp dẫn vào chính điện
    bmesh.ops.create_cube(
        bm_plaza, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, hall_y, 0.6)) @
               mathutils.Matrix.Diagonal((hall_w + 3.0, hall_l + 3.0, 1.2, 1.0))
    )
    # Bậc tam cấp 3 bậc ở cửa trước
    for st in range(3):
        bmesh.ops.create_cube(
            bm_plaza, size=1.0,
            matrix=mathutils.Matrix.Translation((0.0, 21.6 - st * 0.45, 0.2 + (2 - st) * 0.3)) @
                   mathutils.Matrix.Diagonal((6.0, 0.45, 0.4, 1.0))
        )

    # Sàn bên trong chính điện
    bmesh.ops.create_cube(
        bm_plaza, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, hall_y, 1.25)) @
               mathutils.Matrix.Diagonal((hall_w, hall_l, 0.1, 1.0))
    )

    # CÁC BỨC TƯỜNG (CÓ CHỪA CỬA RA VÀO WALKABLE CHO NHÂN VẬT VÀO TRONG):
    # Tường sau (kín)
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, hall_y + hall_l * 0.5, 1.2 + hall_h * 0.5)) @
               mathutils.Matrix.Diagonal((hall_w, 0.5, hall_h, 1.0))
    )
    # Tường trái (có cửa sổ chấn song)
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((-hall_w * 0.5, hall_y, 1.2 + hall_h * 0.5)) @
               mathutils.Matrix.Diagonal((0.5, hall_l, hall_h, 1.0))
    )
    # Tường phải (có cửa sổ chấn song)
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((hall_w * 0.5, hall_y, 1.2 + hall_h * 0.5)) @
               mathutils.Matrix.Diagonal((0.5, hall_l, hall_h, 1.0))
    )
    # Tường trước: 3 gian cửa lớn (Cửa giữa rộng 4.5m mở toang để nhân vật bước vào, 2 gian bên có tường thấp)
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((-7.0, hall_y - hall_l * 0.5, 1.2 + hall_h * 0.5)) @
               mathutils.Matrix.Diagonal((5.0, 0.5, hall_h, 1.0))
    )
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((7.0, hall_y - hall_l * 0.5, 1.2 + hall_h * 0.5)) @
               mathutils.Matrix.Diagonal((5.0, 0.5, hall_h, 1.0))
    )
    # Ngưỡng cửa & trán cửa chính giữa (cao 3.8m để nhân vật đi qua thoải mái)
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, hall_y - hall_l * 0.5, 1.2 + 5.1)) @
               mathutils.Matrix.Diagonal((8.0, 0.5, 2.2, 1.0))
    )

    # NỘI THẤT BÊN TRONG CHÍNH ĐIỆN (SANCTUARY INTERIOR):
    # 8 Cột gỗ lim chịu lực bên trong
    for cx in [-5.5, 5.5]:
        for cy in [hall_y - 4.0, hall_y, hall_y + 4.0]:
            bmesh.ops.create_cone(
                bm_timber, cap_ends=True, radius1=0.45, radius2=0.45, depth=hall_h, segments=8,
                matrix=mathutils.Matrix.Translation((cx, cy, 1.2 + hall_h * 0.5))
            )

    # Bàn thờ Tam Bảo trang nghiêm sát tường sau
    bmesh.ops.create_cube(
        bm_timber, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, hall_y + 5.5, 1.2 + 1.2)) @
               mathutils.Matrix.Diagonal((7.0, 2.2, 2.4, 1.0))
    )
    # Tượng Phật Thích Ca mạ vàng tĩnh tọa trên bàn thờ
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=1.2, radius2=0.6, depth=1.8, segments=12,
        matrix=mathutils.Matrix.Translation((0.0, hall_y + 5.5, 1.2 + 3.3))
    )
    bmesh.ops.create_icosphere(
        bm_gold, subdivisions=2, radius=0.45,
        matrix=mathutils.Matrix.Translation((0.0, hall_y + 5.5, 1.2 + 4.4))
    )
    # Đại hồng chung (Chuông đồng chùa Linh Ứng) đặt bên trái
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=0.8, radius2=0.35, depth=1.6, segments=10,
        matrix=mathutils.Matrix.Translation((-6.5, hall_y + 3.0, 1.2 + 1.8))
    )

    # 4 Cột lim hiên chùa mặt tiền
    for cx in [-7.5, -2.5, 2.5, 7.5]:
        bmesh.ops.create_cone(
            bm_timber, cap_ends=True, radius1=0.42, radius2=0.42, depth=hall_h, segments=8,
            matrix=mathutils.Matrix.Translation((cx, hall_y - hall_l * 0.5 - 1.2, 1.2 + hall_h * 0.5))
        )

    # HỆ MÁI NGÓI 2 TẦNG CONG VÚT (DOUBLE-TIERED RED TILE CURVED ROOFS):
    # Tầng mái dưới (mái hiên bao quanh)
    bmesh.ops.create_cone(
        bm_roofs, cap_ends=True, radius1=max(hall_w, hall_l) * 0.90, radius2=max(hall_w, hall_l) * 0.55,
        depth=2.2, segments=4,
        matrix=mathutils.Matrix.Translation((0.0, hall_y, 1.2 + hall_h + 0.8)) @
               mathutils.Matrix.Diagonal((1.18, 0.95, 1.0, 1.0))
    )
    # Cổ diêm (gian lửng giữa 2 tầng mái)
    bmesh.ops.create_cube(
        bm_walls, size=1.0,
        matrix=mathutils.Matrix.Translation((0.0, hall_y, 1.2 + hall_h + 2.2)) @
               mathutils.Matrix.Diagonal((hall_w * 0.65, hall_l * 0.65, 1.2, 1.0))
    )
    # Tầng mái trên (thượng điện)
    bmesh.ops.create_cone(
        bm_roofs, cap_ends=True, radius1=max(hall_w, hall_l) * 0.65, radius2=1.2,
        depth=2.8, segments=4,
        matrix=mathutils.Matrix.Translation((0.0, hall_y, 1.2 + hall_h + 3.8)) @
               mathutils.Matrix.Diagonal((1.18, 0.95, 1.0, 1.0))
    )

    # Lưỡng Long Chầu Nguyệt trên bờ nóc thượng điện
    bmesh.ops.create_icosphere(
        bm_gold, subdivisions=2, radius=0.7,
        matrix=mathutils.Matrix.Translation((0.0, hall_y, 1.2 + hall_h + 5.5))
    )
    for rx in [-2.5, 2.5]:
        bmesh.ops.create_cone(
            bm_gold, cap_ends=True, radius1=0.25, radius2=0.08, depth=2.0, segments=6,
            matrix=mathutils.Matrix.Translation((rx, hall_y, 1.2 + hall_h + 5.4)) @
                   mathutils.Matrix.Rotation(math.radians(35 * (-1 if rx > 0 else 1)), 4, 'Y')
        )

    # Đèn lồng đỏ treo hiên chùa
    for lx in [-5.0, 0.0, 5.0]:
        bmesh.ops.create_cube(
            bm_lanterns, size=0.6,
            matrix=mathutils.Matrix.Translation((lx, hall_y - hall_l * 0.5 - 1.2, 1.2 + hall_h - 0.2))
        )

    # =========================================================================
    # XUẤT CÁC MESH & LƯU FILE
    # =========================================================================
    export_parts = [
        ("plaza", bm_plaza, mats["stone_floor"]),
        ("walls", bm_walls, mats["wall_yellow"]),
        ("roofs", bm_roofs, mats["tile_red"]),
        ("timber", bm_timber, mats["timber_dark"]),
        ("marble", bm_marble, mats["white_marble"]),
        ("gold", bm_gold, mats["gold_ornament"]),
        ("lanterns", bm_lanterns, mats["lantern"]),
    ]

    for name, bm, mat in export_parts:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"clu_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"clu_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)

    # Lưu .blend
    os.makedirs(MODULE_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"-> Đã lưu module Chùa Linh Ứng tại: {BLEND_OUT}")

    # Export .glb
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export GLB Chùa Linh Ứng tại: {GLB_OUT}")


if __name__ == "__main__":
    build_temple()
