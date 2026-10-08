"""
build_vong_hai_dai.py — Dựng 3D Vọng Hải Đài & Vọng Giang Đài (Ngũ Hành Sơn)
Module độc lập:
  - Lầu lục giác ngắm cảnh trên đỉnh Thủy Sơn:
    * Thềm đá lục giác nâng cao có lan can đá chạm hoa sen bao quanh.
    * 6 cột gỗ lim vững chãi đỡ 2 tầng mái ngói cong vút.
    * Bàn trà đá và ghế đá tròn bên trong để nhân vật ngồi ngắm cảnh biển Đông.
    * Chóp hồ lô đồng thau trên đỉnh nóc.
  - Tọa độ gốc (0, 0, 0) tại tâm sàn lầu ngắm cảnh.
"""

import bpy
import bmesh
import math
import mathutils
import os

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_OUT = os.path.join(MODULE_DIR, "vong-hai-dai.blend")
GLB_OUT = os.path.join(MODULE_DIR, "vong-hai-dai.glb")


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for block in list(bpy.data.meshes):
        bpy.data.meshes.remove(block)
    for block in list(bpy.data.materials):
        bpy.data.materials.remove(block)


def make_material(name, base_color, metallic=0.0, roughness=0.5):
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
    return mat


def build_materials():
    mats = {}
    mats["stone"] = make_material("vhd_stone", (0.60, 0.60, 0.58), roughness=0.75)
    mats["timber"] = make_material("vhd_timber", (0.22, 0.13, 0.09), roughness=0.70)
    mats["tile_roof"] = make_material("vhd_tile_roof", (0.10, 0.38, 0.30), metallic=0.15, roughness=0.35)
    mats["gold_finial"] = make_material("vhd_gold_finial", (0.95, 0.80, 0.20), metallic=0.88, roughness=0.22)
    return mats


def build_pavilion():
    clean_scene()
    mats = build_materials()

    bm_base = bmesh.new()
    bm_timber = bmesh.new()
    bm_roof = bmesh.new()
    bm_gold = bmesh.new()

    # 1. Bệ thềm đá lục giác (Hexagonal Stone Terrace R = 5.5m, H = 0.8m)
    bmesh.ops.create_cone(
        bm_base, cap_ends=True, radius1=5.5, radius2=5.2, depth=0.8, segments=6,
        matrix=mathutils.Matrix.Translation((0, 0, 0.4))
    )

    # Lan can đá xung quanh (chừa 1 lối bậc bước vào)
    r_bal = 5.0
    for s in range(6):
        if s != 0:  # Chừa lối cửa vào ở hướng s = 0
            ang1 = s * math.pi / 3.0
            ang2 = (s + 1) * math.pi / 3.0
            mx = (math.cos(ang1) + math.cos(ang2)) * 0.5 * r_bal
            my = (math.sin(ang1) + math.sin(ang2)) * 0.5 * r_bal
            length = math.sqrt((math.cos(ang2) - math.cos(ang1))**2 + (math.sin(ang2) - math.sin(ang1))**2) * r_bal
            rot = math.atan2(math.sin(ang2) - math.sin(ang1), math.cos(ang2) - math.cos(ang1))
            bmesh.ops.create_cube(
                bm_base, size=1.0,
                matrix=mathutils.Matrix.Translation((mx, my, 1.25)) @
                       mathutils.Matrix.Rotation(rot, 4, 'Z') @
                       mathutils.Matrix.Diagonal((length, 0.22, 0.75, 1.0))
            )
        # Trụ lan can mỗi góc
        ang = s * math.pi / 3.0
        bmesh.ops.create_cube(
            bm_base, size=1.0,
            matrix=mathutils.Matrix.Translation((math.cos(ang) * r_bal, math.sin(ang) * r_bal, 1.3)) @
                   mathutils.Matrix.Diagonal((0.35, 0.35, 0.85, 1.0))
        )

    # Bàn đá và ghế tròn bên trong lầu ngắm cảnh
    bmesh.ops.create_cone(
        bm_base, cap_ends=True, radius1=1.1, radius2=1.0, depth=0.85, segments=12,
        matrix=mathutils.Matrix.Translation((0, 0, 1.25))
    )
    for a in range(4):
        ang = a * math.pi * 0.5 + 0.35
        bmesh.ops.create_cone(
            bm_base, cap_ends=True, radius1=0.45, radius2=0.40, depth=0.55, segments=8,
            matrix=mathutils.Matrix.Translation((math.cos(ang) * 2.2, math.sin(ang) * 2.2, 1.1))
        )

    # 2. 6 Cột gỗ lim chịu lực
    col_r = 4.2
    for s in range(6):
        ang = s * math.pi / 3.0
        cx = math.cos(ang) * col_r
        cy = math.sin(ang) * col_r
        bmesh.ops.create_cone(
            bm_timber, cap_ends=True, radius1=0.32, radius2=0.32, depth=3.8, segments=8,
            matrix=mathutils.Matrix.Translation((cx, cy, 2.7))
        )

    # Xà gồ giằng đỉnh cột
    for s in range(6):
        ang1 = s * math.pi / 3.0
        ang2 = (s + 1) * math.pi / 3.0
        mx = (math.cos(ang1) + math.cos(ang2)) * 0.5 * col_r
        my = (math.sin(ang1) + math.sin(ang2)) * 0.5 * col_r
        length = math.sqrt((math.cos(ang2) - math.cos(ang1))**2 + (math.sin(ang2) - math.sin(ang1))**2) * col_r
        rot = math.atan2(math.sin(ang2) - math.sin(ang1), math.cos(ang2) - math.cos(ang1))
        bmesh.ops.create_cube(
            bm_timber, size=1.0,
            matrix=mathutils.Matrix.Translation((mx, my, 4.6)) @
                   mathutils.Matrix.Rotation(rot, 4, 'Z') @
                   mathutils.Matrix.Diagonal((length, 0.28, 0.35, 1.0))
        )

    # 3. 2 Tầng mái ngói lục giác cong vút
    # Mái dưới
    bmesh.ops.create_cone(
        bm_roof, cap_ends=True, radius1=6.8, radius2=3.8, depth=1.8, segments=6,
        matrix=mathutils.Matrix.Translation((0, 0, 5.5))
    )
    # Mái trên cong vút chóp
    bmesh.ops.create_cone(
        bm_roof, cap_ends=True, radius1=4.6, radius2=0.6, depth=2.4, segments=6,
        matrix=mathutils.Matrix.Translation((0, 0, 7.2))
    )

    # Búp hồ lô đồng trên đỉnh
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=0.45, radius2=0.08, depth=1.2, segments=6,
        matrix=mathutils.Matrix.Translation((0, 0, 8.8))
    )
    bmesh.ops.create_icosphere(
        bm_gold, subdivisions=2, radius=0.35,
        matrix=mathutils.Matrix.Translation((0, 0, 9.6))
    )

    export_parts = [
        ("base", bm_base, mats["stone"]),
        ("timber", bm_timber, mats["timber"]),
        ("roof", bm_roof, mats["tile_roof"]),
        ("gold", bm_gold, mats["gold_finial"]),
    ]

    for name, bm, mat in export_parts:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"vhd_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"vhd_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)

    os.makedirs(MODULE_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"-> Đã lưu module Vọng Hải Đài tại: {BLEND_OUT}")

    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export GLB Vọng Hải Đài tại: {GLB_OUT}")


if __name__ == "__main__":
    build_pavilion()
