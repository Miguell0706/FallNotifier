import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_CONTACTS = "contacts";
const KEY_MESSAGE = "alertMessage";

export async function saveContacts(numbers: string[]) {
  await AsyncStorage.setItem(KEY_CONTACTS, JSON.stringify(numbers));
}

export async function loadContacts() {
  const raw = await AsyncStorage.getItem(KEY_CONTACTS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveAlertMessage(msg: string) {
  await AsyncStorage.setItem(KEY_MESSAGE, msg);
}

export async function loadAlertMessage() {
  return (await AsyncStorage.getItem(KEY_MESSAGE)) || "";
}
