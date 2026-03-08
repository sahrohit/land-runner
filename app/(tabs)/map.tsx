import React, { useEffect, useState } from 'react';
import MapView, { Polygon } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/text';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function Screen() {
  const [pointsData, pointsLoading, pointsError] = useCollectionData(collection(db, 'points'), {
    snapshotListenOptions: { includeMetadataChanges: true },
  });

  const [activityData, activityLoading, activityError] = useCollectionData(
    collection(db, 'activities'),
    {
      snapshotListenOptions: { includeMetadataChanges: true },
    }
  );

  //  LOG  Points Values [{"activityId": "ZwtJGXrG84wtUlGfBbNX", "coordinates": [Object], "id": " ZG9xbaUtQZyKaJCXI1YM", "recordedAt": [Object], "sequence": 0}]
  //  LOG  Activity Values [{"activityType": "run", "capturedArea": 4.4, "distanceMeters": 2, "endedAt": [Object], "id": " ZwtJGXrG84wtUlGfBbNX", "isLoopClosed": false, "startedAt": [Object], "userId": " ZwtJGXrG84wtUlGfBbNX"}]

  // This above is the data structure of the points and activities collection. We can use this data to display the points on the map and also to display the activity details.

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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

  if (!coords || pointsLoading || activityLoading) {
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
        {activityData?.map((activity) => {
          const activityPoints = pointsData?.filter((point) => point.activityId === activity.id);

          if (!activityPoints) return null;

          const sortedPoints = activityPoints.sort((a, b) => a.sequence - b.sequence);

          const coordinates = sortedPoints.map((point) => ({
            latitude: point.coordinates.latitude,
            longitude: point.coordinates.longitude,
          }));

          return (
            <Polygon
              key={activity.id}
              coordinates={coordinates}
              fillColor={`rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`}
              strokeColor="blue"
              strokeWidth={2}
              tappable={true}
              onPress={() => console.log(`Pressed activity ${activity.id}`)}
            />
          );
        })}
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
});
