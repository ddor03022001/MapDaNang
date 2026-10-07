#!/usr/bin/env node
/**
 * scripts/compute-scene-positions.mjs
 *
 * Đọc data/map-config.json (gốc toạ độ + phép chiếu) và data/landmarks.json
 * (toạ độ GPS thật của từng địa danh), tự tính lại field "scenePosition"
 * cho mỗi landmark, rồi ghi đè lại landmarks.json và đồng bộ sang
 * web/public/data/landmarks.json.
 *
 * Mục đích: không ai phải tính tay toạ độ scene (dễ sai, dễ lệch giữa các
 * địa danh). Mỗi khi thêm/sửa GPS của 1 địa danh, chạy lại script này.
 *
 * Cách dùng:
 *   node scripts/compute-scene-positions.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gpsToScene } from '../web/src/utils/geo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CONFIG_PATH = path.join(ROOT, 'data', 'map-config.json');
const LANDMARKS_PATH = path.join(ROOT, 'data', 'landmarks.json');
const WEB_PUBLIC_LANDMARKS_PATH = path.join(ROOT, 'web', 'public', 'data', 'landmarks.json');

function main() {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  const landmarksFile = JSON.parse(readFileSync(LANDMARKS_PATH, 'utf-8'));

  for (const landmark of landmarksFile.landmarks) {
    // elevationMeters là input ổn định (mét thật, đặt tay, KHÔNG đổi theo scale).
    // Không đọc ngược từ scenePosition.y vì giá trị đó là OUTPUT đã chia scale,
    // đọc ngược lại sẽ làm elevation bị chia lặp mỗi lần chạy script.
    const elevationMeters = landmark.elevationMeters ?? 0;
    const scenePosition = gpsToScene(landmark.gps, config, elevationMeters);

    landmark.scenePosition = {
      x: round(scenePosition.x),
      y: round(scenePosition.y),
      z: round(scenePosition.z)
    };

    console.log(
      `[${landmark.id}] GPS(${landmark.gps.lat}, ${landmark.gps.lng}) elevation=${elevationMeters}m -> scene(${landmark.scenePosition.x}, ${landmark.scenePosition.y}, ${landmark.scenePosition.z})`
    );
  }

  const output = JSON.stringify(landmarksFile, null, 2) + '\n';
  writeFileSync(LANDMARKS_PATH, output, 'utf-8');

  mkdirSync(path.dirname(WEB_PUBLIC_LANDMARKS_PATH), { recursive: true });
  writeFileSync(WEB_PUBLIC_LANDMARKS_PATH, output, 'utf-8');

  console.log('\nĐã cập nhật scenePosition trong:');
  console.log(`  - ${path.relative(ROOT, LANDMARKS_PATH)}`);
  console.log(`  - ${path.relative(ROOT, WEB_PUBLIC_LANDMARKS_PATH)}`);
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

main();
