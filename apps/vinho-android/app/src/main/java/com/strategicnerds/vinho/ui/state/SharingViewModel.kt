package com.strategicnerds.vinho.ui.state

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.strategicnerds.vinho.data.model.SharingConnection
import com.strategicnerds.vinho.data.model.UserSharingPreferences
import com.strategicnerds.vinho.data.repository.SharingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SharingUiState(
    val loading: Boolean = true,
    val connections: List<SharingConnection> = emptyList(),
    val preferences: UserSharingPreferences? = null,
    val currentUserId: String? = null,
    val sending: Boolean = false,
    val message: String? = null,
    val error: String? = null,
) {
    val pendingReceived: List<SharingConnection>
        get() = connections.filter { it.isPending && it.viewerId == currentUserId }

    // "Sent" = current user is the sharer; "received" = current user is the viewer.
    val activeSharesSent: List<SharingConnection>
        get() = connections.filter { it.isAccepted && it.sharerId == currentUserId }

    val activeSharesReceived: List<SharingConnection>
        get() = connections.filter { it.isAccepted && it.viewerId == currentUserId }

    fun isSharerVisible(sharerId: String): Boolean =
        preferences?.visibleSharers?.contains(sharerId) ?: false
}

@HiltViewModel
class SharingViewModel @Inject constructor(
    private val repository: SharingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SharingUiState())
    val uiState: StateFlow<SharingUiState> = _uiState.asStateFlow()

    fun load(userId: String) {
        _uiState.value = _uiState.value.copy(loading = true, currentUserId = userId)
        viewModelScope.launch {
            val connections = repository.fetchConnections()
            val prefs = repository.fetchPreferences(userId)
            _uiState.value = _uiState.value.copy(
                loading = false,
                connections = connections,
                preferences = prefs,
                currentUserId = userId,
            )
        }
    }

    fun sendInvitation(email: String) {
        if (email.isBlank()) return
        _uiState.value = _uiState.value.copy(sending = true, message = null, error = null)
        viewModelScope.launch {
            val result = repository.sendInvitation(email.trim())
            _uiState.value = _uiState.value.copy(
                sending = false,
                message = if (result.success) (result.message ?: "Invitation sent") else null,
                error = if (result.success) null else (result.error ?: "Failed to send invitation"),
            )
            if (result.success) refresh()
        }
    }

    fun accept(connectionId: String) = act { repository.acceptInvitation(connectionId) }
    fun reject(connectionId: String) = act { repository.rejectInvitation(connectionId) }
    fun revoke(connectionId: String) = act { repository.revokeSharing(connectionId) }

    fun toggleVisibility(sharerId: String, visible: Boolean) {
        val prefs = _uiState.value.preferences ?: return
        viewModelScope.launch {
            val updated = repository.toggleSharerVisibility(prefs, sharerId, visible)
            if (updated != null) {
                _uiState.value = _uiState.value.copy(preferences = updated)
            }
        }
    }

    private fun act(block: suspend () -> Boolean) {
        viewModelScope.launch {
            if (block()) refresh()
        }
    }

    private fun refresh() {
        val userId = _uiState.value.currentUserId ?: return
        viewModelScope.launch {
            val connections = repository.fetchConnections()
            val prefs = repository.fetchPreferences(userId)
            _uiState.value = _uiState.value.copy(connections = connections, preferences = prefs)
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(message = null, error = null)
    }
}
