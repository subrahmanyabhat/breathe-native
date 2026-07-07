package com.breathex.app

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream

class AppBlockerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AppBlockerModule"

    companion object {
        const val PREFS_NAME = "AppBlockerPrefs"
        const val KEY_BLOCKED_PACKAGES = "blocked_packages"
        const val KEY_UNBLOCK_PREFIX = "unblock_until_"
    }

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
                PackageManager.MATCH_ALL else 0
            @Suppress("DEPRECATION")
            val resolveInfos = pm.queryIntentActivities(intent, flags)
            val ownPkg = reactContext.packageName
            val result = Arguments.createArray()
            for (ri in resolveInfos) {
                val pkg = ri.activityInfo.packageName
                if (pkg == ownPkg) continue
                try {
                    val label = ri.loadLabel(pm).toString()
                    val icon = ri.loadIcon(pm)
                    val map = Arguments.createMap().apply {
                        putString("packageName", pkg)
                        putString("appName", label)
                        putString("icon", drawableToBase64(icon))
                    }
                    result.pushMap(map)
                } catch (_: Exception) {}
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    private fun drawableToBase64(drawable: Drawable): String {
        val bmp = Bitmap.createBitmap(48, 48, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        drawable.setBounds(0, 0, 48, 48)
        drawable.draw(canvas)
        val out = ByteArrayOutputStream()
        bmp.compress(Bitmap.CompressFormat.PNG, 85, out)
        return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
    }

    @ReactMethod
    fun setBlockedApps(packages: ReadableArray, promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val joined = (0 until packages.size())
            .mapNotNull { packages.getString(it) }
            .filter { it.isNotEmpty() }
            .joinToString(",")
        prefs.edit().putString(KEY_BLOCKED_PACKAGES, joined).apply()
        try {
            val intent = Intent(reactContext, AppBlockingService::class.java)
                .apply { action = "UPDATE_BLOCKED_APPS" }
            reactContext.startService(intent)
        } catch (_: Exception) {}
        promise.resolve(true)
    }

    @ReactMethod
    fun getBlockedApps(promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_BLOCKED_PACKAGES, "") ?: ""
        val result = Arguments.createArray()
        raw.split(",").filter { it.isNotEmpty() }.forEach { result.pushString(it) }
        promise.resolve(result)
    }

    @ReactMethod
    fun hasUsageStatsPermission(promise: Promise) {
        val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactContext.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                reactContext.packageName
            )
        }
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(reactContext))
    }

    @ReactMethod
    fun openUsageStatsSettings(promise: Promise) {
        try {
            reactContext.startActivity(
                Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
                    .apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            reactContext.startActivity(
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startBlockingService(promise: Promise) {
        try {
            val intent = Intent(reactContext, AppBlockingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopBlockingService(promise: Promise) {
        try {
            reactContext.stopService(Intent(reactContext, AppBlockingService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isBlockingActive(promise: Promise) {
        promise.resolve(AppBlockingService.isRunning)
    }

    @ReactMethod
    fun temporarilyUnblock(packages: ReadableArray, durationMs: Double, promise: Promise) {
        val prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val until = System.currentTimeMillis() + durationMs.toLong()
        val editor = prefs.edit()
        for (i in 0 until packages.size()) {
            val pkg = packages.getString(i) ?: continue
            editor.putLong("${KEY_UNBLOCK_PREFIX}${pkg}", until)
        }
        editor.apply()
        try {
            val intent = Intent(reactContext, AppBlockingService::class.java)
                .apply { action = "REFRESH_WHITELIST" }
            reactContext.startService(intent)
        } catch (_: Exception) {}
        promise.resolve(true)
    }
}
