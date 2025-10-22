import * as Linking from "expo-linking";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
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

const DEFAULT_REGION: Region = {
  latitude: 33.4484, // Phoenix default
  longitude: -112.074,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const GMap: React.FC = () => {
  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const [hasPerm, setHasPerm] = useState<boolean>(false);
  const [firstFix, setFirstFix] = useState<Region | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // animate helper (uncontrolled MapView for smooth user panning)
  const animateTo = (r: Region, duration = 500) => {
    mapRef.current?.animateCamera(
      { center: { latitude: r.latitude, longitude: r.longitude }, zoom: 16 },
      { duration }
    );
  };

  const ensurePermission = async (): Promise<boolean> => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    const ok = status === "granted";
    setHasPerm(ok);
    if (!ok) setErrorMsg("Permission to access location was denied");
    return ok;
  };

  const seedAndCenter = async () => {
    // Last-known (fast)
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last?.coords) {
        const r: Region = {
          latitude: last.coords.latitude,
          longitude: last.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setFirstFix((prev) => prev ?? r);
        animateTo(r, 600);
      }
    } catch {}

    // Fresh (accurate)
    try {
      const fresh = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("loc-timeout")), 5000)
        ),
      ]);

      const r: Region = {
        latitude: fresh.coords.latitude,
        longitude: fresh.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setFirstFix(r);
      setErrorMsg(null);
      animateTo(r, 600);
    } catch (e) {
      if (!firstFix) setErrorMsg("Couldn’t get location. Try again.");
    }
  };

  const startWatching = async () => {
    // stop previous watcher if any
    watchRef.current?.remove();
    watchRef.current = null;

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 5, // meters
        timeInterval: 2000, // ms
      },
      (loc) => {
        const r: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        animateTo(r, 400);
      }
    );
  };

  const bootstrap = async () => {
    const ok = await ensurePermission();
    if (!ok) return;
    await seedAndCenter();
    await startWatching();
  };

  useEffect(() => {
    // initial boot
    bootstrap();

    // refresh on foreground
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") bootstrap();
      if (s === "background" || s === "inactive") {
        watchRef.current?.remove();
        watchRef.current = null;
      }
    });

    return () => {
      sub.remove();
      watchRef.current?.remove();
      watchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSettings = () => Linking.openSettings();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.mapContainer}>
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            // Uncontrolled map: we set a sensible initial region, then animate the camera as location updates
            initialRegion={firstFix ?? DEFAULT_REGION}
            showsUserLocation
            showsMyLocationButton
            toolbarEnabled={false}
            onMapReady={() => {
              if (firstFix) animateTo(firstFix, 600);
            }}
          />

          {/* Overlay while waiting for the first fix or showing errors */}
          {!firstFix && (
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
          )}
        </View>

        {/* Recenter / refresh */}
        <View style={{ position: "absolute", bottom: 16, right: 16, gap: 8 }}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={seedAndCenter}
          >
            <Text style={styles.settingsText}>Recenter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={bootstrap}>
            <Text style={styles.settingsText}>Refresh</Text>
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
