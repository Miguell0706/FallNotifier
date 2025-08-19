// components/SettingsPanel.tsx
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

type Screen = "menu" | "message" | "test" | "sensitivity" | "faq" | "donate";
type Props = { phoneNumbers?: string[] };

export default function SettingsPanel({ phoneNumbers = [] }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");

  // Local state (swap to useSettings() later if you want persistence)
  const [messageTemplate, setMessageTemplate] = useState(
    "I may have fallen. My location: {link}"
  );
  const [countdownSec, setCountdownSec] = useState(10);
  const [showConfirm, setShowConfirm] = useState(true);
  const [sensitivity, setSensitivity] = useState(5); // 1..10

  const Row = ({ label, to }: { label: string; to: Screen }) => (
    <Pressable onPress={() => setScreen(to)} style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );

  const Menu = () => (
    <View>
      <Row label="Message & Countdown" to="message" />
      <Row label="Test" to="test" />
      <Row label="Sensitivity" to="sensitivity" />
      <Row label="FAQ" to="faq" />
      <Row label="Donations" to="donate" />
    </View>
  );

  const MessageAndCountdown = () => (
    <ScrollView contentContainerStyle={{ gap: 16 }}>
      <Section>Message & Countdown</Section>

      <Field
        label="Message template"
        hint={
          "Use {link} where the map URL should go. Keep it under 160 GSM chars to stay 1 SMS segment."
        }
      >
        <TextInput
          value={messageTemplate}
          onChangeText={setMessageTemplate}
          multiline
          style={[styles.input, { height: 100 }]}
        />
      </Field>

      <Field
        label="Countdown (seconds)"
        hint="Time before the app proceeds to send (or opens SMS) in emergency mode."
      >
        <TextInput
          value={String(countdownSec)}
          onChangeText={(t) =>
            setCountdownSec(Math.max(0, parseInt(t || "0", 10) || 0))
          }
          keyboardType="number-pad"
          style={styles.input}
        />
      </Field>

      <Field label="Show confirm dialog (non-emergency)">
        <Switch value={showConfirm} onValueChange={setShowConfirm} />
      </Field>

      <Back onPress={() => setScreen("menu")} />
    </ScrollView>
  );

  const Test = () => (
    <View style={{ gap: 12 }}>
      <Section>Test</Section>
      <Text style={{ opacity: 0.8 }}>
        Simulation shows your final message without sending. The Android option
        opens your SMS app so you can tap Send (carrier rates may apply).
      </Text>

      <Pressable
        style={styles.btnGhost}
        onPress={() => {
          const msg = messageTemplate.replace(
            "{link}",
            "https://maps.google.com/?q=0,0"
          );
          Alert.alert("Simulation (no SMS sent)", msg);
        }}
      >
        <Text>Run Simulation (free)</Text>
      </Pressable>

      <Pressable
        style={styles.btnPrimary}
        onPress={async () => {
          if (Platform.OS !== "android") {
            Alert.alert("Android only", "SMS sending is Android-only for now.");
            return;
          }
          // ✅ Lazy import avoids native-module error until the module is installed & built
          const { isAvailableAsync, sendSMSAsync } = await import("expo-sms");
          const ok = await isAvailableAsync();
          if (!ok) {
            Alert.alert("SMS unavailable", "This device cannot send SMS.");
            return;
          }
          const msg = messageTemplate.replace(
            "{link}",
            "https://maps.google.com/?q=0,0"
          );
          await sendSMSAsync(phoneNumbers, msg);
        }}
      >
        <Text style={styles.btnPrimaryLabel}>Open SMS app (Android)</Text>
      </Pressable>

      <Back onPress={() => setScreen("menu")} />
    </View>
  );

  const SensitivityPage = () => (
    <ScrollView contentContainerStyle={{ gap: 16 }}>
      <Section>Sensitivity</Section>

      <Field
        label="Sensitivity (1–10)"
        hint="Higher triggers with smaller movements; lower requires stronger movement."
      >
        <TextInput
          value={String(sensitivity)}
          keyboardType="number-pad"
          onChangeText={(t) => {
            const n = Math.min(10, Math.max(1, parseInt(t || "0", 10) || 1));
            setSensitivity(n);
          }}
          style={styles.input}
        />
      </Field>

      <Back onPress={() => setScreen("menu")} />
    </ScrollView>
  );

  const FAQ = () => (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <Section>FAQ</Section>
      <Q q="Who pays for messages?">
        Messages are sent via your phone plan on Android; your mobile carrier
        may apply charges.
      </Q>
      <Q q="Do settings persist?">
        In this basic version they’re local to this screen. If you add a
        settings context, they can be saved and used across the app.
      </Q>
      <Q q="What does countdown do?">
        It delays sending to give you a chance to cancel before an alert is
        sent.
      </Q>

      <Back onPress={() => setScreen("menu")} />
    </ScrollView>
  );

  const Donations = () => (
    <View style={{ gap: 12 }}>
      <Section>Donations</Section>
      <Text>Support development:</Text>

      <Pressable
        style={styles.btnPrimary}
        onPress={() => Alert.alert("Link", "Open your donation link here")}
      >
        <Text style={styles.btnPrimaryLabel}>Buy me a coffee ☕</Text>
      </Pressable>

      <Pressable
        style={styles.btnGhost}
        onPress={() =>
          Alert.alert("Link", "Open your secondary donations page")
        }
      >
        <Text>Open donations page</Text>
      </Pressable>

      <Back onPress={() => setScreen("menu")} />
    </View>
  );

  return (
    <LinearGradient
      colors={["#E7C49A", "#B76A2A", "#8F4A2C"]} // tan → brownish amber → umber
      locations={[0, 0.65, 0.9]}
      style={styles.linearGradient}
    >
      <View style={{ flex: 1 }}>
        {screen === "menu" && <Menu />}
        {screen === "message" && <MessageAndCountdown />}
        {screen === "test" && <Test />}
        {screen === "sensitivity" && <SensitivityPage />}
        {screen === "faq" && <FAQ />}
        {screen === "donate" && <Donations />}
      </View>
    </LinearGradient>
  );
}

/* ---------- small helpers ---------- */

function Field({
  label,
  hint,
  children,
}: React.PropsWithChildren<{ label: string; hint?: string }>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, opacity: 0.8 }}>{label}</Text>
      {children}
      {hint ? <Text style={{ fontSize: 12, opacity: 0.6 }}>{hint}</Text> : null}
    </View>
  );
}

function Section({ children }: React.PropsWithChildren) {
  return <Text style={styles.section}>{children}</Text>;
}

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.q}>{q}</Text>
      <Text style={styles.a}>{children}</Text>
    </View>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backBtn}>
      <Text style={styles.backText}>‹ Back</Text>
    </Pressable>
  );
}

/* ---------- styles ---------- */
const COLORS = {
  text: "#F8F5F2",
  textMuted: "rgba(248,245,242,0.75)",
  card: "rgba(38,26,20,0.85)", // dark brown glass
  stroke: "rgba(248,245,242,0.14)", // subtle light border
  inputBg: "rgba(58,42,34,0.85)", // deeper brown field
  primary: "#C57A2A", // warm amber button
};

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  rowText: { fontSize: 16, flex: 1, color: COLORS.text },
  chev: { fontSize: 22, color: COLORS.textMuted, paddingHorizontal: 6 },

  section: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: COLORS.text,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: COLORS.inputBg,
    color: COLORS.text,
  },

  backBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  backText: { fontSize: 16, fontWeight: "600", color: COLORS.text },

  q: { fontWeight: "700", marginTop: 6, color: COLORS.text },
  a: { color: COLORS.textMuted, marginTop: 2 },

  btnPrimary: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnPrimaryLabel: { color: "#12100E", fontWeight: "700" }, // high contrast on amber
  btnGhost: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  linearGradient: {
    flex: 1,
  },
});
