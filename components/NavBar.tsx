import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppEnabled } from "./AppEnabledProvider";

const { width, height } = Dimensions.get("window");

interface NavBarProps {
  onSettingsPress: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onSettingsPress }) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const [isRotated, setIsRotated] = useState(false);
  const { enabled, setEnabled, hydrated } = useAppEnabled();

  const handleSettingsPress = () => {
    Animated.timing(rotateValue, {
      toValue: isRotated ? 0 : 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
    setIsRotated(!isRotated);
    onSettingsPress();
  };

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "160deg"],
  });
  const handleToggle = (next: boolean) => {
    if (!hydrated) return;
    console.log("handleToggle", next);
    setEnabled(next);
  };
  return (
    <View style={styles.nav}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Fall Notifier</Text>
        <Image
          style={styles.logo}
          source={require("../assets/images/FallNotifierFavicon.png")}
        />
      </View>

      <View style={styles.rightControls}>
        <View style={styles.switchBlock}>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={!hydrated}
            accessibilityLabel={enabled ? "Disable alerts" : "Enable alerts"}
          />
        </View>

        <TouchableOpacity activeOpacity={0.6} onPress={handleSettingsPress}>
          <Animated.Image
            source={require("../assets/images/settings.png")}
            style={[styles.image, { transform: [{ rotate }] }]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.02,
    paddingTop: height * 0.01,
  },
  titleContainer: { flexDirection: "row", alignItems: "center" },
  title: {
    fontSize: width * 0.065,
    fontFamily: "Construction3",
    color: "black",
    letterSpacing: width * 0.003,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: width * 0.002, height: height * 0.002 },
    textShadowRadius: 1,
    marginRight: 8,
  },
  logo: { width: width * 0.08, height: height * 0.04, resizeMode: "contain" },
  rightControls: { flexDirection: "row", alignItems: "center", gap: 14 },
  switchBlock: { flexDirection: "row", alignItems: "center", gap: 6 },
  switchLabel: { fontSize: width * 0.04, color: "black" },
  image: {
    paddingTop: height * 0.02,
    width: width * 0.08,
    height: height * 0.05,
    resizeMode: "contain",
  },
});

export default NavBar;
