import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

interface NavBarProps {
  onSettingsPress: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onSettingsPress }) => (
  <View style={styles.nav}>
    <View style={styles.titleContainer}>
      <Text style={styles.title}>Fall Notifier</Text>
      <Image
        style={styles.logo}
        source={require("../../assets/images/FallNotifierFavicon.png")}
      />
    </View>
    <TouchableOpacity activeOpacity={0.6} onPress={onSettingsPress}>
      <Image
        source={require("../../assets/images/settings.png")}
        style={styles.image}
      />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  titleContainer: {
    flexDirection: "row",
  },
  title: {
    fontSize: 24,
    fontFamily: "Construction3",
    color: "black",
    letterSpacing: 1.25,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1.2, height: 1.2 },
    textShadowRadius: 1,
  },
  logo: {
    paddingLeft: 40,
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  image: {
    paddingTop: 10,
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
});

export default NavBar;
