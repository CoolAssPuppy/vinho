package com.vinho.android.core.di

import android.content.Context
import com.vinho.android.core.analytics.AnalyticsService
import com.vinho.android.core.analytics.PosthogService
import com.vinho.android.core.network.SupabaseClientProvider
import com.vinho.android.core.preferences.UserPreferences
import com.vinho.android.core.security.BiometricLockController
import com.vinho.android.data.repository.AuthRepository
import com.vinho.android.data.repository.ProfileRepository
import com.vinho.android.data.repository.ScanRepository
import com.vinho.android.data.repository.TastingRepository
import com.vinho.android.data.repository.WineRepository
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
}
