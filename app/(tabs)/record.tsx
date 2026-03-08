import React, { useEffect, useRef, useState } from 'react';
import MapView, { Polygon } from 'react-native-maps';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/text';
import { collection, addDoc, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { MapPin, Radio, Square, Navigation } from 'lucide-react-native';

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
} as const;

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
    <View style={[styles.statPill, { backgroundColor: T.cardInner }]}>
      <View style={styles.statPillHeader}>
        {icon}
        <Text style={[styles.statLabel, { color: T.textMid }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: T.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Screen() {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [pointCount, setPointCount] = useState(0);
  const [elapsedSecs, setElapsedSecs] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sequenceRef = useRef(1);
  const startedAtRef = useRef<Timestamp | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    })();
  }, []);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid ?? 'anonymous';

    startedAtRef.current = Timestamp.now();
    sequenceRef.current = 1;
    setPointCount(0);
    setElapsedSecs(0);

    const activityRef = await addDoc(collection(db, 'activities'), {
      activityType: 'run',
      capturedArea: 0,
      distanceMeters: 0,
      startedAt: startedAtRef.current,
      endedAt: null,
      isLoopClosed: false,
      userId,
    });

    const newActivityId = activityRef.id;
    await setDoc(doc(db, 'activities', newActivityId), { id: newActivityId }, { merge: true });

    setActivityId(newActivityId);
    setIsRecording(true);

    // Elapsed timer
    timerRef.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);

    // GPS point writer
    intervalRef.current = setInterval(async () => {
      try {
        const position = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = position.coords;

        const pointRef = await addDoc(collection(db, 'points'), {
          activityId: newActivityId,
          coordinates: new (await import('firebase/firestore')).GeoPoint(latitude, longitude),
          sequence: sequenceRef.current,
        });

        await setDoc(doc(db, 'points', pointRef.id), { id: pointRef.id }, { merge: true });

        sequenceRef.current += 1;
        setPointCount((c) => c + 1);
        setCoords({ latitude, longitude });
      } catch (err) {
        console.error('Error writing point:', err);
      }
    }, 1000);
  };

  const stopRecording = async () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    if (activityId) {
      await setDoc(
        doc(db, 'activities', activityId),
        { endedAt: Timestamp.now() },
        { merge: true }
      );
    }

    setIsRecording(false);
    setActivityId(null);
    sequenceRef.current = 1;
  };

  const handleRecordToggle = () => isRecording ? stopRecording() : startRecording();

  if (!coords) {
    return (
      <View style={[styles.container, { backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }]}>
        <Navigation size={32} color={T.iconMuted} />
        <Text style={{ color: T.textMuted, fontSize: 15 }}>Acquiring location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={{ flex: 1 }}
        showsUserLocation
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />

      {/* Floating card */}
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: T.card }]}>

          {/* Green accent bar */}
          <View style={[styles.accentBar, { backgroundColor: T.accentGreen }]} />

          <View style={styles.cardBody}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: T.textPrimary }]}>
                  {isRecording ? 'Recording…' : 'Start your Journey'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: T.textMid }]}>
                  {isRecording
                    ? 'GPS tracking active'
                    : 'Ready to record your activity'}
                </Text>
              </View>

              {/* Live indicator */}
              {isRecording && (
                <View style={[styles.liveBadge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatPill
                icon={<MapPin size={13} color={T.accentGreen} />}
                label="GPS Points"
                value={`${pointCount}`}
              />
              <StatPill
                icon={<Radio size={13} color={T.accentBlue} />}
                label="Elapsed"
                value={isRecording ? formatElapsed(elapsedSecs) : '—'}
              />
            </View>

            {/* Button */}
            <TouchableOpacity
              onPress={handleRecordToggle}
              activeOpacity={0.85}
              style={[
                styles.recordButton,
                {
                  backgroundColor: isRecording ? T.cardInner : T.accentGreen,
                  borderWidth: isRecording ? 1.5 : 0,
                  borderColor: isRecording ? T.border : 'transparent',
                },
              ]}
            >
              {isRecording
                ? <Square size={16} color={T.textPrimary} />
                : <Radio size={16} color="#0A0A0A" />
              }
              <Text
                style={[
                  styles.recordButtonText,
                  { color: isRecording ? T.textPrimary : '#0A0A0A' },
                ]}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  accentBar: {
    height: 3,
  },
  cardBody: {
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  statPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  recordButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});