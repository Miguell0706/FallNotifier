// components/MessageAndCountdown.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

const COUNTDOWN_KEY = "countdown:v1";

type Styles = { [key: string]: any };

type FieldProps = React.PropsWithChildren<{
  styles: Styles;
  label: string;
  hint?: string;
}>;

const Field: React.FC<FieldProps> = ({ styles, label, hint, children }) => (
  <View style={{ gap: 8 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {children}
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

type BackProps = {
  styles: Styles;
  onPress: () => void;
};

const Back: React.FC<BackProps> = ({ styles, onPress }) => (
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

type MessageAndCountdownProps = {
  styles: Styles;
  messageTemplate: string;
  setMessageTemplate: (s: string) => void;
  countdownSec: number;
  setCountdownSec: React.Dispatch<React.SetStateAction<number>>;
  clampCountdown: (n: number) => number;
  onBack: () => void; // 👈 no params here
};

const MessageAndCountdown: React.FC<MessageAndCountdownProps> = ({
  styles,
  messageTemplate,
  setMessageTemplate,
  countdownSec,
  setCountdownSec,
  clampCountdown,
  onBack,
}) => {
  React.useEffect(() => {
    console.log("[MessageAndCountdown] MOUNT");
    return () => console.log("[MessageAndCountdown] UNMOUNT");
  }, []);

  const incCountdown = () =>
    setCountdownSec((prev) => {
      const next = clampCountdown(prev + 1);
      AsyncStorage.setItem(COUNTDOWN_KEY, String(next)).catch(() => {});
      return next;
    });

  const decCountdown = () =>
    setCountdownSec((prev) => {
      const next = clampCountdown(prev - 1);
      AsyncStorage.setItem(COUNTDOWN_KEY, String(next)).catch(() => {});
      return next;
    });

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Message & Countdown</Text>

      <ScrollView
        contentContainerStyle={styles.panelBody}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        <Field
          styles={styles}
          label="Message template"
          hint="Use {link} where the map URL should go. Keep it under ~160 GSM chars for 1 SMS segment."
        >
          <TextInput
            value={messageTemplate}
            onChangeText={setMessageTemplate}
            multiline
            style={[styles.input, { height: 110 }]}
            placeholder="I may have fallen. My location: {link}"
            placeholderTextColor="rgba(250,246,242,0.72)"
            selectionColor="#E3A250"
          />
        </Field>

        <Field
          styles={styles}
          label="Countdown (seconds)"
          hint="Delay before sending so you can cancel an accidental alert."
        >
          <View style={styles.stepperRow}>
            <Pressable
              onPress={decCountdown}
              disabled={countdownSec <= 0}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={[styles.stepBtn, countdownSec <= 0 && styles.disabledBtn]}
              accessibilityRole="button"
              accessibilityLabel="Decrease countdown"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.stepBtnLabel}>−</Text>
            </Pressable>

            <TextInput
              value={String(countdownSec)}
              onChangeText={async (t) => {
                const parsed = parseInt(t, 10);
                if (!Number.isNaN(parsed)) {
                  const clamped = clampCountdown(parsed);
                  setCountdownSec(clamped);
                  try {
                    await AsyncStorage.setItem(COUNTDOWN_KEY, String(clamped));
                  } catch {}
                }
              }}
              onBlur={() => {
                setCountdownSec((v) => {
                  const clamped = clampCountdown(v);
                  AsyncStorage.setItem(COUNTDOWN_KEY, String(clamped)).catch(
                    () => {}
                  );
                  return clamped;
                });
              }}
              keyboardType="number-pad"
              style={[styles.input, styles.stepInput]}
              selectionColor="#E3A250"
            />

            <Pressable
              onPress={incCountdown}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              disabled={countdownSec >= 10}
              style={[styles.stepBtn, countdownSec >= 10 && styles.disabledBtn]}
              accessibilityRole="button"
              accessibilityLabel="Increase countdown"
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.stepBtnLabel}>+</Text>
            </Pressable>
          </View>
        </Field>
      </ScrollView>

      <Back styles={styles} onPress={onBack} />
    </View>
  );
};

export default MessageAndCountdown;
