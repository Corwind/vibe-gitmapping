import { describe, it, expect } from 'vitest';
import type { Contributor, Vec3 } from '../src/types';
import { CONTRIBUTOR_TRAVEL_DURATION_MS } from '../src/utils/constants';

function makeContributor(overrides: Partial<Contributor> = {}): Contributor {
  return {
    name: 'Alice',
    color: 0xff4488,
    position: [0, 0, 0] as Vec3,
    targetFile: null,
    active: true,
    lastActiveTimestamp: 1000,
    ...overrides,
  };
}

/** Linear interpolation matching the Contributors.tsx logic */
function lerpVec3(current: Vec3, target: Vec3, dtMs: number): Vec3 {
  const factor = Math.min(1.0, dtMs / CONTRIBUTOR_TRAVEL_DURATION_MS);
  return [
    current[0] + (target[0] - current[0]) * factor,
    current[1] + (target[1] - current[1]) * factor,
    current[2] + (target[2] - current[2]) * factor,
  ];
}

/** Compute idle opacity matching Contributors.tsx logic */
function computeIdleOpacity(idleMs: number): number {
  const IDLE_TIMEOUT = 5000;
  if (idleMs < IDLE_TIMEOUT) return 1.0;
  return Math.max(0, 1.0 - (idleMs - IDLE_TIMEOUT) / 1000);
}

/** Compute beam opacity matching Contributors.tsx logic */
function computeBeamOpacity(beamAgeMs: number): number {
  const BEAM_DURATION = 1000;
  if (beamAgeMs >= BEAM_DURATION) return 0;
  return 1.0 - beamAgeMs / BEAM_DURATION;
}

describe('contributor lerp movement', () => {
  it('does not move when dt is 0', () => {
    const current: Vec3 = [0, 0, 0];
    const target: Vec3 = [10, 0, 10];
    const result = lerpVec3(current, target, 0);
    expect(result[0]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(0);
  });

  it('reaches target when dt equals travel duration', () => {
    const current: Vec3 = [0, 0, 0];
    const target: Vec3 = [10, 5, 10];
    const result = lerpVec3(current, target, CONTRIBUTOR_TRAVEL_DURATION_MS);
    expect(result[0]).toBeCloseTo(10);
    expect(result[1]).toBeCloseTo(5);
    expect(result[2]).toBeCloseTo(10);
  });

  it('clamps factor to 1.0 for large dt', () => {
    const current: Vec3 = [0, 0, 0];
    const target: Vec3 = [10, 0, 10];
    const result = lerpVec3(current, target, 99999);
    expect(result[0]).toBeCloseTo(10);
    expect(result[2]).toBeCloseTo(10);
  });

  it('interpolates halfway for half duration', () => {
    const current: Vec3 = [0, 0, 0];
    const target: Vec3 = [10, 0, 0];
    const result = lerpVec3(current, target, CONTRIBUTOR_TRAVEL_DURATION_MS / 2);
    expect(result[0]).toBeCloseTo(5);
  });
});

describe('contributor idle opacity', () => {
  it('returns 1.0 for active contributor', () => {
    expect(computeIdleOpacity(0)).toBeCloseTo(1.0);
    expect(computeIdleOpacity(2000)).toBeCloseTo(1.0);
    expect(computeIdleOpacity(4999)).toBeCloseTo(1.0);
  });

  it('starts fading after idle timeout', () => {
    expect(computeIdleOpacity(5500)).toBeLessThan(1.0);
    expect(computeIdleOpacity(5500)).toBeGreaterThan(0.0);
  });

  it('fully faded after timeout + 1 second', () => {
    expect(computeIdleOpacity(6000)).toBeCloseTo(0.0);
  });

  it('clamps to 0 for very long idle', () => {
    expect(computeIdleOpacity(100000)).toBe(0);
  });
});

describe('laser beam opacity', () => {
  it('returns 1.0 for just-fired beam', () => {
    expect(computeBeamOpacity(0)).toBeCloseTo(1.0);
  });

  it('returns 0 after beam duration', () => {
    expect(computeBeamOpacity(1000)).toBeCloseTo(0.0);
    expect(computeBeamOpacity(2000)).toBe(0);
  });

  it('fades linearly', () => {
    expect(computeBeamOpacity(500)).toBeCloseTo(0.5, 1);
    expect(computeBeamOpacity(250)).toBeCloseTo(0.75, 1);
  });
});

describe('contributor sorting by activity', () => {
  it('most recently active contributor comes first', () => {
    const contributors = [
      makeContributor({ name: 'Alice', lastActiveTimestamp: 100 }),
      makeContributor({ name: 'Bob', lastActiveTimestamp: 500 }),
      makeContributor({ name: 'Charlie', lastActiveTimestamp: 300 }),
    ];
    contributors.sort((a, b) => b.lastActiveTimestamp - a.lastActiveTimestamp);
    expect(contributors[0].name).toBe('Bob');
    expect(contributors[1].name).toBe('Charlie');
    expect(contributors[2].name).toBe('Alice');
  });

  it('pools to max count', () => {
    const MAX = 100;
    const contributors = Array.from({ length: 200 }, (_, i) =>
      makeContributor({ name: `user${i}`, lastActiveTimestamp: i }),
    );
    contributors.sort((a, b) => b.lastActiveTimestamp - a.lastActiveTimestamp);
    const visible = contributors.slice(0, MAX);
    expect(visible.length).toBe(MAX);
    // Most recent should be first
    expect(visible[0].name).toBe('user199');
  });
});
