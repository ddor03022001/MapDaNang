import { SceneManager } from './scene/SceneManager.js';
import { Ground } from './scene/Ground.js';
import { LandmarkLoader } from './landmarks/LandmarkLoader.js';

const infoPanel = document.querySelector('#info-panel');

async function bootstrap() {
  const sceneManager = new SceneManager('#app');

  const ground = new Ground();
  ground.addTo(sceneManager.scene);

  const landmarkLoader = new LandmarkLoader();
  let landmarks = [];

  try {
    landmarks = await landmarkLoader.loadAll('/data/landmarks.json');
  } catch (err) {
    console.error('Không tải được danh sách địa danh:', err);
  }

  if (landmarks.length === 0) {
    infoPanel.textContent =
      'Chưa có địa danh nào có model sẵn sàng (status "ready"). Hãy dựng model trong Blender, export .glb, ' +
      'copy vào web/public/models/, rồi cập nhật data/landmarks.json.';
  } else {
    infoPanel.textContent = `Đã tải ${landmarks.length} địa danh: ${landmarks.map((l) => l.name).join(', ')}`;
  }

  landmarks.forEach((landmark) => landmark.addTo(sceneManager.scene));

  function animate() {
    requestAnimationFrame(animate);
    sceneManager.render();
  }
  animate();
}

bootstrap();
