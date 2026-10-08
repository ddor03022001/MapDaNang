import bpy
import bmesh
import math
import os
import shutil

print("=== STARTING FULL TOURIST CHARACTER BUILD & EXPORT ===")

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for col in [bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.actions, bpy.data.images]:
    for b in list(col):
        col.remove(b)

# 1. Load Soldier (for animation data)
soldier_path = 'e:/Huy/PersonalProject/assets/blender/character/Soldier.glb'
bpy.ops.import_scene.gltf(filepath=soldier_path)
soldier_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
soldier_arm.name = 'Soldier_Armature'

# 2. Load RPM
rpm_path = 'e:/Huy/PersonalProject/assets/blender/character/readyplayer.me.glb'
bpy.ops.import_scene.gltf(filepath=rpm_path)
rpm_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE' and o != soldier_arm][0]
rpm_arm.name = 'RPM_Armature'

# Remove unwanted items
for name in ['Wolf3D_Headwear', 'Wolf3D_Beard', 'Cube', 'Icosphere']:
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)

def make_pbr_mat(name, color, roughness=0.5, metallic=0.0):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.5
    return m

mat_hair = make_pbr_mat("Tourist_Hair_Dark", (0.045, 0.035, 0.028, 1.0), roughness=0.85)
mat_gold = make_pbr_mat("Aviator_Gold", (0.95, 0.78, 0.25, 1.0), roughness=0.15, metallic=0.95)
mat_lens = make_pbr_mat("Aviator_Lens", (0.04, 0.04, 0.05, 1.0), roughness=0.04, metallic=0.3)
mat_cargo = make_pbr_mat("Tourist_CargoPants_Olive", (0.22, 0.26, 0.16, 1.0), roughness=0.72)
mat_sneakers = make_pbr_mat("Tourist_Sneakers_White", (0.92, 0.92, 0.92, 1.0), roughness=0.45)
mat_pack_navy = make_pbr_mat("Pack_Navy", (0.10, 0.18, 0.28, 1.0), roughness=0.65)
mat_pack_accent = make_pbr_mat("Pack_Accent_Orange", (0.92, 0.40, 0.10, 1.0), roughness=0.55)
mat_bedroll = make_pbr_mat("Bedroll_Mat", (0.95, 0.48, 0.15, 1.0), roughness=0.8)
mat_strap = make_pbr_mat("Strap_Black", (0.08, 0.08, 0.09, 1.0), roughness=0.8)
mat_flask = make_pbr_mat("Flask_Silver", (0.88, 0.90, 0.94, 1.0), roughness=0.15, metallic=0.95)

# -------------------------------------------------------------
# 3. MODERN SCULPTED HAIR
# -------------------------------------------------------------
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=24, radius=0.093)
hair = bpy.context.active_object
hair.name = "Tourist_Hair"
hair.scale = (0.98, 1.08, 0.90)
bpy.ops.object.transform_apply(scale=True)

bm = bmesh.new()
bm.from_mesh(hair.data)
verts_to_delete = []
for v in bm.verts:
    if v.co.y >= 0.0:
        if v.co.z < -0.060:
            verts_to_delete.append(v)
    elif -0.06 <= v.co.y < 0.0:
        if v.co.z < -0.048 and abs(v.co.x) < 0.076:
            verts_to_delete.append(v)
    else:
        arch_threshold = -0.015 - 0.02 * (abs(v.co.x) / 0.08)
        if v.co.z < arch_threshold:
            verts_to_delete.append(v)

bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
for v in bm.verts:
    if v.co.z > 0.02 and v.co.y < -0.02:
        v.co.z += 0.014
        v.co.y -= 0.006

bm.to_mesh(hair.data)
bm.free()
hair.data.update()

hair.location = (0.0, -0.016, 1.770)
bpy.ops.object.transform_apply(location=True)
hair.data.materials.append(mat_hair)
bpy.ops.object.shade_smooth()

hair.parent = rpm_arm
vg_h = hair.vertex_groups.new(name='Head')
vg_h.add([v.index for v in hair.data.vertices], 1.0, 'REPLACE')
mod_h = hair.modifiers.new(name='Armature', type='ARMATURE')
mod_h.object = rpm_arm

# -------------------------------------------------------------
# 4. AVIATOR SUNGLASSES (Gọng vàng, tròng đen)
# -------------------------------------------------------------
glasses_parts = []
for side, x in [('Left', 0.0315), ('Right', -0.0315)]:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.017, depth=0.004, vertices=28,
        location=(x, -0.106, 1.734),
        rotation=(math.radians(90), 0, 0)
    )
    rim = bpy.context.active_object
    rim.scale = (1.10, 1.22, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    rim.data.materials.append(mat_gold)
    glasses_parts.append(rim)
    
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.0155, depth=0.002, vertices=28,
        location=(x, -0.107, 1.734),
        rotation=(math.radians(90), 0, 0)
    )
    lens = bpy.context.active_object
    lens.scale = (1.10, 1.22, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    lens.data.materials.append(mat_lens)
    glasses_parts.append(lens)

bpy.ops.mesh.primitive_cylinder_add(
    radius=0.0016, depth=0.024, vertices=12,
    location=(0.0, -0.107, 1.737),
    rotation=(0, math.radians(90), 0)
)
bridge_low = bpy.context.active_object
bridge_low.data.materials.append(mat_gold)
glasses_parts.append(bridge_low)

bpy.ops.mesh.primitive_cylinder_add(
    radius=0.0016, depth=0.034, vertices=12,
    location=(0.0, -0.106, 1.748),
    rotation=(0, math.radians(90), 0)
)
bridge_high = bpy.context.active_object
bridge_high.data.materials.append(mat_gold)
glasses_parts.append(bridge_high)

for side, x in [('Left', 0.052), ('Right', -0.052)]:
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.0018, depth=0.095, vertices=12,
        location=(x, -0.058, 1.740),
        rotation=(math.radians(90), 0, 0)
    )
    temple = bpy.context.active_object
    temple.data.materials.append(mat_gold)
    glasses_parts.append(temple)

bpy.ops.object.select_all(action='DESELECT')
for gp in glasses_parts:
    gp.select_set(True)
bpy.context.view_layer.objects.active = glasses_parts[0]
bpy.ops.object.join()
glasses_obj = bpy.context.active_object
glasses_obj.name = "Tourist_Aviator_Sunglasses"
bpy.ops.object.shade_smooth()

glasses_obj.parent = rpm_arm
vg_gl = glasses_obj.vertex_groups.new(name='Head')
vg_gl.add([v.index for v in glasses_obj.data.vertices], 1.0, 'REPLACE')
mod_gl = glasses_obj.modifiers.new(name='Armature', type='ARMATURE')
mod_gl.object = rpm_arm

# -------------------------------------------------------------
# 5. SHIRT MODIFICATIONS & HAWAIIAN TEXTURE
# -------------------------------------------------------------
top_obj = bpy.data.objects.get('Wolf3D_Outfit_Top')
if top_obj:
    for v in top_obj.data.vertices:
        # Tuck protruding flower
        if 1.35 < v.co.z < 1.50 and v.co.x < -0.05 and v.co.y < -0.10:
            v.co.y = -0.095
        # Tuck tailcoat flap
        if v.co.z < 0.93 and v.co.y > 0.0:
            v.co.z = 0.95
        # Tuck bowtie
        if 1.52 < v.co.z < 1.62 and abs(v.co.x) < 0.06 and v.co.y < -0.08:
            v.co.y = -0.072
    top_obj.data.update()

pattern_path = os.path.join(os.path.dirname(__file__), 'textures', 'hawaiian_shirt.jpg')
if not os.path.exists(pattern_path):
    pattern_path = 'e:/Huy/PersonalProject/assets/blender/character/textures/hawaiian_shirt.jpg'
if os.path.exists(pattern_path) and top_obj:
    mat_top = top_obj.data.materials[0]
    mat_top.use_nodes = True
    nodes = mat_top.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    
    img = bpy.data.images.load(pattern_path)
    tex_node = nodes.new(type='ShaderNodeTexImage')
    tex_node.image = img
    
    coord_node = nodes.new(type='ShaderNodeTexCoord')
    map_node = nodes.new(type='ShaderNodeMapping')
    map_node.inputs['Scale'].default_value = (1.5, 1.5, 1.5)
    
    mat_top.node_tree.links.new(coord_node.outputs['UV'], map_node.inputs['Vector'])
    mat_top.node_tree.links.new(map_node.outputs['Vector'], tex_node.inputs['Vector'])
    mat_top.node_tree.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.65

# -------------------------------------------------------------
# 6. CARGO PANTS & SNEAKERS
# -------------------------------------------------------------
bottom_obj = bpy.data.objects.get('Wolf3D_Outfit_Bottom')
if bottom_obj:
    bottom_obj.data.materials.clear()
    bottom_obj.data.materials.append(mat_cargo)

for side, x in [('Left', 0.13), ('Right', -0.13)]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, 0.0, 0.65), scale=(0.035, 0.10, 0.12))
    pocket = bpy.context.active_object
    pocket.name = f"CargoPocket_{side}"
    pocket.data.materials.append(mat_cargo)
    pocket.parent = rpm_arm
    vg_leg = pocket.vertex_groups.new(name=f'{side}Leg')
    vg_leg.add([v.index for v in pocket.data.vertices], 1.0, 'REPLACE')
    mod_arm_pk = pocket.modifiers.new(name='Armature', type='ARMATURE')
    mod_arm_pk.object = rpm_arm

footwear_obj = bpy.data.objects.get('Wolf3D_Outfit_Footwear')
if footwear_obj:
    footwear_obj.data.materials.clear()
    footwear_obj.data.materials.append(mat_sneakers)

# -------------------------------------------------------------
# 7. HIKING TRAVEL BACKPACK & EQUIPMENT
# -------------------------------------------------------------
backpack_parts = []

# Main Pack Body (+Y is back of RPM)
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.22, 1.28), scale=(0.34, 0.22, 0.46))
pack_body = bpy.context.active_object
pack_body.name = "BP_MainBody"
pack_body.data.materials.append(mat_pack_navy)
backpack_parts.append(pack_body)

# Top Storm Hood
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.23, 1.53), scale=(0.36, 0.24, 0.12), rotation=(math.radians(-6), 0, 0))
pack_lid = bpy.context.active_object
pack_lid.name = "BP_Lid"
pack_lid.data.materials.append(mat_pack_accent)
backpack_parts.append(pack_lid)

# Outer Utility Pocket
bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.35, 1.25), scale=(0.28, 0.08, 0.28))
pack_pocket = bpy.context.active_object
pack_pocket.name = "BP_OuterPocket"
pack_pocket.data.materials.append(mat_pack_accent)
backpack_parts.append(pack_pocket)

# Rolled Trekking Mat / Sleeping Pad
bpy.ops.mesh.primitive_cylinder_add(radius=0.068, depth=0.44, vertices=24, location=(0.0, 0.24, 1.00), rotation=(0, math.radians(90), 0))
bedroll = bpy.context.active_object
bedroll.name = "BP_Bedroll"
bedroll.data.materials.append(mat_bedroll)
backpack_parts.append(bedroll)

for x in [-0.13, 0.13]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.072, depth=0.026, vertices=20, location=(x, 0.24, 1.00), rotation=(0, math.radians(90), 0))
    strap = bpy.context.active_object
    strap.name = f"BP_MatStrap_{x}"
    strap.data.materials.append(mat_strap)
    backpack_parts.append(strap)

# Stainless Steel Water Flask
bpy.ops.mesh.primitive_cylinder_add(radius=0.038, depth=0.18, vertices=20, location=(0.19, 0.20, 1.25))
flask = bpy.context.active_object
flask.name = "BP_WaterFlask"
flask.data.materials.append(mat_flask)
backpack_parts.append(flask)

bpy.ops.mesh.primitive_cylinder_add(radius=0.022, depth=0.04, vertices=16, location=(0.19, 0.20, 1.36))
flask_cap = bpy.context.active_object
flask_cap.name = "BP_FlaskCap"
flask_cap.data.materials.append(mat_flask)
backpack_parts.append(flask_cap)

# Dual Shoulder Harness Straps
for side, x in [('Left', 0.10), ('Right', -0.10)]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(x, 0.06, 1.38), scale=(0.045, 0.22, 0.32), rotation=(math.radians(15), 0, 0))
    sh_strap = bpy.context.active_object
    sh_strap.name = f"BP_ShoulderStrap_{side}"
    sh_strap.data.materials.append(mat_strap)
    backpack_parts.append(sh_strap)

bpy.ops.object.select_all(action='DESELECT')
for bp in backpack_parts:
    bp.select_set(True)
bpy.context.view_layer.objects.active = backpack_parts[0]
bpy.ops.object.join()
backpack_obj = bpy.context.active_object
backpack_obj.name = "Tourist_Travel_Backpack"
bpy.ops.object.shade_smooth()

backpack_obj.parent = rpm_arm
vg_spine = backpack_obj.vertex_groups.new(name='Spine2')
vg_spine.add([v.index for v in backpack_obj.data.vertices], 1.0, 'REPLACE')
mod_arm_bp = backpack_obj.modifiers.new(name='Armature', type='ARMATURE')
mod_arm_bp.object = rpm_arm

# -------------------------------------------------------------
# 8. ROTATE RPM ARMATURE 180° AROUND Z TO ALIGN WITH SOLDIER (+Y)
# -------------------------------------------------------------
rpm_arm.rotation_euler.z = math.pi
bpy.context.view_layer.update()

# -------------------------------------------------------------
# 9. BAKE ANIMATIONS FROM SOLDIER TO RPM ARMATURE
# -------------------------------------------------------------
bone_map = {
    'Hips': 'mixamorig:Hips',
    'Spine': 'mixamorig:Spine',
    'Spine1': 'mixamorig:Spine1',
    'Spine2': 'mixamorig:Spine2',
    'Neck': 'mixamorig:Neck',
    'Head': 'mixamorig:Head',
    'LeftShoulder': 'mixamorig:LeftShoulder',
    'LeftArm': 'mixamorig:LeftArm',
    'LeftForeArm': 'mixamorig:LeftForeArm',
    'LeftHand': 'mixamorig:LeftHand',
    'RightShoulder': 'mixamorig:RightShoulder',
    'RightArm': 'mixamorig:RightArm',
    'RightForeArm': 'mixamorig:RightForeArm',
    'RightHand': 'mixamorig:RightHand',
    'LeftUpLeg': 'mixamorig:LeftUpLeg',
    'LeftLeg': 'mixamorig:LeftLeg',
    'LeftFoot': 'mixamorig:LeftFoot',
    'LeftToeBase': 'mixamorig:LeftToeBase',
    'RightUpLeg': 'mixamorig:RightUpLeg',
    'RightLeg': 'mixamorig:RightLeg',
    'RightFoot': 'mixamorig:RightFoot',
    'RightToeBase': 'mixamorig:RightToeBase',
}

def setup_constraints():
    bpy.context.view_layer.objects.active = rpm_arm
    bpy.ops.object.mode_set(mode='POSE')
    for rpm_bname, soldier_bname in bone_map.items():
        pbone = rpm_arm.pose.bones.get(rpm_bname)
        if not pbone:
            continue
        for c in list(pbone.constraints):
            pbone.constraints.remove(c)
        c_rot = pbone.constraints.new('COPY_ROTATION')
        c_rot.target = soldier_arm
        c_rot.subtarget = soldier_bname
        c_rot.target_space = 'WORLD'
        c_rot.owner_space = 'WORLD'
        if rpm_bname == 'Hips':
            c_loc = pbone.constraints.new('COPY_LOCATION')
            c_loc.target = soldier_arm
            c_loc.subtarget = soldier_bname
            c_loc.target_space = 'WORLD'
            c_loc.owner_space = 'WORLD'
    bpy.ops.object.mode_set(mode='OBJECT')

clips = [
    ('Idle_Character', 0, 47),
    ('Walk_Character', 0, 24),
    ('Run_Character', 0, 16)
]

baked_actions = []

for clip_name, start_f, end_f in clips:
    sol_action = bpy.data.actions.get(clip_name)
    if not sol_action:
        continue
    
    soldier_arm.animation_data.action = sol_action
    setup_constraints()
    
    bpy.ops.object.select_all(action='DESELECT')
    rpm_arm.select_set(True)
    bpy.context.view_layer.objects.active = rpm_arm
    
    bpy.ops.nla.bake(
        frame_start=start_f,
        frame_end=end_f,
        only_selected=False,
        visual_keying=True,
        clear_constraints=True,
        clear_parents=False,
        use_current_action=False,
        bake_types={'POSE'}
    )
    
    baked_act = rpm_arm.animation_data.action
    if baked_act:
        baked_act.name = f"Tourist_{clip_name}"
        baked_actions.append(baked_act)
        track = rpm_arm.animation_data.nla_tracks.new()
        track.name = baked_act.name
        track.strips.new(baked_act.name, start_f, baked_act)

print(f"Baked actions: {[a.name for a in baked_actions]}")

# -------------------------------------------------------------
# 10. REMOVE SOLDIER FROM SCENE
# -------------------------------------------------------------
for o in list(bpy.data.objects):
    if o == soldier_arm or 'vanguard' in o.name.lower() or 'mixamorig' in o.name.lower():
        bpy.data.objects.remove(o, do_unlink=True)

# -------------------------------------------------------------
# 11. EXPORT TO WEB PLAYER GLB
# -------------------------------------------------------------
export_glb_path = 'e:/Huy/PersonalProject/web/public/models/character/player.glb'
blend_save_path = 'e:/Huy/PersonalProject/assets/blender/character/tourist_real_gta.blend'

# Save blend file
bpy.ops.wm.save_as_mainfile(filepath=blend_save_path)
print(f"Saved .blend to {blend_save_path}")

# Select all remaining meshes and armature
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type in {'MESH', 'ARMATURE'}:
        o.select_set(True)
bpy.context.view_layer.objects.active = rpm_arm

bpy.ops.export_scene.gltf(
    filepath=export_glb_path,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='NLA_TRACKS',
    export_skins=True,
    export_morph=True,
    export_apply=False
)
print(f"Successfully exported final tourist character to: {export_glb_path}")

# Render studio preview of the final model
cam_data = bpy.data.cameras.new('FinalCam')
cam_obj = bpy.data.objects.new('FinalCam', cam_data)
bpy.context.scene.collection.objects.link(cam_obj)
bpy.context.scene.camera = cam_obj
# Rotated RPM faces +Y now
cam_obj.location = (0.0, 2.5, 1.25)
cam_obj.rotation_euler = (math.radians(82), 0, math.radians(180))

bpy.ops.object.light_add(type='SUN', location=(2.0, 3.0, 4.0))
sun = bpy.context.active_object
sun.data.energy = 4.0

preview_final = 'e:/Huy/PersonalProject/assets/blender/character/renders/final_tourist_front.png'
bpy.context.scene.render.filepath = preview_final
bpy.context.scene.render.resolution_x = 800
bpy.context.scene.render.resolution_y = 1000
bpy.ops.render.render(write_still=True)
print(f"Rendered final front preview to: {preview_final}")
print("=== BUILD AND EXPORT COMPLETED SUCCESSFULLY ===")
