import React, { useEffect, useState } from "react";
import * as Font from "expo-font";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LoadingIndicator from "./components/LoadingIndicator";
import NavBar from "./components/NavBar";
import PhoneNumberInput from "./components/PhoneNumberInput";

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

  useEffect(() => {
    loadFonts()
      .then(() => setFontsLoaded(true))
      .catch((error) => {
        console.error("Error loading fonts:", error);
      });
  }, []);

  if (!fontsLoaded) {
    return <LoadingIndicator />; // Show loading indicator
  }

  const handleAddPress = (number: string) => {
    Alert.alert("Phone Number Added", `You added: ${number}`);
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
});

export default Home;
