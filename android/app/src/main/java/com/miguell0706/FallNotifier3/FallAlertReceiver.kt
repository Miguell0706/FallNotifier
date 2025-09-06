
package com.miguell0706.FallNotifier3

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class FallAlertReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action
    val svc = Intent(context, FallAlertService::class.java).apply { setAction(action) }
    if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(svc) else context.startService(svc)
  }
}
