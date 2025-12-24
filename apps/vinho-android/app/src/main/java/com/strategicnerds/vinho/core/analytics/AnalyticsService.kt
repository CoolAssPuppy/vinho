package com.strategicnerds.vinho.core.analytics

import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnalyticsService @Inject constructor(
    private val posthog: PosthogService
) {
    fun track(event: String, properties: Map<String, Any?> = emptyMap()) {
        posthog.capture(event, properties)
    }

    fun identify(userId: String, properties: Map<String, Any?> = emptyMap()) {
        posthog.identify(userId, properties)
    }

    fun reset() {
        posthog.reset()
    }
}
