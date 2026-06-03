// 段位定义
export type RankTier = '青铜' | '白银' | '黄金' | '铂金' | '钻石' | '大师' | '王者';

// 用户信息
export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  rankTier: RankTier;
  score: number;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  streak: number; // 连胜/连负
}

// 比赛记录
export interface MatchRecord {
  id: string;
  date: string;
  opponent: {
    id: string;
    nickname: string;
    avatar: string;
    rankTier: RankTier;
  };
  scores: Array<[number, number]>; // 每局比分 [我方, 对方]
  result: 'win' | 'lose';
  matchType: 'friendly' | 'ranked'; // 友谊赛/积分赛
  scoreChange: number; // 积分变化
  venue?: string;
  duration?: number; // 比赛时长(分钟)
}

// 战报详情
export interface MatchReport {
  matchId: string;
  summary: string;
  highlights: string[];
  suggestions: string[];
  stats: {
    myGames: number;
    oppGames: number;
    totalPoints: number;
    pointDiff: number;
    closeGames: number;
    largestMargin: number;
  };
}

// 排行榜条目
export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatar: string;
  rankTier: RankTier;
  score: number;
  wins: number;
  winRate: number;
  isMe?: boolean;
}

// 好友
export interface Friend {
  id: string;
  nickname: string;
  avatar: string;
  rankTier: RankTier;
  score: number;
  lastActive: string;
  headToHead: { wins: number; losses: number };
}

// 挑战
export interface Challenge {
  id: string;
  challenger: { id: string; nickname: string; avatar: string; rankTier: RankTier };
  challenged: { id: string; nickname: string; avatar: string; rankTier: RankTier };
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  createdAt: string;
  matchId?: string;
  result?: 'win' | 'lose';
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
}
