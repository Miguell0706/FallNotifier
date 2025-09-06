package com.miguell0706.FallNotifier3

import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter

class CountdownActivity : AppCompatActivity() {

  private lateinit var titleView: TextView
  private lateinit var countdownView: TextView
private val tickReceiver = object : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == FallAlertService.ACTION_TICK) {
      val s = intent.getIntExtra("seconds", -1)
      if (s >= 0) countdownView.text = "Sending in ${s}s…"
      if (intent.getBooleanExtra("done", false)) finish()
    }
  }
}

override fun onResume() {
  super.onResume()
  registerReceiver(tickReceiver, IntentFilter(FallAlertService.ACTION_TICK))
}

override fun onPause() {
  super.onPause()
  unregisterReceiver(tickReceiver)
}

override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  android.widget.Toast
    .makeText(this, "CountdownActivity launched", android.widget.Toast.LENGTH_SHORT)
    .show()
    setShowWhenLocked(true)
    setTurnScreenOn(true)
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
      WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )

    // ---- Simple programmatic UI (no XML needed) ----
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#CC000000")) // translucent black
      gravity = Gravity.CENTER
      setPadding(48, 64, 48, 64)
    }

    titleView = TextView(this).apply {
      text = "Fall detected"
      setTextColor(Color.WHITE)
      textSize = 24f
      setPadding(0, 0, 0, 16)
      gravity = Gravity.CENTER
    }

    countdownView = TextView(this).apply {
      text = "Sending in 10s…"  // static for now; we’ll wire live updates next
      setTextColor(Color.WHITE)
      textSize = 42f
      setPadding(0, 0, 0, 32)
      gravity = Gravity.CENTER
    }

    val sendBtn = Button(this).apply {
      text = "Send now"
      setOnClickListener {
        // We’ll hook this to the service next step; for now, just close the screen:
        finish()
        // (Optional) broadcast an action; harmless if receiver not added yet:
        sendBroadcast(android.content.Intent("com.fallnotifier.ACTION_SEND_NOW"))
      }
    }

    val cancelBtn = Button(this).apply {
      text = "Cancel"
      setOnClickListener {
        finish()
        sendBroadcast(android.content.Intent("com.fallnotifier.ACTION_CANCEL"))
      }
    }

    val buttons = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
      lp.setMargins(16, 0, 16, 0)
      addView(sendBtn, lp)
      addView(cancelBtn, lp)
    }

    root.addView(titleView)
    root.addView(countdownView)
    root.addView(buttons)
    setContentView(root)
  }
}
