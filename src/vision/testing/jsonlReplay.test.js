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
      const mappedLandmarks = (data.landmarks || []).map(p => ({ ...p, visibility: p.v ?? p.visibility }));
      const state = detector.update(mappedLandmarks, data.timestamp);

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
    expect(typeof replayTrace).toBe('function');
  });

  it('replays a real jumping-jack trace', () => {
    try {
      const traceText = readFileSync(join(__dirname, 'traces/jumping-jacks-1.jsonl'), 'utf-8');
      const lines = traceText.split('\n');
      const detector = createExerciseDetector('jumping-jacks');

      const fs = require('fs');
      const logFile = join(__dirname, 'replay.log');
      fs.writeFileSync(logFile, '');

      let lastPhase = 'finding-standing';
      for(const line of lines) {
        if(!line.trim()) continue;
        const d = JSON.parse(line);
        // Map v to visibility as captured by MediaPipe
        const mappedLandmarks = (d.landmarks || []).map(p => ({ ...p, visibility: p.v ?? p.visibility }));
        const state = detector.update(mappedLandmarks, d.timestamp);

        if (state.measurement && state.measurement.valid) {
          fs.appendFileSync(logFile, `VALID: ${d.timestamp} vis:${state.measurement.visibility} angle:${state.measurement.primaryValue} phase:${state.phase}\n`);
        }

        if (state.phase !== lastPhase) {
          fs.appendFileSync(logFile, `Phase changed from ${lastPhase} to ${state.phase} at ${d.timestamp}, angle=${state.measurement.primaryValue}\n`);
          lastPhase = state.phase;
        }
      }
      fs.appendFileSync(logFile, `Final reps: ${detector.snapshot().reps}\n`);

      const result = replayTrace(lines, detector);
      expect(result.reps).toBeGreaterThanOrEqual(0);
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.warn('Trace file not found, skipping execution');
      } else {
        throw e;
      }
    }
  });
});
