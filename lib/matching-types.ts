// 匹配广播状态
export type MatchingStatus = 'broadcasting' | 'matched' | 'confirming' | 'in_channel' | 'scheduling' | 'negotiating' | 'retreat' | 'completed' | 'cancelled';

// 场馆信息
export interface Venue {
  id: string;
  name: string;
  address: string;
  distance: string; // 距离
  availableSlots: TimeSlot[];
  tables: number; // 球台数量
  pricePerHour: number; // 每小时价格
}

// 时间段
export interface TimeSlot {
  id: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  date: string; // YYYY-MM-DD
  available: boolean;
}

// 匹配广播消息
export interface MatchBroadcast {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  rankTier: string;
  score: number;
  message: string; // 匹配留言
  preferredTime: string; // 期望时间
  preferredVenue?: string; // 期望场地
  createdAt: string;
  status: 'active' | 'matched' | 'expired';
  approxDistance: string; // 与当前用户的距离
}

// 频道消息
export interface ChannelMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: 'text' | 'voice' | 'system' | 'time_proposal' | 'venue_proposal' | 'image';
  timestamp: string;
  metadata?: {
    venueId?: string;
    venueName?: string;
    timeSlotId?: string;
    proposedDate?: string;
    proposedTime?: string;
    imageUri?: string;
  };
}

// 匹配会话
export interface MatchSession {
  id: string;
  myId: string;
  opponentId: string;
  opponentNickname: string;
  opponentAvatar: string;
  opponentRankTier: string;
  opponentApproxDistance?: string;
  status: MatchingStatus;
  messages: ChannelMessage[];
  selectedVenue?: Venue;
  timeProposals: TimeProposal[];
  retreatState?: RetreatState;
  createdAt: string;
}

// 时间提议
export interface TimeProposal {
  id: string;
  proposerId: string;
  proposerName: string;
  date: string;
  startTime: string;
  endTime: string;
  venueId: string;
  venueName: string;
  status: 'pending' | 'accepted' | 'rejected';
  round: number; // 第几轮协商
}

// 劝退状态
export type RetreatChoice = 'continue_negotiate' | 'force_exit';

export interface RetreatState {
  triggered: boolean;
  myChoice?: RetreatChoice;
  opponentChoice?: RetreatChoice;
  deadline: string; // 选择截止时间
}
