import * as Notifications from "expo-notifications";
import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 🔔 Step 1: show alerts even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification:
    async (): Promise<Notifications.NotificationBehavior> => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,

      // 👇 add these two for newer Expo/TS types
      shouldShowBanner: true,
      shouldShowList: true,
    }),
});
// 🔔 Test notification helper
const sendTest = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test from UI",
      body: "If you see this, notifications work in the UI runtime.",
    },
    trigger: null,
    // channelId: "fall-alerts", // <- we'll add this in step 2 if needed
  });
};

interface NumbersListProps {
  phoneNumbers: string[];
  onDelete: (number: string) => void;
}

const NumbersList: React.FC<NumbersListProps> = ({
  phoneNumbers,
  onDelete,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Numbers List</Text>

      {/* 🔘 Test notification button */}
      <Pressable onPress={sendTest} style={styles.testButton}>
        <Text style={{ color: "#f8f8ff", fontWeight: "600" }}>
          Send test notification
        </Text>
      </Pressable>

      <FlatList
        data={phoneNumbers}
        keyExtractor={(item, index) => `${item}-${index}`}
        ListEmptyComponent={
          <Text style={{ opacity: 0.6, fontStyle: "italic" }}>
            No numbers yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.numberContainer}>
            <Text style={styles.numberText}>{item}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(item)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item}`}
            >
              <Image
                source={require("../assets/images/trash.png")}
                style={styles.deleteImage}
              />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 3,
    width: 160,
    minWidth: 160,
    flexDirection: "column",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "monospace",
    color: "black",
    marginLeft: 7,
    marginBottom: 10,
    letterSpacing: 1.1,
  },
  numberContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
    padding: 2,
    borderRadius: 4,
    backgroundColor: "#000",
  },
  numberText: {
    flex: 1,
    padding: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#f8f8ff",
    letterSpacing: 1.1,
  },
  deleteButton: {
    backgroundColor: "#69463e",
    paddingVertical: 2,
    paddingHorizontal: 1,
    borderRadius: 4,
  },
  testButton: {
    backgroundColor: "#9a9dab",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  deleteImage: {
    width: 20,
    height: 20,
    tintColor: "#de1616",
  },
});

export default NumbersList;
