export function averageLumaFromRgba(data) {
  if (!data?.length) return null;
  let total = 0;
  let pixels = 0;
  for (let index = 0; index < data.length; index += 4) {
    total += (0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2]) / 255;
    pixels += 1;
  }
  return pixels ? total / pixels : null;
}

export function classifyBrightness(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 0.12) return 'low';
  if (value < 0.18) return 'dim';
  return 'ok';
}

export function createVideoBrightnessSampler(overrides = {}) {
  const config = {
    width: 32,
    height: 18,
    intervalMs: 650,
    ...overrides,
  };
  let canvas = null;
  let context = null;
  let lastSampleAt = -Infinity;
  let lastBrightness = null;

  function ensureCanvas() {
    if (canvas || typeof document === 'undefined') return;
    canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    context = canvas.getContext('2d', { willReadFrequently: true });
  }

  function sample(video, timestamp = performance.now()) {
    if (!video || timestamp - lastSampleAt < config.intervalMs) return lastBrightness;
    ensureCanvas();
    if (!context || !video.videoWidth || !video.videoHeight) return lastBrightness;

    try {
      context.drawImage(video, 0, 0, config.width, config.height);
      lastBrightness = averageLumaFromRgba(context.getImageData(0, 0, config.width, config.height).data);
      lastSampleAt = timestamp;
    } catch {
      lastSampleAt = timestamp;
    }
    return lastBrightness;
  }

  function reset() {
    lastSampleAt = -Infinity;
    lastBrightness = null;
  }

  return { sample, reset, config };
}
