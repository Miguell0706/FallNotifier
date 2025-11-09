import React from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
    display: "flex",
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
  deleteImage: {
    width: 20,
    height: 20,
    tintColor: "#de1616",
  },
});

export default NumbersList;
