// Tests for Austin <-> UTC. Austin is UTC-6 in winter (CST) and UTC-5 in summer (CDT).
// DST 2026: starts Sunday Mar 8 at 2:00 AM, ends Sunday Nov 1 at 2:00 AM (worked out from the calendar:
// Jan 1 2026 is a Thursday, so Mar 1 and Nov 1 are Sundays; second Sunday of March = Mar 8).
import { describe, expect, test } from '@jest/globals';
import { austinWallFromUtc, utcFromAustinWall, wall } from './time';

describe('utcFromAustinWall', () => {
  test('winter: Dec 2 2026, 10:00 AM CST is 16:00 UTC', () => {
    expect(utcFromAustinWall(wall(2026, 12, 2, 10, 0))).toBe(Date.UTC(2026, 11, 2, 16, 0));
  });
  test('summer: Jul 1 2026, 10:00 AM CDT is 15:00 UTC', () => {
    expect(utcFromAustinWall(wall(2026, 7, 1, 10, 0))).toBe(Date.UTC(2026, 6, 1, 15, 0));
  });
  test('the day before DST ends is still daylight time, the day it ends is standard time', () => {
    expect(utcFromAustinWall(wall(2026, 10, 31, 12, 0))).toBe(Date.UTC(2026, 9, 31, 17, 0)); // CDT: +5
    expect(utcFromAustinWall(wall(2026, 11, 1, 12, 0))).toBe(Date.UTC(2026, 10, 1, 18, 0));  // CST: +6
  });
  test('the day before DST starts is standard time, the day it starts is daylight time', () => {
    expect(utcFromAustinWall(wall(2026, 3, 7, 12, 0))).toBe(Date.UTC(2026, 2, 7, 18, 0));   // CST: +6
    expect(utcFromAustinWall(wall(2026, 3, 8, 12, 0))).toBe(Date.UTC(2026, 2, 8, 17, 0));   // CDT: +5
  });
  test('going there and back gives the same wall time, all through a year', () => {
    for (let day = 0; day < 365; day += 7) {
      const w = wall(2026, 1, 1 + day, 9, 30);
      const back = austinWallFromUtc(utcFromAustinWall(w));
      expect(back.getTime()).toBe(w.getTime());
    }
  });
});
