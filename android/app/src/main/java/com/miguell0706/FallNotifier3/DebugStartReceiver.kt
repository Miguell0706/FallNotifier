package com.miguell0706.FallNotifier3

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class DebugStartReceiver : BroadcastReceiver() {
  override fun onReceive(ctx: Context, intent: Intent) {
    if (intent.action != "com.miguell0706.FallNotifier3.DEBUG_START") return

    Log.d("DebugStartReceiver", "onReceive action=${intent.action}")

    // Ensure channel exists before any notify()
    Notif.ensureChannel(ctx)

    // (Optional) short CPU wake to help FSI when screen is off
    try {
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
      val wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "fallnotifier:wake")
      wl.acquire(2000)
      wl.release()
    } catch (_: Throwable) {}

    // Restart countdown service each trigger
    val svc = Intent(ctx, FallAlertService::class.java)
      .setAction(FallAlertService.ACTION_START)
      .putExtra(FallAlertService.EXTRA_SECONDS, 10)
    if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(svc) else ctx.startService(svc)

    // Full-screen intent to surface CountdownActivity
    val activityIntent = Intent(ctx, CountdownActivity::class.java).apply {
      addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP
      )
      putExtra("source", "debug_broadcast")
    }
    val fullScreenPI = PendingIntent.getActivity(
      ctx, 0, activityIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notif = NotificationCompat.Builder(ctx, Notif.CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle("Fall detected (debug)")
      .setContentText("Opening countdown…")
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setDefaults(NotificationCompat.DEFAULT_ALL)
      .setFullScreenIntent(fullScreenPI, true)
      .setAutoCancel(true)
      .build()

    try {
      NotificationManagerCompat.from(ctx).notify(42, notif)
    } catch (_: Throwable) {
      // In case channel state was odd, recreate and retry once
      Notif.ensureChannel(ctx)
      NotificationManagerCompat.from(ctx).notify(42, notif)
    }

    // Also try direct start; one of the two will work depending on OEM rules
    try { ctx.startActivity(activityIntent) } catch (_: Throwable) {}
  }
}
