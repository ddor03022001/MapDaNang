import { overviewConfig } from './overview/config.js';
import { cauRongConfig } from './cau-rong/config.js';
import { cauSongHanConfig } from './cau-song-han/config.js';
import { myKheConfig } from './my-khe/config.js';
import { nguHanhSonConfig } from './ngu-hanh-son/config.js';

/**
 * Centralized registry for all Da Nang map landmarks and urban locations.
 * Allows effortless scalability when adding future landmarks (e.g. Ba Na Hills, Son Tra Peninsula).
 */
export const LANDMARK_REGISTRY = {
  'overview': overviewConfig,
  'cau-rong': cauRongConfig,
  'cau-song-han': cauSongHanConfig,
  'my-khe': myKheConfig,
  'ngu-hanh-son': nguHanhSonConfig,
  'nguhanh-son': nguHanhSonConfig,
};

/**
 * Returns configuration object for a specific landmark ID.
 * @param {string} id
 * @returns {object|null}
 */
export function getLandmarkConfig(id) {
  return LANDMARK_REGISTRY[id] || null;
}

/**
 * Returns an array of all registered landmark configurations.
 * @returns {object[]}
 */
export function getAllLandmarkConfigs() {
  return Object.values(LANDMARK_REGISTRY);
}
