package com.miguell0706.FallNotifier3

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

private const val TAG = "FallMonitorService"

class FallMonitorService : Service() {

 companion object {
    const val ACTION_START = "com.miguell0706.FallNotifier3.FALL_MONITOR_START"
    const val ACTION_STOP  = "com.miguell0706.FallNotifier3.FALL_MONITOR_STOP"

    private const val EXTRA_SENSITIVITY = "sensitivity"
    private const val EXTRA_TEST_MODE   = "testMode"

    private const val NOTIF_ID = 41
    // 👇 NEW CHANNEL ID so Android recreates it
    private const val CHANNEL_ID = "fall_monitor_channel_v2"

    fun start(
        ctx: Context,
        sensitivity: Int,
        testMode: Boolean
    ) {
        val i = Intent(ctx, FallMonitorService::class.java).apply {
            action = ACTION_START
            putExtra(EXTRA_SENSITIVITY, sensitivity)
            putExtra(EXTRA_TEST_MODE, testMode)
        }
        androidx.core.content.ContextCompat.startForegroundService(ctx, i)
    }

    fun stop(ctx: Context) {
        val i = Intent(ctx, FallMonitorService::class.java).apply {
            action = ACTION_STOP
        }
        ctx.startService(i)
    }
}

    override fun onCreate() {
        super.onCreate()
        ensureChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        Log.i(TAG, "onStartCommand action=$action")

        when (action) {
            ACTION_START -> {
                val s = intent.getIntExtra(EXTRA_SENSITIVITY, 5)
                val test = intent.getBooleanExtra(EXTRA_TEST_MODE, false)

                Log.i(TAG, "Starting FallEngine in foreground, s=$s testMode=$test")

                // Make sure channel exists before startForeground
                ensureChannel()

                // 🔴 Foreground notification for monitoring
                startForeground(NOTIF_ID, buildNotification())

                // 🔴 Start the native engine
                FallEngine.start(
                    context = applicationContext,
                    sensitivity = s,
                    testMode = test
                ) { impactG, onFall ->
                    Log.i(TAG, "FallEngine.start callback impactG=$impactG testMode=$test")

                    FallDetectorCore(
                        onFall = onFall,
                        thresholds = FallThresholds(impactG = impactG),
                        debug = test
                    )
                }

                return START_STICKY
            }

            ACTION_STOP -> {
                Log.i(TAG, "Stopping FallEngine + foreground monitor")
                FallEngine.stop()
                stopForeground(true)
                stopSelf()
                return START_NOT_STICKY
            }

            else -> {
                Log.w(TAG, "Unknown/null action, ignoring")
                return START_STICKY
            }
        }
    }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val mgr = getSystemService(NotificationManager::class.java)

        if (mgr.getNotificationChannel(CHANNEL_ID) == null) {
            val ch = NotificationChannel(
                CHANNEL_ID,
                "Fall monitoring",
                // 👈 make it clearly visible
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Background fall detection is active"
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            mgr.createNotificationChannel(ch)
            Log.i(TAG, "Notification channel $CHANNEL_ID created (IMPORTANCE_DEFAULT)")
        } else {
            Log.i(TAG, "Notification channel $CHANNEL_ID already exists")
        }
    }
}


 private fun buildNotification(): Notification {
    return NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("FallNotifier monitoring")
        .setContentText("Monitoring for falls in the background…")
        .setSmallIcon(android.R.drawable.stat_sys_warning) // TODO: app icon
        .setOngoing(true)
        .setCategory(NotificationCompat.CATEGORY_SERVICE)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .build()
}


    override fun onBind(intent: Intent?): IBinder? = null
}
