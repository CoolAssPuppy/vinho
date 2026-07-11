package com.strategicnerds.vinho

import com.strategicnerds.vinho.core.preferences.NotificationPreferences
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationPreferencesTest {

    @Test
    fun defaults_matchIosAppStorageDefaults() {
        val defaults = NotificationPreferences()

        // On by default (mirrors iOS @AppStorage initial values).
        assertTrue(defaults.push)
        assertTrue(defaults.email)
        assertTrue(defaults.newWineAlerts)
        assertTrue(defaults.events)

        // Off by default.
        assertFalse(defaults.tastingReminders)
        assertFalse(defaults.priceAlerts)
    }
}
