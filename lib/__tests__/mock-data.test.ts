import { describe, it, expect } from 'vitest';
import { currentUser, matchRecords, rankingData, friends, challenges, techAnalysis } from '../mock-data';

describe('Mock Data Integrity', () => {
  it('currentUser has valid properties', () => {
    expect(currentUser.id).toBe('user_001');
    expect(currentUser.nickname).toBeTruthy();
    expect(currentUser.score).toBeGreaterThan(0);
    expect(currentUser.totalMatches).toBe(currentUser.wins + currentUser.losses);
    expect(currentUser.winRate).toBeCloseTo(
      (currentUser.wins / currentUser.totalMatches) * 100,
      0
    );
  });

  it('matchRecords have valid structure', () => {
    expect(matchRecords.length).toBeGreaterThan(0);
    matchRecords.forEach((match) => {
      expect(match.id).toBeTruthy();
      expect(match.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(match.opponent.id).toBeTruthy();
      expect(match.scores.length).toBeGreaterThanOrEqual(3);
      expect(['win', 'lose']).toContain(match.result);
      expect(['friendly', 'ranked']).toContain(match.matchType);
    });
  });

  it('match scores are consistent with result', () => {
    matchRecords.forEach((match) => {
      const myGames = match.scores.filter(s => s[0] > s[1]).length;
      const oppGames = match.scores.filter(s => s[0] < s[1]).length;
      if (match.result === 'win') {
        expect(myGames).toBeGreaterThan(oppGames);
      } else {
        expect(oppGames).toBeGreaterThan(myGames);
      }
    });
  });

  it('rankingData is sorted by rank', () => {
    for (let i = 1; i < rankingData.length; i++) {
      expect(rankingData[i].rank).toBeGreaterThan(rankingData[i - 1].rank);
    }
  });

  it('friends have valid headToHead records', () => {
    friends.forEach((friend) => {
      expect(friend.headToHead.wins).toBeGreaterThanOrEqual(0);
      expect(friend.headToHead.losses).toBeGreaterThanOrEqual(0);
    });
  });

  it('challenges have valid status', () => {
    challenges.forEach((challenge) => {
      expect(['pending', 'accepted', 'completed', 'declined']).toContain(challenge.status);
      if (challenge.status === 'completed') {
        expect(challenge.result).toBeTruthy();
      }
    });
  });

  it('techAnalysis dimensions are within 0-100 range', () => {
    const dims = techAnalysis.dimensions;
    Object.values(dims).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
    expect(techAnalysis.overall).toBeGreaterThanOrEqual(0);
    expect(techAnalysis.overall).toBeLessThanOrEqual(100);
  });

  it('techAnalysis has suggestions and trends', () => {
    expect(techAnalysis.suggestions.length).toBeGreaterThan(0);
    expect(techAnalysis.trend.length).toBeGreaterThan(0);
    expect(techAnalysis.strengths.length).toBeGreaterThan(0);
    expect(techAnalysis.weaknesses.length).toBeGreaterThan(0);
  });
});
