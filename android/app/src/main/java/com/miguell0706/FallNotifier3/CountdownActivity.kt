package com.miguell0706.FallNotifier3

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
    private var tickRegistered = false

    // ---- Receives ticks from FallAlertService ----
    private val tickReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != FallAlertService.ACTION_TICK) return

            val s = intent.getIntExtra(FallAlertService.EXTRA_SECONDS, -1)
            val done = intent.getBooleanExtra("done", false)

            Log.d("CountdownActivity", "onReceive ACTION_TICK seconds=$s done=$done")

            if (s >= 0) {
                countdownView.text = "Sending in ${s}s…"
            }

            if (done) {
                countdownView.text = "Sending now…"
                finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("CountdownActivity", "onCreate")

        if (!FallAlertService.isRunning) {
          Log.d("CountdownActivity", "FallAlertService not running → finishing immediately")
          finish()
          return
    }
        // Show over lockscreen, wake screen
        setShowWhenLocked(true)
        setTurnScreenOn(true)
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        // ---- Simple UI ----
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#CC000000"))
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
            text = "Preparing…"
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(i)
                } else {
                    startService(i)
                }
                finish()
            }
        }

        val cancelBtn = Button(this).apply {
            text = "Cancel"
            setOnClickListener {
                val i = Intent(this@CountdownActivity, FallAlertService::class.java)
                    .setAction(FallAlertService.ACTION_CANCEL)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(i)
                } else {
                    startService(i)
                }
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

        // Initialize from extras (for the very first frame)
        val initialSeconds =
            intent?.getIntExtra(FallAlertService.EXTRA_SECONDS, -1) ?: -1
        if (initialSeconds >= 0) {
            countdownView.text = "Sending in ${initialSeconds}s…"
        }

        // Start listening for ticks
        registerTickReceiver()
    }

    // When ACTION_START hits an existing singleTop activity
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d("CountdownActivity", "onNewIntent")
        setIntent(intent)

            // Again: if service already died, just close
        if (!FallAlertService.isRunning) {
            Log.d("CountdownActivity", "onNewIntent but service not running → finishing")
            finish()
            return
        }
        val initialSeconds =
            intent?.getIntExtra(FallAlertService.EXTRA_SECONDS, -1) ?: -1
        if (initialSeconds >= 0) {
            countdownView.text = "Sending in ${initialSeconds}s…"
        }
    }

    private fun registerTickReceiver() {
        if (tickRegistered) return
        val filter = IntentFilter(FallAlertService.ACTION_TICK)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(tickReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(tickReceiver, filter)
        }
        tickRegistered = true
    }

    private fun unregisterReceiverSafe() {
        if (!tickRegistered) return
        try {
            unregisterReceiver(tickReceiver)
        } catch (_: Throwable) {
        }
        tickRegistered = false
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiverSafe()
        Log.d("CountdownActivity", "onDestroy → receiver unregistered")
    }
}
