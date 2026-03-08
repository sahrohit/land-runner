import { Text } from '@/components/ui/text';
import { View, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import {
  MapPin,
  Timer,
  Ruler,
  AreaChart,
  ChevronRight,
  Footprints,
  RotateCcw,
  TrendingUp,
} from 'lucide-react-native';

// ── Theme ─────────────────────────────────────────────────────────────────────

const T = {
  bg: '#F5F5F5', // was #0A0A0A
  card: '#ECECEC', // was #131313
  cardInner: '#E0E0E0', // was #0D0D0D
  border: '#D5D5D5', // was #1F1F1F
  textPrimary: '#0A0A0A', // was #F5F5F5
  textMid: '#555555', // same
  textMuted: '#888888', // was #444 / #333
  iconMuted: '#C8C8C8', // was #2A2A2A
  accentGreen: '#A3E635', // unchanged
  accentBlue: '#60A5FA', // unchanged
  greenBadge: 'rgba(163,230,53,0.18)',
  blueBadge: 'rgba(96,165,250,0.18)',
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

type Activity = {
  id: string;
  activityType: 'run' | 'walk' | 'cycle';
  capturedArea: number;
  distanceMeters: number;
  startedAt: Date;
  endedAt: Date;
  isLoopClosed: boolean;
  userId: string;
};

type ActivityPoint = {
  id: string;
  activityId: string;
  coordinates: { latitude: number; longitude: number };
  sequence: number;
};

// ── Mock data ─────────────────────────────────────────────────────────────────

const ACTIVITIES: Activity[] = [
  {
    id: 'ZwtJGXrG84wtUlGfBbNX',
    activityType: 'run',
    capturedArea: 4.4,
    distanceMeters: 2,
    startedAt: new Date('2026-03-08T16:11:11Z'),
    endedAt: new Date('2026-03-08T16:11:12Z'),
    isLoopClosed: false,
    userId: 'ZwtJGXrG84wtUlGfBbNX',
  },
];

const POINTS: ActivityPoint[] = [
  {
    id: 'PanxwTg0EnUZ0aEHzVQ9',
    activityId: 'ZwtJGXrG84wtUlGfBbNX',
    coordinates: { latitude: 38.620812, longitude: -90.190519 },
    sequence: 2,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(start: Date, end: Date): string {
  const secs = Math.round((end.getTime() - start.getTime()) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters} m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function activityLabel(type: Activity['activityType']): string {
  return { run: 'Run', walk: 'Walk', cycle: 'Cycle' }[type];
}

function getPointsForActivity(id: string) {
  return POINTS.filter((p) => p.activityId === id);
}

// ── Mini dot-map ──────────────────────────────────────────────────────────────

function DotMap({ points }: { points: ActivityPoint[] }) {
  if (points.length === 0) return null;

  const lats = points.map((p) => p.coordinates.latitude);
  const lngs = points.map((p) => p.coordinates.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const W = 72;
  const H = 48;
  const pad = 6;

  const toX = (lng: number) =>
    points.length === 1 ? W / 2 : pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
  const toY = (lat: number) =>
    points.length === 1
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
      {points.map((p) => (
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

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: T.cardInner }}>
      <View className="mb-1 flex-row items-center gap-1">
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

function ActivityCard({ activity }: { activity: Activity }) {
  const points = getPointsForActivity(activity.id);
  const duration = formatDuration(activity.startedAt, activity.endedAt);
  const distance = formatDistance(activity.distanceMeters);

  return (
    <Pressable className="mb-4 overflow-hidden rounded-2xl" style={{ backgroundColor: T.card }}>
      {/* Top accent bar */}
      <View style={{ height: 3, backgroundColor: T.accentGreen }} />

      <View className="p-4">
        {/* Header row */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: T.greenBadge }}>
              <Footprints size={12} color={T.accentGreen} />
              <Text className="text-xs font-semibold" style={{ color: T.accentGreen }}>
                {activityLabel(activity.activityType).toUpperCase()}
              </Text>
            </View>

            {activity.isLoopClosed && (
              <View
                className="flex-row items-center gap-1 rounded-full px-2 py-1"
                style={{ backgroundColor: T.blueBadge }}>
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
        <Text className="mb-0.5 text-base font-bold" style={{ color: T.textPrimary }}>
          {formatDate(activity.startedAt)}
        </Text>
        <Text className="mb-4 text-xs" style={{ color: T.textMid }}>
          {formatTime(activity.startedAt)} → {formatTime(activity.endedAt)}
        </Text>

        {/* Stats row */}
        <View className="mb-4 flex-row gap-4">
          <StatPill
            icon={<Ruler size={13} color={T.accentGreen} />}
            label="Distance"
            value={distance}
          />
          <StatPill
            icon={<Timer size={13} color={T.accentGreen} />}
            label="Duration"
            value={duration}
          />
          <StatPill
            icon={<AreaChart size={13} color={T.accentGreen} />}
            label="Area"
            value={`${activity.capturedArea} m²`}
          />
        </View>

        {/* Footer: coordinates + dot-map */}
        <View
          className="flex-row items-center justify-between rounded-xl p-3"
          style={{ backgroundColor: T.cardInner }}>
          <View className="flex-row items-center gap-2">
            <MapPin size={13} color={T.textMuted} />
            {points[0] ? (
              <Text className="text-xs" style={{ color: T.textMid }}>
                {points[0].coordinates.latitude.toFixed(4)}°N{' '}
                {Math.abs(points[0].coordinates.longitude).toFixed(4)}°W
              </Text>
            ) : (
              <Text className="text-xs" style={{ color: T.textMuted }}>
                No location data
              </Text>
            )}
          </View>

          <DotMap points={points} />
        </View>
      </View>
    </Pressable>
  );
}

// ── Summary header ────────────────────────────────────────────────────────────

function SummaryHeader({ activities }: { activities: Activity[] }) {
  const totalDist = activities.reduce((a, b) => a + b.distanceMeters, 0);
  const totalArea = activities.reduce((a, b) => a + b.capturedArea, 0);

  return (
    <View className="mb-6">
      <View className="mb-1 flex-row items-end justify-between">
        <Text className="text-3xl font-black tracking-tight" style={{ color: T.textPrimary }}>
          Activities
        </Text>
        <View className="mb-1 flex-row items-center gap-1">
          <TrendingUp size={14} color={T.accentGreen} />
          <Text className="text-xs font-semibold" style={{ color: T.accentGreen }}>
            {activities.length} total
          </Text>
        </View>
      </View>

      <Text className="mb-5 text-sm" style={{ color: T.textMid }}>
        {formatDate(new Date())}
      </Text>

      {/* Totals strip */}
      <View className="flex-row overflow-hidden rounded-2xl" style={{ backgroundColor: T.card }}>
        <View
          className="flex-1 items-center p-4"
          style={{ borderRightWidth: 1, borderRightColor: T.border }}>
          <Text className="mb-1 text-xs" style={{ color: T.textMid }}>
            TOTAL DIST
          </Text>
          <Text className="text-xl font-black" style={{ color: T.textPrimary }}>
            {formatDistance(totalDist)}
          </Text>
        </View>
        <View className="flex-1 items-center p-4">
          <Text className="mb-1 text-xs" style={{ color: T.textMid }}>
            AREA MAPPED
          </Text>
          <Text className="text-xl font-black" style={{ color: T.textPrimary }}>
            {totalArea.toFixed(1)} m²
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ActivitiesScreenLight() {
  return (
    <View className="flex-1" style={{ backgroundColor: T.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        <SummaryHeader activities={ACTIVITIES} />

        <Text
          className="mb-3 text-xs font-semibold"
          style={{ color: T.textMuted, letterSpacing: 1.5 }}>
          RECENT
        </Text>

        {ACTIVITIES.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}

        {ACTIVITIES.length === 0 && (
          <View className="items-center justify-center py-20">
            <Footprints size={40} color={T.iconMuted} />
            <Text className="mt-4 text-base" style={{ color: T.textMuted }}>
              No activities yet
            </Text>
            <Text className="mt-1 text-sm" style={{ color: T.textMuted }}>
              Start your first run to see it here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
