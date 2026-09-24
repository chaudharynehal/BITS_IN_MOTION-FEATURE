import { initializePoseLandmarker } from './poseLandmarker';

export const JOINTS = {
  NOSE: 0, LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3, RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8, MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_ELBOW: 13, RIGHT_ELBOW: 14, LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18, LEFT_INDEX: 19, RIGHT_INDEX: 20, LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25, RIGHT_KNEE: 26, LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30, LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

/**
 * Create a MediaPipe pose provider.
 * @param {string} [_backendType] - Ignored; MediaPipe is the only backend.
 * @param {Function} [onFallback] - Called if GPU delegate fails.
 * @returns {Promise<{detect: Function, close: Function, backendType: string}>}
 */
export async function createPoseProvider(_backendType = 'mediapipe', onFallback) {
  const landmarker = await initializePoseLandmarker(onFallback);

  return {
    backendType: 'mediapipe',
    close: () => landmarker.close(),
    detect(video, timestamp) {
      const t0 = performance.now();
      const result = landmarker.detectForVideo(video, timestamp);
      const inferenceLatency = performance.now() - t0;
      return {
        backend: 'mediapipe',
        timestamp,
        inferenceLatency,
        landmarks: result.landmarks || [],
        worldLandmarks: result.worldLandmarks || [],
        raw: result,
      };
    },
  };
}
