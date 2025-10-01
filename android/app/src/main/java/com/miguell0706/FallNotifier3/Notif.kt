package com.miguell0706.FallNotifier3

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object Notif {
  const val CHANNEL_ID = "fall_alerts_core_v1"
  const val CHANNEL_NAME = "Fall alerts"

  fun ensureChannel(ctx: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = ctx.getSystemService(NotificationManager::class.java)
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        val chan = NotificationChannel(
          CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
        ).apply {
          description = "Urgent fall countdown"
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
          enableVibration(true) // keep this if you want vibration
        }
        nm.createNotificationChannel(chan)
      }
    }
  }
}
