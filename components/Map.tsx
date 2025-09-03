import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const GMap: React.FC = () => {
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getLocationOnce = async () => {
    console.log("Map mounted, fetching location...");

    // Ask (or re-ask) for permission
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      return;
    }

    // Try last-known first (instant), then fresh with a timeout fallback
    const last = await Location.getLastKnownPositionAsync();
    if (last && !initialRegion) {
      setInitialRegion({
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
    console.log("Last-known location:", last);
    try {
      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("loc-timeout")), 5000)
        ),
      ]);
      setInitialRegion({
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setErrorMsg(null);
    } catch {
      // If fresh timed out and we already showed last-known, keep it
      if (!last) setErrorMsg("Couldn’t get location. Try again.");
    }
    console.log("Location fetch attempt finished.");
  };

  useEffect(() => {
    getLocationOnce();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") getLocationOnce(); // refresh when returning to foreground
    });
    return () => sub.remove();
  }, []);

  const openSettings = () => Linking.openSettings();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.mapContainer}>
        <View style={styles.mapWrapper}>
          {!initialRegion ? (
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" />
              {errorMsg && (
                <>
                  <Text style={styles.overlayText}>{errorMsg}</Text>
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
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={initialRegion} // ✅ set once
              showsUserLocation
              showsMyLocationButton
            />
          )}
        </View>

        {/* Optional: manual refresh button */}
        <View style={{ position: "absolute", bottom: 16, right: 16 }}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={getLocationOnce}
          >
            <Text style={styles.settingsText}>Refresh Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mapContainer: { flex: 1 },
  mapWrapper: {
    flex: 1,
    borderColor: "#000",
    borderWidth: 2,
    overflow: "hidden",
  },
  map: { flex: 1 },
  overlayText: {
    color: "#333",
    fontSize: width * 0.045,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  settingsButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#007bff",
    borderRadius: 6,
  },
  settingsText: { color: "#fff", fontWeight: "bold" },
  spinnerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    zIndex: 10,
    gap: 12,
  },
});

export default GMap;
