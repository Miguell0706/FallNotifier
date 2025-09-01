import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PhoneNumberInputProps {
  phoneNumber: string;
  setPhoneNumber: (number: string) => void;
  onAddPress: (number: string) => void;
}

const countryCodes = [
  { code: "+1", name: "United States" },
  // Add more as necessary for the app's user base
];

const { width } = Dimensions.get("window");

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  phoneNumber,
  setPhoneNumber,
  onAddPress,
}) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    countryCodes[0].code
  );
  const [modalVisible, setModalVisible] = useState(false);

  const handleAddPress = () => {
    const fullNumber = selectedCountryCode + phoneNumber;
    if (isValidPhoneNumber(fullNumber)) {
      onAddPress(fullNumber);
      setPhoneNumber("");
      Alert.alert("Success", "Phone number added successfully!");
    } else {
      Alert.alert(
        "Input Error",
        "Please enter a valid international phone number."
      );
    }
  };

  const isValidPhoneNumber = (number: string) => {
    const regex = /^\+\d{10,15}$/; // Adjust this regex for international number validation
    return regex.test(number);
  };

  const handleCountryCodeSelect = (code: string) => {
    setSelectedCountryCode(code);
    setModalVisible(false);
  };

  return (
    <View style={styles.inputContainer}>
      <View style={styles.countryCodeContainer}>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Text style={styles.countryCodeText}>▼{selectedCountryCode}</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.numberInput}
        selectionColor="#F8F8F8"
        placeholder="Enter phone number"
        placeholderTextColor="rgba(248, 248, 248, .5)"
        keyboardType="phone-pad"
        caretHidden={true}
        value={phoneNumber}
        onChangeText={setPhoneNumber}
      />
      <TouchableOpacity
        activeOpacity={0.6}
        style={styles.addButton}
        onPress={handleAddPress}
      >
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>

      {/* Modal for country code selection */}
      <Modal
        transparent={true}
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <FlatList
              data={countryCodes}
              keyExtractor={(item, index) =>
                `${item.code}-${item.name}-${index}`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryCodeItem}
                  onPress={() => handleCountryCodeSelect(item.code)}
                >
                  <Text style={styles.countryCodeText}>
                    {item.code} {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  countryCodeContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    borderColor: "#F8F8FF",
    borderWidth: 1,
    borderRightWidth: 0,
    height: 40,
    width: "12%",
    opacity: 0.8,
  },
  countryCodeText: {
    fontSize: 12,
    color: "#F8F8FF",
  },
  numberInput: {
    backgroundColor: "#000",
    opacity: 0.8,
    width: "60%", // Dynamic width, adjusts with screen size
    height: 40,
    borderColor: "#F8F8FF",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 10,
    marginRight: 10,
    color: "#F8F8FF",
    fontSize: 14,
    letterSpacing: 2.5,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  addButton: {
    height: 40,
    width: "18%",
    backgroundColor: "#2E8B57",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#F8F8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#F8F8FF",
    fontFamily: "Construction2",
    fontSize: 16,
    letterSpacing: 1.5,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1.2, height: 1.2 },
    textShadowRadius: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)", // semi-transparent background
  },
  modalContent: {
    width: "80%",
    backgroundColor: "black",
    borderRadius: 10,
    padding: 20,
    height: "50%",
  },
  countryCodeItem: {
    padding: 15,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#2E8B57",
    borderRadius: 5,
    padding: 10,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
  },
});

export default PhoneNumberInput;
