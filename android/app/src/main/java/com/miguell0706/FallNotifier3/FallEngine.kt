package com.miguell0706.FallNotifier3

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import kotlin.math.sqrt

// --- Event types, like your TS FallEngineEvent union ---

sealed class FallEngineEvent {
    data class Sample(val g: Float, val ts: Long) : FallEngineEvent()
    data class Impact(val g: Float, val ts: Long, val impactG: Float) : FallEngineEvent()
    data class Fall(val ts: Long) : FallEngineEvent()
}

typealias FallEngineListener = (FallEngineEvent) -> Unit

private const val TAG = "FallEngine"

/**
 * Kotlin twin of core/fallEngine.ts.
 *
 *  - holds a FallDetector
 *  - subscribes to the accelerometer
 *  - emits Sample / Impact / Fall events to listeners
 */
object FallEngine : SensorEventListener {

    private var detector: FallDetector? = null
    private var config: FallThresholds? = null
    private var running: Boolean = false
    private var testMode: Boolean = false

    private val listeners = mutableSetOf<FallEngineListener>()

    private var sensorManager: SensorManager? = null
    private var accelSensor: Sensor? = null

    // --- public API, like startFallEngine in TS ---

    fun start(
        context: Context,
        sensitivity: Int,
        testMode: Boolean = false,
        detectorFactory: (impactG: Float, onFall: () -> Unit) -> FallDetector
    ) {
        if (running) {
            Log.w(TAG, "start() called but already running; ignoring (sensitivity=$sensitivity)")
            return
        }
        running = true
        this.testMode = testMode

        val impactG = Sensitivity.toImpactG(sensitivity)

        Log.i(
            TAG,
            "start() sensitivity=$sensitivity impactG=$impactG testMode=$testMode"
        )

        detector = detectorFactory(impactG) {
            val ts = System.currentTimeMillis()
            Log.i(TAG, "onFall() from detector at ts=$ts testMode=$testMode")

            if (!this.testMode) {
                for (l in listeners) {
                    l(FallEngineEvent.Fall(ts))
                }
            } else {
                Log.d(TAG, "testMode=true → FALL event not forwarded to JS")
            }
        }

        config = detector?.getConfig()
        Log.i(TAG, "config from detector: $config")

        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        if (accelSensor == null) {
            Log.e(TAG, "No accelerometer sensor found; stopping")
            stop()
            return
        }

        val rateMs = config?.rateMs ?: 50
        val rateUs = rateMs * 1000

        Log.i(TAG, "Registering sensor listener with rateMs=$rateMs (rateUs=$rateUs)")

        sensorManager?.registerListener(
            this,
            accelSensor,
            rateUs
        )
    }

    fun stop() {
        Log.i(TAG, "stop() called (running=$running)")
        try {
            sensorManager?.unregisterListener(this)
        } catch (e: Exception) {
            Log.w(TAG, "unregisterListener error: ${e.message}")
        }

        detector = null
        config = null
        running = false
        testMode = false
        sensorManager = null
        accelSensor = null
    }

    fun isRunning(): Boolean = running

    fun getConfig(): FallThresholds? = config

    fun subscribe(listener: FallEngineListener): () -> Unit {
        listeners.add(listener)
        Log.d(TAG, "subscribe() listenerCount=${listeners.size}")
        return {
            listeners.remove(listener)
            Log.d(TAG, "unsubscribe() listenerCount=${listeners.size}")
        }
    }

    // --- SensorEventListener implementation ---

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
        det.onSample(g)

        // In testMode, show more detail so your ImpactTestPanel makes sense
       // Only log "bigger" samples in test mode
        if (testMode && g >= 2.0f) {
            Log.d(TAG, "sample g=$g ts=$ts")
        }


        // raw sample → JS
        for (l in listeners) {
            l(FallEngineEvent.Sample(g, ts))
        }

        val cfg = config
        if (cfg != null && g >= cfg.impactG) {
            Log.i(TAG, "IMPACT threshold crossed: g=$g >= impactG=${cfg.impactG} ts=$ts")
            for (l in listeners) {
                l(FallEngineEvent.Impact(g, ts, cfg.impactG))
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // not used
    }
}
