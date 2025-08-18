import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoadingIndicator from "./components/LoadingIndicator";
import GMap from "./components/Map";
import NavBar from "./components/NavBar";
import NumbersList from "./components/NumbersList";
import PhoneNumberInput from "./components/PhoneNumberInput";

// Load custom fonts
const loadFonts = async () => {
  try {
    await Font.loadAsync({
      Construction: require("../assets/fonts/Construction.otf"),
      Construction2: require("../assets/fonts/Construction2.otf"),
      Construction3: require("../assets/fonts/Construction3.otf"),
    });
    console.log("Fonts loaded successfully!");
  } catch (error) {
    console.error("Error loading fonts:", error);
  }
};

const Home: React.FC = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const hydratedRef = useRef(false); // Track hydration state
  useEffect(() => {
    (async () => {
      try {
        await loadFonts();
        setFontsLoaded(true);

        const storedNumbers = await AsyncStorage.getItem("phoneNumbers");
        if (storedNumbers) {
          setPhoneNumbers(JSON.parse(storedNumbers));
        }
      } catch (error) {
        console.error("Error initializing app:", error);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("phoneNumbers");
        if (stored) {
          setPhoneNumbers(JSON.parse(stored));
          console.log("Hydrated numbers:", stored);
        }
      } catch (e) {
        console.error("Error initializing app (storage load):", e);
      } finally {
        hydratedRef.current = true; // 👈 now it's safe to save changes
      }
    })();
  }, []);

  // Persist to storage only after hydration
  useEffect(() => {
    if (!hydratedRef.current) return; // skip the first mount write
    AsyncStorage.setItem("phoneNumbers", JSON.stringify(phoneNumbers)).catch(
      (err) => console.error("Failed to save phone numbers:", err)
    );
  }, [phoneNumbers]);

  if (!fontsLoaded) return <LoadingIndicator />;

  const handleAddPress = (number: string) => {
    // Optional: basic dedupe/trim
    const clean = number.trim();
    if (!clean) return;
    setPhoneNumbers((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setPhoneNumber(""); // clear input if you want
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
        <NavBar onSettingsPress={() => console.log("Settings pressed!")} />
        <PhoneNumberInput
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onAddPress={handleAddPress}
        />
        <View style={styles.mapListContainer}>
          <NumbersList
            phoneNumbers={phoneNumbers}
            onDelete={handleDeleteNumber}
          />
          <GMap />
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
  mapListContainer: { flex: 1, flexDirection: "row" },
});

export default Home;
