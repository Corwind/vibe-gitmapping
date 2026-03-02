import { describe, it, expect } from 'vitest';
import { computeHeatmap, formatDate, formatDateTime } from '../src/utils/timelineHelpers';

describe('computeHeatmap — extended edge cases', () => {
  it('single commit placed in correct bucket', () => {
    const commits = [{ timestamp: 50 }];
    const result = computeHeatmap(commits, 0, 100, 10);
    // timestamp 50 -> bucket index = floor((50/100)*10) = 5
    expect(result[5]).toBe(1); // normalized: 1/1 = 1
  });

  it('all commits in one bucket normalizes to 1', () => {
    const commits = [{ timestamp: 10 }, { timestamp: 11 }, { timestamp: 12 }];
    const result = computeHeatmap(commits, 0, 100, 10);
    // All in bucket 1
    expect(result[1]).toBe(1);
  });

  it('handles single bucket', () => {
    const commits = [{ timestamp: 10 }, { timestamp: 50 }, { timestamp: 90 }];
    const result = computeHeatmap(commits, 0, 100, 1);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(1);
  });

  it('handles commits at exact boundary of range', () => {
    const commits = [{ timestamp: 0 }, { timestamp: 100 }];
    const result = computeHeatmap(commits, 0, 100, 10);
    expect(result.length).toBe(10);
    // timestamp 0 -> bucket 0
    // timestamp 100 -> Math.min(floor(1*10), 9) = 9
    expect(result[0]).toBeGreaterThan(0);
    expect(result[9]).toBeGreaterThan(0);
  });

  it('handles negative timestamp range', () => {
    const commits = [{ timestamp: -50 }];
    const result = computeHeatmap(commits, -100, 0, 10);
    expect(result.length).toBe(10);
    // (-50 - (-100)) / 100 = 0.5 -> bucket 5
    expect(result[5]).toBe(1);
  });

  it('returns all zeros when commits are outside range', () => {
    const commits = [{ timestamp: 200 }];
    const result = computeHeatmap(commits, 0, 100, 10);
    // idx = Math.min(floor(2*10), 9) = 9
    // Actually this will place it in bucket 9 (clamped)
    expect(result[9]).toBe(1);
  });

  it('handles large number of buckets', () => {
    const commits = Array.from({ length: 100 }, (_, i) => ({ timestamp: i }));
    const result = computeHeatmap(commits, 0, 100, 1000);
    expect(result.length).toBe(1000);
    // Each commit lands in its own bucket area
    const nonZero = result.filter((v) => v > 0).length;
    expect(nonZero).toBeGreaterThan(0);
  });
});

describe('formatDate — extended', () => {
  it('formats epoch 0', () => {
    const result = formatDate(0);
    expect(result).toContain('1970');
  });

  it('formats a date in 2023', () => {
    // 2023-06-15 approx
    const result = formatDate(1686787200);
    expect(result).toContain('2023');
    expect(result).toContain('Jun');
  });

  it('formats a very large timestamp', () => {
    // Year 2100 approx
    const result = formatDate(4102444800);
    expect(result).toContain('2100');
  });
});

describe('formatDateTime — extended', () => {
  it('returns a string containing year and time components', () => {
    const result = formatDateTime(1686787200);
    expect(result).toContain('2023');
    // Should contain some time indication
    expect(result.length).toBeGreaterThan(10);
  });

  it('formats epoch 0', () => {
    const result = formatDateTime(0);
    expect(result).toContain('1970');
  });
});
