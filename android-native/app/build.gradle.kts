plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

/**
 * The upload keystore is only needed for signed builds. Reading the password
 * from the environment (as ../android already does) keeps it out of git; when
 * it is absent, debug builds fall back to the default debug keystore so a
 * plain `./gradlew assembleDebug` still works on a fresh checkout.
 */
val keystorePassword: String? = System.getenv("MEYDAN_KEYSTORE_PASSWORD")

/**
 * Optional backend override for debug builds:
 *
 *   ./gradlew assembleDebug -PapiBase=https://meydan-chi.vercel.app/
 *
 * Debug normally points at the dev machine (see below), which needs
 * `adb reverse` and a running dev server. This lets a debug APK be built
 * against the real backend so it can be sideloaded and used anywhere, without
 * the release keystore. Trailing slash is required by Retrofit.
 */
val apiBaseOverride: String? = (findProperty("apiBase") as String?)
    ?.trim()
    ?.let { if (it.endsWith("/")) it else "$it/" }

android {
    namespace = "com.meydan.app"
    compileSdk = 36

    defaultConfig {
        // Same application id as the Capacitor shell. Google Sign-In is already
        // registered against this id plus the upload keystore's fingerprint, so
        // reusing both means no Google Cloud Console changes. The trade-off is
        // that the two APKs cannot be installed side by side.
        applicationId = "com.meydan.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 4
        versionName = "1.1.1"

        // The OAuth *web* client ID (public by design, safe to embed). Used as
        // Credential Manager's serverClientId so the minted ID token's audience
        // is the web client — exactly what the server's google-auth service
        // already verifies for the web app.
        buildConfigField(
            "String",
            "GOOGLE_SERVER_CLIENT_ID",
            "\"103988773087-ifdijskkcmm3fpioirhbhb981pkfhsio.apps.googleusercontent.com\"",
        )

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (keystorePassword != null) {
            create("upload") {
                storeFile = file("../../keys/android.keystore")
                storePassword = keystorePassword
                keyAlias = "meydan"
                keyPassword = keystorePassword
            }
        }
    }

    buildTypes {
        debug {
            // Sign debug builds with the upload key when it is available, so the
            // certificate fingerprint matches the one Google Cloud Console
            // already trusts and Google Sign-In works during development.
            signingConfigs.findByName("upload")?.let { signingConfig = it }
            // Points at the dev machine via `adb reverse tcp:3000 tcp:3000`, so
            // a phone or emulator reaches the Next.js dev server on localhost —
            // unless -PapiBase overrides it (see above).
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${apiBaseOverride ?: "http://localhost:3000/"}\"",
            )
        }
        release {
            signingConfigs.findByName("upload")?.let { signingConfig = it }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // Production backend. A later VPS move is a one-line change here.
            // -PapiBase overrides it (used to smoke-test a release build against
            // a local backend without shipping that URL).
            buildConfigField(
                "String",
                "API_BASE_URL",
                "\"${apiBaseOverride ?: "https://meydan-chi.vercel.app/"}\"",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.material.icons.extended)
    implementation(libs.androidx.navigation.compose)

    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.retrofit)
    implementation(libs.retrofit.serialization)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)

    implementation(libs.androidx.datastore.preferences)

    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services)
    implementation(libs.googleid)

    implementation(libs.coil.compose)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
}
