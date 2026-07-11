package com.strategicnerds.vinho.core.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore("vinho_prefs")

data class VinhoPreferences(
    val hasCompletedOnboarding: Boolean = false,
    val biometricsEnabled: Boolean = false,
    val notifications: NotificationPreferences = NotificationPreferences()
)

/** Device-local notification toggles, mirroring the iOS @AppStorage notification settings. */
data class NotificationPreferences(
    val push: Boolean = true,
    val email: Boolean = true,
    val tastingReminders: Boolean = false,
    val newWineAlerts: Boolean = true,
    val priceAlerts: Boolean = false,
    val events: Boolean = true
)

enum class NotificationToggle {
    PUSH,
    EMAIL,
    TASTING_REMINDERS,
    NEW_WINE_ALERTS,
    PRICE_ALERTS,
    EVENTS
}

@Singleton
class UserPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val onboardingKey = booleanPreferencesKey("has_completed_onboarding")
    private val biometricsKey = booleanPreferencesKey("biometrics_enabled")
    private val pushKey = booleanPreferencesKey("notif_push")
    private val emailKey = booleanPreferencesKey("notif_email")
    private val tastingRemindersKey = booleanPreferencesKey("notif_tasting_reminders")
    private val newWineAlertsKey = booleanPreferencesKey("notif_new_wine_alerts")
    private val priceAlertsKey = booleanPreferencesKey("notif_price_alerts")
    private val eventsKey = booleanPreferencesKey("notif_events")

    val flow: Flow<VinhoPreferences> = context.dataStore.data.map { prefs ->
        VinhoPreferences(
            hasCompletedOnboarding = prefs[onboardingKey] ?: false,
            biometricsEnabled = prefs[biometricsKey] ?: false,
            notifications = NotificationPreferences(
                push = prefs[pushKey] ?: true,
                email = prefs[emailKey] ?: true,
                tastingReminders = prefs[tastingRemindersKey] ?: false,
                newWineAlerts = prefs[newWineAlertsKey] ?: true,
                priceAlerts = prefs[priceAlertsKey] ?: false,
                events = prefs[eventsKey] ?: true
            )
        )
    }

    suspend fun setOnboardingComplete() {
        context.dataStore.edit { prefs -> prefs[onboardingKey] = true }
    }

    suspend fun setBiometricsEnabled(enabled: Boolean) {
        context.dataStore.edit { prefs -> prefs[biometricsKey] = enabled }
    }

    suspend fun setNotificationToggle(toggle: NotificationToggle, enabled: Boolean) {
        val key = when (toggle) {
            NotificationToggle.PUSH -> pushKey
            NotificationToggle.EMAIL -> emailKey
            NotificationToggle.TASTING_REMINDERS -> tastingRemindersKey
            NotificationToggle.NEW_WINE_ALERTS -> newWineAlertsKey
            NotificationToggle.PRICE_ALERTS -> priceAlertsKey
            NotificationToggle.EVENTS -> eventsKey
        }
        context.dataStore.edit { prefs -> prefs[key] = enabled }
    }
}
