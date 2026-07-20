package com.meydan.app

import android.app.Application

/**
 * Application entry point.
 *
 * Currently bare; it exists so dependency-injection setup and the FCM
 * registration hook have a home when they land, without needing a manifest
 * change at that point.
 */
class MeydanApplication : Application()
