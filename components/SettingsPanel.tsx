// components/SettingsPanel.tsx
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

type Screen = "menu" | "message" | "test" | "sensitivity" | "faq" | "donate";
type Props = { phoneNumbers?: string[] };

/* ---------- theme ---------- */
const COLORS = {
  text: "#FAF6F2",
  textMuted: "rgba(250,246,242,0.72)",
  surface: "rgba(28,18,14,0.72)", // glass on wood
  surfaceSolid: "#241812",
  stroke: "rgba(255,255,255,0.10)",
  inputBg: "rgba(60,40,30,0.72)",
  primary: "#E3A250", // lighter amber
  primaryInk: "#1a120e",
  shadow: "#000",
};

const SHADOW = {
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

/* ---------- styles factory (uses fs for responsive fonts) ---------- */
const makeStyles = (fs: (n: number) => number) =>
  StyleSheet.create({
    linearGradient: { flex: 1 },

    // Right column that overlays the map/background
    rightColumn: {
      flex: 1,
      flexDirection: "column",
      // If this column should be a fixed width on large screens, you can set width here.
      // width: 420,
      // alignSelf: "flex-end",
    },

    // Main panel card that fills the right column
    panel: {
      flex: 1,
      alignSelf: "stretch",
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.stroke,
      overflow: "hidden",
      ...SHADOW,
      marginBottom: 16,
    },

    sectionTitle: {
      fontSize: fs(13),
      fontWeight: "700",
      letterSpacing: 1.1,
      color: COLORS.text,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      textShadowColor: "#000",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },

    panelBody: { padding: 16, gap: 14 },

    bodyText: { color: COLORS.textMuted, lineHeight: fs(20), fontSize: fs(14) },

    // Menu rows container
    menuStack: { padding: 12, gap: 10 },

    // Rows (lighter for readability)
    row: {
      minHeight: 56,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      flexDirection: "row",
      alignItems: "center",
    },
    rowText: {
      flex: 1,
      fontSize: fs(15),
      color: COLORS.text,
      letterSpacing: 1.2,
      fontFamily: "Construction2",
      fontWeight: "600",
    },
    chev: { fontSize: fs(20), color: COLORS.textMuted, paddingLeft: 8 },

    // Inputs (lighter bg + clearer border)
    fieldLabel: { fontSize: fs(13), color: COLORS.text, opacity: 0.9 },
    hint: { fontSize: fs(12), color: COLORS.textMuted },
    input: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.14)",
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: fs(16),
      backgroundColor: COLORS.inputBg,
      color: COLORS.text,
    },

    // Buttons
    btnPrimary: {
      backgroundColor: COLORS.primary,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      alignItems: "center",
      ...SHADOW,
    },
    btnPrimaryLabel: {
      color: COLORS.primaryInk,
      fontWeight: "800",
      fontSize: fs(14),
    },
    btnGhost: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    btnGhostLabel: { color: COLORS.text, fontSize: fs(14) },

    // Back
    backBtn: {
      marginTop: 8,
      alignSelf: "flex-start",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: "transparent",
    },
    backText: { fontSize: fs(16), fontWeight: "600", color: COLORS.text },

    // FAQ Q&A
    q: {
      fontWeight: "700",
      color: COLORS.text,
      marginBottom: 2,
      fontSize: fs(14),
    },
    a: { color: COLORS.textMuted, fontSize: fs(13), lineHeight: fs(19) },
  });

export default function SettingsPanel({ phoneNumbers = [] }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");

  // Local state
  const [messageTemplate, setMessageTemplate] = useState(
    "I may have fallen. My location: {link}"
  );
  const [countdownSec, setCountdownSec] = useState(10);
  const [showConfirm, setShowConfirm] = useState(true);
  const [sensitivity, setSensitivity] = useState(5); // 1..10

  // Responsive font scaling
  const { width } = useWindowDimensions();
  const SCALE = width < 390 ? 1.1 : width > 420 ? 1.7 : 1.3;
  const fs = (n: number) => Math.round(n * SCALE);

  // Build styles with fs so ALL text respects scaling
  const styles = useMemo(() => makeStyles(fs), [SCALE]);

  /* ---------- helpers moved INSIDE so styles is in scope ---------- */
  function Field({
    label,
    hint,
    children,
  }: React.PropsWithChildren<{ label: string; hint?: string }>) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    );
  }

  function Q({ q, children }: { q: string; children: React.ReactNode }) {
    return (
      <View style={{ marginBottom: 12 }}>
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

  const Row = ({ label, to }: { label: string; to: Screen }) => (
    <Pressable
      onPress={() => setScreen(to)}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      style={styles.row}
    >
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );

  const Menu = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.menuStack}>
        <Row label="Message & Countdown" to="message" />
        <Row label="Test" to="test" />
        <Row label="Sensitivity" to="sensitivity" />
        <Row label="FAQ" to="faq" />
        <Row label="Donations" to="donate" />
      </View>
    </View>
  );

  const MessageAndCountdown = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Message & Countdown</Text>
      <ScrollView
        contentContainerStyle={styles.panelBody}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Message template"
          hint="Use {link} where the map URL should go. Keep it under ~160 GSM chars for 1 SMS segment."
        >
          <TextInput
            value={messageTemplate}
            onChangeText={setMessageTemplate}
            multiline
            style={[styles.input, { height: 110 }]}
            placeholder="I may have fallen. My location: {link}"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
          />
        </Field>

        <Field
          label="Countdown (seconds)"
          hint="Delay before sending so you can cancel an accidental alert."
        >
          <TextInput
            value={String(countdownSec)}
            onChangeText={(t) =>
              setCountdownSec(Math.max(0, parseInt(t || "0", 10) || 0))
            }
            keyboardType="number-pad"
            style={styles.input}
            selectionColor={COLORS.primary}
          />
        </Field>

        <Field label="Show confirm dialog (non-emergency)">
          <Switch value={showConfirm} onValueChange={setShowConfirm} />
        </Field>

        <Back onPress={() => setScreen("menu")} />
      </ScrollView>
    </View>
  );

  const Test = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Test</Text>
      <View style={styles.panelBody}>
        <Text style={styles.bodyText}>
          Simulation shows your final message without sending. The Android
          option opens your SMS app so you can tap Send.
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
          <Text style={styles.btnGhostLabel}>Run Simulation (free)</Text>
        </Pressable>

        <Pressable
          style={styles.btnPrimary}
          onPress={async () => {
            if (Platform.OS !== "android") {
              Alert.alert(
                "Android only",
                "SMS sending is Android-only for now."
              );
              return;
            }
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
    </View>
  );

  const SensitivityPage = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Sensitivity</Text>
      <ScrollView contentContainerStyle={styles.panelBody}>
        <Field
          label="Sensitivity (1–10)"
          hint="Higher triggers on smaller movements; lower requires stronger movement."
        >
          <TextInput
            value={String(sensitivity)}
            keyboardType="number-pad"
            onChangeText={(t) => {
              const n = Math.min(10, Math.max(1, parseInt(t || "0", 10) || 1));
              setSensitivity(n);
            }}
            style={styles.input}
            selectionColor={COLORS.primary}
          />
        </Field>

        <Back onPress={() => setScreen("menu")} />
      </ScrollView>
    </View>
  );

  const FAQ = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>FAQ</Text>
      <ScrollView contentContainerStyle={styles.panelBody}>
        <Q q="Who pays for messages?">
          Messages are sent via your phone plan on Android; your mobile carrier
          may apply charges.
        </Q>
        <Q q="Do settings persist?">
          In this basic version they’re local to this screen. A settings context
          can save and reuse them across the app.
        </Q>
        <Q q="What does countdown do?">
          It delays sending to give you a chance to cancel before an alert is
          sent.
        </Q>

        <Back onPress={() => setScreen("menu")} />
      </ScrollView>
    </View>
  );

  const Donations = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Donations</Text>
      <View style={styles.panelBody}>
        <Text style={styles.bodyText}>Support development:</Text>

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
          <Text style={styles.btnGhostLabel}>Open donations page</Text>
        </Pressable>

        <Back onPress={() => setScreen("menu")} />
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={["#231711", "#3A261D", "#4A3226", "#3A261D", "#231711"]}
      locations={[0, 0.32, 0.62, 0.82, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.linearGradient}
    >
      {/* Right-side column with blur */}
      <View style={styles.rightColumn}>
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        {/* subtle overlay to increase contrast over busy backgrounds */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(20,12,8,0.35)",
          }}
        />

        {/* Content */}
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
