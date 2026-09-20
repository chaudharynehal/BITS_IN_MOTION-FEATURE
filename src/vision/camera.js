export function isCameraSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function getCameraErrorState(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return {
      status: 'denied',
      message: 'Camera permission was denied. Allow camera access in your browser settings, then try again.',
    };
  }
  if (error?.name === 'UnsupportedError') {
    return {
      status: 'unsupported',
      message: 'This browser does not provide camera access. Try a current version of Chrome, Edge or Safari.',
    };
  }
  return {
    status: 'error',
    message: 'The camera could not start. Close other camera apps and try again.',
  };
}

export async function startCamera(videoElement) {
  if (!isCameraSupported()) {
    const error = new Error('Camera access is not supported by this browser.');
    error.name = 'UnsupportedError';
    throw error;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  videoElement.srcObject = stream;
  videoElement.playsInline = true;
  videoElement.muted = true;
  await videoElement.play();
  return stream;
}

export function stopCamera(stream, videoElement) {
  stream?.getTracks().forEach((track) => track.stop());
  if (videoElement) {
    videoElement.pause();
    videoElement.srcObject = null;
  }
}
