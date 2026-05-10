package com.hualas.mobile.core.design

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Forest,
    onPrimary = Snow,
    secondary = Trail,
    tertiary = Lake,
    background = Snow,
    onBackground = Ink,
    surface = Snow,
    onSurface = Ink,
    surfaceVariant = ColorTokens.SurfaceVariant,
    onSurfaceVariant = Muted
)

private val DarkColors = darkColorScheme(
    primary = ColorTokens.ForestLight,
    onPrimary = ForestDark,
    secondary = Trail,
    tertiary = Lake,
    background = ForestDark,
    onBackground = Snow,
    surface = ColorTokens.DarkSurface,
    onSurface = Snow,
    surfaceVariant = ColorTokens.DarkSurfaceVariant,
    onSurfaceVariant = ColorTokens.DarkMuted
)

@Composable
fun HualasTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = HualasTypography,
        content = content
    )
}
