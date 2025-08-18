import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Get device dimensions
const { width, height } = Dimensions.get("window");

interface NavBarProps {
  onSettingsPress: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onSettingsPress }) => {
  const rotateValue = useRef(new Animated.Value(0)).current; // Animated value for rotation
  const [isRotated, setIsRotated] = useState(false); // State to track the rotation

  const handleSettingsPress = () => {
    // Trigger the rotation animation
    Animated.timing(rotateValue, {
      toValue: isRotated ? 0 : 1, // Rotate based on current state
      duration: 600,
      useNativeDriver: true,
    }).start();

    setIsRotated(!isRotated); // Toggle rotation state
    onSettingsPress(); // Call the provided onSettingsPress function
  };

  // Interpolate the animated value to get rotation degrees
  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "220deg"], // Rotate from 0 to 180 degrees
  });

  return (
    <View style={styles.nav}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Fall Notifier</Text>
        <Image
          style={styles.logo}
          source={require("../../assets/images/FallNotifierFavicon.png")}
        />
      </View>
      <TouchableOpacity activeOpacity={0.6} onPress={handleSettingsPress}>
        <Animated.Image
          source={require("../../assets/images/settings.png")}
          style={[styles.image, { transform: [{ rotate }] }]} // Apply the rotation transform
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: width * 0.05, // 5% of screen width
    paddingBottom: height * 0.02, // 2% of screen height
    paddingTop: height * 0.01, // 1% of screen height
  },
  titleContainer: {
    flexDirection: "row",
  },
  title: {
    fontSize: width * 0.065, // 6% of screen width
    fontFamily: "Construction3",
    color: "black",
    letterSpacing: width * 0.003, // 0.2% of screen width
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: width * 0.002, height: height * 0.002 },
    textShadowRadius: 1,
  },
  logo: {
    width: width * 0.08, // 8% of screen width
    height: height * 0.04, // 4% of screen height
    resizeMode: "contain",
  },
  image: {
    paddingTop: height * 0.02, // 2% of screen height
    width: width * 0.08, // 8% of screen width
    height: height * 0.05, // 5% of screen height
    resizeMode: "contain",
  },
});

export default NavBar;
