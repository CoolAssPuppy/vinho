package com.strategicnerds.vinho.core.deeplink

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AppDeepLinkTest {
    @Test
    fun `routes authentication callbacks to Supabase`() {
        assertEquals(
            AppDeepLink.AuthenticationCallback,
            AppDeepLink.parse("vinho://auth-callback?code=oauth-code")
        )
    }

    @Test
    fun `extracts invite codes from Vinho web links`() {
        assertEquals(
            AppDeepLink.Invite("ABC123"),
            AppDeepLink.parse("https://www.vinho.dev/invite/ABC123")
        )
        assertEquals(
            AppDeepLink.Invite("XYZ789"),
            AppDeepLink.parse("https://vinho.dev/invite/XYZ789")
        )
    }

    @Test
    fun `rejects links outside Vinho`() {
        assertNull(AppDeepLink.parse("https://example.com/invite/ABC123"))
    }
}
