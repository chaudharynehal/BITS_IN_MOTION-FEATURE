import { initializePoseLandmarker } from './poseLandmarker';
import { initializeMovenet } from './movenetBackend';

export const JOINTS = {
  NOSE: 0, LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3, RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8, MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12, LEFT_ELBOW: 13, RIGHT_ELBOW: 14, LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18, LEFT_INDEX: 19, RIGHT_INDEX: 20, LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24, LEFT_KNEE: 25, RIGHT_KNEE: 26, LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30, LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

const MOVENET_TO_CANONICAL = {
  0: JOINTS.NOSE, 1: JOINTS.LEFT_EYE, 2: JOINTS.RIGHT_EYE, 3: JOINTS.LEFT_EAR, 4: JOINTS.RIGHT_EAR,
  5: JOINTS.LEFT_SHOULDER, 6: JOINTS.RIGHT_SHOULDER, 7: JOINTS.LEFT_ELBOW, 8: JOINTS.RIGHT_ELBOW,
  9: JOINTS.LEFT_WRIST, 10: JOINTS.RIGHT_WRIST, 11: JOINTS.LEFT_HIP, 12: JOINTS.RIGHT_HIP,
  13: JOINTS.LEFT_KNEE, 14: JOINTS.RIGHT_KNEE, 15: JOINTS.LEFT_ANKLE, 16: JOINTS.RIGHT_ANKLE,
};

function normalizeMovenetKeypoints(keypoints, width, height) {
  const landmarks = new Array(33).fill(null);
  if (!keypoints || !width || !height) return landmarks;
  keypoints.forEach((kp, idx) => {
    const canonicalIdx = MOVENET_TO_CANONICAL[idx];
    if (canonicalIdx !== undefined) {
      landmarks[canonicalIdx] = {
        x: kp.x / width,
        y: kp.y / height,
        z: 0,
        visibility: kp.score,
        presence: kp.score,
      };
    }
  });
  return landmarks;
}

export async function createPoseProvider(backendType = 'mediapipe', onFallback, onStatus) {
  let backend = null;
  const t0 = performance.now();
  
  if (backendType === 'movenet') {
    backend = await initializeMovenet(onStatus);
  } else {
    backend = await initializePoseLandmarker(onFallback);
  }

  return {
    backendType,
    close: () => backend.close(),
    detect: async (video, timestamp) => {
      const t1 = performance.now();
      let result;
      if (backendType === 'movenet') {
        result = await backend.detectForVideo(video, timestamp);
      } else {
        result = backend.detectForVideo(video, timestamp);
      }
      const inferenceLatency = performance.now() - t1;

      const canonical = {
        backend: backendType,
        timestamp,
        inferenceLatency,
        landmarks: [],
        worldLandmarks: [],
        raw: result,
      };

      if (backendType === 'movenet') {
        const poses = result.poses || [];
        if (poses.length > 0) {
           canonical.landmarks = [normalizeMovenetKeypoints(poses[0].keypoints, video.videoWidth, video.videoHeight)];
           canonical.worldLandmarks = [];
        }
      } else {
        canonical.landmarks = result.landmarks || [];
        canonical.worldLandmarks = result.worldLandmarks || [];
      }

      return canonical;
    }
  };
}
