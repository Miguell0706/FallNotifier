package com.miguell0706.FallNotifier3

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat

class FallAlertService : Service() {

  companion object {
    private const val CHANNEL_ID = "fall_alert_fs4"
    private const val CHANNEL_NAME = "Fall alerts"
    private const val NOTIF_ID = 42
    private const val REQUEST_FULLSCREEN = 1001

    const val ACTION_SEND_NOW = "com.fallnotifier.ACTION_SEND_NOW"
    const val ACTION_CANCEL   = "com.fallnotifier.ACTION_CANCEL"
    const val ACTION_TICK     = "com.fallnotifier.TICK"
  }

  private var seconds = 10
  private val handler = Handler(Looper.getMainLooper())

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    createChannelIfNeeded()

    // Handle action buttons if service is (re)started with an action
    when (intent?.action) {
      ACTION_SEND_NOW -> { sendNow(); stopSelfCleanly(); return START_NOT_STICKY }
      ACTION_CANCEL   -> { stopSelfCleanly();            return START_NOT_STICKY }
    }

    // Full-screen intent for the countdown Activity
    val fsIntent = Intent(this, CountdownActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

    val fsPending = PendingIntent.getActivity(
      this,
      REQUEST_FULLSCREEN,
      fsIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // Start in foreground with an initial notification that requests full-screen once
    startForeground(NOTIF_ID, buildNotification(remaining = null, fsPending = fsPending))

    // Some OEMs honor FS better if we explicitly start the Activity on lockscreen
    try {
      val km = getSystemService(KeyguardManager::class.java)
      if (km?.isKeyguardLocked == true) startActivity(fsIntent)
    } catch (_: Throwable) {}

    // Start ticking only once per service lifetime
    if (seconds == 10) handler.post(ticker)

    return START_STICKY
  }

  private val ticker = object : Runnable {
    override fun run() {
      // Let JS/RN know (if you listen for this)
      sendBroadcast(Intent(ACTION_TICK).putExtra("seconds", seconds))

      // Update the notification content without re-triggering full-screen
      val nm = getSystemService(NotificationManager::class.java)
      nm.notify(NOTIF_ID, buildNotification(remaining = seconds, fsPending = null))

      if (seconds <= 0) {
        sendNow()
        stopSelfCleanly()
      } else {
        seconds--
        handler.postDelayed(this, 1000)
      }
    }
  }

  private fun buildNotification(remaining: Int?, fsPending: PendingIntent?): Notification {
    val text = when (remaining) {
      null       -> "Preparing countdown…"
      in 0..9999 -> "Sending in ${remaining}s…"
      else       -> "Preparing countdown…"
    }

    // Action buttons target this Service (no BroadcastReceiver needed)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    val sendNowPI = PendingIntent.getService(
      this, 1,
      Intent(this, FallAlertService::class.java).setAction(ACTION_SEND_NOW),
      flags
    )
    val cancelPI = PendingIntent.getService(
      this, 2,
      Intent(this, FallAlertService::class.java).setAction(ACTION_CANCEL),
      flags
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_warning) // TODO: replace with your own drawable
      .setContentTitle("Fall detected")
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)   // pre-O behavior
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .apply {
        if (fsPending != null) {
          setFullScreenIntent(fsPending, true)        // request full-screen on initial post
          setContentIntent(fsPending)
          setDefaults(NotificationCompat.DEFAULT_ALL)
          if (Build.VERSION.SDK_INT >= 31) {
            setForegroundServiceBehavior(
              NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE
            )
          }
        }
      }
      .addAction(0, "Send now", sendNowPI)
      .addAction(0, "Cancel",   cancelPI)
      .build()
  }

  private fun sendNow() {
    // TODO: invoke your SMS/alert flow
    sendBroadcast(Intent(ACTION_TICK).putExtra("done", true))
  }

  private fun stopSelfCleanly() {
    handler.removeCallbacks(ticker)
    if (Build.VERSION.SDK_INT >= 24) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION") stopForeground(true)
    }
    stopSelf()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun createChannelIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val mgr = getSystemService(NotificationManager::class.java)
      if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
        val chan = NotificationChannel(
          CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
        ).apply {
          description = "Urgent fall countdown"
          lockscreenVisibility = Notification.VISIBILITY_PUBLIC
          enableVibration(true)
        }
        mgr.createNotificationChannel(chan)
      }
    }
  }
}
