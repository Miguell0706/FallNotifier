package com.miguell0706.FallNotifier3

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log

class DebugStartReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Log.d("FallAlert", "DebugStartReceiver onReceive: ${intent.action}")

    // Haptic proof that the broadcast hit your app
    val vib = context.getSystemService(Vibrator::class.java)
    vib?.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))

    // Try to start the foreground service
    val i = Intent(context, FallAlertService::class.java)
    try {
      if (Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(i)
      } else {
        context.startService(i)
      }
      Log.d("FallAlert", "Requested startForegroundService(FallAlertService)")
    } catch (t: Throwable) {
      Log.e("FallAlert", "Failed to start service", t)
    }
  }
}
