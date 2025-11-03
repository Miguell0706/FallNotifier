import { Accelerometer } from "expo-sensors";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { createFallDetector } from "../core/fallDetectorCore";

type ImpactRow = {
  id: string;
  ts: number;
  g: number;
  tag?: "IMPACT" | "FALL";
};

const MIN_LOG_G = 1.4; // only log meaningful motion

export default function ImpactTestPanel({
  styles,
  guard,
  onBack,
}: {
  styles: any;
  guard: ReturnType<typeof import("../hooks/useEnabledGuard").useEnabledGuard>;
  onBack: () => void;
}) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [currentG, setCurrentG] = React.useState(1.0);
  const [peakG, setPeakG] = React.useState(1.0);
  const [rows, setRows] = React.useState<ImpactRow[]>([]);
  const [cfg, setCfg] = React.useState(() => ({
    impactG: 8,
    stillnessG: 1.05,
  }));

  const detectorRef = React.useRef<ReturnType<
    typeof createFallDetector
  > | null>(null);
  const subRef = React.useRef<{ remove: () => void } | null>(null);

  // Initialize detector
  React.useEffect(() => {
    const det = createFallDetector(() => {
      const ts = Date.now();
      setRows((prev) =>
        [{ id: "fall-" + ts, ts, g: 0, tag: "FALL" as const }, ...prev].slice(
          0,
          50
        )
      );
    });
    detectorRef.current = det;
    setCfg({
      impactG: det.getConfig().impactG,
      stillnessG: det.getConfig().stillnessG,
    });

    return () => {
      if (subRef.current) subRef.current.remove();
    };
  }, []);

  const start = guard(() => {
    if (isRecording || !detectorRef.current) return;
    Accelerometer.setUpdateInterval(50);

    subRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      const det = detectorRef.current!;
      det.onSample(g);

      setCurrentG(Number(g.toFixed(2)));
      setPeakG((prev) => (g > prev ? Number(g.toFixed(2)) : prev));

      const impactG = det.getConfig().impactG;
      const isImpact = g >= impactG;
      const ts = Date.now();

      // Only log spikes
      if (g >= MIN_LOG_G || isImpact) {
        const tag: "IMPACT" | undefined = isImpact ? "IMPACT" : undefined;
        setRows((prev) =>
          [
            { id: ts.toString(), ts, g: Number(g.toFixed(2)), tag },
            ...prev,
          ].slice(0, 50)
        );
      }
    });

    setIsRecording(true);
  });

  const stop = () => {
    if (subRef.current) {
      subRef.current.remove();
      subRef.current = null;
    }
    setIsRecording(false);
  };

  const clear = () => {
    setRows([]);
    setPeakG(1.0);
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Impact Tester</Text>

      <View style={[styles.panelBody, { gap: 14 }]}>
        {/* BIG DISPLAY */}
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: "rgba(0,0,0,0.18)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ color: "#FAF6F2", opacity: 0.7, fontSize: 12 }}>
            current g
          </Text>
          <Text
            style={{
              color:
                currentG >= cfg.impactG
                  ? "#ffb3b3"
                  : currentG >= MIN_LOG_G
                  ? "#FFE6B3"
                  : "#FAF6F2",
              fontSize: 48,
              fontWeight: "800",
            }}
          >
            {currentG.toFixed(2)}
          </Text>
          <Text style={{ color: "#FAF6F2", opacity: 0.5, fontSize: 12 }}>
            peak: {peakG.toFixed(2)} g
          </Text>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={styles.btnPrimary}
            onPress={isRecording ? stop : start}
          >
            <Text style={styles.btnPrimaryLabel}>
              {isRecording ? "Stop" : "Start"}
            </Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={clear}>
            <Text style={styles.btnGhostLabel}>Clear log</Text>
          </Pressable>
        </View>

        {/* Info */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            padding: 10,
            gap: 4,
          }}
        >
          <Text style={styles.hint}>
            Logging ≥ {MIN_LOG_G.toFixed(1)} g (and all impacts)
          </Text>
          <Text style={styles.hint}>
            impactG (detector): {cfg.impactG.toFixed(2)} g
          </Text>
          <Text style={styles.hint}>
            stillnessG: {cfg.stillnessG.toFixed(2)} g
          </Text>
        </View>

        {/* Log */}
        <View style={{ maxHeight: 220 }}>
          <Text style={[styles.hint, { marginBottom: 6 }]}>Recent events</Text>
          <ScrollView>
            {rows.length === 0 ? (
              <Text style={styles.hint}>No interesting motion yet.</Text>
            ) : (
              rows.map((r) => (
                <View
                  key={r.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 5,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Text style={[styles.bodyText, { fontSize: 12 }]}>
                    {new Date(r.ts).toLocaleTimeString()}
                  </Text>
                  <Text
                    style={[
                      styles.bodyText,
                      {
                        fontSize: 13,
                        fontWeight: r.tag ? "700" : "400",
                        color:
                          r.tag === "FALL"
                            ? "#ffb3b3"
                            : r.tag === "IMPACT"
                            ? "#FFE6B3"
                            : "#FAF6F2",
                      },
                    ]}
                  >
                    {r.tag === "FALL"
                      ? "FALL ✅"
                      : r.tag === "IMPACT"
                      ? `${r.g.toFixed(2)} g (IMPACT)`
                      : `${r.g.toFixed(2)} g`}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
    </View>
  );
}
