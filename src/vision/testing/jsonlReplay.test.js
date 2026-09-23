import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createExerciseDetector } from '../exerciseDetectors';

/**
 * Replays a captured MediaPipe JSONL trace through the exercise detector.
 * A JSONL trace is a file with one JSON object per line.
 * Each line should have: { timestamp, exercise, visibility, angles, movementPhase, repCount, event, landmarks }
 *
 * This function returns the total counted reps, and any events logged.
 */
export function replayTrace(traceLines, detector) {
  let highestReps = 0;
  const events = [];
  const phases = new Set();
  const rejections = [];

  for (const line of traceLines) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      const state = detector.update(data.landmarks || [], data.timestamp);
      
      if (state.reps > highestReps) {
        highestReps = state.reps;
      }
      
      if (state.event) {
        events.push({ time: data.timestamp, event: state.event });
        if (state.event === 'rejected') {
          rejections.push({ time: data.timestamp, reason: state.rejectReason });
        }
      }
      phases.add(state.phase);
    } catch (e) {
      console.error('Error parsing line:', line.substring(0, 50) + '...', e.message);
    }
  }

  return { reps: highestReps, events, phases: Array.from(phases), rejections };
}

describe('Real Trace Replay', () => {
  it('has replay infrastructure ready for when traces are collected', () => {
    // This test ensures the infrastructure is ready.
    // In the future, read files from a traces/ directory:
    // const traceText = readFileSync(join(__dirname, 'traces/pushup-trace-1.jsonl'), 'utf-8');
    // const detector = createExerciseDetector('pushups');
    // const result = replayTrace(traceText.split('\\n'), detector);
    // expect(result.reps).toBeGreaterThan(0);
    expect(typeof replayTrace).toBe('function');
  });
});
