package com.miguell0706.FallNotifier3

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.widget.Toast

class DebugStartReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Visual + haptic proof the receiver fired
    Toast.makeText(context, "DEBUG_START received", Toast.LENGTH_SHORT).show()
    try {
      val vib = context.getSystemService(Vibrator::class.java)
      vib?.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
    } catch (_: Throwable) {}

    Log.d("FallAlert", "DebugStartReceiver onReceive: ${intent.action}")

    // Try to start your foreground service from inside the app
    val i = Intent(context, FallAlertService::class.java)
    try {
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(i) else context.startService(i)
      Log.d("FallAlert", "Requested startForegroundService(FallAlertService)")
    } catch (t: Throwable) {
      Log.e("FallAlert", "Failed to start service", t)
    }
  }
}