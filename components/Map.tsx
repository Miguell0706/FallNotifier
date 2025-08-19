import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
interface MapProps {}

const { width } = Dimensions.get("window");
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
    console.log(location.coords.latitude, location.coords.longitude);
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
  }, []);

  const openSettings = () => {
    Linking.openSettings(); // Redirect to the settings to manually enable permissions
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.mapContainer}>
        <View style={styles.mapWrapper}>
          {!region ? (
            // Show loading spinner while region is null
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color="#007bff" />
              {errorMsg && (
                <>
                  <Text style={styles.overlayText}>
                    Allow location permission to enable location with the alert
                  </Text>
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={openSettings}
                  >
                    <Text style={styles.settingsText}>Open Settings</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            // Show the map when region is ready
            <MapView
              provider="google"
              style={styles.map}
              region={region}
              showsUserLocation={true}
              showsMyLocationButton={true}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
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
    fontSize: width * 0.045,
    textAlign: "center",
    marginBottom: 20,
  },
  settingsButton: {
    padding: width * 0.03,
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  settingsText: {
    color: "#fff",
    fontWeight: "bold",
  },
  spinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)", // Optional fade
    zIndex: 10,
  },
});

export default GMap;
