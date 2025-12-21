package com.vinho.android.core.preferences

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
    val biometricsEnabled: Boolean = false
)

@Singleton
class UserPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val onboardingKey = booleanPreferencesKey("has_completed_onboarding")
    private val biometricsKey = booleanPreferencesKey("biometrics_enabled")

    val flow: Flow<VinhoPreferences> = context.dataStore.data.map { prefs ->
        VinhoPreferences(
            hasCompletedOnboarding = prefs[onboardingKey] ?: false,
            biometricsEnabled = prefs[biometricsKey] ?: false
        )
    }

    suspend fun setOnboardingComplete() {
        context.dataStore.edit { prefs -> prefs[onboardingKey] = true }
    }

    suspend fun setBiometricsEnabled(enabled: Boolean) {
        context.dataStore.edit { prefs -> prefs[biometricsKey] = enabled }
    }
}
