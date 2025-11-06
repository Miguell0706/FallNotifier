import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  FallEngineEvent,
  getFallEngineConfig,
  isFallEngineRunning,
  subscribeToFallEngine,
} from "../core/fallEngine";

type ImpactRow = {
  id: string;
  ts: number;
  g: number;
  tag?: "IMPACT" | "FALL";
};

const MIN_LOG_G = 1.4; // only log meaningful motion

export default function ImpactTestPanel({
  styles,
  onBack,
}: {
  styles: any;
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

  const subRef = React.useRef<null | (() => void)>(null);

  // Load engine config once (after service has started engine)
  React.useEffect(() => {
    const engineCfg = getFallEngineConfig();
    if (engineCfg) {
      setCfg({
        impactG: engineCfg.impactG,
        stillnessG: engineCfg.stillnessG,
      });
    } else {
      console.warn(
        "[ImpactTestPanel] fall engine config not available. Is detection enabled?"
      );
    }
  }, []);

  const handleEvent = React.useCallback((event: FallEngineEvent) => {
    if (event.type === "sample") {
      const gRounded = Number(event.g.toFixed(2));
      setCurrentG(gRounded);
      setPeakG((prev) => (gRounded > prev ? gRounded : prev));

      if (gRounded >= MIN_LOG_G) {
        setRows((prev) =>
          [
            {
              id: String(event.ts),
              ts: event.ts,
              g: gRounded,
            },
            ...prev,
          ].slice(0, 50)
        );
      }
    } else if (event.type === "impact") {
      const gRounded = Number(event.g.toFixed(2));
      setRows((prev) =>
        [
          {
            id: "impact-" + event.ts,
            ts: event.ts,
            g: gRounded,
            tag: "IMPACT" as const, // 👈 important
          },
          ...prev,
        ].slice(0, 50)
      );
    } else if (event.type === "fall") {
      setRows((prev) =>
        [
          {
            id: "fall-" + event.ts,
            ts: event.ts,
            g: 0,
            tag: "FALL" as const, // 👈 important
          },
          ...prev,
        ].slice(0, 50)
      );
    }
  }, []);

  const start = () => {
    if (isRecording) return;

    if (!isFallEngineRunning()) {
      console.warn(
        "[ImpactTestPanel] fall engine is not running; make sure detection is enabled in the main UI."
      );
    }

    const unsub = subscribeToFallEngine(handleEvent);
    subRef.current = unsub;
    setIsRecording(true);
  };

  const stop = () => {
    if (subRef.current) {
      subRef.current();
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
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

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
            impactG (engine): {cfg.impactG.toFixed(2)} g
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
    </View>
  );
}
