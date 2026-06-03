import { Friend, MatchRecord, RankingEntry, RankTier, UserProfile } from './types';

export type ManualMatchInput = {
  currentUser: UserProfile;
  opponent: Friend;
  scores: Array<[number, number]>;
  matchType: MatchRecord['matchType'];
  venue?: string;
};

export type ScoreReport = {
  summary: string;
  stats: {
    myGames: number;
    oppGames: number;
    totalPoints: number;
    pointDiff: number;
    closeGames: number;
    largestMargin: number;
  };
  highlights: string[];
  suggestions: string[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getGameScore(scores: Array<[number, number]>) {
  return scores.reduce(
    (acc, [my, opp]) => {
      if (my > opp) acc.myGames += 1;
      if (opp > my) acc.oppGames += 1;
      return acc;
    },
    { myGames: 0, oppGames: 0 },
  );
}

export function determineMatchResult(scores: Array<[number, number]>): MatchRecord['result'] {
  const { myGames, oppGames } = getGameScore(scores);
  return myGames > oppGames ? 'win' : 'lose';
}

export function calculateScoreChange({
  matchType,
  result,
  myScore,
  opponentScore,
}: {
  matchType: MatchRecord['matchType'];
  result: MatchRecord['result'];
  myScore: number;
  opponentScore: number;
}) {
  if (matchType === 'friendly') return 0;

  const base = 16;
  const scoreGap = result === 'win' ? opponentScore - myScore : myScore - opponentScore;
  const adjustment = clamp(Math.round(scoreGap / 40), -8, 12);
  const delta = base + adjustment;

  return result === 'win' ? delta : -delta;
}

export function getRankTier(score: number): RankTier {
  if (score >= 2400) return '王者';
  if (score >= 2100) return '大师';
  if (score >= 1850) return '钻石';
  if (score >= 1650) return '铂金';
  if (score >= 1450) return '黄金';
  if (score >= 1250) return '白银';
  return '青铜';
}

export function createManualMatchRecord({
  currentUser,
  opponent,
  scores,
  matchType,
  venue,
}: ManualMatchInput): MatchRecord {
  const result = determineMatchResult(scores);
  const scoreChange = calculateScoreChange({
    matchType,
    result,
    myScore: currentUser.score,
    opponentScore: opponent.score,
  });

  return {
    id: `match_${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    opponent: {
      id: opponent.id,
      nickname: opponent.nickname,
      avatar: opponent.avatar,
      rankTier: opponent.rankTier,
    },
    scores,
    result,
    matchType,
    scoreChange,
    venue: venue?.trim() || undefined,
  };
}

export function applyMatchToUser(user: UserProfile, match: MatchRecord): UserProfile {
  const wins = user.wins + (match.result === 'win' ? 1 : 0);
  const losses = user.losses + (match.result === 'lose' ? 1 : 0);
  const totalMatches = wins + losses;
  const score = Math.max(0, user.score + match.scoreChange);
  const streak =
    match.result === 'win'
      ? user.streak > 0 ? user.streak + 1 : 1
      : user.streak < 0 ? user.streak - 1 : -1;

  return {
    ...user,
    score,
    rankTier: getRankTier(score),
    totalMatches,
    wins,
    losses,
    winRate: Number(((wins / totalMatches) * 100).toFixed(1)),
    streak,
  };
}

export function applyMatchToRanking(
  rankingData: RankingEntry[],
  updatedUser: UserProfile,
): RankingEntry[] {
  const withoutMe = rankingData.filter((entry) => entry.userId !== updatedUser.id);
  const next = [
    ...withoutMe,
    {
      rank: 0,
      userId: updatedUser.id,
      nickname: updatedUser.nickname,
      avatar: updatedUser.avatar,
      rankTier: updatedUser.rankTier,
      score: updatedUser.score,
      wins: updatedUser.wins,
      winRate: updatedUser.winRate,
      isMe: true,
    },
  ].sort((a, b) => b.score - a.score);

  return next.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

export function createScoreReport(match: MatchRecord): ScoreReport {
  const { myGames, oppGames } = getGameScore(match.scores);
  const pointDiff = match.scores.reduce((sum, [my, opp]) => sum + my - opp, 0);
  const totalPoints = match.scores.reduce((sum, [my, opp]) => sum + my + opp, 0);
  const closeGames = match.scores.filter(([my, opp]) => Math.abs(my - opp) <= 2).length;
  const largestMargin = match.scores.reduce(
    (max, [my, opp]) => Math.max(max, Math.abs(my - opp)),
    0,
  );
  const lostFirstGame = match.scores[0]?.[0] < match.scores[0]?.[1];
  const isSweep = myGames === 3 && oppGames === 0;
  const wentDistance = match.scores.length >= 5;

  const highlights = [
    match.result === 'win'
      ? `以 ${myGames}:${oppGames} 取胜，完成一场有效记录。`
      : `以 ${myGames}:${oppGames} 告负，比赛结果已沉淀到战绩。`,
  ];

  if (closeGames > 0) {
    highlights.push(`本场有 ${closeGames} 局胶着局，比分压力主要集中在关键分。`);
  }
  if (isSweep) {
    highlights.push('本场完成 3:0 横扫，整场局分控制较稳定。');
  }
  if (lostFirstGame && match.result === 'win') {
    highlights.push('首局落后后完成逆转，后续局分恢复能力较好。');
  }
  if (wentDistance) {
    highlights.push('比赛打满多局，体能和注意力持续性会更影响结果。');
  }

  const suggestions: string[] = [];
  if (closeGames >= 2) {
    suggestions.push('建议赛后补记每局关键分节点，便于复盘胶着局的得失分选择。');
  }
  if (pointDiff < 0 && match.result === 'win') {
    suggestions.push('虽然赢下比赛，但总小分落后，后续可以关注单局崩盘风险。');
  }
  if (largestMargin >= 6) {
    suggestions.push('本场存在较大分差局，建议记录当局开局和暂停后的比分变化。');
  }
  if (suggestions.length === 0) {
    suggestions.push('当前记录只包含最终比分，后续可增加关键分备注来提升复盘价值。');
  }

  return {
    summary:
      match.result === 'win'
        ? '这是一份基于手动比分的胜场复盘，不包含视频动作识别结论。'
        : '这是一份基于手动比分的负场复盘，用于沉淀战绩和比分走势。',
    stats: {
      myGames,
      oppGames,
      totalPoints,
      pointDiff,
      closeGames,
      largestMargin,
    },
    highlights,
    suggestions,
  };
}

export function createScoreTrend(user: UserProfile, matches: MatchRecord[]) {
  let runningScore = user.score - matches.reduce((sum, match) => sum + match.scoreChange, 0);
  return [...matches]
    .reverse()
    .map((match) => {
      runningScore += match.scoreChange;
      return {
        date: match.date.slice(5),
        score: runningScore,
      };
    })
    .slice(-6);
}
