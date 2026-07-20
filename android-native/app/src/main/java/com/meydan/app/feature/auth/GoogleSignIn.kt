package com.meydan.app.feature.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.meydan.app.BuildConfig

/**
 * Wraps Credential Manager's Google Sign-In into one suspend call.
 *
 * Credential Manager (not the deprecated GoogleSignInClient) is the current
 * API. The serverClientId is the OAuth *web* client, so the ID token's
 * audience matches what the backend's google-auth service verifies — the same
 * flow the web app uses, no server changes.
 */
class GoogleSignInHelper(private val context: Context) {

    sealed interface Result {
        data class Success(val idToken: String) : Result

        /** The user closed the sheet — not an error, show nothing. */
        data object Cancelled : Result

        /** No Play Services, no Google account, or a transport failure. */
        data class Failed(val message: String?) : Result
    }

    suspend fun signIn(): Result {
        val option = GetGoogleIdOption.Builder()
            .setServerClientId(BuildConfig.GOOGLE_SERVER_CLIENT_ID)
            // Show every Google account on the device, not only previously
            // authorized ones — first-time sign-ups need the full list.
            .setFilterByAuthorizedAccounts(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()

        return try {
            val response = CredentialManager.create(context)
                .getCredential(context, request)
            val credential = response.credential
            if (
                credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                Result.Success(idToken)
            } else {
                Result.Failed("unexpected credential type")
            }
        } catch (e: GetCredentialCancellationException) {
            Result.Cancelled
        } catch (e: GetCredentialException) {
            Result.Failed(e.message)
        }
    }
}
