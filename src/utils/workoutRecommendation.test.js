import { describe, expect, it } from 'vitest';
import { generateWorkoutPlan } from './workoutRecommendation';
import { recommendWorkout, normalizePreferences, isEligible, calculateWorkoutDuration } from '../../shared/recommendation.js';
import { PROFILE_OPTIONS } from '../../shared/profile.js';
import { EXERCISES } from '../data/exercises.js';
import { buildWorkoutSequence } from '../App.jsx';

const base = { level: 'Beginner', goal: 'Stay fit', time: '20', location: 'Hostel room', equipment: 'None', lowImpact: false };
const ids = (plan) => plan.exercises.map((item) => item.id);
const signature = (plan) => plan.exercises.map(({ id, duration }) => [id, duration]);
const cases = PROFILE_OPTIONS.level.flatMap((level) => PROFILE_OPTIONS.goal.flatMap((goal) =>
  PROFILE_OPTIONS.time.flatMap((time) => PROFILE_OPTIONS.equipment.flatMap((equipment) =>
    [false, true].flatMap((lowImpact) => PROFILE_OPTIONS.location.map((location) => ({ level, goal, time, equipment, lowImpact, location })))))));

describe('recommendation eligibility and exact time budgets', () => {
  it.each(cases)('respects the complete profile %#', (profile) => {
    const plan = generateWorkoutPlan(profile);
    const p = normalizePreferences(profile);
    expect(plan.exercises[0].id).toBe('warmup');
    expect(plan.exercises.at(-1).id).toBe('cooldown');
    expect(calculateWorkoutDuration(plan)).toBe(Number(profile.time) * 60);
    expect(plan.totalMinutes).toBe(Number(profile.time));
    expect(new Set(ids(plan)).size).toBe(plan.exercises.length);
    for (const item of plan.exercises) {
      expect(isEligible(item, p)).toBe(true);
      if (item.sets) {
        expect(item.sets * (item.workSeconds + item.restSeconds)).toBe(item.estimatedSeconds);
        expect(item.rounds * item.setsPerRound * (item.workSeconds + item.restSeconds)).toBe(item.estimatedSeconds);
        expect(item.goalTags).toContain(p.goal);
      }
    }
    expect(generateWorkoutPlan(profile)).toEqual(plan);
  });

  it('changes actual composition and volume for 10, 30, 45 and 60 minutes', () => {
    const plans = [10, 30, 45, 60].map((time) => generateWorkoutPlan({ ...base, time }));
    expect(plans[0].exercises.length).toBeLessThan(plans[1].exercises.length);
    expect(new Set(plans.map((plan) => JSON.stringify(signature(plan)))).size).toBe(4);
    const work = plans.map((plan) => plan.exercises.reduce((sum, item) => sum + (item.sets || 0) * (item.workSeconds || 0), 0));
    expect(work).toEqual([...work].sort((a, b) => a - b));
    expect(work[3]).toBeGreaterThan(work[2]);
  });

  it('uses a backpack even in a short eligible strength session', () => {
    const profile = { ...base, level: 'Intermediate', goal: 'Build strength', time: 10 };
    const bodyweight = generateWorkoutPlan(profile);
    const backpack = generateWorkoutPlan({ ...profile, equipment: 'Backpack' });
    expect(ids(bodyweight)).not.toContain('rows');
    expect(ids(backpack)).toContain('rows');
    expect(signature(bodyweight)).not.toEqual(signature(backpack));
    expect(ids(generateWorkoutPlan({ ...profile, level: 'Beginner', equipment: 'Backpack' }))).not.toContain('rows');
  });

  it('reduces impact without restricting normal-impact open-space plans', () => {
    const profile = { ...base, location: 'Outdoor', level: 'Intermediate', goal: 'Support weight management', time: 45 };
    const normal = generateWorkoutPlan(profile);
    const low = generateWorkoutPlan({ ...profile, lowImpact: true });
    expect(ids(normal)).toContain('jumping-jacks');
    expect(ids(normal)).toContain('lunges');
    expect(ids(low)).toContain('marching');
    expect(low.exercises.every((item) => item.impact === 'low')).toBe(true);
  });

  it('changes level through both eligibility and work/rest targets', () => {
    const profile = { ...base, goal: 'Build strength', location: 'Gym', time: 30, equipment: 'Backpack' };
    const beginner = generateWorkoutPlan(profile);
    const intermediate = generateWorkoutPlan({ ...profile, level: 'Intermediate' });
    expect(ids(beginner)).not.toContain('lunges');
    expect(ids(intermediate)).toContain('lunges');
    expect(intermediate.exercises.find((item) => item.id === 'squats').workSeconds)
      .toBeGreaterThan(beginner.exercises.find((item) => item.id === 'squats').workSeconds);
  });

  it('changes goal selection, order and emphasis', () => {
    const plans = PROFILE_OPTIONS.goal.map((goal) => generateWorkoutPlan({ ...base, goal, time: 30, location: 'Outdoor' }));
    expect(new Set(plans.map((plan) => JSON.stringify(signature(plan)))).size).toBe(3);
    expect(ids(plans[1])).not.toContain('jumping-jacks');
    expect(plans[2].exercises[1].id).toBe('jumping-jacks');
    expect(plans[2].focus).toContain('Conditioning emphasis');
  });

  it('uses existing location to exclude wide and travelling movements', () => {
    const open = generateWorkoutPlan({ ...base, location: 'Campus', time: 45, level: 'Intermediate', goal: 'Support weight management' });
    const small = generateWorkoutPlan({ ...base, time: 45, level: 'Intermediate', goal: 'Support weight management' });
    expect(ids(open)).toContain('jumping-jacks');
    expect(ids(open)).toContain('lunges');
    expect(ids(small)).not.toContain('jumping-jacks');
    expect(ids(small)).not.toContain('lunges');
  });

  it.each([{}, { time: 'NaN' }, { time: -10 }, { time: Infinity }, { level: 'Advanced', equipment: 'unknown', location: 'unknown' }])('handles invalid legacy preferences %#', (profile) => {
    const plan = generateWorkoutPlan(profile);
    expect(plan.totalMinutes).toBe(20);
    expect(plan.exercises.every((item) => item.equipment === 'None' && item.minLevel === 'Beginner')).toBe(true);
  });

  it('normalizes legacy aliases and whitespace identically', () => {
    expect(generateWorkoutPlan({ fitnessLevel: ' intermediate ', availableMinutes: 30, goal: ' BUILD STRENGTH ', equipment: ' backpack ', location: ' gym ' }))
      .toEqual(generateWorkoutPlan({ level: 'Intermediate', time: 30, goal: 'Build strength', equipment: 'Backpack', location: 'Gym' }));
  });

  it('explains unsupported legacy equipment and never promises its use', () => {
    const plan = generateWorkoutPlan({ ...base, level: 'Intermediate', equipment: 'Dumbbells' });
    expect(plan.exercises.every((item) => item.equipment === 'None')).toBe(true);
    expect(plan.reasons.join(' ')).toContain('not supported yet');
  });

  it('fails closed if required catalogue entries are unavailable', () => {
    expect(() => recommendWorkout(base, [])).toThrow('suitable workout');
    expect(() => recommendWorkout(base, Object.values(EXERCISES).filter((item) => item.id !== 'warmup'))).toThrow('suitable workout');
  });

  it('generates executable, non-absurd plans for Personas A through E', () => {
    const personaA = generateWorkoutPlan({ level: 'Beginner', time: '10', location: 'Hostel room', goal: 'Support weight management', lowImpact: true, equipment: 'None' });
    const personaB = generateWorkoutPlan({ level: 'Beginner', time: '30', location: 'Hostel room', goal: 'Stay fit', lowImpact: false, equipment: 'None' });
    const personaC = generateWorkoutPlan({ level: 'Intermediate', time: '30', location: 'Open indoor space', goal: 'Build strength', lowImpact: false, equipment: 'Backpack' });
    const personaD = generateWorkoutPlan({ level: 'Intermediate', time: '45', location: 'Hostel room', goal: 'Support weight management', lowImpact: false, equipment: 'None' });
    const personaE = generateWorkoutPlan({ level: 'Intermediate', time: '20', location: 'Home', goal: 'Stay fit', lowImpact: true, equipment: 'Backpack' });

    // Duration and volume differentiations
    expect(personaA.totalMinutes).toBe(10);
    expect(personaB.totalMinutes).toBe(30);
    expect(personaC.totalMinutes).toBe(30);
    expect(personaD.totalMinutes).toBe(45);
    expect(personaE.totalMinutes).toBe(20);

    // Safeguard: no single movement ever gets > 9 sets/minutes (prevents the 22-set marching disaster)
    for (const plan of [personaA, personaB, personaC, personaD, personaE]) {
      for (const exercise of plan.exercises) {
        if (exercise.sets) {
          expect(exercise.sets).toBeLessThanOrEqual(9);
        }
      }
    }

    // Persona A: Low impact respected, marching present, no jumping jacks
    expect(ids(personaA)).toContain('marching');
    expect(ids(personaA)).not.toContain('jumping-jacks');

    // Persona B: Small room replaces jumping jacks with marching and explains it
    expect(ids(personaB)).toContain('marching');
    expect(personaB.reasons.some((r) => r.includes('Jumping jacks replaced'))).toBe(true);

    // Persona C: Backpack rows and reverse lunges included
    expect(ids(personaC)).toContain('rows');
    expect(ids(personaC)).toContain('lunges');
    expect(personaC.reasons).toContain('uses Backpack');

    // Persona D: 45m weight management is balanced across movements, marching <= 9 min (not 22 min)
    const marchingD = personaD.exercises.find((e) => e.id === 'marching');
    expect(marchingD.sets).toBeLessThanOrEqual(9);
    expect(ids(personaD)).toContain('pushups');
    expect(ids(personaD)).toContain('crunches');

    // Persona E: Intermediate 20m uses backpack rows and low impact
    expect(ids(personaE)).toContain('rows');
    expect(ids(personaE).every((id) => id !== 'jumping-jacks')).toBe(true);
  });

  it('independently computes actual executable duration for 10, 20, 30, 45, and 60 minutes with 0 discrepancy', () => {
    for (const time of [10, 20, 30, 45, 60]) {
      const plan = generateWorkoutPlan({ ...base, time });
      const sequence = buildWorkoutSequence(plan);
      const warmup = sequence.find((s) => s.id === 'warmup');
      const cooldown = sequence.find((s) => s.id === 'cooldown');
      const stations = sequence.filter((s) => !['warmup', 'cooldown'].includes(s.id));
      const rounds = plan.rounds || 1;
      const roundRecoveries = (rounds > 1 ? rounds - 1 : 0) * (plan.roundBreakSeconds || 60);
      const actualExecutableSeconds = warmup.estimatedSeconds + stations.reduce((sum, s) => sum + s.estimatedSeconds, 0) + roundRecoveries + cooldown.estimatedSeconds;
      expect(actualExecutableSeconds).toBe(time * 60);
      expect(Math.abs(actualExecutableSeconds - time * 60)).toBe(0);
      expect(calculateWorkoutDuration(plan)).toBe(time * 60);
    }
  });

  it('guarantees circuit rotation and structure without monolithic blocks for 30, 45, and 60 min plans', () => {
    for (const time of [30, 45, 60]) {
      const plan = generateWorkoutPlan({ ...base, time });
      const sequence = buildWorkoutSequence(plan);
      expect(sequence[0].id).toBe('warmup');
      expect(sequence.at(-1).id).toBe('cooldown');
      expect(sequence.filter((s) => s.id === 'warmup')).toHaveLength(1);
      expect(sequence.filter((s) => s.id === 'cooldown')).toHaveLength(1);

      const stationSteps = sequence.filter((s) => !['warmup', 'cooldown'].includes(s.id));
      expect(stationSteps).toHaveLength(plan.circuitStations * plan.rounds);

      // Verify rotation: no consecutive steps have the same movement id
      for (let i = 0; i < stationSteps.length - 1; i += 1) {
        expect(stationSteps[i].id).not.toBe(stationSteps[i + 1].id);
      }

      // Verify each round visits each station once
      for (let r = 1; r <= plan.rounds; r += 1) {
        const roundSteps = stationSteps.filter((s) => s.round === r);
        expect(roundSteps).toHaveLength(plan.circuitStations);
        const uniqueIds = new Set(roundSteps.map((s) => s.id));
        expect(uniqueIds.size).toBe(plan.circuitStations);
      }

      // Verify every station in plan has execution count matching displayed prescription
      for (const exercise of plan.exercises.filter((e) => !['warmup', 'cooldown'].includes(e.id))) {
        const executions = stationSteps.filter((s) => s.id === exercise.id);
        expect(executions).toHaveLength(exercise.rounds);
        expect(exercise.sets).toBe(exercise.rounds);
        expect(exercise.setsPerRound).toBe(1);
        expect(exercise.rounds * exercise.setsPerRound * (exercise.workSeconds + exercise.restSeconds)).toBe(exercise.estimatedSeconds);
      }
    }
  });
});
