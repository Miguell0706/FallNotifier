import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";

interface MapProps {}

const GMap: React.FC<MapProps> = () => {
  const [region, setRegion] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        Alert.alert(
          "Location Permission",
          "Permission to access location was denied."
        );
        return;
      }

      // Get the current location
      let location = await Location.getCurrentPositionAsync({});

      // Set region to device location
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922, // Adjust zoom level here
        longitudeDelta: 0.0421, // Adjust zoom level here
      });
    })();
  }, []);

  return (
    <View style={styles.mapContainer}>
      {/* Wrapping the MapView inside a container View to apply the border */}
      <View style={styles.mapWrapper}>
        {region ? (
          <MapView
            style={styles.map}
            region={region} // Dynamically set the region based on device location
            showsUserLocation // Option to show the user's location on the map
            showsMyLocationButton // Show the "locate me" button on the map
          />
        ) : (
          <View /> // Empty view while waiting for location (you could also show a spinner here)
        )}
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
