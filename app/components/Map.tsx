import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import * as Location from "expo-location";
import * as Linking from "expo-linking";

interface MapProps {}

const GMap: React.FC<MapProps> = () => {
  const [region, setRegion] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
    setErrorMsg(null); // Clear the error if permission is granted
  };

  useEffect(() => {
    getLocation(); // Check location on initial load

    const appStateListener = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // The app has come to the foreground, so re-check permissions
          getLocation();
        }
        setAppState(nextAppState);
      }
    );

    return () => {
      appStateListener.remove(); // Clean up the listener on unmount
    };
  }, [appState]);

  const openSettings = () => {
    Linking.openSettings(); // Redirect to the settings to manually enable permissions
  };

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          region={region || undefined} // Show default map if location isn't granted
          showsUserLocation={!!region} // Only show user location if region is set
          showsMyLocationButton={!!region} // Show "locate me" button if region is set
        />

        {/* Overlay the tint and message if permission is denied */}
        {!region && errorMsg && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>
              Allow location permission to enable location with the alert
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openSettings}
            >
              <Text style={styles.settingsText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
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
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  settingsButton: {
    padding: 10,
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  settingsText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default GMap;
