import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";

type Props = {
  open: boolean; // controlled by parent
  children?: React.ReactNode; // your settings UI goes here
};

export default function SettingsModal({ open, children }: Props) {
  const [width, setWidth] = useState(0);
  const tx = useRef(new Animated.Value(0)).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(w);
    // Align initial position to avoid a flash
    tx.setValue(open ? 0 : w);
  };

  useEffect(() => {
    if (!width) return;
    Animated.timing(tx, {
      toValue: open ? 0 : width, // 0 = visible, width = offscreen-right
      duration: open ? 260 : 220,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, width, tx]);

  return (
    // Fills the parent wrapper (e.g., your map container). No backdrop/close handler.
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <Animated.View
        onLayout={onLayout}
        style={[styles.panel, { transform: [{ translateX: tx }] }]}
        // When closed, let touches pass to the map; when open, capture touches
        pointerEvents={open ? "auto" : "none"}
      >
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "100%", // matches the parent wrapper width (use a fixed px width for a narrow drawer)
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    padding: 0,
  },
});
