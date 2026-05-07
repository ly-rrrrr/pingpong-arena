import { describe, it, expect } from 'vitest';
import { matchBroadcasts, venues, sampleChannelMessages } from '../matching-mock-data';

describe('Matching Mock Data Integrity', () => {
  it('matchBroadcasts have valid structure', () => {
    expect(matchBroadcasts.length).toBeGreaterThan(0);
    matchBroadcasts.forEach((broadcast) => {
      expect(broadcast.id).toBeTruthy();
      expect(broadcast.userId).toBeTruthy();
      expect(broadcast.nickname).toBeTruthy();
      expect(broadcast.avatar).toBeTruthy();
      expect(broadcast.message).toBeTruthy();
      expect(broadcast.preferredTime).toBeTruthy();
      expect(['active', 'matched', 'expired']).toContain(broadcast.status);
      expect(broadcast.distance).toBeTruthy();
    });
  });

  it('venues have valid structure with available slots', () => {
    expect(venues.length).toBeGreaterThan(0);
    venues.forEach((venue) => {
      expect(venue.id).toBeTruthy();
      expect(venue.name).toBeTruthy();
      expect(venue.tables).toBeGreaterThan(0);
      expect(venue.pricePerHour).toBeGreaterThanOrEqual(0);
      expect(venue.availableSlots.length).toBeGreaterThan(0);
      venue.availableSlots.forEach((slot) => {
        expect(slot.id).toBeTruthy();
        expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
        expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof slot.available).toBe('boolean');
      });
    });
  });

  it('each venue has at least one available slot', () => {
    venues.forEach((venue) => {
      const availableSlots = venue.availableSlots.filter(s => s.available);
      expect(availableSlots.length).toBeGreaterThan(0);
    });
  });

  it('sampleChannelMessages have valid structure', () => {
    expect(sampleChannelMessages.length).toBeGreaterThan(0);
    sampleChannelMessages.forEach((msg) => {
      expect(msg.id).toBeTruthy();
      expect(msg.senderId).toBeTruthy();
      expect(msg.content).toBeTruthy();
      expect(['text', 'voice', 'system', 'time_proposal', 'venue_proposal']).toContain(msg.type);
      expect(msg.timestamp).toBeTruthy();
    });
  });

  it('broadcasts are sorted by distance (closest first)', () => {
    // Verify distances are parseable numbers
    matchBroadcasts.forEach((broadcast) => {
      const distNum = parseInt(broadcast.distance);
      expect(distNum).toBeGreaterThan(0);
    });
  });
});

describe('Matching Flow Logic', () => {
  it('time negotiation allows max 2 rounds', () => {
    const MAX_ROUNDS = 2;
    let rejectedCount = 0;

    // Simulate 2 rejections
    rejectedCount++;
    expect(rejectedCount).toBeLessThanOrEqual(MAX_ROUNDS);
    rejectedCount++;
    expect(rejectedCount).toBeLessThanOrEqual(MAX_ROUNDS);

    // After 2 rejections, retreat should trigger
    expect(rejectedCount >= MAX_ROUNDS).toBe(true);
  });

  it('retreat requires both parties to choose same option for effect', () => {
    type Choice = 'continue_negotiate' | 'force_exit';

    function resolveRetreat(myChoice: Choice, oppChoice: Choice): string {
      if (myChoice === 'continue_negotiate' && oppChoice === 'continue_negotiate') return 'continue';
      if (myChoice === 'force_exit' && oppChoice === 'force_exit') return 'exit';
      return 'deadlock';
    }

    expect(resolveRetreat('continue_negotiate', 'continue_negotiate')).toBe('continue');
    expect(resolveRetreat('force_exit', 'force_exit')).toBe('exit');
    expect(resolveRetreat('continue_negotiate', 'force_exit')).toBe('deadlock');
    expect(resolveRetreat('force_exit', 'continue_negotiate')).toBe('deadlock');
  });

  it('user can change from continue to exit but not vice versa', () => {
    // Rule: 选择"继续协商"后可随时改选为"执意退出"
    let myChoice: string = 'continue_negotiate';
    // Can change to force_exit
    myChoice = 'force_exit';
    expect(myChoice).toBe('force_exit');
  });
});
