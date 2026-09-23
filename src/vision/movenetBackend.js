import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

let detector = null;

export async function initializeMovenet(onStatus) {
  const updateStatus = (status, error = null) => {
    if (onStatus) onStatus({ status, error });
  };

  try {
    updateStatus('LOADING_TF');
    await tf.ready();

    const backend = tf.getBackend();
    if (!backend) {
      throw new Error('TensorFlow backend failed to initialize');
    }

    updateStatus('LOADING_MODEL');
    const detectorConfig = {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      enableSmoothing: true,
    };

    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);

    updateStatus('WAITING_FOR_VIDEO');

    return {
      close: () => {
        if (detector) {
          detector.dispose();
          detector = null;
        }
      },
      detectForVideo: async (video, timestamp) => {
        if (!detector) return { landmarks: [], worldLandmarks: [] };

        if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
           updateStatus('WAITING_FOR_VIDEO');
           return { landmarks: [], worldLandmarks: [] };
        }

        try {
          updateStatus('INFERENCE_ACTIVE');
          const poses = await detector.estimatePoses(video, {
            maxPoses: 1,
            flipHorizontal: false,
          });

          return {
            isMovenet: true,
            poses,
          };
        } catch (err) {
          updateStatus('ERROR', err.message);
          return { landmarks: [], worldLandmarks: [] };
        }
      }
    };
  } catch (err) {
    updateStatus('ERROR', err.message);
    throw err;
  }
}
