package com.strategicnerds.vinho.core.deeplink

import java.net.URI

sealed interface AppDeepLink {
    data object AuthenticationCallback : AppDeepLink
    data class Invite(val code: String) : AppDeepLink

    companion object {
        fun parse(value: String): AppDeepLink? {
            val uri = runCatching { URI(value) }.getOrNull() ?: return null
            if (uri.scheme == "vinho" && uri.host == "auth-callback") {
                return AuthenticationCallback
            }

            val isVinhoWebLink = uri.scheme == "https" &&
                (uri.host == "vinho.dev" || uri.host == "www.vinho.dev")
            if (!isVinhoWebLink) return null

            val path = uri.path.trim('/').split('/').filter(String::isNotBlank)
            return if (path.size == 2 && path.first() == "invite") {
                Invite(path.last())
            } else {
                null
            }
        }
    }
}
