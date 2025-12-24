package com.strategicnerds.vinho.core.analytics

import android.content.Context
import com.posthog.PostHogInterface
import com.posthog.android.PostHogAndroid
import com.posthog.android.PostHogAndroidConfig
import com.strategicnerds.vinho.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PosthogService @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val client: PostHogInterface? = BuildConfig.POSTHOG_API_KEY.takeIf { it.isNotBlank() }?.let {
        val config = PostHogAndroidConfig(
            apiKey = it,
            host = BuildConfig.POSTHOG_HOST
        ).apply {
            captureApplicationLifecycleEvents = true
            captureDeepLinks = true
            captureScreenViews = true
        }
        PostHogAndroid.with(context, config)
    }

    @Suppress("UNCHECKED_CAST")
    fun capture(event: String, properties: Map<String, Any?> = emptyMap()) {
        client?.capture(event, properties = properties.filterValues { it != null } as Map<String, Any>?)
    }

    @Suppress("UNCHECKED_CAST")
    fun identify(userId: String, properties: Map<String, Any?> = emptyMap()) {
        client?.identify(userId, properties.filterValues { it != null } as Map<String, Any>?)
    }

    fun reset() {
        client?.reset()
    }
}
