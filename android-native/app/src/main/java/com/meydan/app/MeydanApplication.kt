package com.meydan.app

import android.app.Application
import com.meydan.app.core.di.AppContainer

/**
 * Application entry point. Owns the single [AppContainer], from which
 * everything else is constructed.
 */
class MeydanApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
