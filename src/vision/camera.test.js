import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCameraErrorState, startCamera, stopCamera } from './camera';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('camera lifecycle', () => {
  it('maps denied browser permission to a helpful state', async () => {
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    const getUserMedia = vi.fn().mockRejectedValue(denied);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    await expect(startCamera({})).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(getCameraErrorState(denied)).toEqual({
      status: 'denied',
      message: 'Camera permission was denied. Allow camera access in your browser settings, then try again.',
    });
  });

  it('stops every media track and clears the video element', () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    const stream = { getTracks: () => [{ stop: stopA }, { stop: stopB }] };
    const video = { pause: vi.fn(), srcObject: stream };
    stopCamera(stream, video);
    expect(stopA).toHaveBeenCalledOnce();
    expect(stopB).toHaveBeenCalledOnce();
    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });
});
