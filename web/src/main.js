import { SceneManager } from './scene/SceneManager.js';
import { Ground } from './scene/Ground.js';
import { LandmarkLoader } from './landmarks/LandmarkLoader.js';
import { DragonEffects } from './landmarks/cau-rong/DragonEffects.js';
import { AudioSynthesizer } from './core/AudioSynthesizer.js';
import { LANDMARK_REGISTRY, getLandmarkConfig } from './landmarks/registry.js';

/**
 * Main application bootstrap routine.
 * Initializes 3D scene, geographic terrain, procedural landmarks, audio engines,
 * and reactive UI controls.
 */
async function bootstrap() {
  const sceneManager = new SceneManager('#app');

  // Initialize geographical environment (Han River, city grid, My Khe beach)
  const ground = new Ground();
  ground.addTo(sceneManager.scene);

  // Initialize landmark-specific visual effects
  const dragonEffects = new DragonEffects(sceneManager.scene);

  // Procedural ocean audio synthesizer (zero external audio assets required)
  const oceanAudio = new AudioSynthesizer();

  const landmarkLoader = new LandmarkLoader();
  let landmarks = [];
  let cauRongModel = null;
  let nguHanhSonModel = null;

  const statusText = document.querySelector('#status-text');

  try {
    landmarks = await landmarkLoader.loadAll();
  } catch (err) {
    console.error('Failed to load landmarks:', err);
  }

  if (landmarks.length === 0) {
    if (statusText) statusText.textContent = 'Awaiting Dragon Bridge 3D model...';
  } else {
    if (statusText) {
      statusText.textContent = `Loaded ${landmarks.length} 3D landmarks (${landmarks.map((l) => l.name).join(', ')})`;
    }
  }

  landmarks.forEach((landmark) => {
    landmark.addTo(sceneManager.scene);
    if (landmark.id === 'cau-rong') {
      cauRongModel = landmark.object3D;
    }
    if (landmark.id === 'nguhanh-son') {
      nguHanhSonModel = landmark.object3D;
    }
  });

  // Mount reactive sidebar navigation and feature controls
  setupSidebarUI(sceneManager, dragonEffects, ground, oceanAudio, () => cauRongModel, () => nguHanhSonModel);

  // Animation and render loop
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    const time = now / 1000;

    // Update environmental animations (river currents, traffic lanes, ocean waves)
    ground.update(time, delta);

    // Update smooth camera transitions and particle systems
    sceneManager.update(delta);
    dragonEffects.update(delta, time, cauRongModel);

    sceneManager.render();
  }

  requestAnimationFrame(animate);
}

/**
 * Sets up sidebar panel, lighting toggles, landmark navigation tabs,
 * camera controls, and landmark-specific interactive features.
 * 
 * @param {SceneManager} sceneManager 
 * @param {DragonEffects} dragonEffects 
 * @param {Ground} ground 
 * @param {AudioSynthesizer} oceanAudio 
 * @param {() => THREE.Object3D|null} getBridgeModel 
 * @param {() => THREE.Object3D|null} [getNhsModel]
 */
function setupSidebarUI(sceneManager, dragonEffects, ground, oceanAudio, getBridgeModel, getNhsModel) {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const toggleIcon = document.getElementById('toggle-icon');
  const detailsContainer = document.getElementById('landmark-details');
  const navTabs = document.querySelectorAll('.nav-tab');

  // Internal reactive application state
  const state = {
    activeLandmark: 'overview',
    activeCamera: 'overview:city',
    isFireActive: false,
    isWaterActive: false,
    isWaveSurgeActive: false,
    isAudioActive: false,
    isTrafficActive: true,
    isDivineLightActive: true,
    currentLighting: 'day'
  };

  // 1. Sidebar Collapse/Expand Toggle
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      if (toggleIcon) {
        toggleIcon.textContent = isCollapsed ? '▶' : '◀';
      }
    });
  }

  // 2. Lighting Mode Controls (Day / Sunset / Night)
  const lightModeButtons = {
    'light-day': 'day',
    'light-sunset': 'sunset',
    'light-night': 'night'
  };

  function setLighting(mode) {
    state.currentLighting = mode;
    Object.keys(lightModeButtons).forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (btn) btn.classList.toggle('active', lightModeButtons[btnId] === mode);
    });

    sceneManager.setLightingMode(mode);
    dragonEffects.setNightMode(mode === 'night', getBridgeModel());
    if (ground && ground.setNightMode) {
      ground.setNightMode(mode === 'night', getNhsModel ? getNhsModel() : null);
    }
  }

  Object.entries(lightModeButtons).forEach(([btnId, mode]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => setLighting(mode));
    }
  });

  // 3. Render Landmark Detail & Feature Action Panel
  function renderLandmarkPanel(landmarkKey) {
    const config = getLandmarkConfig(landmarkKey);
    if (!config || !detailsContainer) return;

    state.activeLandmark = landmarkKey;
    state.activeCamera = config.defaultCamera;

    // Synchronize active tab styling
    navTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.getAttribute('data-landmark') === landmarkKey);
    });

    // Build detail view markup
    let html = `
      <!-- Landmark Header -->
      <div class="landmark-header">
        <h2>${config.name} <span>${config.icon}</span></h2>
        <div class="subtitle">${config.subtitle}</div>
        <p class="desc">${config.desc}</p>
      </div>

      <!-- Real-world Engineering Specifications -->
      <div class="stats-grid">
        ${config.stats.map(s => `
          <div class="stat-item">
            <div class="stat-label">${s.label}</div>
            <div class="stat-val">${s.val}</div>
          </div>
        `).join('')}
      </div>

      <!-- Landmark Perspective Presets -->
      <div class="section-block">
        <div class="section-title">Góc Nhìn Khám Phá</div>
        <div class="action-grid">
          ${config.cameras.map(c => `
            <button class="btn-action ${c.preset === state.activeCamera ? 'active' : ''}" data-cam="${c.preset}">
              <span>${c.icon}</span> ${c.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Landmark-Specific Interactive Features
    if (config.features && config.features.length > 0) {
      html += `
        <div class="section-block">
          <div class="section-title">Tính Năng Tương Tác</div>
          <div class="action-grid">
            ${config.features.map(f => {
              let isActive = false;
              let labelText = f.label;

              if (f.type === 'fire') isActive = state.isFireActive;
              else if (f.type === 'water') isActive = state.isWaterActive;
              else if (f.type === 'wave') {
                isActive = state.isWaveSurgeActive;
                labelText = isActive ? 'Sóng Lớn Cuộn Trào' : 'Sóng Biển Êm Dịu';
              }
              else if (f.type === 'audio') {
                isActive = state.isAudioActive;
                labelText = isActive ? 'Tắt Tiếng Sóng' : 'Tiếng Sóng Biển';
              }
              else if (f.type === 'toggle') {
                isActive = state.isTrafficActive;
                labelText = isActive ? 'Đang Chạy Xe' : 'Tạm Dừng Xe';
              }
              else if (f.type === 'light-beam') {
                isActive = state.isDivineLightActive;
                labelText = isActive ? 'Tắt Luồng Sáng' : 'Luồng Sáng Giếng Trời';
              }
              else if (f.type === 'bell') {
                isActive = false;
                labelText = f.label;
              }

              return `
                <button class="btn-action ${f.className || ''} ${isActive ? 'active' : ''}" data-feature="${f.id}" id="${f.id}">
                  <span>${f.icon}</span> <span class="feat-label">${labelText}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    detailsContainer.innerHTML = html;

    // Bind camera angle button events
    detailsContainer.querySelectorAll('[data-cam]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-cam');
        state.activeCamera = preset;
        detailsContainer.querySelectorAll('[data-cam]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sceneManager.setCameraPreset(preset);
      });
    });

    // Bind feature action handlers
    detailsContainer.querySelectorAll('[data-feature]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const featId = btn.getAttribute('data-feature');
        handleFeatureAction(featId, btn);
      });
    });
  }

  /**
   * Dispatches feature button interactions based on identifier.
   * @param {string} featId 
   * @param {HTMLElement} btn 
   */
  function handleFeatureAction(featId, btn) {
    if (featId === 'feat-fire') {
      state.isFireActive = !state.isFireActive;
      if (state.isFireActive) {
        state.isWaterActive = false;
        const wBtn = document.getElementById('feat-water');
        if (wBtn) wBtn.classList.remove('active');
        dragonEffects.toggleWater(false);
      }
      btn.classList.toggle('active', state.isFireActive);
      dragonEffects.toggleFire(state.isFireActive);

      // Focus camera on dragon head if user is zoomed far away
      if (state.isFireActive && sceneManager.camera.position.length() > 6) {
        sceneManager.setCameraPreset('cau-rong:head');
        state.activeCamera = 'cau-rong:head';
        detailsContainer.querySelectorAll('[data-cam]').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-cam') === 'cau-rong:head');
        });
      }

    } else if (featId === 'feat-water') {
      state.isWaterActive = !state.isWaterActive;
      if (state.isWaterActive) {
        state.isFireActive = false;
        const fBtn = document.getElementById('feat-fire');
        if (fBtn) fBtn.classList.remove('active');
        dragonEffects.toggleFire(false);
      }
      btn.classList.toggle('active', state.isWaterActive);
      dragonEffects.toggleWater(state.isWaterActive);

      // Focus camera on dragon head if user is zoomed far away
      if (state.isWaterActive && sceneManager.camera.position.length() > 6) {
        sceneManager.setCameraPreset('cau-rong:head');
        state.activeCamera = 'cau-rong:head';
        detailsContainer.querySelectorAll('[data-cam]').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-cam') === 'cau-rong:head');
        });
      }

    } else if (featId === 'feat-sh-night') {
      setLighting('night');
      sceneManager.setCameraPreset('cau-song-han:overview');
      state.activeCamera = 'cau-song-han:overview';
      detailsContainer.querySelectorAll('[data-cam]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-cam') === 'cau-song-han:overview');
      });

    } else if (featId === 'feat-wave-surge') {
      state.isWaveSurgeActive = !state.isWaveSurgeActive;
      btn.classList.toggle('active', state.isWaveSurgeActive);
      const lbl = btn.querySelector('.feat-label');
      if (lbl) lbl.textContent = state.isWaveSurgeActive ? 'Sóng Lớn Cuộn Trào' : 'Sóng Biển Êm Dịu';
      if (ground && ground.setWaveIntensity) {
        ground.setWaveIntensity(state.isWaveSurgeActive ? 2.0 : 1.0);
      }

    } else if (featId === 'feat-ocean-audio') {
      state.isAudioActive = oceanAudio.toggle();
      btn.classList.toggle('active', state.isAudioActive);
      const lbl = btn.querySelector('.feat-label');
      if (lbl) lbl.textContent = state.isAudioActive ? 'Tắt Tiếng Sóng' : 'Tiếng Sóng Biển';

    } else if (featId === 'feat-traffic') {
      state.isTrafficActive = !state.isTrafficActive;
      btn.classList.toggle('active', state.isTrafficActive);
      const lbl = btn.querySelector('.feat-label');
      if (lbl) lbl.textContent = state.isTrafficActive ? 'Đang Chạy Xe' : 'Tạm Dừng Xe';
      if (ground && ground.setTrafficEnabled) {
        ground.setTrafficEnabled(state.isTrafficActive);
      }

    } else if (featId === 'feat-temple-bell') {
      // Ring the resonant bronze temple bell of Linh Ung Pagoda
      oceanAudio.playTempleBell();
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 1500);

    } else if (featId === 'feat-divine-light') {
      // Toggle mystical volumetric god ray beam in Huyen Khong Cave
      state.isDivineLightActive = !state.isDivineLightActive;
      btn.classList.toggle('active', state.isDivineLightActive);
      const lbl = btn.querySelector('.feat-label');
      if (lbl) lbl.textContent = state.isDivineLightActive ? 'Tắt Luồng Sáng' : 'Luồng Sáng Giếng Trời';
      if (ground && ground.toggleDivineLight) {
        ground.toggleDivineLight(state.isDivineLightActive);
      }

    } else if (featId === 'feat-nhs-night') {
      // Night mode with illuminated Xa Loi Stupa lanterns
      setLighting('night');
      sceneManager.setCameraPreset('ngu-hanh-son:thap-xa-loi');
      state.activeCamera = 'ngu-hanh-son:thap-xa-loi';
      detailsContainer.querySelectorAll('[data-cam]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-cam') === 'ngu-hanh-son:thap-xa-loi');
      });
    }
  }

  // 4. Bind Landmark Navigation Tabs
  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const landmarkKey = tab.getAttribute('data-landmark');
      const config = getLandmarkConfig(landmarkKey);
      if (config) {
        sceneManager.setCameraPreset(config.defaultCamera);
        renderLandmarkPanel(landmarkKey);
      }
    });
  });

  // Initial landing state
  renderLandmarkPanel('overview');
  sceneManager.setCameraPreset('overview:city');
}

bootstrap();
