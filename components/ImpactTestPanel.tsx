import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  FallEngineEvent,
  getFallEngineConfig,
  isFallEngineRunning,
  startFallEngine,
  stopFallEngine,
  subscribeToFallEngine,
} from "../core/fallEngine";

type ImpactRow = {
  id: string;
  ts: number;
  g: number;
  tag?: "IMPACT" | "FALL";
};

const MIN_LOG_G = 1.4; // only log meaningful motion
const TEST_SENSITIVITY = 9; // fallback sensitivity when guard is OFF

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
  const [startedLocally, setStartedLocally] = React.useState(false);

  const subRef = React.useRef<null | (() => void)>(null);
  const startedLocallyRef = React.useRef(false);

  // keep ref in sync with state for cleanup
  React.useEffect(() => {
    startedLocallyRef.current = startedLocally;
  }, [startedLocally]);

  // Load engine config once (after service or panel has started engine)
  React.useEffect(() => {
    const engineCfg = getFallEngineConfig();
    if (engineCfg) {
      setCfg({
        impactG: engineCfg.impactG,
        stillnessG: engineCfg.stillnessG,
      });
    } else {
      console.warn(
        "[ImpactTestPanel] fall engine config not available. Is detection enabled or test started?"
      );
    }

    return () => {
      // cleanup on unmount
      if (subRef.current) {
        subRef.current();
        subRef.current = null;
      }
      if (startedLocallyRef.current) {
        stopFallEngine().catch(() => {});
      }
    };
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
            tag: "IMPACT" as const,
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
            tag: "FALL" as const,
          },
          ...prev,
        ].slice(0, 50)
      );
    }
  }, []);

  const start = async () => {
    if (isRecording) return;

    // If engine is not running, start it in "test mode"
    if (!isFallEngineRunning()) {
      console.log(
        "[ImpactTestPanel] Engine not running; starting in TEST mode with sensitivity",
        TEST_SENSITIVITY
      );
      await startFallEngine(TEST_SENSITIVITY, { testMode: true });
      setStartedLocally(true);

      // refresh config after starting
      const engineCfg = getFallEngineConfig();
      if (engineCfg) {
        setCfg({
          impactG: engineCfg.impactG,
          stillnessG: engineCfg.stillnessG,
        });
      }
    } else {
      console.log(
        "[ImpactTestPanel] Engine already running; subscribing only (REAL mode)"
      );
    }

    const unsub = subscribeToFallEngine(handleEvent);
    subRef.current = unsub;
    setIsRecording(true);
  };

  const stop = async () => {
    if (subRef.current) {
      subRef.current();
      subRef.current = null;
    }
    setIsRecording(false);

    // If we started the engine for test mode, stop it again
    if (startedLocallyRef.current) {
      console.log("[ImpactTestPanel] Stopping engine started in TEST mode");
      await stopFallEngine();
      setStartedLocally(false);
    }
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
