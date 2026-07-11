package com.strategicnerds.vinho

import com.strategicnerds.vinho.data.model.SharingConnection
import com.strategicnerds.vinho.data.model.SharingProfile
import com.strategicnerds.vinho.data.model.UserSharingPreferences
import com.strategicnerds.vinho.ui.state.SharingUiState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

private const val ME = "user-me"
private const val OTHER = "user-other"

private fun profile(
    id: String = OTHER,
    firstName: String? = "Ada",
    lastName: String? = "Lovelace",
): SharingProfile = SharingProfile(id = id, firstName = firstName, lastName = lastName)

private fun connection(
    id: String = "c1",
    sharerId: String = OTHER,
    viewerId: String = ME,
    status: String = "pending",
    sharerProfile: SharingProfile? = profile(id = sharerId),
    viewerProfile: SharingProfile? = profile(id = viewerId, firstName = "Grace", lastName = "Hopper"),
): SharingConnection = SharingConnection(
    id = id,
    sharerId = sharerId,
    viewerId = viewerId,
    status = status,
    sharerProfile = sharerProfile,
    viewerProfile = viewerProfile,
)

private fun state(
    connections: List<SharingConnection> = emptyList(),
    preferences: UserSharingPreferences? = null,
    currentUserId: String? = ME,
): SharingUiState = SharingUiState(
    loading = false,
    connections = connections,
    preferences = preferences,
    currentUserId = currentUserId,
)

class SharingLogicTest {

    @Test
    fun displayName_joinsFirstAndLast() {
        assertEquals("Ada Lovelace", profile().displayName)
    }

    @Test
    fun displayName_fallsBackWhenBlank() {
        assertEquals("Wine lover", profile(firstName = "", lastName = "  ").displayName)
        assertEquals("Wine lover", profile(firstName = null, lastName = null).displayName)
    }

    @Test
    fun connectionStatus_flagsReflectStatusString() {
        assertTrue(connection(status = "pending").isPending)
        assertFalse(connection(status = "pending").isAccepted)
        assertTrue(connection(status = "accepted").isAccepted)
        assertFalse(connection(status = "accepted").isPending)
    }

    @Test
    fun pendingReceived_onlyIncludesPendingInvitesToCurrentUser() {
        val received = connection(id = "r", viewerId = ME, status = "pending")
        val sentByMe = connection(id = "s", sharerId = ME, viewerId = OTHER, status = "pending")
        val accepted = connection(id = "a", viewerId = ME, status = "accepted")

        val result = state(connections = listOf(received, sentByMe, accepted)).pendingReceived

        assertEquals(listOf("r"), result.map { it.id })
    }

    @Test
    fun activeShares_splitByWhoIsSharerVersusViewer() {
        val iShare = connection(id = "sent", sharerId = ME, viewerId = OTHER, status = "accepted")
        val iView = connection(id = "recv", sharerId = OTHER, viewerId = ME, status = "accepted")
        val pending = connection(id = "p", sharerId = ME, viewerId = OTHER, status = "pending")

        val s = state(connections = listOf(iShare, iView, pending))

        assertEquals(listOf("sent"), s.activeSharesSent.map { it.id })
        assertEquals(listOf("recv"), s.activeSharesReceived.map { it.id })
    }

    @Test
    fun isSharerVisible_readsVisibleSharersList() {
        val prefs = UserSharingPreferences(userId = ME, visibleSharers = listOf(OTHER))
        val s = state(preferences = prefs)

        assertTrue(s.isSharerVisible(OTHER))
        assertFalse(s.isSharerVisible("someone-else"))
    }

    @Test
    fun isSharerVisible_defaultsFalseWithoutPreferences() {
        assertFalse(state(preferences = null).isSharerVisible(OTHER))
    }
}
