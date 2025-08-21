import { useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useAppEnabled } from "../components/AppEnabledProvider";

export function useEnabledGuard(defaultMsg = "Messaging is disabled.") {
  const { enabled, hydrated } = useAppEnabled();
  const showingRef = useRef(false); // optional throttle

  return useCallback(
    <Args extends any[], R>(fn: (...args: Args) => R | Promise<R>, msg = defaultMsg) => {
      return (...args: Args): R | void | Promise<R | void> => {
        if (!hydrated) {
          if (!showingRef.current) {
            showingRef.current = true;
            Alert.alert(
              "Please wait",
              "Loading settings…",
              [{ text: "OK", onPress: () => (showingRef.current = false) }],
              { cancelable: true, onDismiss: () => (showingRef.current = false) }
            );
          }
          return;
        }
        if (!enabled) {
          if (!showingRef.current) {
            showingRef.current = true;
            Alert.alert(
              "Disabled",
              msg,
              [{ text: "OK", onPress: () => (showingRef.current = false) }],
              { cancelable: true, onDismiss: () => (showingRef.current = false) }
            );
          }
          return;
        }
        return fn(...args);
      };
    },
    [enabled, hydrated, defaultMsg]
  );
}
