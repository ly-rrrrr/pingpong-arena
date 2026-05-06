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
  techAnalysis: {
    serve: number; // 发球 0-100
    receive: number; // 接发球
    forehand: number; // 正手
    backhand: number; // 反手
    footwork: number; // 步法
    mentality: number; // 心态
  };
  highlights: string[];
  suggestions: string[];
  overallRating: number; // 总评分
  aiComment: string; // AI评语
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

// AI技术分析
export interface TechAnalysis {
  overall: number;
  dimensions: {
    serve: number;
    receive: number;
    forehand: number;
    backhand: number;
    footwork: number;
    mentality: number;
  };
  trend: Array<{ date: string; score: number }>;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}
