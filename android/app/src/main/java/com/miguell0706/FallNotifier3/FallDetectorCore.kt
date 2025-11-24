package com.miguell0706.FallNotifier3

import android.util.Log
import kotlin.math.max

// --- Threshold config (like FallThresholds in TS) ---

data class FallThresholds(
    val rateMs: Int = 50,                // ~20 Hz
    val impactG: Float = 8.0f,           // hard impact
    val stillnessG: Float = 1.05f,       // “still” idle ~1g
    val impactGraceMs: Long = 1200L,     // let post-impact jiggle die down
    val stillnessWindowMs: Long = 1200L, // sliding window size
    val stillnessMinMs: Long = 700L,     // consecutive ms under threshold
    val cooldownMs: Long = 10_000L,      // one alert max per 10s
    val maxObserveMs: Long = 4000L       // how long after grace to look for stillness
)

// Simple sample type: time + g
private data class Sample(val t: Long, val g: Float)

// --- State info (like getState TS return) ---

enum class FallDetectorPhase { IDLE, AFTER_IMPACT }

data class FallDetectorState(
    val state: FallDetectorPhase,
    val lastTrigger: Long,
    val impactAt: Long
)

// --- Interface (to match what FallEngine expects) ---

interface FallDetector {
    fun onSample(g: Float, now: Long = System.currentTimeMillis())
    fun reset()
    fun setThresholds(patch: FallThresholdsPatch)
    fun getConfig(): FallThresholds
    fun getState(): FallDetectorState
}

// Patch type, equivalent of Partial<FallThresholds> in TS
data class FallThresholdsPatch(
    val rateMs: Int? = null,
    val impactG: Float? = null,
    val stillnessG: Float? = null,
    val impactGraceMs: Long? = null,
    val stillnessWindowMs: Long? = null,
    val stillnessMinMs: Long? = null,
    val cooldownMs: Long? = null,
    val maxObserveMs: Long? = null
)

// --- Implementation (this is the TS createFallDetector port) ---

class FallDetectorCore(
    private val onFall: () -> Unit,
    thresholds: FallThresholds = FallThresholds(),
    private val debug: Boolean = false
) : FallDetector {

    private var cfg: FallThresholds = thresholds
    private var phase: FallDetectorPhase = FallDetectorPhase.IDLE
    private var impactAt: Long = 0L
    private var lastTrigger: Long = 0L
    private val buf = mutableListOf<Sample>()

    private fun log(vararg parts: String) {
        if (!debug) return
        Log.d("FallDetector", parts.joinToString(" "))
    }

    private fun prune(now: Long) {
        // keepSince = now - max(impactGraceMs + maxObserveMs + stillnessWindowMs + 1000, cooldownMs)
        val span = cfg.impactGraceMs + cfg.maxObserveMs + cfg.stillnessWindowMs + 1000L
        val keepSince = now - max(span, cfg.cooldownMs)
        while (buf.isNotEmpty() && buf.first().t < keepSince) {
            buf.removeAt(0)
        }
    }

    override fun onSample(g: Float, now: Long) {
        // push & prune
        buf.add(Sample(now, g))
        prune(now)

        // cooldown gate
        if (now - lastTrigger < cfg.cooldownMs) return

        if (phase == FallDetectorPhase.IDLE) {
            if (g >= cfg.impactG) {
                phase = FallDetectorPhase.AFTER_IMPACT
                impactAt = now
                log("IMPACT g=${"%.2f".format(g.toDouble())}")
            }
            return
        }

        // AFTER_IMPACT
        val dt = now - impactAt
        if (dt < cfg.impactGraceMs) return

        // sliding stillness window up to 'now'
        val slideStart = now - cfg.stillnessWindowMs
        var sum = 0f
        var n = 0
        var stillMs = 0L

        for (i in 1 until buf.size) {
            val prev = buf[i - 1]
            val cur = buf[i]

            if (cur.t < slideStart) continue

            sum += cur.g
            n++

            if (prev.t >= slideStart &&
                prev.g <= cfg.stillnessG &&
                cur.g <= cfg.stillnessG
            ) {
                stillMs += (cur.t - prev.t)
            }
        }

        val avg: Float =
            if (n > 0) sum / n.toFloat() else Float.POSITIVE_INFINITY
        val avgStr = if (avg.isFinite()) "%.2f".format(avg.toDouble()) else "inf"

        log("ANALYZE avg=$avgStr stillMs=${stillMs}ms dt=${dt}ms")

        // Condition for fall:
        // avg <= stillnessG OR stillMs >= stillnessMinMs
        if (avg <= cfg.stillnessG || stillMs >= cfg.stillnessMinMs) {
            lastTrigger = now
            phase = FallDetectorPhase.IDLE
            log("FALL DETECTED ✅")
            onFall()
            // trim to avoid immediate retrigger
            val keepRecentSince = now - 300L
            val keep = buf.filter { s -> now - s.t < 300L }
            buf.clear()
            buf.addAll(keep)
            return
        }

        // give up if no stillness appears
        if (dt > cfg.impactGraceMs + cfg.maxObserveMs) {
            phase = FallDetectorPhase.IDLE
            log("RESET (no stillness)")
        }
    }

    override fun reset() {
        phase = FallDetectorPhase.IDLE
        impactAt = 0L
        lastTrigger = 0L
        buf.clear()
    }

    override fun setThresholds(patch: FallThresholdsPatch) {
        cfg = cfg.copy(
            rateMs = patch.rateMs ?: cfg.rateMs,
            impactG = patch.impactG ?: cfg.impactG,
            stillnessG = patch.stillnessG ?: cfg.stillnessG,
            impactGraceMs = patch.impactGraceMs ?: cfg.impactGraceMs,
            stillnessWindowMs = patch.stillnessWindowMs ?: cfg.stillnessWindowMs,
            stillnessMinMs = patch.stillnessMinMs ?: cfg.stillnessMinMs,
            cooldownMs = patch.cooldownMs ?: cfg.cooldownMs,
            maxObserveMs = patch.maxObserveMs ?: cfg.maxObserveMs
        )
    }

    override fun getConfig(): FallThresholds = cfg

    override fun getState(): FallDetectorState =
        FallDetectorState(phase, lastTrigger, impactAt)
}
