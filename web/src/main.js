import { SceneManager } from './scene/SceneManager.js';
import { Ground } from './scene/Ground.js';
import { LandmarkLoader } from './landmarks/LandmarkLoader.js';
import { DragonEffects } from './scene/DragonEffects.js';

const infoPanel = document.querySelector('#info-panel');

async function bootstrap() {
  const sceneManager = new SceneManager('#app');

  // Cảnh quan Sông Hàn & bờ kè Đà Nẵng
  const ground = new Ground();
  ground.addTo(sceneManager.scene);

  // Hệ thống hiệu ứng Phun lửa / Phun nước / LED đêm
  const dragonEffects = new DragonEffects(sceneManager.scene);

  const landmarkLoader = new LandmarkLoader();
  let landmarks = [];
  let cauRongModel = null;

  try {
    landmarks = await landmarkLoader.loadAll('/data/landmarks.json');
  } catch (err) {
    console.error('Không tải được danh sách địa danh:', err);
  }

  if (landmarks.length === 0) {
    infoPanel.textContent = 'Đang chờ tải mô hình Cầu Rồng...';
  } else {
    infoPanel.textContent = `Đã nạp ${landmarks.length} địa danh 3D (${landmarks.map((l) => l.name).join(', ')})`;
  }

  landmarks.forEach((landmark) => {
    landmark.addTo(sceneManager.scene);
    if (landmark.id === 'cau-rong') {
      cauRongModel = landmark.object3D;
    }
  });

  // Thiết lập các nút điều khiển UI tương tác
  setupUI(sceneManager, dragonEffects, () => cauRongModel);

  // Vòng lặp Render & Animation
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    const time = now / 1000;

    // Sóng nước sông Hàn
    ground.update(time);

    // Cập nhật Camera và hiệu ứng rồng
    sceneManager.update(delta);
    dragonEffects.update(delta, time, cauRongModel);

    sceneManager.render();
  }

  requestAnimationFrame(animate);
}

function setupUI(sceneManager, dragonEffects, getBridgeModel) {
  // 1. Góc nhìn Camera
  const camButtons = {
    'cam-overview': 'overview',
    'cam-head': 'head',
    'cam-tail': 'tail',
    'cam-deck': 'deck',
    'cam-river': 'river'
  };

  const allCamBtns = Object.keys(camButtons).map(id => document.getElementById(id)).filter(Boolean);

  Object.entries(camButtons).forEach(([id, presetKey]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        allCamBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sceneManager.setCameraPreset(presetKey);
      });
    }
  });

  // 2. Chế độ Bầu trời & Ánh sáng
  const lightButtons = {
    'light-day': 'day',
    'light-sunset': 'sunset',
    'light-night': 'night'
  };

  const allLightBtns = Object.keys(lightButtons).map(id => document.getElementById(id)).filter(Boolean);

  Object.entries(lightButtons).forEach(([id, mode]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        allLightBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sceneManager.setLightingMode(mode);
        dragonEffects.setNightMode(mode === 'night', getBridgeModel());
      });
    }
  });

  // 3. Trình diễn Phun Lửa / Phun Nước
  const fireBtn = document.getElementById('effect-fire');
  const waterBtn = document.getElementById('effect-water');

  if (fireBtn) {
    fireBtn.addEventListener('click', () => {
      const willBeActive = !fireBtn.classList.contains('active');
      fireBtn.classList.toggle('active', willBeActive);
      if (waterBtn) waterBtn.classList.remove('active');
      dragonEffects.toggleFire(willBeActive);

      // Tự động lia camera về đầu rồng nếu đang ở xa
      if (willBeActive && sceneManager.camera.position.length() > 6) {
        sceneManager.setCameraPreset('head');
        allCamBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('cam-head')?.classList.add('active');
      }
    });
  }

  if (waterBtn) {
    waterBtn.addEventListener('click', () => {
      const willBeActive = !waterBtn.classList.contains('active');
      waterBtn.classList.toggle('active', willBeActive);
      if (fireBtn) fireBtn.classList.remove('active');
      dragonEffects.toggleWater(willBeActive);

      if (willBeActive && sceneManager.camera.position.length() > 6) {
        sceneManager.setCameraPreset('head');
        allCamBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('cam-head')?.classList.add('active');
      }
    });
  }
}

bootstrap();
