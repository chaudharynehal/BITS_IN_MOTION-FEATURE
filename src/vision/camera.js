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
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return { status: 'error', message: 'No camera was found. Connect or enable a camera, then try again.' };
  }
  return {
    status: 'error',
    message: 'The camera could not start. Close other camera apps and try again.',
  };
}

export async function startCamera(videoElement, { signal } = {}) {
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

  const cancel = () => stopCamera(stream, videoElement);
  try {
    if (signal?.aborted || !videoElement) throw new DOMException('Camera request cancelled.', 'AbortError');
    signal?.addEventListener('abort', cancel, { once: true });
    videoElement.srcObject = stream;
    videoElement.playsInline = true;
    videoElement.muted = true;
    await videoElement.play();
    if (signal?.aborted) throw new DOMException('Camera request cancelled.', 'AbortError');
    return stream;
  } catch (error) {
    stopCamera(stream, videoElement);
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}

export function stopCamera(stream, videoElement) {
  stream?.getTracks().forEach((track) => track.stop());
  if (videoElement && (!stream || videoElement.srcObject === stream)) {
    videoElement.pause();
    videoElement.srcObject = null;
  }
}
