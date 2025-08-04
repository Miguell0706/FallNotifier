import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
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

  useEffect(() => {
    loadFonts()
      .then(() => setFontsLoaded(true))
      .catch((error) => {
        console.error("Error loading fonts:", error);
      });

    const loadPhoneNumbers = async () => {
      try {
        const storedNumbers = await AsyncStorage.getItem("phoneNumbers");
        if (storedNumbers) {
          setPhoneNumbers(JSON.parse(storedNumbers));
        }
      } catch (error) {
        console.error("Failed to load phone numbers:", error);
      }
    };

    loadPhoneNumbers();
  }, []);

  if (!fontsLoaded) {
    return <LoadingIndicator />; // Show loading indicator
  }

  // Handle adding a phone number
  const handleAddPress = async (number: string) => {
    Alert.alert("Phone Number Added", `You added: ${number}`);

    const updatedNumbers = [...phoneNumbers, number];
    setPhoneNumbers(updatedNumbers);

    // Save to local storage
    try {
      await AsyncStorage.setItem(
        "phoneNumbers",
        JSON.stringify(updatedNumbers)
      );
      const storedNumbers = await AsyncStorage.getItem("phoneNumbers");
      console.log(
        "Current phone numbers in AsyncStorage:",
        JSON.parse(storedNumbers || "[]")
      );
    } catch (error) {
      console.error("Failed to save phone numbers:", error);
    }
  };

  return (
    <LinearGradient
      colors={["#FFE0B2", "#E18F27", "#DE782F"]}
      locations={[0, 0.65, 0.85]}
      style={styles.linearGradient} // Use a style for the gradient
    >
      <SafeAreaView style={styles.safeArea}>
        <NavBar onSettingsPress={() => console.log("Settings pressed!")} />
        <PhoneNumberInput
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          onAddPress={handleAddPress}
        />
        <View style={styles.mapListContainer}>
          <NumbersList phoneNumbers={phoneNumbers} />
          <GMap />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1, // Ensures the SafeAreaView takes full height
    backgroundColor: "transparent",
  },
  linearGradient: {
    flex: 1, // Ensures the LinearGradient takes full height
    justifyContent: "flex-start",
    flexDirection: "column",
  },
  mapListContainer: {
    flex: 1,
    flexDirection: "row",
  },
});

export default Home;
