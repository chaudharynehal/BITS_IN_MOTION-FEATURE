import { describe, expect, it } from 'vitest';
import { createSubjectTracker, describePose } from './subjectContinuity';

function pose(centerX, { centerY = 0.52, scale = 0.34, visibility = 0.95 } = {}) {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const halfShoulder = scale * 0.23;
  const halfHip = scale * 0.18;
  const top = centerY - scale * 0.34;
  const hipY = centerY;
  const kneeY = centerY + scale * 0.26;
  const ankleY = centerY + scale * 0.48;
  const points = [
    [11, centerX - halfShoulder, top],
    [12, centerX + halfShoulder, top],
    [23, centerX - halfHip, hipY],
    [24, centerX + halfHip, hipY],
    [25, centerX - halfHip, kneeY],
    [26, centerX + halfHip, kneeY],
    [27, centerX - halfHip, ankleY],
    [28, centerX + halfHip, ankleY],
  ];
  for (const [index, x, y] of points) landmarks[index] = { x, y, visibility };
  return landmarks;
}

describe('subject continuity', () => {
  it('locks onto the first stable person and follows them when pose ordering changes', () => {
    const tracker = createSubjectTracker({ minStableFrames: 2 });
    const first = pose(0.34);
    const other = pose(0.76);
    expect(tracker.update([first, other])).toMatchObject({ index: 0, locked: false });
    expect(tracker.update([first, other])).toMatchObject({ index: 0, locked: true });

    const movedFirst = pose(0.36);
    const selected = tracker.update([other, movedFirst]);
    expect(selected).toMatchObject({ index: 1, locked: true });
    expect(selected.landmarks).toBe(movedFirst);
  });

  it('does not switch to a new person until the tracked person is genuinely lost', () => {
    const tracker = createSubjectTracker({ minStableFrames: 2, lostFrameLimit: 2 });
    const first = pose(0.32);
    const other = pose(0.78);
    tracker.update([first]);
    tracker.update([first]);

    expect(tracker.update([other])).toBeNull();
    expect(tracker.update([other])).toBeNull();
    expect(tracker.snapshot()).toMatchObject({ locked: true, lostFrames: 2 });

    expect(tracker.update([other])).toMatchObject({ index: 0, locked: false, reacquiring: true });
    expect(tracker.update([other])).toMatchObject({ index: 0, locked: true });
  });

  it('ignores poses without enough visible body landmarks', () => {
    expect(describePose(pose(0.5, { visibility: 0.1 }))).toBeNull();
  });

  it('survives second-person entry, crossing, temporary loss and legitimate reacquisition', () => {
    const tracker = createSubjectTracker({ minStableFrames: 2, lostFrameLimit: 3 });

    const a1 = pose(0.31, { scale: 0.34 });
    const a2 = pose(0.33, { scale: 0.35 });
    expect(tracker.update([a1])).toMatchObject({ index: 0, locked: false });
    expect(tracker.update([a2])).toMatchObject({ index: 0, locked: true });

    const bFar = pose(0.78, { scale: 0.3 });
    const a3 = pose(0.35, { scale: 0.36 });
    expect(tracker.update([bFar, a3])).toMatchObject({ index: 1, locked: true });

    const bCrossing = pose(0.42, { scale: 0.29 });
    const aCrossing = pose(0.37, { scale: 0.37 });
    expect(tracker.update([bCrossing, aCrossing])).toMatchObject({ index: 1, locked: true });

    const aLowVisibility = pose(0.38, { visibility: 0.12, scale: 0.37 });
    expect(tracker.update([bCrossing, aLowVisibility])).toBeNull();
    expect(tracker.update([bCrossing])).toBeNull();
    expect(tracker.update([bCrossing])).toBeNull();
    expect(tracker.snapshot()).toMatchObject({ locked: true, lostFrames: 3 });

    expect(tracker.update([bCrossing])).toMatchObject({ index: 0, locked: false, reacquiring: true });
    expect(tracker.update([pose(0.43, { scale: 0.31 })])).toMatchObject({ index: 0, locked: true });

    expect(tracker.update([pose(0.45, { scale: 0.42 })])).toMatchObject({ index: 0, locked: true });

    const aReturned = pose(0.28, { scale: 0.34 });
    expect(tracker.update([aReturned])).toBeNull();
    expect(tracker.update([aReturned])).toBeNull();
    expect(tracker.update([aReturned])).toBeNull();
    expect(tracker.update([aReturned])).toMatchObject({ index: 0, locked: false, reacquiring: true });
    expect(tracker.update([pose(0.29, { scale: 0.35 })])).toMatchObject({ index: 0, locked: true });
  });
});
