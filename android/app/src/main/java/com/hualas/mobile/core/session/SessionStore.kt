package com.hualas.mobile.core.session

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.time.Instant

class SessionStore(
    private val dataStore: DataStore<Preferences>,
    private val now: () -> Instant = { Instant.now() }
) {
    val session: Flow<MobileSession?> = dataStore.data.map { preferences ->
        val token = preferences[Keys.token]
        val userId = preferences[Keys.userId]
        val activeRole = preferences[Keys.activeRole]?.toMobileRoleOrNull()
        val allowedRoles = preferences[Keys.allowedRoles]
            ?.mapNotNull { it.toMobileRoleOrNull() }
            ?.toSet()
            .orEmpty()

        val expiresAt = preferences[Keys.expiresAt]

        if (
            token.isNullOrBlank() ||
            userId.isNullOrBlank() ||
            activeRole == null ||
            expiresAt.isExpired()
        ) {
            null
        } else {
            MobileSession(
                token = token,
                userId = userId,
                activeRole = activeRole,
                allowedRoles = allowedRoles,
                expiresAt = expiresAt
            )
        }
    }

    suspend fun save(session: MobileSession) {
        dataStore.edit { preferences ->
            preferences[Keys.token] = session.token
            preferences[Keys.userId] = session.userId
            preferences[Keys.activeRole] = session.activeRole.name
            preferences[Keys.allowedRoles] = session.allowedRoles.map { it.name }.toSet()
            session.expiresAt?.let { preferences[Keys.expiresAt] = it }
                ?: preferences.remove(Keys.expiresAt)
        }
    }

    suspend fun clear() {
        dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    suspend fun currentSession(): MobileSession? {
        return session.first()
    }

    private fun String.toMobileRoleOrNull(): MobileRole? {
        return runCatching { MobileRole.valueOf(this) }.getOrNull()
    }

    private fun String?.isExpired(): Boolean {
        if (this == null) {
            return false
        }

        return runCatching { !Instant.parse(this).isAfter(now()) }.getOrDefault(true)
    }

    private object Keys {
        val token = stringPreferencesKey("mobile_token")
        val userId = stringPreferencesKey("user_id")
        val activeRole = stringPreferencesKey("active_mobile_role")
        val allowedRoles = stringSetPreferencesKey("allowed_mobile_roles")
        val expiresAt = stringPreferencesKey("expires_at")
    }
}
