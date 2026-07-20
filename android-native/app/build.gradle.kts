plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

/**
 * The upload keystore is only needed for signed builds. Reading the password
 * from the environment (as ../android already does) keeps it out of git; when
 * it is absent, debug builds fall back to the default debug keystore so a
 * plain `./gradlew assembleDebug` still works on a fresh checkout.
 */
val keystorePassword: String? = System.getenv("MEYDAN_KEYSTORE_PASSWORD")

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
        versionCode = 1
        versionName = "1.0.0"

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
        }
        release {
            signingConfigs.findByName("upload")?.let { signingConfig = it }
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
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
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)

    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
}
