package com.strategicnerds.vinho.core.di

import android.content.Context
import com.strategicnerds.vinho.core.analytics.AnalyticsService
import com.strategicnerds.vinho.core.analytics.PosthogService
import com.strategicnerds.vinho.core.network.SupabaseClientProvider
import com.strategicnerds.vinho.core.preferences.UserPreferences
import com.strategicnerds.vinho.core.security.BiometricLockController
import com.strategicnerds.vinho.data.repository.AuthRepository
import com.strategicnerds.vinho.data.repository.ProfileRepository
import com.strategicnerds.vinho.data.repository.ScanRepository
import com.strategicnerds.vinho.data.repository.TastingRepository
import com.strategicnerds.vinho.data.repository.WineRepository
import com.strategicnerds.vinho.core.recommendations.VisualSimilarityService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(provider: SupabaseClientProvider): SupabaseClient = provider.client

    @Provides
    @Singleton
    fun providePosthog(@ApplicationContext context: Context): PosthogService = PosthogService(context)

    @Provides
    @Singleton
    fun provideAnalytics(posthogService: PosthogService): AnalyticsService = AnalyticsService(posthogService)

    @Provides
    @Singleton
    fun providePreferences(@ApplicationContext context: Context): UserPreferences = UserPreferences(context)

    @Provides
    @Singleton
    fun provideBiometricLock(): BiometricLockController = BiometricLockController()

    @Provides
    @Singleton
    fun provideAuthRepository(client: SupabaseClient): AuthRepository = AuthRepository(client)

    @Provides
    @Singleton
    fun provideProfileRepository(client: SupabaseClient): ProfileRepository = ProfileRepository(client)

    @Provides
    @Singleton
    fun provideWineRepository(client: SupabaseClient): WineRepository = WineRepository(client)

    @Provides
    @Singleton
    fun provideTastingRepository(client: SupabaseClient): TastingRepository = TastingRepository(client)

    @Provides
    @Singleton
    fun provideScanRepository(client: SupabaseClient): ScanRepository = ScanRepository(client)

    @Provides
    @Singleton
    fun provideVisualSimilarityService(client: SupabaseClient): VisualSimilarityService =
        VisualSimilarityService(client)
}
