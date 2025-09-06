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
    private const val CHANNEL_ID = "fall_alert_fs4"      // bump id once so channel = HIGH
    private const val CHANNEL_NAME = "Fall alerts"
    private const val NOTIF_ID = 42

    const val ACTION_SEND_NOW = "com.fallnotifier.ACTION_SEND_NOW"
    const val ACTION_CANCEL   = "com.fallnotifier.ACTION_CANCEL"
    const val ACTION_TICK     = "com.fallnotifier.TICK"
  }

  private var seconds = 10
  private val handler = Handler(Looper.getMainLooper())

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    createChannelIfNeeded()

    // Handle actions
    when (intent?.action) {
      ACTION_SEND_NOW -> { sendNow(); stopSelfCleanly(); return START_NOT_STICKY }
      ACTION_CANCEL   -> { stopSelfCleanly();            return START_NOT_STICKY }
    }

    // Full-screen intent to open the Activity
    val fsIntent = Intent(this, CountdownActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val fsPending = PendingIntent.getActivity(
      this, 0, fsIntent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    // Build initial notification (no tick yet)
    val notif = buildNotification(remaining = null, fsPending = fsPending)
    startForeground(NOTIF_ID, notif)

    // Fallback: some OEMs ignore FS intent unless we also start the Activity
    try {
      val km = getSystemService(KeyguardManager::class.java)
      if (km?.isKeyguardLocked == true) startActivity(fsIntent)
    } catch (_: Throwable) {}

    // Kick off ticker once
    if (seconds == 10) handler.post(ticker)

    return START_STICKY
  }

  private val ticker = object : Runnable {
    override fun run() {
      // 1) tell the Activity to update its text
      sendBroadcast(Intent(ACTION_TICK).putExtra("seconds", seconds))

      // 2) update the existing foreground notification (silent)
      val nm = getSystemService(NotificationManager::class.java)
      nm.notify(NOTIF_ID, buildNotification(remaining = seconds, fsPending = null)) // keep actions; silent update

      // 3) countdown or finish
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
    // Actions to keep on every update
    val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT

    val sendNowBroadcast = Intent(ACTION_SEND_NOW).setPackage(packageName)
    val sendPI = PendingIntent.getBroadcast(this, 1, sendNowBroadcast, flags)

    val cancelBroadcast = Intent(ACTION_CANCEL).setPackage(packageName)
    val cancelPI = PendingIntent.getBroadcast(this, 2, cancelBroadcast, flags)

    val text = when (remaining) {
      null       -> "Preparing countdown…"
      in 0..9999 -> "Sending in ${remaining}s…"
      else       -> "Preparing countdown…"
    }

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_warning)
      .setContentTitle("Fall detected")
      .setContentText(text)
      .setPriority(NotificationCompat.PRIORITY_MAX)               // pre-Oreo
      .setCategory(NotificationCompat.CATEGORY_CALL)              // helps FS on lockscreen
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)                                     // ← prevents sound/vibe every tick
      .apply {
        if (fsPending != null) {
          // initial post only: request full-screen + tap-to-open
          setFullScreenIntent(fsPending, true)
          setContentIntent(fsPending)
          // play alert once on first post
          setDefaults(NotificationCompat.DEFAULT_ALL)
          setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        }
      }
      .addAction(0, "Send now", sendPI)
      .addAction(0, "Cancel",   cancelPI)
      .build()
  }

  private fun sendNow() {
    // TODO: call your backend to send Twilio messages here
    sendBroadcast(Intent(ACTION_TICK).putExtra("done", true))
  }

  private fun stopSelfCleanly() {
    handler.removeCallbacks(ticker)
    stopForeground(STOP_FOREGROUND_REMOVE)
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
