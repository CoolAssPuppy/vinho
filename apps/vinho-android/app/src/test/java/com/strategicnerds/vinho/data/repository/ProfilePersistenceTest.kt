package com.strategicnerds.vinho.data.repository

import com.strategicnerds.vinho.data.model.PriceRange
import com.strategicnerds.vinho.data.model.UserProfile
import com.strategicnerds.vinho.data.model.WinePreferences
import org.junit.Assert.assertEquals
import org.junit.Test

class ProfilePersistenceTest {
    @Test
    fun `profile persistence includes every preference field shared with iOS`() {
        val profile = UserProfile(
            id = "user-1",
            winePreferences = WinePreferences(wineTypes = listOf("Red", "Sparkling")),
            favoriteRegions = listOf("Douro"),
            favoriteVarietals = listOf("Touriga Nacional"),
            favoriteStyles = listOf("Full-bodied"),
            priceRange = PriceRange(low = 15, high = 80),
            tastingNoteStyle = "sommelier"
        )

        val persisted = ProfileInsert.fromProfile(profile)

        assertEquals(profile.winePreferences, persisted.winePreferences)
        assertEquals(profile.favoriteRegions, persisted.favoriteRegions)
        assertEquals(profile.favoriteVarietals, persisted.favoriteVarietals)
        assertEquals(profile.favoriteStyles, persisted.favoriteStyles)
        assertEquals(profile.priceRange, persisted.priceRange)
        assertEquals(profile.tastingNoteStyle, persisted.tastingNoteStyle)
    }
}
