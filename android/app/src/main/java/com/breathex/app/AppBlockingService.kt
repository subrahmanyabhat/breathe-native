package com.breathex.app

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.provider.Settings
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat

class AppBlockingService : Service() {

    companion object {
        @Volatile var isRunning = false
        private const val CHANNEL_ID = "app_blocker"
        private const val NOTIF_ID = 8001
    }

    private val handler = Handler(Looper.getMainLooper())
    private var wm: WindowManager? = null
    private var overlay: View? = null
    private var shownForPkg: String? = null

    private val poller = object : Runnable {
        override fun run() {
            checkFg()
            handler.postDelayed(this, 2000)
        }
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
        createChannel()
        startForeground(NOTIF_ID, buildNotif())
        handler.post(poller)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        handler.removeCallbacks(poller)
        hideOverlay()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Core logic ────────────────────────────────────────────────────────────

    private fun checkFg() {
        val blocked = blockedPkgs()
        if (blocked.isEmpty()) { hideOverlay(); return }

        val fg = foregroundPkg() ?: return
        if (fg == packageName) { hideOverlay(); return }

        val shouldBlock = blocked.contains(fg) && !isUnblocked(fg)
        when {
            shouldBlock && shownForPkg != fg -> showOverlay(fg)
            !shouldBlock && shownForPkg != null -> hideOverlay()
        }
    }

    private fun blockedPkgs(): Set<String> {
        val raw = prefs().getString(AppBlockerModule.KEY_BLOCKED_PACKAGES, "") ?: ""
        return if (raw.isEmpty()) emptySet()
        else raw.split(",").filter { it.isNotEmpty() }.toSet()
    }

    private fun isUnblocked(pkg: String): Boolean {
        val until = prefs().getLong("${AppBlockerModule.KEY_UNBLOCK_PREFIX}$pkg", 0L)
        return System.currentTimeMillis() < until
    }

    private fun foregroundPkg(): String? {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE)
            as? android.app.usage.UsageStatsManager ?: return null
        val now = System.currentTimeMillis()
        val stats = usm.queryUsageStats(
            android.app.usage.UsageStatsManager.INTERVAL_DAILY,
            now - 10_000, now
        ) ?: return null
        return stats.filter { it.lastTimeUsed > 0 }
            .maxByOrNull { it.lastTimeUsed }?.packageName
    }

    private fun prefs() = getSharedPreferences(AppBlockerModule.PREFS_NAME, Context.MODE_PRIVATE)

    // ── Overlay ───────────────────────────────────────────────────────────────

    private fun showOverlay(pkg: String) {
        if (!Settings.canDrawOverlays(this)) return
        hideOverlay()
        shownForPkg = pkg
        val appName = try {
            val ai = packageManager.getApplicationInfo(pkg, 0)
            packageManager.getApplicationLabel(ai).toString()
        } catch (_: Exception) { pkg }

        val root = FrameLayout(this)
        root.setBackgroundColor(Color.parseColor("#F0071118"))

        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
        }

        // App icon
        try {
            val d = packageManager.getApplicationIcon(pkg)
            val iv = ImageView(this).apply {
                setImageDrawable(d)
                val sz = dp(72)
                layoutParams = LinearLayout.LayoutParams(sz, sz).apply {
                    gravity = Gravity.CENTER_HORIZONTAL
                    bottomMargin = dp(20)
                }
            }
            col.addView(iv)
        } catch (_: Exception) {}

        col.addView(tv(appName, 22f, Color.WHITE, Typeface.BOLD, dp(6)))
        col.addView(tv("This app is blocked", 15f, Color.parseColor("#99FFFFFF"), bottomMargin = dp(48)))

        // Breathe button
        val btn = Button(this).apply {
            text = "Breathe to Unlock"
            setTextColor(Color.parseColor("#07111E"))
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            background = GradientDrawable().apply {
                setColor(Color.parseColor("#4FCDD8"))
                cornerRadius = dp(26).toFloat()
            }
            val lp = LinearLayout.LayoutParams(dp(220), dp(52))
            lp.gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = lp
            setOnClickListener {
                val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("ANDROID_BREATHE_UNLOCK", true)
                }
                if (launch != null) startActivity(launch)
            }
        }
        col.addView(btn)

        val clp = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER }
        root.addView(col, clp)

        val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            type,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )

        handler.post {
            try { wm?.addView(root, params); overlay = root } catch (_: Exception) {}
        }
    }

    private fun hideOverlay() {
        handler.post {
            try { overlay?.let { wm?.removeView(it) } } catch (_: Exception) {}
            overlay = null
            shownForPkg = null
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    private fun tv(
        text: String, size: Float, color: Int,
        style: Int = Typeface.NORMAL, bottomMargin: Int = 0
    ) = TextView(this).apply {
        this.text = text
        textSize = size
        setTextColor(color)
        typeface = Typeface.create(Typeface.DEFAULT, style)
        gravity = Gravity.CENTER
        layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { this.bottomMargin = bottomMargin }
    }

    // ── Notification ──────────────────────────────────────────────────────────

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "App Blocker", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Monitors apps in background"
                setShowBadge(false)
            }
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(ch)
        }
    }

    private fun buildNotif(): Notification {
        val pi = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("App blocking active")
            .setContentText("Breathe & Focus is monitoring your apps")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
