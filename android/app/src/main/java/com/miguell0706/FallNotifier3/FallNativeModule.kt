package com.miguell0706.FallNotifier3

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.miguell0706.FallNotifier3.FallAlertService

private const val TAG = "FallNativeModule"

// Optional: mirror JS formula for comparison in logs
private fun previewImpactG(s: Int): Double {
    val maxG = 9.0      // g at sensitivity 1
    val minG = 2.5      // g at sensitivity 10
    val clamped = maxOf(1, minOf(10, s))
    val t = (clamped - 1) / 9.0
    return maxG - t * (maxG - minG)
}

class FallNativeModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FallNativeModule"

    private var unsubscribe: (() -> Unit)? = null

    private fun sendEvent(name: String, params: WritableMap) {
        Log.i(TAG, "sendEvent: $name $params")
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    @ReactMethod
    fun startFallService(sensitivity: Int?, testMode: Boolean?) {
        val s = sensitivity ?: 5          // fallback if JS somehow sends null
        val safeTest = testMode ?: false  // default: real mode

        val preview = previewImpactG(s)

        Log.i(
            TAG,
            "startFallService (JS) → sensitivity=$s, testMode=$safeTest, previewImpactG=$preview"
        )

        // 🔴 Start the FOREGROUND monitoring service
        FallMonitorService.start(
            ctx = reactApplicationContext,
            sensitivity = s,
            testMode = safeTest
        )

        // 🔁 Forward events from FallEngine → JS (ImpactTestPanel, etc.)
        unsubscribe?.invoke()
        unsubscribe = FallEngine.subscribe { event ->
            when (event) {
                is FallEngineEvent.Sample -> {
                    // Only forward "meaningful" motion
                    if (event.g >= 2.0f) {
                        val m = Arguments.createMap()
                        m.putDouble("g", event.g.toDouble())
                        m.putDouble("ts", event.ts.toDouble())
                        sendEvent("FallEngineSample", m)
                    }
                }

                is FallEngineEvent.Impact -> {
                    Log.i(
                        TAG,
                        "Impact g=${event.g} impactG=${event.impactG} ts=${event.ts}"
                    )
                    val m = Arguments.createMap()
                    m.putDouble("g", event.g.toDouble())
                    m.putDouble("impactG", event.impactG.toDouble())
                    m.putDouble("ts", event.ts.toDouble())
                    sendEvent("FallEngineImpact", m)
                }

                is FallEngineEvent.Fall -> {
                    Log.w(TAG, "FALL event ts=${event.ts}")

                    // 🔴 Start native countdown service (10s by default)
                    FallAlertService.start(
                        ctx = reactApplicationContext,
                        seconds = 10 // tweak this later if you want
                    )

                    // 🔁 Still forward the event to JS for logs / UI
                    val m = Arguments.createMap()
                    m.putDouble("ts", event.ts.toDouble())
                    sendEvent("FallEngineFall", m)
                }

            }
        }
    }

    @ReactMethod
    fun stopFallService() {
        Log.i(TAG, "stopFallService (JS) called")

        // 🔁 Stop forwarding events to JS
        unsubscribe?.invoke()
        unsubscribe = null

        // 🔴 Stop the FOREGROUND monitoring service
        FallMonitorService.stop(reactApplicationContext)
        // FallEngine.stop() will be called from inside FallMonitorService
    }

    // 👇 Required so React Native's NativeEventEmitter stops warning
    @ReactMethod
    fun addListener(eventName: String) {
        // no-op
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // no-op
    }
}
