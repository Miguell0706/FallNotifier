package com.miguell0706.FallNotifier3

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class PrefsModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName() = "PrefsModule"

    @ReactMethod
    fun saveContacts(arr: ReadableArray) {
        val list = mutableListOf<String>()
        for (i in 0 until arr.size()) {
            list.add(arr.getString(i) ?: "")
        }
        Prefs.saveContacts(ctx, list)
    }

    @ReactMethod
    fun saveMessage(text: String) {
        Prefs.saveMessage(ctx, text)
    }
}
