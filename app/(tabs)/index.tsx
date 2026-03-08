import { Text } from '@/components/ui/text';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { collection, query, where } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase'; // adjust to your firebase init path
import {
  MapPin,
  Timer,
  Ruler,
  AreaChart,
  ChevronRight,
  Footprints,
  RotateCcw,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';

// ── Theme ─────────────────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

type Activity = {
  id: string;
  activityType: 'run' | 'walk' | 'cycle';
  capturedArea: number;
  distanceMeters: number;
  startedAt: { toDate: () => Date };
  endedAt: { toDate: () => Date };
  isLoopClosed: boolean;
  userId: string;
};

type ActivityPoint = {
  id: string;
  activityId: string;
  coordinates: { latitude: number; longitude: number };
  sequence: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function durationSeconds(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(0)} m`;
}

function formatPace(distanceMeters: number, durationSecs: number): string {
  if (distanceMeters <= 0 || durationSecs <= 0) return '—';
  const secsPerKm = durationSecs / (distanceMeters / 1000);
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')} /km`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function activityLabel(type: Activity['activityType']): string {
  return { run: 'Run', walk: 'Walk', cycle: 'Cycle' }[type] ?? type;
}

// ── Mini dot-map ──────────────────────────────────────────────────────────────

function DotMap({ points }: { points: ActivityPoint[] }) {
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.sequence - b.sequence);
  const lats = sorted.map((p) => p.coordinates.latitude);
  const lngs = sorted.map((p) => p.coordinates.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const W = 72;
  const H = 48;
  const pad = 6;

  const toX = (lng: number) =>
    sorted.length === 1
      ? W / 2
      : pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
  const toY = (lat: number) =>
    sorted.length === 1
      ? H / 2
      : pad + (1 - (lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2);

  return (
    <View style={{ width: W, height: H, position: 'relative' }}>
      {[0.33, 0.66].map((f) => (
        <View
          key={`h${f}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: H * f,
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.07)',
          }}
        />
      ))}
      {sorted.map((p) => (
        <View
          key={p.id}
          style={{
            position: 'absolute',
            left: toX(p.coordinates.longitude) - 3,
            top: toY(p.coordinates.latitude) - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: T.accentGreen,
          }}
        />
      ))}
    </View>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: T.cardInner }}>
      <View className="flex-row items-center gap-1 mb-1">
        {icon}
        <Text className="text-xs" style={{ color: T.textMid }}>
          {label}
        </Text>
      </View>
      <Text className="text-sm font-bold" style={{ color: T.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  points,
}: {
  activity: Activity;
  points: ActivityPoint[];
}) {
  const startedAt = activity.startedAt.toDate();
  const endedAt = activity.endedAt.toDate();
  const secs = durationSeconds(startedAt, endedAt);
  const actPoints = points
    .filter((p) => p.activityId === activity.id)
    .sort((a, b) => a.sequence - b.sequence);
  const firstPoint = actPoints[0] ?? null;

  return (
    <Link href={`/activity/${activity.id}`} asChild>
      <Pressable
        className="mb-4 overflow-hidden rounded-2xl"
        style={{ backgroundColor: T.card }}
      >
        {/* Top accent bar */}
        <View style={{ height: 3, backgroundColor: T.accentGreen }} />

        <View className="p-4">
          {/* Header row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View
                className="flex-row items-center gap-1 rounded-full px-2 py-1"
                style={{ backgroundColor: T.greenBadge }}
              >
                <Footprints size={12} color={T.accentGreen} />
                <Text className="text-xs font-semibold" style={{ color: T.accentGreen }}>
                  {activityLabel(activity.activityType).toUpperCase()}
                </Text>
              </View>

              {activity.isLoopClosed && (
                <View
                  className="flex-row items-center gap-1 rounded-full px-2 py-1"
                  style={{ backgroundColor: T.blueBadge }}
                >
                  <RotateCcw size={10} color={T.accentBlue} />
                  <Text className="text-xs font-semibold" style={{ color: T.accentBlue }}>
                    LOOP
                  </Text>
                </View>
              )}
            </View>

            <ChevronRight size={16} color={T.textMuted} />
          </View>

          {/* Date / time */}
          <Text className="text-base font-bold mb-0.5" style={{ color: T.textPrimary }}>
            {formatDate(startedAt)}
          </Text>
          <Text className="text-xs mb-4" style={{ color: T.textMid }}>
            {formatTime(startedAt)} → {formatTime(endedAt)}
          </Text>

          {/* Stats row */}
          <View className="flex-row gap-2 mb-2">
            <StatPill
              icon={<Ruler size={13} color={T.accentGreen} />}
              label="Distance"
              value={formatDistance(activity.distanceMeters)}
            />
            <StatPill
              icon={<Timer size={13} color={T.accentGreen} />}
              label="Duration"
              value={formatDuration(secs)}
            />
            <StatPill
              icon={<AreaChart size={13} color={T.accentGreen} />}
              label="Area"
              value={`${activity.capturedArea.toFixed(1)} m²`}
            />
          </View>

          {/* Pace + points row */}
          <View className="flex-row gap-2 mb-4">
            <StatPill
              icon={<TrendingUp size={13} color={T.accentBlue} />}
              label="Avg Pace"
              value={formatPace(activity.distanceMeters, secs)}
            />
            <StatPill
              icon={<MapPin size={13} color={T.accentBlue} />}
              label="GPS Points"
              value={`${actPoints.length}`}
            />
          </View>

          {/* Footer: coordinates + dot-map */}
          <View
            className="flex-row items-center justify-between rounded-xl p-3"
            style={{ backgroundColor: T.cardInner }}
          >
            <View className="flex-row items-center gap-2">
              <MapPin size={13} color={T.textMuted} />
              {firstPoint ? (
                <Text className="text-xs" style={{ color: T.textMid }}>
                  {firstPoint.coordinates.latitude.toFixed(4)}°N{' '}
                  {Math.abs(firstPoint.coordinates.longitude).toFixed(4)}°W
                </Text>
              ) : (
                <Text className="text-xs" style={{ color: T.textMuted }}>
                  No location data
                </Text>
              )}
            </View>

            <DotMap points={actPoints} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// ── Summary header ────────────────────────────────────────────────────────────

function SummaryHeader({ activities }: { activities: Activity[] }) {
  const totalDist = activities.reduce((s, a) => s + (a.distanceMeters ?? 0), 0);
  const totalArea = activities.reduce((s, a) => s + (a.capturedArea ?? 0), 0);
  const totalDuration = activities.reduce(
    (s, a) => s + durationSeconds(a.startedAt.toDate(), a.endedAt.toDate()),
    0
  );

  return (
    <View className="mb-6">
      <View className="flex-row items-end justify-between mb-1">
        <Text className="text-3xl font-black tracking-tight" style={{ color: T.textPrimary }}>
          Activities
        </Text>
        <View className="flex-row items-center gap-1 mb-1">
          <TrendingUp size={14} color={T.accentGreen} />
          <Text className="text-xs font-semibold" style={{ color: T.accentGreen }}>
            {activities.length} total
          </Text>
        </View>
      </View>

      <Text className="text-sm mb-5" style={{ color: T.textMid }}>
        {formatDate(new Date())}
      </Text>

      {/* Totals strip */}
      <View className="rounded-2xl overflow-hidden" style={{ backgroundColor: T.card }}>
        <View className="flex-row">
          <View
            className="flex-1 p-4 items-center"
            style={{ borderRightWidth: 1, borderRightColor: T.border }}
          >
            <Text className="text-xs mb-1" style={{ color: T.textMid }}>
              TOTAL DIST
            </Text>
            <Text className="text-xl font-black" style={{ color: T.textPrimary }}>
              {formatDistance(totalDist)}
            </Text>
          </View>
          <View
            className="flex-1 p-4 items-center"
            style={{ borderRightWidth: 1, borderRightColor: T.border }}
          >
            <Text className="text-xs mb-1" style={{ color: T.textMid }}>
              TOTAL TIME
            </Text>
            <Text className="text-xl font-black" style={{ color: T.textPrimary }}>
              {formatDuration(totalDuration)}
            </Text>
          </View>
          <View className="flex-1 p-4 items-center">
            <Text className="text-xs mb-1" style={{ color: T.textMid }}>
              AREA MAPPED
            </Text>
            <Text className="text-xl font-black" style={{ color: T.textPrimary }}>
              {totalArea.toFixed(1)} m²
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ActivitiesScreenLight() {
  const [user, userLoading, userError] = useAuthState(auth);

  const activitiesQuery = user
    ? query(collection(db, 'activities'), where('userId', '==', user.uid))
    : null;

  const [activitiesRaw, activitiesLoading, activitiesError] = useCollectionData(
    activitiesQuery,
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  const [pointsRaw, pointsLoading, pointsError] = useCollectionData(
    collection(db, 'points'),
    { snapshotListenOptions: { includeMetadataChanges: true } }
  );

  const activities = (activitiesRaw ?? []) as Activity[];
  const points = (pointsRaw ?? []) as ActivityPoint[];

  const isLoading = userLoading || activitiesLoading || pointsLoading;
  const error = userError || activitiesError || pointsError;

  const sorted = [...activities].sort(
    (a, b) => b.startedAt.toDate().getTime() - a.startedAt.toDate().getTime()
  );

  return (
    <View className="flex-1" style={{ backgroundColor: T.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Error banner */}
        {error && (
          <View
            className="flex-row items-center gap-2 rounded-xl p-3 mb-4"
            style={{ backgroundColor: T.errorBg }}
          >
            <AlertCircle size={16} color={T.errorText} />
            <Text className="text-sm flex-1" style={{ color: T.errorText }}>
              {error.message ?? 'Failed to load data'}
            </Text>
          </View>
        )}

        {/* Loading state */}
        {isLoading && (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={T.accentGreen} />
            <Text className="text-sm mt-4" style={{ color: T.textMuted }}>
              Loading activities…
            </Text>
          </View>
        )}

        {/* Content */}
        {!isLoading && (
          <>
            {sorted.length > 0 && <SummaryHeader activities={sorted} />}

            <Text
              className="text-xs font-semibold mb-3"
              style={{ color: T.textMuted, letterSpacing: 1.5 }}
            >
              RECENT
            </Text>

            {sorted.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} points={points} />
            ))}

            {sorted.length === 0 && !error && (
              <View className="items-center justify-center py-20">
                <Footprints size={40} color={T.iconMuted} />
                <Text className="text-base mt-4" style={{ color: T.textMuted }}>
                  No activities yet
                </Text>
                <Text className="text-sm mt-1" style={{ color: T.textMuted }}>
                  Start your first run to see it here
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}