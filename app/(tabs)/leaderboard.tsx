import { Text } from '@/components/ui/text';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import {
  Trophy,
  AlertCircle,
  TrendingUp,
  Calendar,
  Crown,
  Medal,
} from 'lucide-react-native';

// ── Theme (same as ActivitiesScreenLight) ─────────────────────────────────────

const T = {
  bg: '#F5F5F5',
  card: '#ECECEC',
  cardInner: '#E0E0E0',
  border: '#D5D5D5',
  textPrimary: '#0A0A0A',
  textMid: '#555555',
  textMuted: '#888888',
  iconMuted: '#C8C8C8',
  accentGreen: '#A3E635',
  accentBlue: '#60A5FA',
  greenBadge: 'rgba(163,230,53,0.18)',
  blueBadge: 'rgba(96,165,250,0.18)',
  errorBg: 'rgba(239,68,68,0.10)',
  errorText: '#EF4444',
} as const;

// ── Rank accent colors ────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'rgba(251,191,36,0.15)', text: '#F59E0B', border: 'rgba(251,191,36,0.4)' },
  2: { bg: 'rgba(156,163,175,0.15)', text: '#9CA3AF', border: 'rgba(156,163,175,0.4)' },
  3: { bg: 'rgba(180,115,60,0.15)', text: '#B47340', border: 'rgba(180,115,60,0.4)' },
};

// ── Types ─────────────────────────────────────────────────────────────────────

type Activity = {
  activityType: string;
  capturedArea: number;
  distanceMeters: number;
  startedAt: { toDate: () => Date };
  endedAt: { toDate: () => Date };
  isLoopClosed: boolean;
  userId: string;
};

type LeaderboardEntry = {
  userId: string;
  totalArea: number;
  activityCount: number;
};

type TabKey = 'daily' | 'alltime';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatArea(m2: number): string {
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(2)} km²`;
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2)} ha`;
  return `${m2.toFixed(1)} m²`;
}

function shortId(userId: string): string {
  return userId.length > 10 ? `${userId.slice(0, 8)}…` : userId;
}

function buildLeaderboard(activities: Activity[]): LeaderboardEntry[] {
  const map = new Map<string, { totalArea: number; activityCount: number }>();
  for (const a of activities) {
    const prev = map.get(a.userId) ?? { totalArea: 0, activityCount: 0 };
    map.set(a.userId, {
      totalArea: prev.totalArea + (a.capturedArea ?? 0),
      activityCount: prev.activityCount + 1,
    });
  }
  return Array.from(map.entries())
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.totalArea - a.totalArea)
    .slice(0, 10);
}

// ── Rank icon ─────────────────────────────────────────────────────────────────

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={16} color="#F59E0B" />;
  if (rank === 2) return <Medal size={16} color="#9CA3AF" />;
  if (rank === 3) return <Medal size={16} color="#B47340" />;
  return (
    <Text className="text-sm font-black w-4 text-center" style={{ color: T.textMuted }}>
      {rank}
    </Text>
  );
}

// ── Podium (top 3) ────────────────────────────────────────────────────────────

function PodiumBar({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  const accent = RANK_COLORS[rank];
  const heights = { 1: 80, 2: 60, 3: 48 };
  const barH = heights[rank as keyof typeof heights] ?? 48;

  return (
    <View className="flex-1 items-center gap-2">
      {/* Name */}
      <Text
        className="text-xs font-semibold text-center"
        numberOfLines={1}
        style={{ color: isCurrentUser ? T.accentGreen : T.textMid, maxWidth: 80 }}
      >
        {isCurrentUser ? 'You' : shortId(entry.userId)}
      </Text>

      {/* Area */}
      <Text className="text-xs font-bold" style={{ color: accent?.text ?? T.textMid }}>
        {formatArea(entry.totalArea)}
      </Text>

      {/* Bar */}
      <View
        style={{
          width: '80%',
          height: barH,
          borderRadius: 8,
          backgroundColor: accent?.bg ?? T.cardInner,
          borderWidth: 1,
          borderColor: accent?.border ?? T.border,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 8,
        }}
      >
        <RankIcon rank={rank} />
      </View>
    </View>
  );
}

function Podium({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}) {
  if (entries.length === 0) return null;

  // Reorder: 2nd, 1st, 3rd
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);

  return (
    <View
      className="rounded-2xl p-4 mb-4"
      style={{ backgroundColor: T.card }}
    >
      <Text
        className="text-xs font-semibold mb-4"
        style={{ color: T.textMuted, letterSpacing: 1.5 }}
      >
        TOP 3
      </Text>
      <View className="flex-row items-end gap-2">
        {order.map((entry) => {
          const rank = entries.indexOf(entry) + 1;
          return (
            <PodiumBar
              key={entry.userId}
              entry={entry}
              rank={rank}
              isCurrentUser={entry.userId === currentUserId}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Leaderboard row ───────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
  totalAreaSum,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
  totalAreaSum: number;
}) {
  const accent = RANK_COLORS[rank];
  const pct = totalAreaSum > 0 ? (entry.totalArea / totalAreaSum) * 100 : 0;
  const barMaxWidth = 120;
  const barWidth = Math.max(4, (pct / 100) * barMaxWidth);

  return (
    <View
      className="flex-row items-center rounded-xl mb-2 px-3 py-3"
      style={{
        backgroundColor: isCurrentUser
          ? 'rgba(163,230,53,0.10)'
          : T.card,
        borderWidth: isCurrentUser ? 1 : 0,
        borderColor: isCurrentUser ? 'rgba(163,230,53,0.35)' : 'transparent',
      }}
    >
      {/* Rank */}
      <View className="w-7 items-center mr-3">
        <RankIcon rank={rank} />
      </View>

      {/* Name + activity count */}
      <View className="flex-1">
        <Text
          className="text-sm font-bold"
          style={{ color: isCurrentUser ? T.accentGreen : T.textPrimary }}
          numberOfLines={1}
        >
          {isCurrentUser ? 'You' : shortId(entry.userId)}
        </Text>
        <Text className="text-xs" style={{ color: T.textMuted }}>
          {entry.activityCount} {entry.activityCount === 1 ? 'activity' : 'activities'}
        </Text>
      </View>

      {/* Bar + area */}
      <View className="items-end gap-1">
        <Text
          className="text-sm font-black"
          style={{ color: accent?.text ?? T.textPrimary }}
        >
          {formatArea(entry.totalArea)}
        </Text>
        <View
          style={{
            height: 4,
            width: barWidth,
            borderRadius: 2,
            backgroundColor: accent?.text ?? T.accentGreen,
            opacity: 0.6,
          }}
        />
      </View>
    </View>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-2 py-2 rounded-xl"
      style={{
        backgroundColor: active ? T.accentGreen : 'transparent',
      }}
    >
      {icon}
      <Text
        className="text-sm font-bold"
        style={{ color: active ? '#0A0A0A' : T.textMuted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [tab, setTab] = useState<TabKey>('daily');

  const [user] = useAuthState(auth);

  const [activitiesRaw, activitiesLoading, activitiesError] = useCollectionData(
    collection(db, 'activities'),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  const activities = (activitiesRaw ?? []) as Activity[];

  const dailyLeaderboard = useMemo(() => {
    const todayActivities = activities.filter((a) => isToday(a.startedAt?.toDate()));
    return buildLeaderboard(todayActivities);
  }, [activities]);

  const allTimeLeaderboard = useMemo(() => buildLeaderboard(activities), [activities]);

  const activeBoard = tab === 'daily' ? dailyLeaderboard : allTimeLeaderboard;
  const totalAreaSum = activeBoard.reduce((s, e) => s + e.totalArea, 0);
  const currentUserId = user?.uid;

  return (
    <View className="flex-1" style={{ backgroundColor: T.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text
              className="text-3xl font-black tracking-tight"
              style={{ color: T.textPrimary }}
            >
              Leaderboard
            </Text>
            <Text className="text-sm mt-0.5" style={{ color: T.textMid }}>
              Top 10 by area covered
            </Text>
          </View>
          <View
            className="rounded-full p-2"
            style={{ backgroundColor: T.greenBadge }}
          >
            <Trophy size={22} color={T.accentGreen} />
          </View>
        </View>

        {/* Tab switcher */}
        <View
          className="flex-row rounded-2xl p-1 mb-6"
          style={{ backgroundColor: T.card }}
        >
          <TabButton
            label="Today"
            icon={
              <Calendar
                size={14}
                color={tab === 'daily' ? '#0A0A0A' : T.textMuted}
              />
            }
            active={tab === 'daily'}
            onPress={() => setTab('daily')}
          />
          <TabButton
            label="All Time"
            icon={
              <TrendingUp
                size={14}
                color={tab === 'alltime' ? '#0A0A0A' : T.textMuted}
              />
            }
            active={tab === 'alltime'}
            onPress={() => setTab('alltime')}
          />
        </View>

        {/* Error */}
        {activitiesError && (
          <View
            className="flex-row items-center gap-2 rounded-xl p-3 mb-4"
            style={{ backgroundColor: T.errorBg }}
          >
            <AlertCircle size={16} color={T.errorText} />
            <Text className="text-sm flex-1" style={{ color: T.errorText }}>
              {activitiesError.message ?? 'Failed to load data'}
            </Text>
          </View>
        )}

        {/* Loading */}
        {activitiesLoading && (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={T.accentGreen} />
            <Text className="text-sm mt-4" style={{ color: T.textMuted }}>
              Loading leaderboard…
            </Text>
          </View>
        )}

        {/* Content */}
        {!activitiesLoading && (
          <>
            {activeBoard.length >= 3 && (
              <Podium entries={activeBoard} currentUserId={currentUserId} />
            )}

            {activeBoard.length > 0 ? (
              <>
                <Text
                  className="text-xs font-semibold mb-3"
                  style={{ color: T.textMuted, letterSpacing: 1.5 }}
                >
                  RANKINGS
                </Text>
                {activeBoard.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    rank={i + 1}
                    isCurrentUser={entry.userId === currentUserId}
                    totalAreaSum={totalAreaSum}
                  />
                ))}
              </>
            ) : (
              <View className="items-center justify-center py-20">
                <Trophy size={40} color={T.iconMuted} />
                <Text className="text-base mt-4" style={{ color: T.textMuted }}>
                  No data {tab === 'daily' ? 'today' : 'yet'}
                </Text>
                <Text className="text-sm mt-1" style={{ color: T.textMuted }}>
                  Complete an activity to appear here
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}