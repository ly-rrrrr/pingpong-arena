import {
  resolveCampusBoundary,
  type CampusBoundary,
  type Coordinates,
} from "./campus-boundaries";
import { openCampusBoundaries } from "./open-campus-boundaries";

export type { Coordinates } from "./campus-boundaries";

export type Campus = CampusBoundary;

export type CampusUser = {
  id: string;
  nickname: string;
  avatar: string;
  rankTier: string;
  score: number;
};

type Presence = {
  user: CampusUser;
  campusId: string;
  location: Coordinates;
  lastSeenAt: number;
  status: "online" | "matching" | "in_session";
};

export type LobbyUser = CampusUser & {
  campusId: string;
  status: Presence["status"];
  lastSeenAt: string;
};

export type CampusBroadcast = {
  id: string;
  userId: string;
  campusId: string;
  nickname: string;
  avatar: string;
  rankTier: string;
  score: number;
  message: string;
  preferredTime?: string;
  preferredVenue?: string;
  status: "active" | "matched" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type CampusBroadcastView = CampusBroadcast & {
  approxDistance: string;
};

const PRESENCE_TTL_MS = 2 * 60 * 1000;
const BROADCAST_TTL_MS = 30 * 60 * 1000;

const RATE_LIMITS = {
  enterLobby: { max: 6, windowMs: 60_000 },
  refreshPresence: { max: 4, windowMs: 60_000 },
} as const;

type RateLimitedEndpoint = keyof typeof RATE_LIMITS;

const rateLimitStore = new Map<string, Map<RateLimitedEndpoint, { count: number; resetAt: number }>>();

let rateLimitCleanupTimer: ReturnType<typeof setInterval> | null = null;

function getRateLimitCleanupTimer() {
  if (!rateLimitCleanupTimer) {
    rateLimitCleanupTimer = setInterval(() => {
      const cutoff = now() - 10 * 60 * 1000;
      for (const [userId, limits] of rateLimitStore.entries()) {
        let allExpired = true;
        for (const [, entry] of limits) {
          if (entry.resetAt > cutoff) { allExpired = false; break; }
        }
        if (allExpired) rateLimitStore.delete(userId);
      }
    }, 5 * 60 * 1000);
  }
  return rateLimitCleanupTimer;
}

function checkRateLimit(userId: string, endpoint: RateLimitedEndpoint): boolean {
  getRateLimitCleanupTimer();
  const nowMs = now();
  if (!rateLimitStore.has(userId)) rateLimitStore.set(userId, new Map());
  const userLimits = rateLimitStore.get(userId)!;
  const limit = RATE_LIMITS[endpoint];
  const entry = userLimits.get(endpoint);
  if (!entry || nowMs > entry.resetAt) {
    userLimits.set(endpoint, { count: 1, resetAt: nowMs + limit.windowMs });
    return true;
  }
  if (entry.count >= limit.max) return false;
  entry.count++;
  return true;
}

export const campuses: Campus[] = openCampusBoundaries;

const seededUsers: Presence[] = [
  {
    user: { id: "campus_user_001", nickname: "同校快攻手", avatar: "⚡", rankTier: "黄金", score: 1510 },
    campusId: "fzu_qishan",
    location: { latitude: 26.062, longitude: 119.202 },
    lastSeenAt: Date.now(),
    status: "online",
  },
  {
    user: { id: "campus_user_002", nickname: "体育馆球友", avatar: "🏓", rankTier: "铂金", score: 1680 },
    campusId: "fzu_qishan",
    location: { latitude: 26.059, longitude: 119.198 },
    lastSeenAt: Date.now(),
    status: "matching",
  },
];

let presenceStore = new Map<string, Presence>();
let broadcastStore = new Map<string, CampusBroadcast>();

function now() {
  return Date.now();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(a: Coordinates, b: Coordinates) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

export function formatApproxDistance(meters: number) {
  if (meters < 200) return "同校区";
  if (meters < 1000) return `约${Math.round(meters / 100) * 100}m`;
  return `约${(meters / 1000).toFixed(1)}km`;
}

export function resolveCampus(location: Coordinates) {
  return resolveCampusBoundary(location, campuses);
}

function freshPresenceEntries(campusId?: string) {
  const cutoff = now() - PRESENCE_TTL_MS;
  return [...presenceStore.values()].filter(
    (presence) =>
      presence.lastSeenAt >= cutoff &&
      (!campusId || presence.campusId === campusId),
  );
}

function getFreshPresence(userId: string) {
  const presence = presenceStore.get(userId);
  if (!presence || presence.lastSeenAt < now() - PRESENCE_TTL_MS) return undefined;
  return presence;
}

export function enterLobby({
  user,
  location,
}: {
  user: CampusUser;
  location: Coordinates;
}) {
  if (!checkRateLimit(user.id, "enterLobby")) {
    throw new Error("RATE_LIMITED: Too many enterLobby requests");
  }

  const campus = resolveCampus(location);
  console.log(`[enterLobby] user=${user.id} lat=${location.latitude} lng=${location.longitude} campus=${campus?.name ?? "NONE"}`);
  if (!campus) {
    presenceStore.delete(user.id);
    return {
      allowed: false as const,
      reason: "OUTSIDE_OPEN_CAMPUS" as const,
      campus: null,
    };
  }

  const presence: Presence = {
    user,
    campusId: campus.id,
    location,
    lastSeenAt: now(),
    status: "online",
  };
  presenceStore.set(user.id, presence);

  return {
    allowed: true as const,
    campus,
  };
}

export function listLobbyUsers({ campusId }: { campusId: string }): LobbyUser[] {
  return freshPresenceEntries(campusId).map((presence) => ({
    ...presence.user,
    campusId: presence.campusId,
    status: presence.status,
    lastSeenAt: new Date(presence.lastSeenAt).toISOString(),
  }));
}

export function createBroadcast({
  userId,
  message,
  preferredTime,
  preferredVenue,
}: {
  userId: string;
  message: string;
  preferredTime?: string;
  preferredVenue?: string;
}) {
  const presence = getFreshPresence(userId);
  if (!presence) {
    throw new Error("User is not in an active campus lobby");
  }

  const createdAt = now();
  const broadcast: CampusBroadcast = {
    id: `broadcast_${createdAt}_${userId}`,
    userId,
    campusId: presence.campusId,
    nickname: presence.user.nickname,
    avatar: presence.user.avatar,
    rankTier: presence.user.rankTier,
    score: presence.user.score,
    message,
    preferredTime,
    preferredVenue,
    status: "active",
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + BROADCAST_TTL_MS).toISOString(),
  };

  broadcastStore.set(broadcast.id, broadcast);
  presenceStore.set(userId, { ...presence, status: "matching", lastSeenAt: createdAt });
  return broadcast;
}

export function listBroadcasts({
  campusId,
  viewerLocation,
}: {
  campusId: string;
  viewerLocation?: Coordinates;
}): CampusBroadcastView[] {
  const currentTime = now();
  return [...broadcastStore.values()].filter(
    (broadcast) =>
      broadcast.campusId === campusId &&
      broadcast.status === "active" &&
      Date.parse(broadcast.expiresAt) > currentTime,
  ).map((broadcast) => {
    const broadcasterPresence = getFreshPresence(broadcast.userId);
    const approxDistance =
      viewerLocation && broadcasterPresence
        ? formatApproxDistance(distanceMeters(viewerLocation, broadcasterPresence.location))
        : "同校区";

    return {
      ...broadcast,
      approxDistance,
    };
  });
}

// ---------------------------------------------------------------------------
// Match requests — when B accepts A's broadcast, a match request is created.
// A polls for incoming requests; both confirm via the server.
// ---------------------------------------------------------------------------

export type MatchRequest = {
  id: string;
  fromUserId: string;      // the user who accepted (B)
  fromNickname: string;
  fromAvatar: string;
  fromRankTier: string;
  fromScore: number;
  toUserId: string;         // the broadcast creator (A)
  broadcastId: string;
  campusId: string;
  status: "pending" | "accepted" | "declined" | "expired";
  fromConfirmed: boolean;   // B confirmed
  toConfirmed: boolean;     // A confirmed
  createdAt: number;
  expiresAt: number;
};

const MATCH_REQUEST_TTL_MS = 5 * 60 * 1000; // 5 minutes

let matchRequestStore = new Map<string, MatchRequest>();

function cleanExpiredMatchRequests() {
  const cutoff = now() - MATCH_REQUEST_TTL_MS;
  const expired: string[] = [];
  for (const [id, mr] of matchRequestStore.entries()) {
    if (mr.createdAt < cutoff || mr.status === "expired") expired.push(id);
  }
  for (const id of expired) matchRequestStore.delete(id);
}

function getPendingMatchRequestForUser(userId: string): MatchRequest | undefined {
  cleanExpiredMatchRequests();
  for (const mr of matchRequestStore.values()) {
    if (mr.toUserId === userId && mr.status === "pending") return mr;
  }
}

function getIncomingMatchRequestForUser(userId: string): MatchRequest | undefined {
  cleanExpiredMatchRequests();
  for (const mr of matchRequestStore.values()) {
    if (
      (mr.toUserId === userId || mr.fromUserId === userId) &&
      (mr.status === "pending" || mr.status === "accepted")
    )
      return mr;
  }
}

export function createMatchRequest({
  fromUserId,
  fromNickname,
  fromAvatar,
  fromRankTier,
  fromScore,
  toUserId,
  broadcastId,
  campusId,
}: {
  fromUserId: string;
  fromNickname: string;
  fromAvatar: string;
  fromRankTier: string;
  fromScore: number;
  toUserId: string;
  broadcastId: string;
  campusId: string;
}) {
  // Cancel existing pending requests between these users
  for (const [id, mr] of matchRequestStore.entries()) {
    if (
      mr.status === "pending" &&
      (mr.fromUserId === fromUserId || mr.toUserId === fromUserId ||
       mr.fromUserId === toUserId || mr.toUserId === toUserId)
    ) {
      matchRequestStore.delete(id);
    }
  }

  const createdAt = now();
  const mr: MatchRequest = {
    id: `mr_${createdAt}_${fromUserId}_${toUserId}`,
    fromUserId,
    fromNickname,
    fromAvatar,
    fromRankTier,
    fromScore,
    toUserId,
    broadcastId,
    campusId,
    status: "pending",
    fromConfirmed: false,
    toConfirmed: false,
    createdAt,
    expiresAt: createdAt + MATCH_REQUEST_TTL_MS,
  };

  // Mark the broadcast as matched so others don't see it
  const broadcast = broadcastStore.get(broadcastId);
  if (broadcast) {
    broadcastStore.set(broadcastId, { ...broadcast, status: "matched" });
  }

  matchRequestStore.set(mr.id, mr);
  return { matchRequest: mr };
}

export function pollMatchRequest({ userId }: { userId: string }) {
  return getPendingMatchRequestForUser(userId) ?? null;
}

export function respondToMatchRequest({
  matchRequestId,
  userId,
  accept,
}: {
  matchRequestId: string;
  userId: string;
  accept: boolean;
}) {
  const mr = matchRequestStore.get(matchRequestId);
  if (!mr) throw new Error("MATCH_REQUEST_NOT_FOUND");
  if (mr.toUserId !== userId) throw new Error("NOT_YOUR_REQUEST");

  if (accept) {
    mr.status = "accepted";
    mr.toConfirmed = true; // A (broadcast creator) confirms by accepting
    matchRequestStore.set(matchRequestId, mr);
    return { matchRequest: mr, phase: "waiting_opponent" as const };
  } else {
    mr.status = "declined";
    matchRequestStore.set(matchRequestId, mr);
    return { matchRequest: mr, phase: "declined" as const };
  }
}

export function confirmMatchFromAcceptor({
  matchRequestId,
  userId,
}: {
  matchRequestId: string;
  userId: string;
}) {
  const mr = matchRequestStore.get(matchRequestId);
  if (!mr) throw new Error("MATCH_REQUEST_NOT_FOUND");
  if (mr.fromUserId !== userId) throw new Error("ONLY_ACCEPTOR_CAN_CONFIRM");

  mr.fromConfirmed = true;
  matchRequestStore.set(matchRequestId, mr);

  if (mr.toConfirmed && mr.fromConfirmed) {
    mr.status = "accepted";
    return { matchRequest: mr, bothConfirmed: true as const };
  }
  return { matchRequest: mr, bothConfirmed: false as const };
}

export function getMatchRequestStatus({
  matchRequestId,
}: {
  matchRequestId: string;
}) {
  const mr = matchRequestStore.get(matchRequestId);
  if (!mr) return null;
  return {
    id: mr.id,
    status: mr.status,
    fromConfirmed: mr.fromConfirmed,
    toConfirmed: mr.toConfirmed,
    fromNickname: mr.fromNickname,
    fromAvatar: mr.fromAvatar,
    toUserId: mr.toUserId,
    fromUserId: mr.fromUserId,
  };
}

// ---------------------------------------------------------------------------
// Channel messages — relay text/emoji between matched users.
// ---------------------------------------------------------------------------

export type ChannelMsg = {
  id: string;
  matchRequestId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: "text" | "voice" | "system" | "image" | "time_proposal";
  timestamp: string;
  metadata?: Record<string, string>;
};

const channelMsgStore = new Map<string, ChannelMsg[]>(); // key: matchRequestId

function ensureChannelMsgList(matchRequestId: string): ChannelMsg[] {
  if (!channelMsgStore.has(matchRequestId)) channelMsgStore.set(matchRequestId, []);
  return channelMsgStore.get(matchRequestId)!;
}

export function sendChannelMessage(input: {
  matchRequestId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: "text" | "voice" | "system" | "image" | "time_proposal";
  id?: string;
  metadata?: Record<string, string>;
}) {
  const list = ensureChannelMsgList(input.matchRequestId);
  if (input.id && list.some((m) => m.id === input.id)) return list[list.length - 1];
  const msg: ChannelMsg = {
    id: input.id || `chmsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    matchRequestId: input.matchRequestId,
    senderId: input.senderId,
    senderName: input.senderName,
    senderAvatar: input.senderAvatar,
    content: input.content,
    type: input.type,
    timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    metadata: input.metadata,
  };
  list.push(msg);
  // Keep only last 200 messages
  if (list.length > 200) channelMsgStore.set(input.matchRequestId, list.slice(-200));
  return msg;
}

export function pollChannelMessages(input: {
  matchRequestId: string;
  sinceId?: string;
}) {
  const list = ensureChannelMsgList(input.matchRequestId);
  if (!input.sinceId) return list;
  const idx = list.findIndex((m) => m.id === input.sinceId);
  return idx >= 0 ? list.slice(idx + 1) : list;
}

export function declineMatchRequest({
  matchRequestId,
  userId,
}: {
  matchRequestId: string;
  userId: string;
}) {
  const mr = matchRequestStore.get(matchRequestId);
  if (!mr) throw new Error("MATCH_REQUEST_NOT_FOUND");
  mr.status = "declined";
  matchRequestStore.set(matchRequestId, mr);

  // Revert associated broadcast back to "active" so others can accept it
  const broadcast = broadcastStore.get(mr.broadcastId);
  if (broadcast && broadcast.status === "matched") {
    broadcastStore.set(mr.broadcastId, { ...broadcast, status: "active" });
  }

  return { ok: true };
}

export function cancelBroadcast({ userId }: { userId: string }) {
  let cancelled = false;
  for (const [id, broadcast] of broadcastStore.entries()) {
    if (broadcast.userId !== userId || broadcast.status !== "active") continue;
    broadcastStore.set(id, { ...broadcast, status: "expired" });
    cancelled = true;
  }

  const presence = getFreshPresence(userId);
  if (presence) {
    presenceStore.set(userId, { ...presence, status: "online", lastSeenAt: now() });
  }

  return { cancelled };
}

export function refreshPresence({
  userId,
  location,
}: {
  userId: string;
  location: Coordinates;
}) {
  if (!checkRateLimit(userId, "refreshPresence")) {
    throw new Error("RATE_LIMITED: Too many refreshPresence requests");
  }

  const presence = getFreshPresence(userId);
  if (!presence) {
    return { ok: false as const, reason: "NO_PRESENCE" as const };
  }

  const campus = resolveCampus(location);
  if (!campus || campus.id !== presence.campusId) {
    presenceStore.delete(userId);
    return { ok: false as const, reason: "LEFT_CAMPUS" as const };
  }

  presenceStore.set(userId, { ...presence, location, lastSeenAt: now() });
  return { ok: true as const };
}

export function resetMatchingStoreForTests() {
  presenceStore = new Map();
  broadcastStore = new Map();
  matchRequestStore = new Map();
  channelMsgStore.clear();
  rateLimitStore.clear();
  if (rateLimitCleanupTimer) {
    clearInterval(rateLimitCleanupTimer);
    rateLimitCleanupTimer = null;
  }
}

export function seedMatchingStore() {
  if (presenceStore.size > 0) return;
  for (const presence of seededUsers) {
    presenceStore.set(presence.user.id, { ...presence, lastSeenAt: now() });
  }
}

seedMatchingStore();
