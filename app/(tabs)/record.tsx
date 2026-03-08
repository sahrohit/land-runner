import React, { useEffect, useState } from 'react';
import MapView, { Polygon } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/text';

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
        <Polygon
          coordinates={polygonCoords}
          fillColor="rgba(255, 0, 0, 0.5)" //
          strokeColor="red" //
          strokeWidth={2}
          tappable={true} //
          onPress={() => console.log('Pressed')}
        />
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
