import { describe, expect, it } from 'vitest';
import { currentUser, friends, rankingData } from '../mock-data';
import {
  applyMatchToRanking,
  applyMatchToUser,
  calculateScoreChange,
  createManualMatchRecord,
  createScoreReport,
  determineMatchResult,
} from '../match-rules';

describe('manual match rules', () => {
  it('determines match result from manually entered game scores', () => {
    expect(determineMatchResult([[11, 8], [9, 11], [11, 7], [11, 5]])).toBe('win');
    expect(determineMatchResult([[8, 11], [11, 9], [7, 11], [9, 11]])).toBe('lose');
  });

  it('calculates score changes only for ranked matches', () => {
    expect(calculateScoreChange({
      matchType: 'friendly',
      result: 'win',
      myScore: 1500,
      opponentScore: 1700,
    })).toBe(0);

    expect(calculateScoreChange({
      matchType: 'ranked',
      result: 'win',
      myScore: 1500,
      opponentScore: 1700,
    })).toBeGreaterThan(16);

    expect(calculateScoreChange({
      matchType: 'ranked',
      result: 'lose',
      myScore: 1700,
      opponentScore: 1500,
    })).toBeLessThan(-16);
  });

  it('creates a persisted manual match record without video-derived analysis', () => {
    const match = createManualMatchRecord({
      currentUser,
      opponent: friends[0],
      scores: [[11, 9], [9, 11], [11, 8], [11, 6]],
      matchType: 'ranked',
      venue: '校园体育馆',
    });

    expect(match.result).toBe('win');
    expect(match.opponent.id).toBe(friends[0].id);
    expect(match.venue).toBe('校园体育馆');
    expect(match.scoreChange).toBeGreaterThan(0);
  });

  it('updates user aggregates from the saved match result', () => {
    const match = createManualMatchRecord({
      currentUser,
      opponent: friends[0],
      scores: [[11, 9], [11, 8], [11, 6]],
      matchType: 'ranked',
    });

    const updated = applyMatchToUser(currentUser, match);

    expect(updated.totalMatches).toBe(currentUser.totalMatches + 1);
    expect(updated.wins).toBe(currentUser.wins + 1);
    expect(updated.losses).toBe(currentUser.losses);
    expect(updated.score).toBe(currentUser.score + match.scoreChange);
    expect(updated.winRate).toBeCloseTo((updated.wins / updated.totalMatches) * 100, 1);
  });

  it('updates and re-sorts ranking after a scored match', () => {
    const match = createManualMatchRecord({
      currentUser,
      opponent: friends[0],
      scores: [[11, 9], [11, 8], [11, 6]],
      matchType: 'ranked',
    });
    const updatedUser = applyMatchToUser(currentUser, match);
    const updatedRanking = applyMatchToRanking(rankingData, updatedUser);

    expect(updatedRanking).toEqual([...updatedRanking].sort((a, b) => a.rank - b.rank));
    expect(updatedRanking.find((entry) => entry.userId === currentUser.id)?.score).toBe(updatedUser.score);
  });

  it('generates score-based report content instead of technical claims', () => {
    const match = createManualMatchRecord({
      currentUser,
      opponent: friends[0],
      scores: [[11, 9], [9, 11], [13, 11], [11, 5]],
      matchType: 'ranked',
    });

    const report = createScoreReport(match);

    expect(report.stats.closeGames).toBe(3);
    expect(report.highlights.some((item) => item.includes('胶着局'))).toBe(true);
    expect(report.suggestions.join('')).not.toContain('正手');
    expect(report.suggestions.join('')).not.toContain('接发球');
  });
});
