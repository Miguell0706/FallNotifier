// components/SettingsPanel.tsx
import { BlurView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { startFallService, stopFallService } from "../background/FallService";
import { sensitivityToImpactG } from "../core/sensitivity";
import { useAppEnabled } from "./AppEnabledProvider";
import ImpactTestPanel from "./ImpactTestPanel";
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
      marginBottom: 10,
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
      padding: 12,
      borderTopWidth: 1,
      borderColor: COLORS.stroke,
      backgroundColor: "rgba(255,255,255,0.05)",
    },
    backText: { fontSize: fs(16), fontWeight: "600", color: COLORS.text },

    // ===== FAQ Q&A =====
    qaBlock: {
      marginBottom: 16, // spacing between Q&A groups
    },
    q: {
      fontWeight: "700",
      color: COLORS.text,
      marginBottom: 4,
      fontSize: fs(15),
    },
    a: {
      color: COLORS.textMuted,
      fontSize: fs(13),
      lineHeight: fs(19),
    },

    // ===== Countdown Stepper =====
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginVertical: 8,
    },
    stepBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    stepBtnLabel: {
      fontSize: fs(20),
      fontWeight: "800",
      color: COLORS.text,
      lineHeight: fs(22),
    },
    stepDisplay: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
    },
    stepDisplayLabel: {
      fontSize: fs(16),
      fontWeight: "700",
      color: COLORS.text,
    },
    stepInput: {
      flex: 1,
      textAlign: "center",
      paddingVertical: 10,
    },
    // ===== Fade Overlay for Scroll hint =====
    fadeBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 40,
      backgroundColor: "transparent",
    },
    donateCard: {
      padding: 14,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.06)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
      gap: 10,
    },
    cardTitle: {
      fontSize: fs(16),
      fontWeight: "700",
      color: COLORS.text,
    },
    rowButtons: {
      gap: 20,
    },
    smallNote: {
      color: COLORS.textMuted,
      fontSize: fs(12),
    },
    copyBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.16)",
      backgroundColor: "rgba(255,255,255,0.04)",
      alignItems: "center",
    },
    copyBtnLabel: { color: COLORS.text, fontSize: fs(13), fontWeight: "600" },
  });

export default function SettingsPanel({ phoneNumbers = [] }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [messageTemplate, setMessageTemplate] = useState(
    "I may have fallen. My location: {link}"
  );
  const [countdownSec, setCountdownSec] = useState(10);
  const [sensitivity, setSensitivity] = useState(5); // 1..10

  const { enabled } = useAppEnabled();

  React.useEffect(() => {
    if (!enabled) return; // only when guard is ON

    const t = setTimeout(() => {
      // restart background service with new sensitivity
      stopFallService().then(() => startFallService(sensitivity));
    }, 400); // small delay so it doesn't restart too aggressively

    return () => clearTimeout(t);
  }, [enabled, sensitivity]);

  // Donation links (replace with your actual links)
  const DONATION_LINKS = {
    coffee: "https://buymeacoffee.com/miguellozano3757",
    paypal: "https://paypal.me/Miguell0706",
  };

  // optional: one or more crypto addresses
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
  async function openLink(url: string) {
    try {
      const result = await WebBrowser.openBrowserAsync(url, {
        enableBarCollapsing: true,
        toolbarColor: "#1e140f",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });
      // if user’s platform can’t present WebBrowser, fall back:
      if (!result || (result as any).type === "cancel") {
        // no-op — they likely closed it
      }
    } catch {
      const can = await Linking.canOpenURL(url);
      if (can) {
        Linking.openURL(url);
      } else {
        Alert.alert("Unable to open link", "Please try again later.");
      }
    }
  }

  async function copyToClipboard(text: string, label?: string) {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", `${label ?? "Value"} copied to clipboard.`);
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
      <Pressable
        onPress={onPress}
        style={styles.backBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
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

  const clampCountdown = (n: number) => Math.max(0, Math.min(60, n));
  const clampSensitivity = (n: number) => Math.max(1, Math.min(10, n));
  const incCountdown = () =>
    setCountdownSec((prev) => clampCountdown((prev ?? 0) + 1));

  const decCountdown = () =>
    setCountdownSec((prev) => clampCountdown((prev ?? 0) - 1));
  const incSensitivity = () =>
    setSensitivity((prev) => clampSensitivity((prev ?? 1) + 1));

  const decSensitivity = () =>
    setSensitivity((prev) => clampSensitivity((prev ?? 1) - 1));
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
          <View style={styles.stepperRow}>
            <Pressable
              onPress={decCountdown}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Decrease countdown"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.stepBtnLabel}>−</Text>
            </Pressable>

            <TextInput
              value={String(countdownSec)}
              onChangeText={(t) => {
                const parsed = parseInt(t, 10);
                if (!Number.isNaN(parsed)) {
                  setCountdownSec(clampCountdown(parsed));
                }
              }}
              onBlur={() => {
                setCountdownSec((v) => clampCountdown(v));
              }}
              keyboardType="number-pad"
              style={[styles.input, styles.stepInput]}
              selectionColor={COLORS.primary}
            />

            <Pressable
              onPress={incCountdown}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Increase countdown"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.stepBtnLabel}>+</Text>
            </Pressable>
          </View>
        </Field>
      </ScrollView>
      <Back onPress={() => setScreen("menu")} />
    </View>
  );

  const SensitivityPage = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Sensitivity</Text>
      <ScrollView
        contentContainerStyle={styles.panelBody}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Sensitivity (1–10)"
          hint="Higher = triggers more easily (may cause more false alarms). Lower = needs stronger motion (may miss gentle falls)."
        >
          <View style={styles.stepperRow}>
            <Pressable
              onPress={decSensitivity}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Decrease sensitivity"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.stepBtnLabel}>−</Text>
            </Pressable>

            {/* Display-only value for clarity (no keyboard) */}
            <View style={[styles.input, styles.stepDisplay]}>
              <Text style={styles.stepDisplayLabel}>{sensitivity}</Text>
            </View>

            <Pressable
              onPress={incSensitivity}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={styles.stepBtn}
              accessibilityRole="button"
              accessibilityLabel="Increase sensitivity"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.stepBtnLabel}>+</Text>
            </Pressable>
          </View>
        </Field>
      </ScrollView>

      {/* keep Back visible without needing to scroll */}
      <Back onPress={() => setScreen("menu")} />
    </View>
  );
  const FAQ = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>FAQ</Text>

      <ScrollView
        contentContainerStyle={styles.panelBody}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.qaBlock}>
          <Text style={styles.q}>How does FallNotifier detect a fall?</Text>
          <Text style={styles.a}>
            The app continuously monitors your phone’s motion sensors. A sudden
            impact followed by stillness triggers a countdown. If you don’t
            cancel in time, FallNotifier automatically sends an alert message to
            your chosen numbers.
          </Text>
        </View>

        <View style={styles.qaBlock}>
          <Text style={styles.q}>Who gets notified if I fall?</Text>
          <Text style={styles.a}>
            The emergency contacts you’ve added in the numbers list on the left.
            When a fall is detected and not cancelled, they’ll receive a text
            message with your alert and location.
          </Text>
        </View>

        <View style={styles.qaBlock}>
          <Text style={styles.q}>Will it send my location?</Text>
          <Text style={styles.a}>
            Yes. If location permission is granted, the alert includes a Google
            Maps link with your last known GPS coordinates so contacts can
            quickly find you.
          </Text>
        </View>

        <View style={styles.qaBlock}>
          <Text style={styles.q}>Does it work without internet?</Text>
          <Text style={styles.a}>
            No. FallNotifier uses a secure server (via Twilio) to send your
            alert messages, which requires Wi-Fi or mobile data. If your phone
            is completely offline at the moment of the fall, the alert will not
            be sent until a connection is restored.
          </Text>
        </View>

        <View style={styles.qaBlock}>
          <Text style={styles.q}>Will it work if the app is closed?</Text>
          <Text style={styles.a}>
            Yes. FallNotifier runs quietly in the background with a small
            notification while monitoring is active. Even if the main app isn’t
            open, detection, countdown, and alerts continue to function.
          </Text>
        </View>

        <View style={styles.qaBlock}>
          <Text style={styles.q}>Can I cancel an accidental alert?</Text>
          <Text style={styles.a}>
            Absolutely. When a potential fall is detected, you’ll see a
            countdown screen with an “I’m OK” button. Tapping it immediately
            cancels the alert before any message is sent.
          </Text>
        </View>
      </ScrollView>

      <Back onPress={() => setScreen("menu")} />
    </View>
  );

  const Donations = () => (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Donations</Text>

      <ScrollView
        contentContainerStyle={[styles.panelBody, { gap: 14 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.bodyText}>
          If this app helps you or someone you love, you can support its ongoing
          development here. Thank you! 🙏
        </Text>
        {/* Coffee / one-off tips */}
        <View style={styles.donateCard}>
          <Text style={styles.cardTitle}>One-tap tip</Text>
          <Text style={styles.smallNote}>
            Quick $3–$10 coffee-style support
          </Text>
          <View style={styles.rowButtons}>
            <Pressable
              style={[styles.btnPrimary, { flex: 1 }]}
              onPress={() => openLink(DONATION_LINKS.coffee)}
            >
              <Text style={styles.btnPrimaryLabel}>Buy me a coffee ☕</Text>
            </Pressable>
            <Pressable
              style={[styles.btnGhost, { flex: 1 }]}
              onPress={() => openLink(DONATION_LINKS.paypal)}
            >
              <Text style={styles.btnGhostLabel}>PayPal</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Back onPress={() => setScreen("menu")} />
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
        {screen === "test" && (
          <ImpactTestPanel
            styles={styles}
            onBack={() => setScreen("menu")}
            impactOverride={sensitivityToImpactG(sensitivity)}
          />
        )}
        {screen === "sensitivity" && <SensitivityPage />}
        {screen === "faq" && <FAQ />}
        {screen === "donate" && <Donations />}
      </View>
    </LinearGradient>
  );
}
