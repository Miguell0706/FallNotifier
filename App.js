import * as Notifications from "expo-notifications";
import { SafeAreaView, Text } from "react-native";

// ✅ Tell Expo to show alerts even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // older name; still required
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // new field
    shouldShowList: true, // new field
  }),
});

export default function App() {
  return (
    <SafeAreaView
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Text>App shell loaded (debug bundle)</Text>
    </SafeAreaView>
  );
}
