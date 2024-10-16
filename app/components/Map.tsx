import React from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Region } from "react-native-maps";

interface MapProps {}

const GMap: React.FC<MapProps> = () => {
  const initialRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.mapContainer}>
      {/* Wrapping the MapView inside a container View to apply the border */}
      <View style={styles.mapWrapper}>
        <MapView style={styles.map} initialRegion={initialRegion} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    borderColor: "#000",
    borderWidth: 2,
    overflow: "hidden", // Ensures the map does not overflow the border radius
  },
  map: {
    flex: 1,
  },
});

export default GMap;
