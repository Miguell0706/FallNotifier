package com.miguell0706.FallNotifier3

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

object Prefs {

    private const val PREF_NAME = "fallnotifier_prefs"
    private const val KEY_CONTACTS = "contacts_native"
    private const val KEY_MESSAGE  = "message_native"

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    // ---------------------------
    // CONTACTS
    // ---------------------------

    fun saveContacts(ctx: Context, contacts: List<String>) {
        val arr = JSONArray()
        contacts.forEach { arr.put(it) }

        prefs(ctx).edit()
            .putString(KEY_CONTACTS, arr.toString())
            .apply()
    }

    fun loadContacts(ctx: Context): List<String> {
        val raw = prefs(ctx).getString(KEY_CONTACTS, null) ?: return emptyList()

        return try {
            val arr = JSONArray(raw)
            List(arr.length()) { i -> arr.getString(i) }
        } catch (e: Exception) {
            emptyList()
        }
    }

    // ---------------------------
    // MESSAGE TEMPLATE
    // ---------------------------

    fun saveMessage(ctx: Context, message: String) {
        prefs(ctx).edit()
            .putString(KEY_MESSAGE, message)
            .apply()
    }

    fun loadMessage(ctx: Context): String {
        return prefs(ctx).getString(KEY_MESSAGE, "I may have fallen. My location: {link}")!!
    }
}
