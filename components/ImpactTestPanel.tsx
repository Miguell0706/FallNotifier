import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  FALL_FALL,
  FALL_IMPACT,
  FALL_SAMPLE,
  fallEmitter,
  startFallService,
  stopFallService,
} from "../core/FallBridge";
import { sensitivityToImpactG } from "../core/sensitivity";

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
  sensitivity,
}: {
  styles: any;
  onBack: () => void;
  sensitivity: number;
}) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [currentG, setCurrentG] = React.useState(1.0);
  const [peakG, setPeakG] = React.useState(1.0);
  const [rows, setRows] = React.useState<ImpactRow[]>([]);

  // Use real app sensitivity to compute approximate impactG for UI
  const impactGApprox = React.useMemo(
    () => sensitivityToImpactG(sensitivity),
    [sensitivity]
  );
  const stillnessGApprox = 1.05;

  // SAMPLE handler
  const handleSample = React.useCallback((e: { g: number; ts: number }) => {
    const gRounded = Number(e.g.toFixed(2));
    setCurrentG(gRounded);
    setPeakG((prev) => (gRounded > prev ? gRounded : prev));

    // Only log & store when it's above our min G
    if (gRounded >= MIN_LOG_G) {
      console.log("[ImpactTestPanel] SAMPLE event (logged)", e);

      const id = `sample-${e.ts}`;
      setRows((prev) => {
        const withoutDup = prev.filter((r) => r.id !== id);
        return [
          {
            id,
            ts: e.ts,
            g: gRounded,
          },
          ...withoutDup,
        ].slice(0, 50);
      });
    }
  }, []);

  // IMPACT handler
  const handleImpact = React.useCallback((e: { g: number; ts: number }) => {
    const gRounded = Number(e.g.toFixed(2));

    console.log("[ImpactTestPanel] IMPACT event", e);

    const id = `impact-${e.ts}`;
    setRows((prev) => {
      const withoutDup = prev.filter((r) => r.id !== id);
      return [
        {
          id,
          ts: e.ts,
          g: gRounded,
          tag: "IMPACT" as const,
        },
        ...withoutDup,
      ].slice(0, 50);
    });
  }, []);

  // FALL handler
  const handleFall = React.useCallback((e: { ts: number }) => {
    console.log("[ImpactTestPanel] FALL event", e);

    const id = `fall-${e.ts}`;
    setRows((prev) => {
      const withoutDup = prev.filter((r) => r.id !== id);
      return [
        {
          id,
          ts: e.ts,
          g: 0,
          tag: "FALL" as const,
        },
        ...withoutDup,
      ].slice(0, 50);
    });
  }, []);

  // Subscribe/unsubscribe based on isRecording
  React.useEffect(() => {
    if (!isRecording) {
      console.log("[ImpactTestPanel] not recording, skip subscribe");
      return;
    }

    console.log("[ImpactTestPanel] isRecording =", isRecording);
    console.log("[ImpactTestPanel] fallEmitter =", fallEmitter);

    if (!fallEmitter) {
      console.warn(
        "[ImpactTestPanel] fallEmitter is null – native events not available"
      );
      return;
    }

    console.log(
      "[ImpactTestPanel] Subscribing to",
      FALL_SAMPLE,
      FALL_IMPACT,
      FALL_FALL
    );

    const sampleSub = fallEmitter.addListener(FALL_SAMPLE, handleSample);
    const impactSub = fallEmitter.addListener(FALL_IMPACT, handleImpact);
    const fallSub = fallEmitter.addListener(FALL_FALL, handleFall);

    return () => {
      sampleSub.remove();
      impactSub.remove();
      fallSub.remove();
      console.log("[ImpactTestPanel] Unsubscribed from native fall events");
    };
  }, [isRecording, handleSample, handleImpact, handleFall]);

  const start = () => {
    if (isRecording) return;
    setRows([]);
    setPeakG(1.0);

    console.log(
      "[ImpactTestPanel] starting native fall service with sensitivity",
      sensitivity
    );
    startFallService(sensitivity); // use real sensitivity from props

    setIsRecording(true); // start listening
  };

  const stop = React.useCallback(() => {
    console.log("[ImpactTestPanel] stop() pressed");

    try {
      stopFallService(); // always call Kotlin stop
    } catch (e) {
      console.warn("[ImpactTestPanel] stopFallService error", e);
    }

    setIsRecording(false); // always update UI
  }, []);

  const clear = () => {
    setRows([]);
    setPeakG(1.0);
  };

  return (
    <View style={styles.panel}>
      <Pressable
        onPress={() => {
          stop(); // 👈 stop engine when leaving
          onBack();
        }}
        style={styles.backBtn}
      >
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
                currentG >= impactGApprox
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
            Logging ≥ {MIN_LOG_G.toFixed(1)} g (and all impacts/falls)
          </Text>
          <Text style={styles.hint}>
            impactG (approx): {impactGApprox.toFixed(2)} g
          </Text>
          <Text style={styles.hint}>
            stillnessG (approx): {stillnessGApprox.toFixed(2)} g
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
