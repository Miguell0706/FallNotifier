import { NativeModules } from "react-native";

const { PrefsModule } = NativeModules;

// ---------------------------
// Save contacts to native
// ---------------------------
export async function syncContactsToNative(list: string[]) {
  try {
    PrefsModule.saveContacts(list);
  } catch (e) {
    console.warn("Failed saving contacts to native:", e);
  }
}

// ---------------------------
// Save message template to native
// ---------------------------
export async function syncMessageToNative(msg: string) {
  try {
    PrefsModule.saveMessage(msg);
  } catch (e) {
    console.warn("Failed saving message to native:", e);
  }
}
