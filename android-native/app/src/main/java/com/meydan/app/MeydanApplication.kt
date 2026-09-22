package com.meydan.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import com.meydan.app.core.di.AppContainer

/**
 * Application entry point. Owns the single [AppContainer], from which
 * everything else is constructed.
 *
 * It is also Coil's [ImageLoaderFactory]: Coil otherwise builds its own
 * OkHttpClient with stock 10 s timeouts, which quietly undid the longer
 * timeouts the API client sets for this market — photos gave up while requests
 * on the same connection went through.
 */
class MeydanApplication : Application(), ImageLoaderFactory {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }

    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .okHttpClient { container.imageClient }
            .diskCache {
                // Coil's default is 2% of free space, which on a nearly full
                // phone can be a couple of MB — not enough to hold a browse
                // through the pitch catalogue, so photos get evicted and
                // re-downloaded on the next scroll.
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(64L * 1024 * 1024)
                    .build()
            }
            // A photo arriving over a slow link should fade in rather than snap,
            // and a card should never sit as a hole in the layout.
            .crossfade(true)
            .respectCacheHeaders(true)
            .build()
}
