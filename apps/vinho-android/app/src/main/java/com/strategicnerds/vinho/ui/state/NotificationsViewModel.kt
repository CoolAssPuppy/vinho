package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.core.preferences.NotificationPreferences
import com.strategicnerds.vinho.core.preferences.NotificationToggle
import com.strategicnerds.vinho.core.preferences.UserPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val preferences: UserPreferences
) : ViewModel() {

    val notifications: StateFlow<NotificationPreferences> = preferences.flow
        .map { it.notifications }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), NotificationPreferences())

    fun setToggle(toggle: NotificationToggle, enabled: Boolean) {
        viewModelScope.launch { preferences.setNotificationToggle(toggle, enabled) }
    }
}
