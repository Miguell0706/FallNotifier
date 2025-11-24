package com.miguell0706.FallNotifier3

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlin.math.sqrt

// --- Event types, like your TS FallEngineEvent union ---

sealed class FallEngineEvent {
    data class Sample(val g: Float, val ts: Long) : FallEngineEvent()
    data class Impact(val g: Float, val ts: Long, val impactG: Float) : FallEngineEvent()
    data class Fall(val ts: Long) : FallEngineEvent()
}

typealias FallEngineListener = (FallEngineEvent) -> Unit

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

    /**
     * Start fall engine.
     * @param context any Context (Service, Activity, Application)
     * @param sensitivity 1..10
     * @param testMode if true, FALL events are NOT emitted
     * @param detectorFactory function to create the detector from impactG + onFall callback
     */
    fun start(
        context: Context,
        sensitivity: Int,
        testMode: Boolean = false,
        detectorFactory: (impactG: Float, onFall: () -> Unit) -> FallDetector
    ) {
        if (running) return
        running = true
        this.testMode = testMode

        val impactG = Sensitivity.toImpactG(sensitivity)
        android.util.Log.i(
            "FallEngine",
            "start with sensitivity=$sensitivity impactG=$impactG testMode=$testMode"
        )

        detector = detectorFactory(impactG) {
            val ts = System.currentTimeMillis()
            android.util.Log.i("FallEngine", "FALL event at $ts")

            if (!this.testMode) {
                for (l in listeners) {
                    l(FallEngineEvent.Fall(ts))
                }
            }
        }

        config = detector?.getConfig()

        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        accelSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

        val rateMs = config?.rateMs ?: 50
        val rateUs = rateMs * 1000  // SensorManager expects microseconds

        sensorManager?.registerListener(
            this,
            accelSensor,
            rateUs
        )
    }

    fun stop() {
        android.util.Log.i("FallEngine", "stop")
        try {
            sensorManager?.unregisterListener(this)
        } catch (_: Exception) {}

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
        return { listeners.remove(listener) }
    }

    // --- SensorEventListener implementation ---

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return
        val det = detector ?: return

        // Android values are in m/s^2 → convert to g for detector
        val ax = event.values[0]
        val ay = event.values[1]
        val az = event.values[2]

        // magnitude in m/s^2
        val mps2 = sqrt((ax * ax + ay * ay + az * az).toDouble()).toFloat()
        val g = mps2 / 9.80665f
        val ts = System.currentTimeMillis()

        det.onSample(g)

        // raw sample
        for (l in listeners) {
            l(FallEngineEvent.Sample(g, ts))
        }

        val cfg = config
        if (cfg != null && g >= cfg.impactG) {
            for (l in listeners) {
                l(FallEngineEvent.Impact(g, ts, cfg.impactG))
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // not used
    }
}
