import React, { useEffect, useRef, useState } from 'react';
import MapView, { Polygon } from 'react-native-maps';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/text';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, addDoc, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';

const polygonCoords = [
  { latitude: 37.78825, longitude: -122.4324 },
  { latitude: 38.75825, longitude: -122.4324 },
  { latitude: 39.75825, longitude: -123.4324 },
  { latitude: 37.75825, longitude: -123.4324 },
];

export default function Screen() {
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sequenceRef = useRef(1);
  const startedAtRef = useRef<Timestamp | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });
    };

    getLocation();
  }, []);

  const startRecording = async () => {
    const auth = getAuth();
    const userId = auth.currentUser?.uid ?? 'anonymous';

    startedAtRef.current = Timestamp.now();
    sequenceRef.current = 1;

    // Create the activity document
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

    // Update the doc to include its own id field
    await setDoc(doc(db, 'activities', newActivityId), { id: newActivityId }, { merge: true });

    setActivityId(newActivityId);
    setIsRecording(true);

    // Write a point every second
    intervalRef.current = setInterval(async () => {
      try {
        const position = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = position.coords;

        const pointRef = await addDoc(collection(db, 'points'), {
          activityId: newActivityId,
          coordinates: new (await import('firebase/firestore')).GeoPoint(latitude, longitude),
          sequence: sequenceRef.current,
        });

        // Update point doc to include its own id
        await setDoc(doc(db, 'points', pointRef.id), { id: pointRef.id }, { merge: true });

        sequenceRef.current += 1;

        // Live-update coords on map
        setCoords({ latitude, longitude });
      } catch (err) {
        console.error('Error writing point:', err);
      }
    }, 1000);
  };

  const stopRecording = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!coords) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={{ flex: 1 }}
        showsUserLocation={true}
        initialRegion={{
          latitude: coords?.latitude || 37.78825,
          longitude: coords?.longitude || -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}>
        <View className="absolute bottom-0 left-0 right-0 m-3 mb-20">
          <Card className="bottom-0 m-3 justify-items-end">
            <CardHeader>
              <CardTitle>Start your Journey</CardTitle>
              <CardDescription>
                {isRecording ? 'Recording in progress...' : 'Ready to record your activity'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Text>
                {isRecording
                  ? `Points captured: ${sequenceRef.current - 1}`
                  : 'Press record to start tracking'}
              </Text>
            </CardContent>

            <CardFooter>
              <TouchableOpacity
                onPress={handleRecordToggle}
                style={[styles.recordButton, isRecording ? styles.stopButton : styles.startButton]}>
                <Text style={styles.recordButtonText}>
                  {isRecording ? '⏹  Stop Recording' : '⏺  Start Recording'}
                </Text>
              </TouchableOpacity>
            </CardFooter>
          </Card>
        </View>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  recordButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#ef4444', // red-500
  },
  stopButton: {
    backgroundColor: '#6b7280', // gray-500
  },
  recordButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
