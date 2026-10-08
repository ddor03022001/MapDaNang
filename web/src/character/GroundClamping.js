import * as THREE from 'three';

/**
 * GroundClamping: Provides terrain elevation queries, gravity,
 * and smooth stair/curb step-up mechanics for the 3D Character Controller.
 */
export class GroundClamping {
  /**
   * @param {object} [options]
   * @param {number} [options.rayOriginOffset=0.03] - Height above feet to cast ray downwards (~3m in scene scale)
   * @param {number} [options.maxStepHeight=0.0045] - Maximum step-up threshold for stairs (~45cm)
   * @param {number} [options.gravity=0.065] - Gravity acceleration per second squared (~9.8 m/s^2 scaled)
   * @param {number} [options.minWorldFloor=-0.015] - Safety floor elevation
   */
  constructor(options = {}) {
    this.rayOriginOffset = options.rayOriginOffset ?? 0.03;
    this.maxStepHeight = options.maxStepHeight ?? 0.0045;
    this.gravity = options.gravity ?? 0.065;
    this.minWorldFloor = options.minWorldFloor ?? -0.015;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.ray.direction.set(0, -1, 0);
    this.raycaster.far = 0.15; // 15 meters detection range

    this.downRayOrigin = new THREE.Vector3();
    this.forwardRayOrigin = new THREE.Vector3();
    this.collisionTargets = [];
  }

  /**
   * Registers 3D collision candidate meshes or groups.
   * @param {THREE.Object3D[]} objects
   */
  setCollisionTargets(objects) {
    this.collisionTargets = objects.filter(Boolean);
  }

  /**
   * Adds an object to collision targets.
   * @param {THREE.Object3D} object
   */
  addTarget(object) {
    if (object && !this.collisionTargets.includes(object)) {
      this.collisionTargets.push(object);
    }
  }

  /**
   * Queries ground elevation at the given 3D position.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   * @returns {number|null} The elevation Y of the nearest surface below, or null if nothing hit
   */
  getGroundElevation(x, y, z) {
    this.downRayOrigin.set(x, y + this.rayOriginOffset, z);
    this.raycaster.ray.origin.copy(this.downRayOrigin);

    if (this.collisionTargets.length === 0) {
      return this.minWorldFloor;
    }

    const hits = this.raycaster.intersectObjects(this.collisionTargets, true);

    // Filter out invisible, trigger, or helper meshes
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (hit.object && hit.object.visible) {
        // Exclude raycasting against character itself or particles
        if (hit.object.name.includes('Character') || hit.object.name.includes('Particle')) {
          continue;
        }
        return hit.point.y;
      }
    }

    return null;
  }

  /**
   * Updates vertical kinematics, step-up, and gravity on the character position.
   * 
   * @param {THREE.Vector3} position - Character position to mutate
   * @param {number} verticalVelocity - Current vertical velocity
   * @param {number} delta - Frame delta in seconds
   * @returns {{ onGround: boolean, newVerticalVelocity: number }}
   */
  clamp(position, verticalVelocity, delta) {
    const groundY = this.getGroundElevation(position.x, position.y, position.z);
    const targetFloor = groundY !== null ? groundY : this.minWorldFloor;

    const deltaY = targetFloor - position.y;
    let onGround = false;
    let newVerticalVelocity = verticalVelocity;

    // 1. Step-up: smooth elevation climb if stepping onto curb or stairs (deltaY <= maxStepHeight)
    if (deltaY > 0 && deltaY <= this.maxStepHeight) {
      // Step up smoothly onto the stair
      position.y += Math.min(deltaY, 0.05 * delta * 60);
      onGround = true;
      newVerticalVelocity = 0;
    } else if (position.y <= targetFloor + 0.0005 && verticalVelocity <= 0) {
      // 2. Firmly planted on ground
      position.y = targetFloor;
      onGround = true;
      newVerticalVelocity = 0;
    } else {
      // 3. Airborne: falling or jumping
      newVerticalVelocity -= this.gravity * delta;
      position.y += newVerticalVelocity * delta;

      // Check landing
      if (position.y <= targetFloor) {
        position.y = targetFloor;
        onGround = true;
        newVerticalVelocity = 0;
      }
    }

    return { onGround, newVerticalVelocity };
  }
}
