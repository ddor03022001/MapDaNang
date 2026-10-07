# -*- coding: utf-8 -*-
import bpy
import math
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BLEND_PATH = os.path.join(SCRIPT_DIR, "cau-rong.blend")

bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
scene = bpy.context.scene

enum_items = bpy.context.scene.render.bl_rna.properties["engine"].enum_items.keys()
if "BLENDER_EEVEE_NEXT" in enum_items:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
elif "BLENDER_EEVEE" in enum_items:
    scene.render.engine = "BLENDER_EEVEE"

scene.render.resolution_x = 1600
scene.render.resolution_y = 900
scene.render.film_transparent = False

scene.world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.50, 0.72, 0.90, 1.0)
    bg.inputs[1].default_value = 1.3

sun_data = bpy.data.lights.new("cau-rong_sun", type="SUN")
sun_data.energy = 4.5
sun_data.color = (1.0, 0.96, 0.90)
sun_obj = bpy.data.objects.new("cau-rong_sun", sun_data)
scene.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (math.radians(45), math.radians(25), math.radians(60))

fill_data = bpy.data.lights.new("cau-rong_fill_sun", type="SUN")
fill_data.energy = 2.0
fill_data.color = (0.7, 0.85, 1.0)
fill_obj = bpy.data.objects.new("cau-rong_fill_sun", fill_data)
scene.collection.objects.link(fill_obj)
fill_obj.rotation_euler = (math.radians(-40), math.radians(-30), math.radians(-120))

bpy.ops.mesh.primitive_plane_add(size=1400.0, location=(0, 0, 0.1))
water_plane = bpy.context.active_object
water_mat = bpy.data.materials.new("water_mat")
water_mat.use_nodes = True
water_bsdf = water_mat.node_tree.nodes.get("Principled BSDF")
if water_bsdf:
    water_bsdf.inputs["Base Color"].default_value = (0.04, 0.22, 0.32, 1.0)
    water_bsdf.inputs["Roughness"].default_value = 0.15
    water_bsdf.inputs["Metallic"].default_value = 0.2
water_plane.data.materials.append(water_mat)

def render_camera_view(name, cam_pos, target_pos, lens=35, output_filename="preview.png"):
    target_obj = bpy.data.objects.new(f"target_{name}", None)
    target_obj.location = target_pos
    scene.collection.objects.link(target_obj)
    
    cam_data = bpy.data.cameras.new(f"cam_{name}")
    cam_data.lens = lens
    cam_data.clip_start = 1.0
    cam_data.clip_end = 3000.0
    
    cam_obj = bpy.data.objects.new(f"cam_{name}", cam_data)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = cam_pos
    
    track = cam_obj.constraints.new(type="TRACK_TO")
    track.target = target_obj
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    
    scene.camera = cam_obj
    scene.render.filepath = os.path.join(SCRIPT_DIR, output_filename)
    bpy.ops.render.render(write_still=True)
    print(f"[render_preview] Đã render: {scene.render.filepath}")
    
    scene.collection.objects.unlink(cam_obj)
    scene.collection.objects.unlink(target_obj)
    bpy.data.objects.remove(cam_obj)
    bpy.data.objects.remove(target_obj)
    bpy.data.cameras.remove(cam_data)

# 1. Cận cảnh Đầu Rồng thời Lý góc 3/4
render_camera_view(
    "head",
    cam_pos=(282.0, -26.0, 31.0),
    target_pos=(258.0, 0.0, 25.5),
    lens=42,
    output_filename="preview_render_head.png"
)

# 2. Cận cảnh Đầu Rồng nhìn nghiêng (Góc khớp Photo 2 & 3)
render_camera_view(
    "head_side",
    cam_pos=(275.0, -32.0, 26.5),
    target_pos=(260.0, 0.0, 25.0),
    lens=40,
    output_filename="preview_render_head_side.png"
)

# 3. Cận cảnh Đuôi Rồng hoa sen nở (Bờ Tây)
render_camera_view(
    "tail",
    cam_pos=(-265.0, -25.0, 18.0),
    target_pos=(-246.0, 0.0, 13.0),
    lens=40,
    output_filename="preview_render_tail.png"
)

# 4. Toàn cảnh 5 nhịp vòm sông Hàn (Góc khớp Photo 1)
render_camera_view(
    "overview",
    cam_pos=(160.0, -240.0, 65.0),
    target_pos=(0.0, 0.0, 18.0),
    lens=26,
    output_filename="preview_render_overview.png"
)

bpy.data.objects.remove(water_plane)
print("[render_preview] Hoàn tất render toàn bộ các góc!")
