package com.miguell0706.FallNotifier3 // Declares the package (namespace) this file belongs to

// ---- Android imports ----
import android.app.KeyguardManager       // Lets you check if the phone is locked
import android.app.Notification          // Base notification object
import android.app.NotificationChannel   // Used to define a channel (Android 8+ requirement)
import android.app.NotificationManager   // System service to show/cancel notifications
import android.app.PendingIntent         // "Future intent" that Android can run later
import android.app.Service               // Base class for background services
import android.content.Intent            // For sending messages between app components
import android.os.Build                  // Lets you check Android version
import android.os.Handler                // Posts delayed/repeating tasks
import android.os.IBinder                // Used if the service can be bound (not here)
import android.os.Looper                 // Defines thread message loops (used for main thread)
import androidx.core.app.NotificationCompat // Helper for backward-compatible notifications
import android.util.Log                  // For debug logging

// ---- Background Service ----
class FallAlertService : Service() {

  // ---- Constants used across the service ----
  companion object {
    private const val TAG = "FallAlertService"   // 👈 add this

    private const val NOTIF_ID = 42                  // Unique ID for the ongoing notification
    private const val REQUEST_FULLSCREEN = 1001      // Request code for fullscreen PendingIntent

    // Intent action names to tell the service what to do
    const val ACTION_SEND_NOW = "com.fallnotifier.ACTION_SEND_NOW"
    const val ACTION_CANCEL   = "com.fallnotifier.ACTION_CANCEL"
    const val ACTION_TICK     = "com.fallnotifier.TICK"
    const val ACTION_START    = "com.fallnotifier.ACTION_START"

    // Extra data key to pass countdown duration
    const val EXTRA_SECONDS   = "seconds"
  }

  // ---- Internal state ----
  private var seconds = 10                        // Countdown time in seconds
  private val handler = Handler(Looper.getMainLooper()) // Handler to post repeated tasks on UI thread
  private var running = false                     // Flag to track if countdown is active

  // Called whenever the service receives a command (Intent)
 override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
  Notif.ensureChannel(this)

  val action = intent?.action
  Log.i(TAG, "onStartCommand action=$action startId=$startId")

  val fsIntent = Intent(this, CountdownActivity::class.java)
    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

  val fsPending = PendingIntent.getActivity(
    this, REQUEST_FULLSCREEN, fsIntent,
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )

  when (action) {
    ACTION_SEND_NOW -> {
      Log.i(TAG, "ACTION_SEND_NOW received → sending immediately")
      sendNow()
      stopSelfCleanly()
      return START_NOT_STICKY
    }
    ACTION_CANCEL -> {
      Log.i(TAG, "ACTION_CANCEL received → stopping service")
      stopSelfCleanly()
      return START_NOT_STICKY
    }
    ACTION_START -> {
      val secs = intent.getIntExtra(EXTRA_SECONDS, 10)
      Log.i(TAG, "ACTION_START received → seconds=$secs")

      val notif = buildNotification(remaining = null, fsPending = fsPending)
      startForeground(NOTIF_ID, notif)

      try {
        val km = getSystemService(KeyguardManager::class.java)
        Log.d(TAG, "Keyguard locked? ${km?.isKeyguardLocked}")
        if (km?.isKeyguardLocked == true) {
          Log.i(TAG, "Launching CountdownActivity over lockscreen")
          startActivity(fsIntent)
        }
      } catch (t: Throwable) {
        Log.w(TAG, "Error starting fullscreen activity: ${t.message}")
      }

      resetCountdown(secs)
      return START_STICKY
    }
  }

  Log.w(TAG, "onStartCommand with null/unknown action, restarting foreground countdown")
  val notif = buildNotification(remaining = null, fsPending = fsPending)
  startForeground(NOTIF_ID, notif)
  if (!running) resetCountdown(10)
  return START_STICKY
}

  // Restart countdown with new value
private fun resetCountdown(newSeconds: Int = 10) {
  Log.i(TAG, "resetCountdown newSeconds=$newSeconds (was $seconds)")
  handler.removeCallbacks(ticker)
  seconds = newSeconds
  running = true
  handler.post(ticker)
}

private fun sendNow() {
  Log.i(TAG, "sendNow() called → TODO: implement SMS sending")
  // later: log which contacts, template, etc.
}

private fun stopSelfCleanly() {
  Log.i(TAG, "stopSelfCleanly() called, stopping service + foreground")
  sendBroadcast(Intent(ACTION_TICK).putExtra("done", true))
  running = false
  handler.removeCallbacks(ticker)

  if (Build.VERSION.SDK_INT >= 24) {
    stopForeground(STOP_FOREGROUND_REMOVE)
  } else {
    @Suppress("DEPRECATION")
    stopForeground(true)
  }
  stopSelf()
}


  // Runnable that fires every second
  private val ticker = object : Runnable {
  override fun run() {
    Log.d(TAG, "tick seconds=$seconds running=$running")

    sendBroadcast(Intent(ACTION_TICK).putExtra("seconds", seconds))

    val nm = getSystemService(NotificationManager::class.java)
    nm.notify(NOTIF_ID, buildNotification(remaining = seconds, fsPending = null))

    if (seconds <= 0) {
      Log.i(TAG, "Countdown finished → triggering sendNow()")
      sendNow()
      stopSelfCleanly()
    } else {
      seconds--
      handler.postDelayed(this, 1000)
    }
  }
}


  // Build notification with optional countdown + fullscreen intent
  private fun buildNotification(remaining: Int?, fsPending: PendingIntent?): Notification {
    val text = when (remaining) {
      null       -> "Preparing countdown…"
      in 0..9999 -> "Sending in ${remaining}s…"
      else       -> "Preparing countdown…"
    }

    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    // Button: "Send now"
    val sendNowPI = PendingIntent.getService(
      this, 1,
      Intent(this, FallAlertService::class.java).apply { action = ACTION_SEND_NOW },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val cancelPI = PendingIntent.getService(
      this, 2,
      Intent(this, FallAlertService::class.java).apply { action = ACTION_CANCEL },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )


    return NotificationCompat.Builder(this, Notif.CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_warning) // TODO replace with custom icon
      .setContentTitle("Fall detected")
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX) // High priority
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)  // Don’t buzz again on update
      .setOngoing(true)        // Cannot be swiped away
      .apply {
        if (fsPending != null) { // If fullscreen is requested
          setFullScreenIntent(fsPending, true)
          setContentIntent(fsPending)
          setDefaults(NotificationCompat.DEFAULT_ALL) // Sound/vibrate
          if (Build.VERSION.SDK_INT >= 31) {
            setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
          }
        }
      }
      .addAction(0, "Send now", sendNowPI) // Add action button
      .addAction(0, "Cancel",   cancelPI)
      .build()
  }


  // Not a bound service
  override fun onBind(intent: Intent?): IBinder? = null
}