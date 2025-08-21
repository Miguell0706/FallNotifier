import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DisabledBanner from "../components/DisabledBanner";
import LoadingIndicator from "../components/LoadingIndicator";
import GMap from "../components/Map";
import NavBar from "../components/NavBar";
import NumbersList from "../components/NumbersList";
import PhoneNumberInput from "../components/PhoneNumberInput";
import SettingsModal from "../components/SettingsModal";
import SettingsPanel from "../components/SettingsPanel";
const loadFonts = async () => {
  await Font.loadAsync({
    Construction: require("../assets/fonts/Construction.otf"),
    Construction2: require("../assets/fonts/Construction2.otf"),
    Construction3: require("../assets/fonts/Construction3.otf"),
  });
};

const Home: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hydratedRef = useRef(false);

  // Load fonts (separate; don't block if it errors)
  useEffect(() => {
    loadFonts()
      .then(() => setFontsLoaded(true))
      .catch((e) => {
        console.error("Error loading fonts:", e);
        setFontsLoaded(true);
      });
  }, []);

  // Hydrate numbers once
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("phoneNumbers");
        if (stored) setPhoneNumbers(JSON.parse(stored));
      } catch (e) {
        console.error("Error initializing app (storage load):", e);
      } finally {
        hydratedRef.current = true;
      }
    })();
  }, []);

  // Persist after hydration
  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem("phoneNumbers", JSON.stringify(phoneNumbers)).catch(
      (err) => console.error("Failed to save phone numbers:", err)
    );
  }, [phoneNumbers]);

  if (!fontsLoaded) return <LoadingIndicator />;

  const handleAddPress = (number: string) => {
    const clean = number.trim();
    if (!clean) return;
    setPhoneNumbers((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setPhoneNumber("");
  };

  const handleDeleteNumber = (number: string) => {
    setPhoneNumbers((prev) => prev.filter((n) => n !== number));
  };

  return (
    <LinearGradient
      colors={["#FFE0B2", "#E18F27", "#DE782F"]}
      locations={[0, 0.65, 0.85]}
      style={styles.linearGradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <NavBar onSettingsPress={() => setSettingsOpen((s) => !s)} />
        <View style={styles.inputFlageContainer}>
          <PhoneNumberInput
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            onAddPress={handleAddPress}
          />
          <DisabledBanner></DisabledBanner>
        </View>
        <View style={styles.mapListContainer}>
          <NumbersList
            phoneNumbers={phoneNumbers}
            onDelete={handleDeleteNumber}
          />

          {/* Map + slide-in settings share this wrapper */}
          <View style={styles.mapSettingsContainer}>
            <GMap />

            <SettingsModal open={settingsOpen}>
              <SettingsPanel />
            </SettingsModal>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "transparent" },
  linearGradient: {
    flex: 1,
    justifyContent: "flex-start",
    flexDirection: "column",
  },
  inputFlageContainer: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  mapListContainer: { flex: 1, flexDirection: "row" },
  mapSettingsContainer: { flex: 1, position: "relative" }, // <- fixed braces
});

export default Home;
