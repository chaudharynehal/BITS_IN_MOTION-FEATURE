import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCameraErrorState, startCamera, stopCamera } from './camera';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('camera lifecycle', () => {
  it('stops a stream if video playback rejects', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    const video = { srcObject: null, play: vi.fn().mockRejectedValue(new Error('playback failed')), pause: vi.fn() };
    await expect(startCamera(video)).rejects.toThrow('playback failed');
    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it('stops permission results that arrive after navigation without starting playback', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    let grant;
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise((resolve) => { grant = resolve; }) } });
    const video = { srcObject: null, play: vi.fn(), pause: vi.fn() };
    const controller = new AbortController();
    const pending = startCamera(video, { signal: controller.signal });
    controller.abort();
    grant(stream);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(stop).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it('does not clear a newer stream when an old request is stopped', () => {
    const stop = vi.fn();
    const old = { getTracks: () => [{ stop }] };
    const current = {};
    const video = { srcObject: current, pause: vi.fn() };
    stopCamera(old, video);
    expect(stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBe(current);
  });

  it('explains missing camera hardware', () => {
    expect(getCameraErrorState({ name: 'NotFoundError' }).message).toContain('No camera was found');
  });
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
