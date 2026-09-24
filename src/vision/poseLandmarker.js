import { DrawingUtils, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const WASM_ROOT = '/mediapipe/wasm';
const MODEL_PATH = '/models/pose_landmarker_lite.task';

async function createWithDelegate(vision, delegate) {
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate,
    },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
}

export async function initializePoseLandmarker(onFallback) {
  const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
  try {
    return await createWithDelegate(vision, 'GPU');
  } catch (gpuError) {
    onFallback?.(gpuError);
    return createWithDelegate(vision, 'CPU');
  }
}

export function drawPoseOverlay(canvas, landmarks) {
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks?.length) return;

  const drawing = new DrawingUtils(context);
  drawing.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, {
    color: '#62e5cf',
    lineWidth: 4,
  });
  drawing.drawLandmarks(landmarks, {
    color: '#ffffff',
    fillColor: '#1769ff',
    radius: (data) => DrawingUtils.lerp(data.from?.z ?? 0, -0.15, 0.1, 5, 2),
  });
}

export function clearPoseOverlay(canvas) {
  canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
}
