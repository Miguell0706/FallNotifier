package com.miguell0706.FallNotifier3

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import kotlin.math.sqrt

private const val TAG = "FallEngine"

// Events we forward to JS via FallNativeModule
sealed class FallEngineEvent {
    data class Sample(val g: Float, val ts: Long) : FallEngineEvent()
    data class Impact(val g: Float, val ts: Long, val impactG: Float) : FallEngineEvent()
    data class Fall(val ts: Long) : FallEngineEvent()
}

object FallEngine : SensorEventListener {

    private var sensorManager: SensorManager? = null
    private var accel: Sensor? = null

    private var detector: FallDetector? = null
    private var running: Boolean = false
    private var testMode: Boolean = false

    // We cache the detector config just for logging / impact threshold
    var config: FallThresholds? = null
        private set

    // Simple listener list → NativeModule subscribes and forwards to JS
    private val listeners = mutableSetOf<(FallEngineEvent) -> Unit>()

    /**
     * Start the engine:
     *
     *  - context: app context from ReactApplicationContext
     *  - sensitivity: 1..10 from JS
     *  - testMode: true for ImpactTestPanel, false for real monitoring
     *  - buildDetector: given an impactG + onFall callback, return a FallDetectorCore
     */
    fun start(
        context: Context,
        sensitivity: Int,
        testMode: Boolean,
        buildDetector: (impactG: Float, onFall: () -> Unit) -> FallDetector
    ) {
        // If already running, just log and rewire listeners; avoid double registration
        if (running) {
            Log.w(TAG, "start() called but already running; ignoring (sensitivity=$sensitivity)")
            return
        }

        this.testMode = testMode

        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accel = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        if (accel == null) {
            Log.e(TAG, "No accelerometer available on this device")
            return
        }

        // Map sensitivity (1–10) to impactG threshold, same curve as JS
        val impactG = sensitivityToImpactG(sensitivity)

        // Build detector with our onFall callback
        detector = buildDetector(impactG) {
            val ts = System.currentTimeMillis()
            Log.i(TAG, "onFall() from detector at ts=$ts testMode=$testMode")

            if (testMode) {
                // For ImpactTestPanel: only native logs
                Log.d(TAG, "testMode=true → FALL event not forwarded to JS")
            } else {
                // Real mode: notify JS so you can trigger CountdownActivity / SMS
                emit(FallEngineEvent.Fall(ts))
            }
        }

        // Cache config for logs
        config = detector?.getConfig()

        Log.i(
            TAG,
            "start() sensitivity=$sensitivity impactG=$impactG testMode=$testMode"
        )
        Log.i(TAG, "config from detector: ${config}")

        // Register accelerometer listener
        val rateMs = config?.rateMs ?: 50
        val rateUs = rateMs * 1000
        Log.i(TAG, "Registering sensor listener with rateMs=$rateMs (rateUs=$rateUs)")
        sensorManager?.registerListener(
            this,
            accel,
            rateUs
        )

        running = true
    }

    fun stop() {
        Log.i(TAG, "stop() called (running=$running)")
        if (!running) return

        sensorManager?.unregisterListener(this)
        sensorManager = null
        accel = null

        detector?.reset()
        detector = null
        config = null
        running = false
    }

    fun subscribe(listener: (FallEngineEvent) -> Unit): () -> Unit {
        listeners.add(listener)
        Log.d(TAG, "subscribe() listenerCount=${listeners.size}")
        return {
            listeners.remove(listener)
            Log.d(TAG, "unsubscribe() listenerCount=${listeners.size}")
        }
    }

    private fun emit(event: FallEngineEvent) {
        for (l in listeners) {
            l(event)
        }
    }

    // --- SensorEventListener ---

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
        val det = detector ?: return

        val ax = event.values[0]
        val ay = event.values[1]
        val az = event.values[2]

        // magnitude in m/s^2
        val mps2 = sqrt((ax * ax + ay * ay + az * az).toDouble()).toFloat()
        val g = mps2 / 9.80665f
        val ts = System.currentTimeMillis()

        // Feed into detector
        det.onSample(g, ts)

        // In testMode, show more detail for ImpactTestPanel
        if (testMode && g >= 2.0f) {
            Log.d(TAG, "BIG sample (>=2g) g=$g ts=$ts")
        }

        // raw sample → listeners (JS via NativeModule)
        emit(FallEngineEvent.Sample(g, ts))

        val cfg = config
        if (cfg != null && g >= cfg.impactG) {
            Log.i(TAG, "IMPACT threshold crossed: g=$g >= impactG=${cfg.impactG} ts=$ts")
            emit(FallEngineEvent.Impact(g, ts, cfg.impactG))
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // no-op
    }

    // Match the JS curve: 1 = least sensitive (needs big impact), 10 = most sensitive
    private fun sensitivityToImpactG(s: Int): Float {
        val maxG = 9.0f    // at sensitivity 1
        val minG = 2.5f    // at sensitivity 10
        val clamped = s.coerceIn(1, 10)
        val t = (clamped - 1) / 9.0f
        return maxG - t * (maxG - minG)
    }
}
