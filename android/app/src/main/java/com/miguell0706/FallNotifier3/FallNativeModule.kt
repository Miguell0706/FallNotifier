package com.miguell0706.FallNotifier3

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap   // 👈 ADD THIS
import com.facebook.react.modules.core.DeviceEventManagerModule

class FallNativeModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "FallNativeModule"

    private var unsubscribe: (() -> Unit)? = null

    private fun sendEvent(name: String, params: WritableMap) {
        Log.i("FallNativeModule", "sendEvent: $name $params")
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, params)
    }

    @ReactMethod
    fun startFallService(sensitivity: Int) {
        Log.i("FallNativeModule", "startFallService called with sensitivity=$sensitivity")

        FallEngine.start(
            context = reactApplicationContext,
            sensitivity = sensitivity,
            testMode = true  // 👈 for ImpactTestPanel visualization
        ) { impactG, onFall ->
            FallDetectorCore(
                onFall = onFall,
                thresholds = FallThresholds(impactG = impactG),
                debug = true
            )
        }

        // Forward events to JS
        unsubscribe?.invoke()
        unsubscribe = FallEngine.subscribe { event ->
            when (event) {
                is FallEngineEvent.Sample -> {
                    val m = Arguments.createMap()
                    m.putDouble("g", event.g.toDouble())
                    m.putDouble("ts", event.ts.toDouble())
                    sendEvent("FallEngineSample", m)
                }
                is FallEngineEvent.Impact -> {
                    val m = Arguments.createMap()
                    m.putDouble("g", event.g.toDouble())
                    m.putDouble("impactG", event.impactG.toDouble())
                    m.putDouble("ts", event.ts.toDouble())
                    sendEvent("FallEngineImpact", m)
                }
                is FallEngineEvent.Fall -> {
                    val m = Arguments.createMap()
                    m.putDouble("ts", event.ts.toDouble())
                    sendEvent("FallEngineFall", m)
                }
            }
        }
    }

    @ReactMethod
    fun stopFallService() {
        Log.i("FallNativeModule", "stopFallService called")
        unsubscribe?.invoke()
        unsubscribe = null
        FallEngine.stop()
    }
}
