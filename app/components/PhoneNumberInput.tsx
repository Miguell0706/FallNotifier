import React from "react";
import {
  TouchableOpacity,
  TextInput,
  Text,
  View,
  StyleSheet,
  Alert,
} from "react-native";

interface PhoneNumberInputProps {
  phoneNumber: string;
  setPhoneNumber: (number: string) => void;
  onAddPress: (number: string) => void;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  phoneNumber,
  setPhoneNumber,
  onAddPress,
}) => {
  const handleAddPress = () => {
    if (isValidPhoneNumber(phoneNumber)) {
      onAddPress(phoneNumber);
      setPhoneNumber("");
    } else {
      Alert.alert("Input Error", "Please enter a valid phone number.");
    }
  };

  const isValidPhoneNumber = (number: string) => {
    const regex = /^\d{10}$/; // Adjust this regex as needed
    return regex.test(number);
  };

  return (
    <View style={styles.inputContainer}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    paddingVertical: 10,
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "center",
  },
  numberInput: {
    backgroundColor: "#000",
    opacity: 0.8,
    flex: 1,
    height: 40,
    borderColor: "#F8F8FF",
    borderWidth: 1,
    marginHorizontal: 18,
    paddingHorizontal: 10,
    marginRight: 10,
    color: "#F8F8FF",
    fontSize: 16,
    letterSpacing: 2.5,
    borderRadius: 5,
  },
  addButton: {
    height: 40,
    width: 60,
    backgroundColor: "#2E8B57",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#F8F8FF",
    marginHorizontal: 20,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#F8F8FF",
    fontSize: 19,
    letterSpacing: 1.5,
    fontFamily: "Construction2",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 1.2, height: 1.2 },
    textShadowRadius: 1,
  },
});

export default PhoneNumberInput;
