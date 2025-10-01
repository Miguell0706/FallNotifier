import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity


class CountdownActivity : ComponentActivity() {

  private lateinit var countdownView: TextView

  // ---- Receives ticks from your foreground service ----
  private val tickReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      if (intent.action == FallAlertService.ACTION_TICK) {
        val s = intent.getIntExtra("seconds", -1)
        if (s >= 0) countdownView.text = "Sending in ${s}s…"
        if (intent.getBooleanExtra("done", false)) finish()
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    Log.d("CountdownActivity", "onCreate")


    // Make sure we really show on the lock screen and turn the screen on
    setShowWhenLocked(true)
    setTurnScreenOn(true)
    @Suppress("DEPRECATION")
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )

    // ---- Simple programmatic UI ----
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#CC000000")) // translucent black
      gravity = Gravity.CENTER
      setPadding(48, 64, 48, 64)
    }

    val titleView = TextView(this).apply {
      text = "Fall detected"
      setTextColor(Color.WHITE)
      textSize = 24f
      setPadding(0, 0, 0, 16)
      gravity = Gravity.CENTER
    }

    countdownView = TextView(this).apply {
      text = "Preparing…"    // will be updated by ticks
      setTextColor(Color.WHITE)
      textSize = 42f
      setPadding(0, 0, 0, 32)
      gravity = Gravity.CENTER
    }

    val sendBtn = Button(this).apply {
      text = "Send now"
      setOnClickListener {
        val i = Intent(this@CountdownActivity, FallAlertService::class.java)
          .setAction(FallAlertService.ACTION_SEND_NOW)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(i) else startService(i)
        finish()
      }
    }

    val cancelBtn = Button(this).apply {
      text = "Cancel"
      setOnClickListener {
        val i = Intent(this@CountdownActivity, FallAlertService::class.java)
          .setAction(FallAlertService.ACTION_CANCEL)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(i) else startService(i)
        finish()
      }
    }

    val buttons = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply { setMargins(16, 0, 16, 0) }
      addView(sendBtn, lp)
      addView(cancelBtn, lp)
    }

    root.addView(titleView)
    root.addView(countdownView)
    root.addView(buttons)
    setContentView(root)

    Toast.makeText(this, "CountdownActivity launched", Toast.LENGTH_SHORT).show()

    // Start/refresh countdown on first launch too
    startOrRefreshCountdown()
  }

  // IMPORTANT: called when you re-trigger with launchMode="singleTop"
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    Log.d("CountdownActivity", "onNewIntent")

    setIntent(intent) // keep latest extras if you use them
    // Reset UI and restart countdown each time you get a new trigger
    startOrRefreshCountdown()
  }

  override fun onResume() {
    super.onResume()
    registerTickReceiver()
  }

  override fun onPause() {
    super.onPause()
    unregisterReceiverSafe()
  }

  // --- Helpers ---

  private fun startOrRefreshCountdown() {
    countdownView.text = "Sending in 10s…"
    val svc = Intent(this, FallAlertService::class.java)
      .setAction(FallAlertService.ACTION_START)
      .putExtra(FallAlertService.EXTRA_SECONDS, 10)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(svc)
    else startService(svc)
  }

  private var tickRegistered = false

  private fun registerTickReceiver() {
    if (tickRegistered) return
    val filter = IntentFilter(FallAlertService.ACTION_TICK)
    if (Build.VERSION.SDK_INT >= 33) {
      registerReceiver(tickReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("DEPRECATION") registerReceiver(tickReceiver, filter)
    }
    tickRegistered = true
  }

  private fun unregisterReceiverSafe() {
    if (!tickRegistered) return
    try { unregisterReceiver(tickReceiver) } catch (_: Throwable) {}
    tickRegistered = false
  }
}
