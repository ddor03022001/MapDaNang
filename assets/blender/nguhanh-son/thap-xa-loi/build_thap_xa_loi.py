"""
build_thap_xa_loi.py — Dựng 3D Tháp Xá Lợi 7 Tầng Bát Giác (Ngũ Hành Sơn)
Module độc lập:
  - Thiết kế chuẩn tỉ lệ thực tế (cao 28.5m, đường kính đáy 14m).
  - Kiến trúc Bát Giác (8 cạnh) truyền thống với 7 tầng thu nhỏ dần.
  - CÓ KHÔNG GIAN BÊN TRONG (Walkable Interior):
    * Tầng 1: Cửa vòm 8 hướng, sàn đá bước vào được, gian thờ chính điện có bệ thờ Xá Lợi.
    * Tầng 2-7: Hành lang ban công bên ngoài có lan can đá bao quanh để nhân vật ngắm cảnh biển.
    * Mái ngói lưu ly xanh ngọc 7 tầng cong vút đầu đao.
    * Hệ thống đèn lồng đỏ và chuông gió ở mỗi đầu đao.
    * Đỉnh bảo tháp: Đài sen và búp tháp vàng 9 tầng thếp vàng rực rỡ.
  - Tọa độ gốc (0, 0, 0) tại mặt sàn đế tháp, thuận tiện xoay/đặt/chỉnh sửa độc lập.
"""

import bpy
import bmesh
import math
import mathutils
import os

MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_OUT = os.path.join(MODULE_DIR, "thap-xa-loi.blend")
GLB_OUT = os.path.join(MODULE_DIR, "thap-xa-loi.glb")


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
    # Đá granite xám lát thềm tam cấp và lan can
    mats["stone_base"] = make_material("txl_stone_base", (0.62, 0.62, 0.60), roughness=0.75)
    # Tường đá vàng ngà cổ kính
    mats["stupa_wall"] = make_material("txl_stupa_wall", (0.80, 0.74, 0.60), roughness=0.68)
    # Cột gỗ lim & khung cửa
    mats["timber"] = make_material("txl_timber", (0.24, 0.14, 0.10), roughness=0.70)
    # Mái ngói lưu ly xanh ngọc bích
    mats["jade_roof"] = make_material("txl_jade_roof", (0.08, 0.40, 0.32), metallic=0.20, roughness=0.32)
    # Đỉnh bảo tháp vàng thếp
    mats["gold_spire"] = make_material("txl_gold_spire", (0.96, 0.82, 0.18), metallic=0.92, roughness=0.18)
    # Đèn lồng đỏ chiếu sáng
    mats["lantern"] = make_material("txl_lantern", (0.98, 0.22, 0.10), roughness=0.3,
                                    emission_color=(1.0, 0.25, 0.08), emission_strength=5.0)
    # Bàn thờ & tượng Phật bên trong gian chính điện
    mats["white_marble"] = make_material("txl_white_marble", (0.92, 0.92, 0.90), roughness=0.30)
    return mats


def create_octagonal_tube(bm, r_out, r_in, height, z_bottom, segments=8):
    """Tạo khối tường hình bát giác rỗng ruột (có không gian bên trong để đi lại)"""
    for s in range(segments):
        a1 = s * math.pi * 2.0 / segments
        a2 = (s + 1) * math.pi * 2.0 / segments

        # 4 đỉnh ngoài
        v_out_b1 = bm.verts.new((math.cos(a1) * r_out, math.sin(a1) * r_out, z_bottom))
        v_out_b2 = bm.verts.new((math.cos(a2) * r_out, math.sin(a2) * r_out, z_bottom))
        v_out_t2 = bm.verts.new((math.cos(a2) * r_out, math.sin(a2) * r_out, z_bottom + height))
        v_out_t1 = bm.verts.new((math.cos(a1) * r_out, math.sin(a1) * r_out, z_bottom + height))

        # 4 đỉnh trong
        v_in_b1 = bm.verts.new((math.cos(a1) * r_in, math.sin(a1) * r_in, z_bottom))
        v_in_b2 = bm.verts.new((math.cos(a2) * r_in, math.sin(a2) * r_in, z_bottom))
        v_in_t2 = bm.verts.new((math.cos(a2) * r_in, math.sin(a2) * r_in, z_bottom + height))
        v_in_t1 = bm.verts.new((math.cos(a1) * r_in, math.sin(a1) * r_in, z_bottom + height))

        # Mặt tường ngoài
        bm.faces.new([v_out_b1, v_out_b2, v_out_t2, v_out_t1])
        # Mặt tường trong
        bm.faces.new([v_in_b2, v_in_b1, v_in_t1, v_in_t2])
        # Mặt trên tường
        bm.faces.new([v_out_t1, v_out_t2, v_in_t2, v_in_t1])
        # Mặt dưới tường
        bm.faces.new([v_out_b2, v_out_b1, v_in_b1, v_in_b2])


def create_octagonal_floor(bm, r_out, z_pos, segments=8):
    """Tạo mặt sàn đá bát giác bên trong tháp"""
    verts = [bm.verts.new((math.cos(s * math.pi * 2.0 / segments) * r_out,
                           math.sin(s * math.pi * 2.0 / segments) * r_out,
                           z_pos)) for s in range(segments)]
    bm.faces.new(verts)


def create_curved_eave_roof(bm_roof, r_wall, r_overhang, z_eave, eave_h=1.1, segments=8):
    """Tạo mái ngói bát giác cong vút đầu đao"""
    # Vòng đỉnh mái bám sát tường tầng trên
    ring_top = []
    # Vòng mép mái vươn rộng ra ngoài
    ring_edge = []
    # Vòng đáy mái
    ring_bot = []

    for s in range(segments):
        ang = s * math.pi * 2.0 / segments
        # Đầu đao nhô cong lên ở 8 góc
        corner_flare = 0.35 if (s % 1 == 0) else 0.0

        vx_top = math.cos(ang) * (r_wall * 0.95)
        vy_top = math.sin(ang) * (r_wall * 0.95)
        vz_top = z_eave + eave_h

        vx_edge = math.cos(ang) * r_overhang
        vy_edge = math.sin(ang) * r_overhang
        vz_edge = z_eave + corner_flare

        vx_bot = math.cos(ang) * (r_overhang * 0.96)
        vy_bot = math.sin(ang) * (r_overhang * 0.96)
        vz_bot = z_eave - 0.25

        ring_top.append(bm_roof.verts.new((vx_top, vy_top, vz_top)))
        ring_edge.append(bm_roof.verts.new((vx_edge, vy_edge, vz_edge)))
        ring_bot.append(bm_roof.verts.new((vx_bot, vy_bot, vz_bot)))

    for s in range(segments):
        s_next = (s + 1) % segments
        # Mặt ngói dốc trên
        bm_roof.faces.new([ring_top[s], ring_top[s_next], ring_edge[s_next], ring_edge[s]])
        # Mặt gờ diềm mái
        bm_roof.faces.new([ring_edge[s], ring_edge[s_next], ring_bot[s_next], ring_bot[s]])


def build_stupa():
    clean_scene()
    mats = build_materials()

    bm_base = bmesh.new()
    bm_walls = bmesh.new()
    bm_roofs = bmesh.new()
    bm_timber = bmesh.new()
    bm_gold = bmesh.new()
    bm_lanterns = bmesh.new()
    bm_interior = bmesh.new()

    # =========================================================================
    # 1. BỆ THỀM TAM CẤP BÁT GIÁC (PLAZA FOUNDATION)
    # =========================================================================
    # Cấp 1 (R = 14m, H = 1.0m)
    bmesh.ops.create_cone(
        bm_base, cap_ends=True, radius1=14.0, radius2=13.6, depth=1.0, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, 0.5))
    )
    # Cấp 2 (R = 12.0m, H = 0.8m)
    bmesh.ops.create_cone(
        bm_base, cap_ends=True, radius1=12.0, radius2=11.6, depth=0.8, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, 1.4))
    )

    # Lan can đá bao quanh bệ thềm bát giác cấp 2
    r_bal = 11.4
    for s in range(8):
        ang1 = s * math.pi * 0.25
        ang2 = (s + 1) * math.pi * 0.25
        # 4 lối bậc thang vào tháp (Bắc, Nam, Đông, Tây) chừa lối mở
        if s % 2 == 1:
            # Đoạn lan can
            mx = (math.cos(ang1) + math.cos(ang2)) * 0.5 * r_bal
            my = (math.sin(ang1) + math.sin(ang2)) * 0.5 * r_bal
            length = math.sqrt((math.cos(ang2) - math.cos(ang1))**2 + (math.sin(ang2) - math.sin(ang1))**2) * r_bal
            rot = math.atan2(math.sin(ang2) - math.sin(ang1), math.cos(ang2) - math.cos(ang1))
            bmesh.ops.create_cube(
                bm_base, size=1.0,
                matrix=mathutils.Matrix.Translation((mx, my, 2.2)) @
                       mathutils.Matrix.Rotation(rot, 4, 'Z') @
                       mathutils.Matrix.Diagonal((length, 0.25, 0.8, 1.0))
            )
        # Trụ lan can chạm sen ở mỗi góc
        cx = math.cos(ang1) * r_bal
        cy = math.sin(ang1) * r_bal
        bmesh.ops.create_cube(
            bm_base, size=1.0,
            matrix=mathutils.Matrix.Translation((cx, cy, 2.25)) @
                   mathutils.Matrix.Diagonal((0.4, 0.4, 0.9, 1.0))
        )
        bmesh.ops.create_icosphere(
            bm_base, subdivisions=1, radius=0.22,
            matrix=mathutils.Matrix.Translation((cx, cy, 2.8))
        )

    # 4 Dãy bậc tam cấp dẫn lên bệ tháp (hướng 4 phương chính)
    for a in [0, math.pi * 0.5, math.pi, math.pi * 1.5]:
        dx = math.cos(a)
        dy = math.sin(a)
        for st in range(4):
            dist = 11.6 + st * 0.6
            h_st = 1.8 - st * 0.45
            bmesh.ops.create_cube(
                bm_base, size=1.0,
                matrix=mathutils.Matrix.Translation((dx * dist, dy * dist, h_st * 0.5)) @
                       mathutils.Matrix.Rotation(a, 4, 'Z') @
                       mathutils.Matrix.Diagonal((0.6, 3.2, h_st, 1.0))
            )

    # Sàn tầng 1 bên trong tháp (Z = 1.8m)
    create_octagonal_floor(bm_base, r_out=8.8, z_pos=1.8, segments=8)

    # =========================================================================
    # 2. KHÔNG GIAN NỘI THẤT CHÍNH ĐIỆN TẦNG 1 (INTERIOR SANCTUARY)
    # =========================================================================
    # Bệ thờ Xá Lợi Phật trung tâm (Central Relic Altar)
    bmesh.ops.create_cone(
        bm_interior, cap_ends=True, radius1=2.2, radius2=2.0, depth=1.2, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, 2.4))
    )
    bmesh.ops.create_cone(
        bm_interior, cap_ends=True, radius1=1.6, radius2=1.4, depth=0.8, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, 3.4))
    )
    # Bảo tháp pha lê / cẩm thạch đựng Xá Lợi trên đài sen
    bmesh.ops.create_icosphere(
        bm_interior, subdivisions=2, radius=0.6,
        matrix=mathutils.Matrix.Translation((0, 0, 4.2))
    )
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=0.4, radius2=0.05, depth=1.2, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, 5.0))
    )

    # 8 Cột lim chịu lực bên trong gian chính điện
    for s in range(8):
        ang = s * math.pi * 0.25
        col_x = math.cos(ang) * 5.2
        col_y = math.sin(ang) * 5.2
        bmesh.ops.create_cone(
            bm_timber, cap_ends=True, radius1=0.32, radius2=0.32, depth=3.6, segments=8,
            matrix=mathutils.Matrix.Translation((col_x, col_y, 3.6))
        )

    # =========================================================================
    # 3. 7 TẦNG BÁT GIÁC & HÀNH LANG BAN CÔNG (7 TIERS WITH WALKABLE BALCONIES)
    # =========================================================================
    cur_z = 1.8
    r_wall = 8.8
    num_tiers = 7

    for t in range(num_tiers):
        h_tier = 3.2 - t * 0.12
        r_inner = r_wall - 0.75  # Chiều dày tường 0.75m vững chãi
        r_eave = r_wall * 1.38

        # Sàn tầng (để nhân vật có thể bước đi trên các tầng)
        if t > 0:
            create_octagonal_floor(bm_base, r_out=r_wall, z_pos=cur_z, segments=8)

        # Tường tháp bát giác rỗng ruột (Walkable hollow tower walls)
        create_octagonal_tube(bm_walls, r_out=r_wall, r_in=r_inner, height=h_tier, z_bottom=cur_z, segments=8)

        # Cửa vòm cuốn / cửa sổ lim trên 8 mặt bát giác
        for s in range(8):
            ang = s * math.pi * 0.25
            cx = math.cos(ang) * r_wall
            cy = math.sin(ang) * r_wall
            cz = cur_z + h_tier * 0.5
            rot = ang + math.pi * 0.5

            # Khung cửa gỗ lim
            bmesh.ops.create_cube(
                bm_timber, size=1.0,
                matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                       mathutils.Matrix.Rotation(ang, 4, 'Z') @
                       mathutils.Matrix.Diagonal((0.5, 1.8, 2.2 - t * 0.1, 1.0))
            )
            # Cánh cửa gỗ có dát họa tiết vàng
            bmesh.ops.create_cube(
                bm_gold, size=1.0,
                matrix=mathutils.Matrix.Translation((cx, cy, cz)) @
                       mathutils.Matrix.Rotation(ang, 4, 'Z') @
                       mathutils.Matrix.Diagonal((0.55, 1.2, 1.8 - t * 0.1, 1.0))
            )

        # Mái ngói cong vút lưu ly xanh ngọc tại đỉnh mỗi tầng
        create_curved_eave_roof(bm_roofs, r_wall=r_wall, r_overhang=r_eave, z_eave=cur_z + h_tier, eave_h=1.0, segments=8)

        # Lan can ban công tầng ngoài (cho tầng 2 trở lên)
        if t > 0:
            r_balc = r_eave * 0.82
            for s in range(8):
                ang1 = s * math.pi * 0.25
                ang2 = (s + 1) * math.pi * 0.25
                mx = (math.cos(ang1) + math.cos(ang2)) * 0.5 * r_balc
                my = (math.sin(ang1) + math.sin(ang2)) * 0.5 * r_balc
                length = math.sqrt((math.cos(ang2) - math.cos(ang1))**2 + (math.sin(ang2) - math.sin(ang1))**2) * r_balc
                rot = math.atan2(math.sin(ang2) - math.sin(ang1), math.cos(ang2) - math.cos(ang1))
                bmesh.ops.create_cube(
                    bm_base, size=1.0,
                    matrix=mathutils.Matrix.Translation((mx, my, cur_z + 0.4)) @
                           mathutils.Matrix.Rotation(rot, 4, 'Z') @
                           mathutils.Matrix.Diagonal((length, 0.15, 0.7, 1.0))
                )

        # Đèn lồng đỏ chiếu sáng 8 góc mái mỗi tầng
        for s in range(8):
            ang = s * math.pi * 0.25
            lx = math.cos(ang) * (r_eave * 0.96)
            ly = math.sin(ang) * (r_eave * 0.96)
            lz = cur_z + h_tier + 0.15
            bmesh.ops.create_cube(
                bm_lanterns, size=0.55,
                matrix=mathutils.Matrix.Translation((lx, ly, lz))
            )

        cur_z += h_tier + 0.95
        r_wall *= 0.885

    # =========================================================================
    # 4. ĐỈNH BẢO THÁP VÀNG THẾP (GOLDEN LOTUS SPIRE - 9 TIERS)
    # =========================================================================
    # Đài sen vàng nâng búp tháp
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=2.6, radius2=2.2, depth=1.2, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, cur_z + 0.6))
    )
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=2.0, radius2=2.5, depth=0.8, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, cur_z + 1.4))
    )

    # Cột búp tháp 9 đĩa tròn (Nine Wheels of Wisdom)
    spire_z = cur_z + 1.8
    for w in range(9):
        disk_r = 1.9 - w * 0.15
        disk_h = 0.22
        bmesh.ops.create_cone(
            bm_gold, cap_ends=True, radius1=disk_r, radius2=disk_r * 0.92, depth=disk_h, segments=12,
            matrix=mathutils.Matrix.Translation((0, 0, spire_z + w * 0.45))
        )

    # Chóp nhọn hồ lô vàng và ngọc phát quang trên đỉnh cao nhất (Z = 28.5m)
    bmesh.ops.create_cone(
        bm_gold, cap_ends=True, radius1=0.75, radius2=0.08, depth=2.4, segments=8,
        matrix=mathutils.Matrix.Translation((0, 0, spire_z + 4.8))
    )
    bmesh.ops.create_icosphere(
        bm_gold, subdivisions=2, radius=0.9,
        matrix=mathutils.Matrix.Translation((0, 0, spire_z + 6.2))
    )

    # =========================================================================
    # 5. XUẤT CÁC MESH VÀ LƯU FILE
    # =========================================================================
    export_parts = [
        ("base", bm_base, mats["stone_base"]),
        ("walls", bm_walls, mats["stupa_wall"]),
        ("roofs", bm_roofs, mats["jade_roof"]),
        ("timber", bm_timber, mats["timber"]),
        ("gold", bm_gold, mats["gold_spire"]),
        ("lanterns", bm_lanterns, mats["lantern"]),
        ("interior", bm_interior, mats["white_marble"]),
    ]

    for name, bm, mat in export_parts:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        m = bpy.data.meshes.new(f"txl_{name}_mesh")
        bm.to_mesh(m)
        bm.free()
        obj = bpy.data.objects.new(f"txl_{name}", m)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(mat)

    # Lưu .blend
    os.makedirs(MODULE_DIR, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
    print(f"-> Đã lưu module Tháp Xá Lợi tại: {BLEND_OUT}")

    # Export .glb
    bpy.ops.export_scene.gltf(
        filepath=GLB_OUT,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_yup=True
    )
    print(f"-> Đã export GLB Tháp Xá Lợi tại: {GLB_OUT}")


if __name__ == "__main__":
    build_stupa()
