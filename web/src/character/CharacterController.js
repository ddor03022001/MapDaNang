import * as THREE from 'three';
import { createGltfLoader } from '../utils/loaders.js';
import { GroundClamping } from './GroundClamping.js';

/**
 * CharacterController: Third-person exploration character controller (GTA Style).
 * Features:
 * - High-detail tourist backpacker character with Mocap animations (Idle, Walk, Run).
 * - Smooth state transitions via THREE.AnimationMixer.
 * - GTA-style spring-arm third-person camera & mouse-look rig (with First-Person toggle).
 * - Ground clamping with gravity and stair step-up over Da Nang 3D terrain and bridges.
 * - Landmark spawn locations (Dragon Bridge, My Khe Beach, Marble Mountains).
 */
export class CharacterController {
  /**
   * @param {object} params
   * @param {THREE.Scene} params.scene
   * @param {THREE.Camera} params.camera
   * @param {HTMLElement} params.domElement
   * @param {GroundClamping} [params.groundClamping]
   */
  constructor({ scene, camera, domElement, groundClamping = null }) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.groundClamping = groundClamping || new GroundClamping();

    this.enabled = false;
    this.isLoaded = false;
    this.isLoading = false;

    // Model & Animation
    this.model = null;
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.currentState = 'idle'; // 'idle' | 'walk' | 'run' | 'jump'

    // Physics & Kinematics
    this.position = new THREE.Vector3(2.2, 0.135, 0.02); // Dragon bridge pedestrian walkway
    this.velocity = new THREE.Vector3();
    this.verticalVelocity = 0;
    this.onGround = true;

    // Movement speeds (1 unit = 100m)
    this.walkSpeed = 0.014;  // ~5.0 km/h
    this.runSpeed = 0.038;   // ~13.7 km/h
    this.jumpForce = 0.018;  // ~1.2m jump height
    this.turnDamping = 12.0;

    // Camera Rig (GTA Style)
    this.cameraMode = 'tps'; // 'tps' | 'fps'
    this.yaw = 0.0;
    this.pitch = 0.22;
    this.targetCameraDistance = 0.035; // 3.5m behind character
    this.cameraDistance = 0.035;
    this.cameraLookAt = new THREE.Vector3();
    this.idealCameraPos = new THREE.Vector3();

    // Mouse & Pointer Lock
    this.isPointerLocked = false;
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseSensitivity = 0.0024;

    // Input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false
    };

    // Predefined spawn locations across Da Nang
    this.spawnPoints = {
      'cau-rong': {
        name: 'Cầu Rồng (Lối đi bộ ngắm đầu Rồng)',
        pos: new THREE.Vector3(2.20, 0.135, 0.02),
        yaw: Math.PI / 2
      },
      'my-khe': {
        name: 'Bãi Biển Mỹ Khê (Bờ cát vàng)',
        pos: new THREE.Vector3(21.20, 0.020, 0.15),
        yaw: -Math.PI / 4
      },
      'ngu-hanh-son': {
        name: 'Ngũ Hành Sơn (Lối lên Chùa Linh Ứng)',
        pos: new THREE.Vector3(38.60, 0.220, 65.20),
        yaw: 0.0
      },
      'cau-song-han': {
        name: 'Cầu Sông Hàn (Mặt cầu quay)',
        pos: new THREE.Vector3(-0.20, 0.155, -12.25),
        yaw: Math.PI
      }
    };
    this.currentSpawnKey = 'cau-rong';

    // Callbacks
    this.onStateChange = null;

    // Bind event handlers
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
  }

  /**
   * Asynchronously loads the tourist character model and extracts animations.
   * @param {string} [modelPath]
   * @returns {Promise<THREE.Group>}
   */
  async load(modelPath = null) {
    if (this.isLoaded) return this.model;
    if (this.isLoading) return null;

    this.isLoading = true;
    const basePath = import.meta.env.BASE_URL || '/';
    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const resolvedPath = modelPath || `${cleanBase}models/character/player.glb`;

    const loader = createGltfLoader();

    return new Promise((resolve, reject) => {
      loader.load(
        resolvedPath,
        (gltf) => {
          this.model = gltf.scene;
          this.model.name = 'PlayerCharacter';

          // 1 Three.js unit = 100 meters. Human height ~ 1.73m -> scale = 0.01
          this.model.scale.setScalar(0.01);
          this.model.position.copy(this.position);

          this.model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.roughness = Math.max(child.material.roughness, 0.4);
              }
            }
          });

          // Animation setup
          this.mixer = new THREE.AnimationMixer(this.model);

          gltf.animations.forEach((clip) => {
            const name = clip.name;
            const action = this.mixer.clipAction(clip);
            this.animations[name] = action;

            // Alias common names
            if (name.includes('Idle')) this.animations['idle'] = action;
            if (name.includes('Walk')) this.animations['walk'] = action;
            if (name.includes('Run')) this.animations['run'] = action;
          });

          // Fallbacks if aliases not matched
          if (!this.animations['idle'] && gltf.animations[0]) {
            this.animations['idle'] = this.mixer.clipAction(gltf.animations[0]);
          }
          if (!this.animations['walk']) this.animations['walk'] = this.animations['idle'];
          if (!this.animations['run']) this.animations['run'] = this.animations['walk'];

          // Start in idle
          this._playAction('idle');

          this.isLoaded = true;
          this.isLoading = false;
          resolve(this.model);
        },
        undefined,
        (err) => {
          this.isLoading = false;
          console.error('[CharacterController] Failed to load character:', err);
          reject(err);
        }
      );
    });
  }

  /**
   * Activates walking exploration mode.
   * @param {string} [spawnPointKey]
   */
  enable(spawnPointKey = null) {
    if (this.enabled) return;
    this.enabled = true;

    if (!this.model && !this.isLoading) {
      this.load().then(() => {
        if (this.enabled) {
          this._mountCharacter(spawnPointKey);
        }
      });
    } else if (this.model) {
      this._mountCharacter(spawnPointKey);
    }

    // Attach user input listeners
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    this.domElement.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    this.domElement.addEventListener('wheel', this._onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this._onPointerLockChange);

    // Optimize camera near plane for human scale (0.5m instead of 5m)
    this.camera.near = 0.005;
    this.camera.updateProjectionMatrix();

    if (this.onStateChange) {
      this.onStateChange({
        enabled: true,
        location: this.spawnPoints[this.currentSpawnKey]?.name || 'Đà Nẵng',
        mode: this.cameraMode
      });
    }
  }

  /**
   * Deactivates character controller and releases inputs.
   */
  disable() {
    if (!this.enabled) return;
    this.enabled = false;

    // Detach inputs
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    this.domElement.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    this.domElement.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Hide character model
    if (this.model && this.model.parent) {
      this.scene.remove(this.model);
    }

    // Restore camera near plane
    this.camera.near = 0.05;
    this.camera.updateProjectionMatrix();

    if (this.onStateChange) {
      this.onStateChange({ enabled: false });
    }
  }

  /**
   * Teleports character to a designated spawn location.
   * @param {string} spawnKey
   */
  teleportTo(spawnKey) {
    const sp = this.spawnPoints[spawnKey];
    if (!sp) return;

    this.currentSpawnKey = spawnKey;
    this.position.copy(sp.pos);
    this.yaw = sp.yaw;
    this.verticalVelocity = 0;

    if (this.model) {
      this.model.position.copy(this.position);
      this.model.rotation.y = this.yaw;
    }

    if (this.onStateChange) {
      this.onStateChange({
        enabled: this.enabled,
        location: sp.name,
        mode: this.cameraMode
      });
    }
  }

  /**
   * Cycles to the next spawn location.
   */
  cycleSpawnLocation() {
    const keys = Object.keys(this.spawnPoints);
    const currIdx = keys.indexOf(this.currentSpawnKey);
    const nextKey = keys[(currIdx + 1) % keys.length];
    this.teleportTo(nextKey);
  }

  /**
   * Toggles between Third-Person (TPS) and First-Person (FPS).
   */
  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'tps' ? 'fps' : 'tps';
    if (this.model) {
      this.model.visible = this.cameraMode === 'tps';
    }
    if (this.onStateChange) {
      this.onStateChange({
        enabled: this.enabled,
        location: this.spawnPoints[this.currentSpawnKey]?.name,
        mode: this.cameraMode
      });
    }
  }

  /**
   * Requests browser pointer lock for immersive camera look.
   */
  requestPointerLock() {
    if (!document.pointerLockElement && this.enabled) {
      this.domElement.requestPointerLock();
    }
  }

  /**
   * Main per-frame update loop.
   * @param {number} delta - Frame time in seconds
   */
  update(delta) {
    if (!this.enabled || !this.isLoaded || !this.model) return;

    // 1. Advance Animation Mixer
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // 2. Compute Movement Input Vector
    const moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    const moveZ = (this.keys.backward ? 1 : 0) - (this.keys.forward ? 1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    // 3. State & Speed Selection
    let targetSpeed = 0;
    let nextState = 'idle';

    if (isMoving) {
      if (this.keys.sprint) {
        targetSpeed = this.runSpeed;
        nextState = 'run';
      } else {
        targetSpeed = this.walkSpeed;
        nextState = 'walk';
      }
    }

    if (!this.onGround) {
      nextState = 'jump';
    }

    if (nextState !== this.currentState) {
      this._playAction(nextState);
    }

    // 4. Movement in Camera Yaw Space
    if (isMoving) {
      // Camera forward and right vectors
      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize();
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, -moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      // Translate position
      this.position.x += moveDir.x * targetSpeed * delta;
      this.position.z += moveDir.z * targetSpeed * delta;

      // Rotate character model to face movement direction smoothly
      // In Three.js Mixamo soldier, front faces +Z or opposite
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      const curAngle = this.model.rotation.y;
      this.model.rotation.y = THREE.MathUtils.lerp(curAngle, targetAngle, Math.min(1.0, this.turnDamping * delta));
    }

    // 5. Jump Kinematics
    if (this.keys.jump && this.onGround) {
      this.verticalVelocity = this.jumpForce;
      this.onGround = false;
      this.keys.jump = false; // Trigger once per press
    }

    // 6. Ground Clamping, Gravity, and Stair Step-Up
    const clampResult = this.groundClamping.clamp(this.position, this.verticalVelocity, delta);
    this.onGround = clampResult.onGround;
    this.verticalVelocity = clampResult.newVerticalVelocity;

    // Sync model position
    this.model.position.copy(this.position);

    // 7. Update Third-Person Camera Rig
    this._updateCamera(delta);
  }

  /**
   * Internal routine to switch animations with smooth cross-fading.
   * @private
   */
  _playAction(name) {
    const newAction = this.animations[name];
    if (!newAction || newAction === this.currentAction) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }

    newAction.reset().fadeIn(0.2).play();
    this.currentAction = newAction;
    this.currentState = name;
  }

  /**
   * Updates camera following spring arm and look-at target.
   * @private
   */
  _updateCamera(delta) {
    // Smooth zoom damping
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.targetCameraDistance, 0.15);

    if (this.cameraMode === 'fps') {
      // First-person eye level: ~1.65m height (0.0165 units)
      const eyePos = this.position.clone().add(new THREE.Vector3(0, 0.0165, 0));
      this.camera.position.copy(eyePos);

      const lookTarget = eyePos.clone().add(new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      ));
      this.camera.lookAt(lookTarget);
    } else {
      // Third-person behind character
      // Target chest level: ~1.3m height (0.013 units)
      const targetPos = this.position.clone().add(new THREE.Vector3(0, 0.013, 0));
      this.cameraLookAt.lerp(targetPos, Math.min(1.0, 16.0 * delta));

      // Calculate camera position offset from yaw and pitch
      const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.cameraDistance;
      const offsetY = Math.sin(this.pitch) * this.cameraDistance + 0.003;
      const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * this.cameraDistance;

      this.idealCameraPos.set(
        this.cameraLookAt.x + offsetX,
        this.cameraLookAt.y + offsetY,
        this.cameraLookAt.z + offsetZ
      );

      // Smooth spring arm position interpolation
      this.camera.position.lerp(this.idealCameraPos, Math.min(1.0, 18.0 * delta));
      this.camera.lookAt(this.cameraLookAt);
    }
  }

  /**
   * Attaches model to scene and teleports to initial spawn point.
   * @private
   */
  _mountCharacter(spawnKey) {
    if (!this.model.parent) {
      this.scene.add(this.model);
    }
    this.model.visible = this.cameraMode === 'tps';
    const key = spawnKey || this.currentSpawnKey;
    this.teleportTo(key);
  }

  /**
   * Keyboard Keydown Listener.
   * @private
   */
  _onKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Space':
        if (this.onGround) this.keys.jump = true;
        break;
      case 'KeyV':
        this.toggleCameraMode();
        break;
      case 'KeyC':
        this.cycleSpawnLocation();
        break;
      case 'Escape':
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        break;
    }
  }

  /**
   * Keyboard Keyup Listener.
   * @private
   */
  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
    }
  }

  /**
   * Mouse Movement Listener (Supports Pointer Lock and Mouse Drag).
   * @private
   */
  _onMouseMove(e) {
    if (!this.enabled) return;

    if (this.isPointerLocked) {
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch = Math.max(-0.45, Math.min(1.15, this.pitch - e.movementY * this.mouseSensitivity));
    } else if (this.isMouseDown) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.yaw -= dx * this.mouseSensitivity;
      this.pitch = Math.max(-0.45, Math.min(1.15, this.pitch - dy * this.mouseSensitivity));
    }
  }

  /**
   * Mouse Down Listener.
   * @private
   */
  _onMouseDown(e) {
    if (!this.enabled) return;
    this.isMouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    // Click canvas in walking mode to activate Pointer Lock
    if (!this.isPointerLocked && e.button === 0) {
      this.requestPointerLock();
    }
  }

  /**
   * Mouse Up Listener.
   * @private
   */
  _onMouseUp() {
    this.isMouseDown = false;
  }

  /**
   * Mouse Wheel Zoom Listener.
   * @private
   */
  _onWheel(e) {
    if (!this.enabled || this.cameraMode === 'fps') return;
    const zoomDelta = e.deltaY * 0.00003;
    this.targetCameraDistance = THREE.MathUtils.clamp(
      this.targetCameraDistance + zoomDelta,
      0.012, // Min 1.2m
      0.075  // Max 7.5m
    );
  }

  /**
   * Pointer Lock State Listener.
   * @private
   */
  _onPointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
  }
}
