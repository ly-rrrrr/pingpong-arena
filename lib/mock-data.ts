import { UserProfile, MatchRecord, RankingEntry, Friend, Challenge } from './types';

// 当前用户
export const currentUser: UserProfile = {
  id: 'user_001',
  nickname: '乒乓小王子',
  avatar: '🏓',
  rankTier: '黄金',
  score: 1580,
  totalMatches: 86,
  wins: 52,
  losses: 34,
  winRate: 60.5,
  streak: 3,
};

// 比赛记录
export const matchRecords: MatchRecord[] = [
  {
    id: 'match_001',
    date: '2026-05-06',
    opponent: { id: 'user_002', nickname: '旋转大师', avatar: '🎯', rankTier: '铂金' },
    scores: [[11, 9], [9, 11], [11, 7], [11, 8]],
    result: 'win',
    matchType: 'ranked',
    scoreChange: 25,
    venue: '阳光球馆',
    duration: 42,
  },
  {
    id: 'match_002',
    date: '2026-05-05',
    opponent: { id: 'user_003', nickname: '快攻手', avatar: '⚡', rankTier: '黄金' },
    scores: [[11, 6], [11, 4], [11, 9]],
    result: 'win',
    matchType: 'ranked',
    scoreChange: 18,
    venue: '校园体育馆',
    duration: 28,
  },
  {
    id: 'match_003',
    date: '2026-05-04',
    opponent: { id: 'user_004', nickname: '防守铁壁', avatar: '🛡️', rankTier: '铂金' },
    scores: [[8, 11], [11, 9], [7, 11], [11, 13]],
    result: 'lose',
    matchType: 'ranked',
    scoreChange: -15,
    venue: '阳光球馆',
    duration: 55,
  },
  {
    id: 'match_004',
    date: '2026-05-03',
    opponent: { id: 'user_005', nickname: '弧圈王', avatar: '🌀', rankTier: '黄金' },
    scores: [[11, 7], [11, 5], [11, 8]],
    result: 'win',
    matchType: 'friendly',
    scoreChange: 0,
    venue: '社区活动中心',
    duration: 25,
  },
  {
    id: 'match_005',
    date: '2026-05-02',
    opponent: { id: 'user_006', nickname: '削球怪', avatar: '🔄', rankTier: '白银' },
    scores: [[11, 13], [11, 8], [9, 11], [11, 6], [11, 9]],
    result: 'win',
    matchType: 'ranked',
    scoreChange: 12,
    venue: '阳光球馆',
    duration: 65,
  },
  {
    id: 'match_006',
    date: '2026-05-01',
    opponent: { id: 'user_007', nickname: '新手小白', avatar: '🐣', rankTier: '青铜' },
    scores: [[11, 3], [11, 5], [11, 4]],
    result: 'win',
    matchType: 'friendly',
    scoreChange: 0,
    duration: 18,
  },
  {
    id: 'match_007',
    date: '2026-04-30',
    opponent: { id: 'user_008', nickname: '老将', avatar: '👴', rankTier: '钻石' },
    scores: [[5, 11], [8, 11], [11, 9], [6, 11]],
    result: 'lose',
    matchType: 'ranked',
    scoreChange: -20,
    venue: '市体育中心',
    duration: 48,
  },
];

// 排行榜数据
export const rankingData: RankingEntry[] = [
  { rank: 1, userId: 'user_010', nickname: '国手级选手', avatar: '👑', rankTier: '王者', score: 2450, wins: 198, winRate: 82.5 },
  { rank: 2, userId: 'user_011', nickname: '弧圈之王', avatar: '🌀', rankTier: '大师', score: 2280, wins: 165, winRate: 76.3 },
  { rank: 3, userId: 'user_012', nickname: '闪电快攻', avatar: '⚡', rankTier: '大师', score: 2150, wins: 142, winRate: 73.8 },
  { rank: 4, userId: 'user_008', nickname: '老将', avatar: '👴', rankTier: '钻石', score: 1980, wins: 130, winRate: 71.2 },
  { rank: 5, userId: 'user_013', nickname: '旋转魔术师', avatar: '🎩', rankTier: '钻石', score: 1850, wins: 118, winRate: 68.5 },
  { rank: 6, userId: 'user_004', nickname: '防守铁壁', avatar: '🛡️', rankTier: '铂金', score: 1720, wins: 105, winRate: 65.1 },
  { rank: 7, userId: 'user_002', nickname: '旋转大师', avatar: '🎯', rankTier: '铂金', score: 1650, wins: 98, winRate: 63.4 },
  { rank: 8, userId: 'user_001', nickname: '乒乓小王子', avatar: '🏓', rankTier: '黄金', score: 1580, wins: 52, winRate: 60.5, isMe: true },
  { rank: 9, userId: 'user_003', nickname: '快攻手', avatar: '⚡', rankTier: '黄金', score: 1520, wins: 88, winRate: 58.7 },
  { rank: 10, userId: 'user_005', nickname: '弧圈王', avatar: '🌀', rankTier: '黄金', score: 1480, wins: 82, winRate: 56.2 },
  { rank: 11, userId: 'user_014', nickname: '稳如泰山', avatar: '⛰️', rankTier: '白银', score: 1350, wins: 72, winRate: 52.8 },
  { rank: 12, userId: 'user_006', nickname: '削球怪', avatar: '🔄', rankTier: '白银', score: 1280, wins: 65, winRate: 50.3 },
];

// 好友列表
export const friends: Friend[] = [
  { id: 'user_002', nickname: '旋转大师', avatar: '🎯', rankTier: '铂金', score: 1650, lastActive: '10分钟前', headToHead: { wins: 5, losses: 8 } },
  { id: 'user_003', nickname: '快攻手', avatar: '⚡', rankTier: '黄金', score: 1520, lastActive: '30分钟前', headToHead: { wins: 7, losses: 3 } },
  { id: 'user_004', nickname: '防守铁壁', avatar: '🛡️', rankTier: '铂金', score: 1720, lastActive: '1小时前', headToHead: { wins: 3, losses: 6 } },
  { id: 'user_005', nickname: '弧圈王', avatar: '🌀', rankTier: '黄金', score: 1480, lastActive: '2小时前', headToHead: { wins: 6, losses: 4 } },
  { id: 'user_006', nickname: '削球怪', avatar: '🔄', rankTier: '白银', score: 1280, lastActive: '昨天', headToHead: { wins: 8, losses: 2 } },
  { id: 'user_008', nickname: '老将', avatar: '👴', rankTier: '钻石', score: 1980, lastActive: '3小时前', headToHead: { wins: 1, losses: 5 } },
];

// 挑战列表
export const challenges: Challenge[] = [
  {
    id: 'challenge_001',
    challenger: { id: 'user_001', nickname: '乒乓小王子', avatar: '🏓', rankTier: '黄金' },
    challenged: { id: 'user_002', nickname: '旋转大师', avatar: '🎯', rankTier: '铂金' },
    status: 'pending',
    createdAt: '2026-05-06 14:00',
  },
  {
    id: 'challenge_002',
    challenger: { id: 'user_003', nickname: '快攻手', avatar: '⚡', rankTier: '黄金' },
    challenged: { id: 'user_001', nickname: '乒乓小王子', avatar: '🏓', rankTier: '黄金' },
    status: 'accepted',
    createdAt: '2026-05-05 18:30',
  },
  {
    id: 'challenge_003',
    challenger: { id: 'user_001', nickname: '乒乓小王子', avatar: '🏓', rankTier: '黄金' },
    challenged: { id: 'user_005', nickname: '弧圈王', avatar: '🌀', rankTier: '黄金' },
    status: 'completed',
    createdAt: '2026-05-03 10:00',
    matchId: 'match_004',
    result: 'win',
  },
];

