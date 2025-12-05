package com.miguell0706.FallNotifier3

// ---- Android imports ----
import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

// ---- Background Service ----
class FallAlertService : Service() {

  companion object {
    private const val TAG = "FallAlertService"

    private const val NOTIF_ID = 42
    private const val REQUEST_FULLSCREEN = 1001

    const val ACTION_SEND_NOW = "com.fallnotifier.ACTION_SEND_NOW"
    const val ACTION_CANCEL   = "com.fallnotifier.ACTION_CANCEL"
    const val ACTION_TICK     = "com.fallnotifier.TICK"
    const val ACTION_START    = "com.fallnotifier.ACTION_START"

    const val EXTRA_SECONDS   = "seconds"

    fun start(ctx: Context, seconds: Int = 10) {
      val intent = Intent(ctx, FallAlertService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_SECONDS, seconds)
      }

      if (Build.VERSION.SDK_INT >= 26) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    }
  }

  // ---- Internal state ----
  private var seconds = 10
  private val handler = Handler(Looper.getMainLooper())
  private var running = false

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Notif.ensureChannel(this)

    val action = intent?.action
    Log.i(TAG, "onStartCommand action=$action startId=$startId")

    val fsIntent = Intent(this, CountdownActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

    val fsPending = PendingIntent.getActivity(
      this,
      REQUEST_FULLSCREEN,
      fsIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // Base notification used for non-countdown actions (send now / cancel / unknown)
    val baseNotif = buildNotification(remaining = null, fsPending = null)

    when (action) {
      ACTION_SEND_NOW -> {
        // Android 14+ requires we actually call startForeground if the service
        // was started as an FGS for this action
        startForeground(NOTIF_ID, baseNotif)
        Log.i(TAG, "ACTION_SEND_NOW received → sending immediately")
        sendNow()
        stopSelfCleanly()
        return START_NOT_STICKY
      }

      ACTION_CANCEL -> {
        // Always create a simple notification and go foreground first
        val cancelNotif = buildNotification(remaining = null, fsPending = null)
        Log.i(TAG, "ACTION_CANCEL received → promoting to foreground, then stopping")

        try {
          startForeground(NOTIF_ID, cancelNotif)
        } catch (t: Throwable) {
          Log.e(TAG, "startForeground() failed in ACTION_CANCEL: ${t.message}", t)
        }

        // Even if countdown already finished, this is safe
        stopSelfCleanly()
        return START_NOT_STICKY
      }


      ACTION_START -> {
        val secs = intent.getIntExtra(EXTRA_SECONDS, 10)
        Log.i(TAG, "ACTION_START received → seconds=$secs running=$running")

        // Foreground notification for active countdown
        val notif = buildNotification(remaining = null, fsPending = fsPending)
        startForeground(NOTIF_ID, notif)

        if (!running) {
          // Only the first ACTION_START per fall should show the fullscreen UI
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
        } else {
          Log.i(TAG, "ACTION_START while already running → ignoring extra start")
        }

        return START_STICKY
      }

      else -> {
        Log.w(TAG, "onStartCommand with null/unknown action, restarting foreground countdown")
        startForeground(NOTIF_ID, baseNotif)
        if (!running) resetCountdown(10)
        return START_STICKY
      }
    }
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
    // later: hook in Twilio / backend / SMS logic
  }

private fun stopSelfCleanly() {
  Log.i(TAG, "stopSelfCleanly() called, stopping service + foreground")

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
// Runnable that fires every second
private val ticker = object : Runnable {
  override fun run() {
    Log.d(TAG, "tick seconds=$seconds running=$running")

    val done = seconds <= 0

    // Broadcast to CountdownActivity
    val tickIntent = Intent(ACTION_TICK).apply {
      setPackage(packageName)              // make sure it stays inside your app
      putExtra("seconds", seconds)
      putExtra("done", done)
    }
    sendBroadcast(tickIntent)

    // Update notification text
    val nm = getSystemService(NotificationManager::class.java)
    nm.notify(NOTIF_ID, buildNotification(remaining = seconds, fsPending = null))

    if (done) {
      Log.i(TAG, "Countdown finished → triggering sendNow()")
      sendNow()
      stopSelfCleanly()
    } else {
      seconds--
      handler.postDelayed(this, 1000)
    }
  }
}


  // Build notification with optional countdown + optional fullscreen intent
  private fun buildNotification(remaining: Int?, fsPending: PendingIntent?): Notification {
    val text = when (remaining) {
      null       -> "Preparing countdown…"
      in 0..9999 -> "Sending in ${remaining}s…"
      else       -> "Preparing countdown…"
    }

    val sendNowPI = PendingIntent.getService(
      this,
      1,
      Intent(this, FallAlertService::class.java).apply { action = ACTION_SEND_NOW },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val cancelPI = PendingIntent.getService(
      this,
      2,
      Intent(this, FallAlertService::class.java).apply { action = ACTION_CANCEL },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, Notif.CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_warning) // TODO: replace with your icon
      .setContentTitle("Fall detected")
      .setContentText(text)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOnlyAlertOnce(true)
      .setOngoing(true)
      .apply {
        if (fsPending != null) {
          setFullScreenIntent(fsPending, true)
          setContentIntent(fsPending)
          setDefaults(NotificationCompat.DEFAULT_ALL)
          if (Build.VERSION.SDK_INT >= 31) {
            setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
          }
        }
      }
      .addAction(0, "Send now", sendNowPI)
      .addAction(0, "Cancel",   cancelPI)
      .build()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
