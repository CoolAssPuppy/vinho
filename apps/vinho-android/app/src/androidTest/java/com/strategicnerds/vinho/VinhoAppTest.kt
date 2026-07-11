package com.strategicnerds.vinho

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import com.strategicnerds.vinho.ui.screens.SplashScreen
import org.junit.Rule
import org.junit.Test

class VinhoAppTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun splashScreen_showsLoadingCopy() {
        composeRule.setContent {
            VinhoTheme {
                SplashScreen()
            }
        }

        composeRule.onNodeWithText("Loading your cellar...").assertIsDisplayed()
    }
}
