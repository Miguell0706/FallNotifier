import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
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
}

const NumbersList: React.FC<NumbersListProps> = ({
  phoneNumbers: initialPhoneNumbers,
}) => {
  const [phoneNumbers, setPhoneNumbers] =
    useState<string[]>(initialPhoneNumbers);

  useEffect(() => {
    // Load numbers from local storage when the component mounts
    const loadNumbers = async () => {
      const storedNumbers = await AsyncStorage.getItem("phoneNumbers");
      if (storedNumbers) {
        setPhoneNumbers(JSON.parse(storedNumbers));
      }
    };
    loadNumbers();
  }, []);

  const deletePhoneNumber = async (number: string) => {
    // Remove the number from the array
    const updatedNumbers = phoneNumbers.filter((phone) => phone !== number);
    setPhoneNumbers(updatedNumbers);

    // Update local storage
    await AsyncStorage.setItem("phoneNumbers", JSON.stringify(updatedNumbers));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Numbers List:</Text>
      <FlatList
        data={phoneNumbers}
        keyExtractor={(item, index) => `${item}-${index}`} // Safer, even if not unique
        renderItem={({ item }) => (
          <View style={styles.numberContainer}>
            <Text style={styles.numberText}>{item}</Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deletePhoneNumber(item)}
            >
              <Image
                source={require("../../assets/images/trash.png")}
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
    paddingVertical: 2,
    paddingHorizontal: 1,
    borderRadius: 4,
  },
  deleteImage: {
    width: 20,
    height: 20,
    tintColor: "#de1616",
  },
  testImage: {
    width: 20,
    height: 20,
    tintColor: "#f8f8ff",
  },
});

export default NumbersList;
