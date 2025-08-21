import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useAppEnabled } from "./AppEnabledProvider";

const BANNER_HEIGHT = 42;

export default function DisabledBanner() {
  const { enabled, hydrated, setEnabled } = useAppEnabled();
  // start at 0 width
  const scaleX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shouldShow = hydrated && !enabled;
    Animated.timing(scaleX, {
      toValue: shouldShow ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [enabled, hydrated, scaleX]);

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [{ scaleX }], // grow horizontally
        },
      ]}
    >
      <View style={styles.banner} accessibilityRole="alert">
        <Text style={styles.text}>
          Alerts are <Text style={styles.bold}>OFF</Text>. Test/real messages
          and countdown are disabled.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    transformOrigin: "left", // react-native doesn’t have this, so use origin transform trick below
    pointerEvents: "none",
  },
  banner: {
    zIndex: 10,
    flex: 1,
    height: BANNER_HEIGHT,
    backgroundColor: "#FFF3CD",
    borderBottomWidth: 1,
    borderColor: "#FFE69C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  text: { color: "#664d03" },
  bold: { fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#664d03",
  },
  pressed: { opacity: 0.8 },
  btnText: { color: "white", fontWeight: "700" },
  dismiss: { color: "#664d03", fontSize: 16, paddingHorizontal: 4 },
});
