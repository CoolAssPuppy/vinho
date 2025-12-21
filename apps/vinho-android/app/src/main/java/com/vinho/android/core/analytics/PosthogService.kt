package com.vinho.android.core.analytics

import android.content.Context
import com.posthog.android.PostHog
import com.vinho.android.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PosthogService @Inject constructor(
    @ApplicationContext context: Context,
) {
    private val client: PostHog? = BuildConfig.POSTHOG_API_KEY.takeIf { it.isNotBlank() }?.let {
        PostHog.Builder(
            context,
            it,
            BuildConfig.POSTHOG_HOST
        ).captureApplicationLifecycleEvents()
            .recordScreenViews()
            .build()
    }

    fun capture(event: String, properties: Map<String, Any?> = emptyMap()) {
        client?.capture(event, properties)
    }

    fun identify(userId: String, properties: Map<String, Any?> = emptyMap()) {
        client?.identify(userId, properties)
    }

    fun reset() {
        client?.reset()
    }
}
