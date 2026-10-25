package com.tumenaksu.lingua;

import android.app.Activity;
import android.graphics.Color;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the web build tint the window decor background behind the status/navigation bars
 * (the WebView sits between the bars via margins, so this strip is the activity background)
 * and pick light/dark system bar icons to match.
 */
@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        String color = call.getString("color");
        Boolean darkIcons = call.getBoolean("darkIcons", true);
        final int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (IllegalArgumentException | NullPointerException e) {
            call.reject("invalid color");
            return;
        }
        final boolean lightBars = darkIcons;
        // Capture everything before posting: if the activity is destroyed before the runnable
        // runs (user quits/backgrounds mid-call) getActivity() returns null inside it.
        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("no activity");
            return;
        }
        final Window window = activity.getWindow();
        final View decor = window.getDecorView();
        final WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, decor);
        activity.runOnUiThread(() -> {
            if (getActivity() == null) return; // torn down before the runnable executed
            decor.setBackgroundColor(parsed);
            bars.setAppearanceLightStatusBars(lightBars);
            bars.setAppearanceLightNavigationBars(lightBars);
        });
        call.resolve();
    }
}
