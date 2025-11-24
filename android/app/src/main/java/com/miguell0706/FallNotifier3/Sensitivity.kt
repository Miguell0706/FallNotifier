package com.miguell0706.FallNotifier3

object Sensitivity {
    /**
     * Map a UI sensitivity (1..10) to an impact threshold in "g".
     * 1 = least sensitive (bigger impact needed)
     * 10 = most sensitive (smaller impact triggers)
     */
    fun toImpactG(s: Int): Float {
        val clamped = s.coerceIn(1, 10)
        val max = 9.0f   // g at sensitivity 1
        val min = 2.5f   // g at sensitivity 10
        val t = (clamped - 1f) / 9f
        return max - t * (max - min)
    }

    /**
     * Same threshold expressed in m/s^2 for raw Android accelerometer values.
     */
    fun toImpactMs2(s: Int): Float = toImpactG(s) * 9.80665f
}
