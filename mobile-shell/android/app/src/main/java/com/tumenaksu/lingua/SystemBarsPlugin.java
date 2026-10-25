package com.tumenaksu.lingua;

import android.graphics.Color;
import android.view.View;
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
        getActivity()
            .runOnUiThread(() -> {
                View decor = getActivity().getWindow().getDecorView();
                decor.setBackgroundColor(parsed);
                WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getActivity().getWindow(), decor);
                bars.setAppearanceLightStatusBars(lightBars);
                bars.setAppearanceLightNavigationBars(lightBars);
            });
        call.resolve();
    }
}
