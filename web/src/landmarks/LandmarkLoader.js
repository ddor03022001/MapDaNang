import { createGltfLoader } from '../utils/loaders.js';
import { Landmark } from './Landmark.js';

/**
 * LandmarkLoader: đọc data/landmarks.json và load từng model .glb tương ứng.
 * Những landmark chưa có model (model.status === "pending") sẽ bị bỏ qua
 * và chỉ log cảnh báo, để không làm vỡ app khi model chưa được dựng xong.
 */
export class LandmarkLoader {
  constructor() {
    this.gltfLoader = createGltfLoader();
  }

  /**
   * @param {string} jsonUrl - đường dẫn tới landmarks.json
   * @param {string} mapConfigUrl - đường dẫn tới map-config.json (quy ước scale/origin)
   * @returns {Promise<Landmark[]>}
   */
  async loadAll(jsonUrl = '/data/landmarks.json', mapConfigUrl = '/data/map-config.json') {
    const [landmarksRes, mapConfigRes] = await Promise.all([fetch(jsonUrl), fetch(mapConfigUrl)]);

    if (!landmarksRes.ok) {
      throw new Error(`Không tải được metadata địa danh từ ${jsonUrl} (status ${landmarksRes.status})`);
    }
    if (!mapConfigRes.ok) {
      throw new Error(`Không tải được map-config từ ${mapConfigUrl} (status ${mapConfigRes.status})`);
    }

    const { landmarks } = await landmarksRes.json();
    const mapConfig = await mapConfigRes.json();
    const results = [];

    for (const data of landmarks) {
      if (data.model?.status !== 'ready') {
        console.warn(`[LandmarkLoader] Bỏ qua "${data.name}" (${data.id}): model chưa sẵn sàng (status = ${data.model?.status}).`);
        continue;
      }

      try {
        const landmark = await this._loadOne(data, mapConfig);
        results.push(landmark);
      } catch (err) {
        console.error(`[LandmarkLoader] Lỗi khi load model cho "${data.name}" (${data.id}):`, err);
      }
    }

    return results;
  }

  _loadOne(data, mapConfig) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        data.model.path,
        (gltf) => {
          const landmark = new Landmark(data, gltf.scene, mapConfig);
          resolve(landmark);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }
}
