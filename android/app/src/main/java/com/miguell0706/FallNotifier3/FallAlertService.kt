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
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import android.location.Location
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory


data class BackendLocation(
    val lat: Double? = null,
    val lng: Double? = null,
    val link: String? = null
)

data class BackendPayload(
    val numbers: List<String>,
    val message: String,
    val location: BackendLocation? = null
)

// Dev: emulator -> backend on your PC
private const val BACKEND_URL = "http://192.168.0.228:4000/send-alert"
// Later in prod: "https://your-domain.com/send-alert"

private val httpClient by lazy { OkHttpClient() }

private val moshi by lazy {
    Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()
}

private val backendAdapter by lazy {
    moshi.adapter(BackendPayload::class.java)
}

private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

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

    const val EXTRA_LAT      = "lat"
    const val EXTRA_LON      = "lon"
    const val EXTRA_MAPS_URL = "mapsUrl"

    @Volatile
    var isRunning: Boolean = false

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

  private lateinit var fusedClient: com.google.android.gms.location.FusedLocationProviderClient

  override fun onCreate() {
    super.onCreate()
    fusedClient = LocationServices.getFusedLocationProviderClient(this)
    Log.d(TAG, "FallAlertService created, fused location ready")
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Notif.ensureChannel(this)

    val action = intent?.action
    Log.i(TAG, "onStartCommand action=$action startId=$startId")
    val secs = intent?.getIntExtra(EXTRA_SECONDS, 10) ?: 10

    val fsIntent = Intent(this, CountdownActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      .putExtra(EXTRA_SECONDS, secs)

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

        stopSelfCleanly()
        return START_NOT_STICKY
      }

      ACTION_START -> {
        Log.i(TAG, "ACTION_START received → seconds=$secs running=$running")

        val notif = buildNotification(remaining = secs, fsPending = fsPending)
        startForeground(NOTIF_ID, notif)

        if (!running) {
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
    isRunning = true
    handler.post(ticker)
  }

  // ---- NEW: GPS + dispatch to JS ----
  // ---- NEW: GPS + dispatch to backend ----
  private fun sendNow() {
      Log.i(TAG, "sendNow() — requesting current GPS location...")

      try {
          fusedClient
              .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
              .addOnSuccessListener { loc: Location? ->
                  val lat = loc?.latitude ?: 0.0
                  val lon = loc?.longitude ?: 0.0
                  val mapsUrl = "https://maps.google.com/?q=$lat,$lon"

                  Log.i(TAG, "Using location lat=$lat lon=$lon url=$mapsUrl")

                  // 1) Load contacts + message template from Prefs (native storage)
                  val contacts = Prefs.loadContacts(this)   // should be List<String> of phone numbers
                  val template = Prefs.loadMessage(this)

                  val finalMessage = template.replace("{link}", mapsUrl)

                  Log.i(TAG, "Will send to ${contacts.size} contacts, msg=\"$finalMessage\"")

                  // 2) Fire HTTP request to your backend / Twilio server (OkHttp)
                  sendAlertToBackend(
                      numbers = contacts,
                      message = finalMessage,
                      lat = lat,
                      lng = lon,
                      mapsUrl = mapsUrl
                  )
              }
              .addOnFailureListener { e ->
                  Log.e(TAG, "getCurrentLocation failed", e)
                  // If you want, you can still send without GPS:
                  // val contacts = Prefs.loadContacts(this)
                  // val template = Prefs.loadMessage(this)
                  // sendAlertToBackend(contacts, template, null, null, null)
              }
      } catch (se: SecurityException) {
          Log.e(TAG, "No location permission in service", se)
          // Optional: still send without GPS
      }
  }


  private fun sendAlertToBackend(
      numbers: List<String>,
      message: String,
      lat: Double?,
      lng: Double?,
      mapsUrl: String?
    ) {
      Thread {
          try {
              val location = when {
                  mapsUrl != null -> BackendLocation(link = mapsUrl)
                  lat != null && lng != null -> BackendLocation(lat = lat, lng = lng)
                  else -> null
              }

              val payload = BackendPayload(
                  numbers = numbers,
                  message = message,
                  location = location
              )

              val json = backendAdapter.toJson(payload)
              Log.i(TAG, "sendAlertToBackend() payload=$json")

              val body = json.toRequestBody(JSON_MEDIA_TYPE)

              val request = Request.Builder()
                  .url(BACKEND_URL)
                  .post(body)
                  .build()

              httpClient.newCall(request).execute().use { response ->
                  if (!response.isSuccessful) {
                      Log.e(
                          TAG,
                          "sendAlertToBackend error: HTTP ${response.code} ${response.message}"
                      )
                  } else {
                      Log.i(TAG, "sendAlertToBackend success: ${response.code}")
                  }
              }
          } catch (t: Throwable) {
              Log.e(TAG, "sendAlertToBackend exception", t)
          }
      }.start()
  }



  private fun stopSelfCleanly() {
    Log.i(TAG, "stopSelfCleanly() called, stopping service + foreground")

    // Let the UI know countdown is finished
    sendBroadcast(
      Intent(ACTION_TICK)
        .setPackage(packageName)
        .putExtra(EXTRA_SECONDS, 0)
        .putExtra("done", true)
    )

    running = false
    isRunning = false

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

      val done = seconds <= 0

      // Broadcast to CountdownActivity
      val tickIntent = Intent(ACTION_TICK).apply {
        setPackage(packageName)
        putExtra(EXTRA_SECONDS, seconds)
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

  override fun onDestroy() {
    super.onDestroy()
    isRunning = false
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
