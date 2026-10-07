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
  setupUI(sceneManager, dragonEffects, ground, () => cauRongModel);

  // Vòng lặp Render & Animation
  let lastTime = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = (now - lastTime) / 1000;
    lastTime = now;
    const time = now / 1000;

    // Sóng nước sông Hàn & Xe cộ giao thông
    ground.update(time, delta);

    // Cập nhật Camera và hiệu ứng rồng
    sceneManager.update(delta);
    dragonEffects.update(delta, time, cauRongModel);

    sceneManager.render();
  }

  requestAnimationFrame(animate);
}

function setupUI(sceneManager, dragonEffects, ground, getBridgeModel) {
  const cardTitle = document.querySelector('.landmark-card h2');
  const cardSub = document.querySelector('.landmark-card .subtitle');
  const cardDesc = document.querySelector('.landmark-card p');
  const cardStats = document.querySelector('.landmark-card .stats-grid');

  function updateCard(type) {
    if (!cardTitle || !cardStats) return;
    if (type === 'song-han') {
      cardTitle.innerHTML = 'Cầu Sông Hàn <span>🌉</span>';
      cardSub.textContent = 'Han River Swing Bridge • Cầu quay đầu tiên tại VN';
      cardDesc.textContent = 'Cây cầu quay lịch sử kết nối đường Lê Duẩn (Hải Châu) và Phạm Văn Đồng (Sơn Trà). Nhịp giữa có khả năng xoay 90 độ cho tàu bè trọng tải lớn qua lại.';
      cardStats.innerHTML = `
        <div class="stat-item"><div class="stat-label">Chiều dài thật</div><div class="stat-val">487.7 m</div></div>
        <div class="stat-item"><div class="stat-label">Chiều rộng cầu</div><div class="stat-val">12.9 m</div></div>
        <div class="stat-item"><div class="stat-label">Nhịp dầm quay</div><div class="stat-val">122.8 m (xoay 90°)</div></div>
        <div class="stat-item"><div class="stat-label">Tháp cáp chữ A</div><div class="stat-val">Cao 25.3 m • Dây văng</div></div>
      `;
    } else if (type === 'city') {
      cardTitle.innerHTML = 'Đô Thị Sông Hàn <span>🏙️</span>';
      cardSub.textContent = 'Trung tâm TP Đà Nẵng • Hải Châu & Sơn Trà';
      cardDesc.textContent = 'Mạng lưới đường xá và các công trình biểu tượng ven sông Hàn: Tòa nhà Trung tâm Hành chính, Novotel, Hilton, Công viên APEC, Bảo tàng Chăm, Cầu Tình Yêu.';
      cardStats.innerHTML = `
        <div class="stat-item"><div class="stat-label">Trục Đông - Tây</div><div class="stat-val">Nguyễn Văn Linh / Võ Văn Kiệt</div></div>
        <div class="stat-item"><div class="stat-label">Trục ven sông</div><div class="stat-val">Bạch Đằng / Trần Hưng Đạo</div></div>
        <div class="stat-item"><div class="stat-label">Tòa nhà cao nhất</div><div class="stat-val">TTHC 34 tầng (167m)</div></div>
        <div class="stat-item"><div class="stat-label">Công viên biểu tượng</div><div class="stat-val">Mái vòm APEC • Cầu Tình Yêu</div></div>
      `;
    } else {
      cardTitle.innerHTML = 'Cầu Rồng Đà Nẵng <span>⭐</span>';
      cardSub.textContent = 'Dragon Bridge • Biểu tượng sông Hàn';
      cardDesc.textContent = 'Cây cầu vòm thép đơn độc đáo mô phỏng con rồng thời Lý bay ra biển Đông. Đầu rồng ngẩng cao tại bờ Đông (Sơn Trà), đuôi hoa sen nở tại bờ Tây (Hải Châu).';
      cardStats.innerHTML = `
        <div class="stat-item"><div class="stat-label">Chiều dài thật</div><div class="stat-val">666 m (6 làn xe)</div></div>
        <div class="stat-item"><div class="stat-label">Chiều rộng mặt cầu</div><div class="stat-val">37.5 m</div></div>
        <div class="stat-item"><div class="stat-label">Chiều cao vòm rồng</div><div class="stat-val">48.0 m (5 nhịp)</div></div>
        <div class="stat-item"><div class="stat-label">Đầu rồng thời Lý</div><div class="stat-val">18.2 m • 194.1 tấn</div></div>
      `;
    }
  }

  // 1. Góc nhìn Camera
  const camButtons = {
    'cam-overview': 'overview',
    'cam-head': 'head',
    'cam-tail': 'tail',
    'cam-deck': 'deck',
    'cam-river': 'river',
    'cam-song-han': 'song-han',
    'cam-city': 'city'
  };

  const allCamBtns = Object.keys(camButtons).map(id => document.getElementById(id)).filter(Boolean);

  Object.entries(camButtons).forEach(([id, presetKey]) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        allCamBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sceneManager.setCameraPreset(presetKey);
        updateCard(presetKey);
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
        if (ground && ground.setNightMode) {
          ground.setNightMode(mode === 'night');
        }
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
