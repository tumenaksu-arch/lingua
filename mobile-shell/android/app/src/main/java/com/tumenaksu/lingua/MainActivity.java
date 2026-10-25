package com.tumenaksu.lingua;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup.MarginLayoutParams;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Lingua web shell: loads https://ankaxai.ai/lingua/ (capacitor.config.json server.url).
 * Edge-to-edge/keyboard handling follows the EduPilot shell (ankaokul apps/mobile MainActivity).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15 edge-to-edge: the area behind the system bars is the window background
        // (adjustMarginsForEdgeToEdge keeps the WebView between the bars). White + dark icons.
        getWindow().getDecorView().setBackgroundColor(Color.WHITE);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(true);
        bars.setAppearanceLightNavigationBars(true);
        applyKeyboardAwareMargins();
    }

    /** Replaces Capacitor's edge-to-edge listener so the bottom margin also covers the keyboard (IME). */
    private void applyKeyboardAwareMargins() {
        String mode = getBridge().getConfig().adjustMarginsForEdgeToEdge();
        if (mode.equals("disable")) return;
        boolean force = mode.equals("force");
        boolean auto = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM && mode.equals("auto")) {
            TypedValue value = new TypedValue();
            boolean optOut = getTheme().resolveAttribute(android.R.attr.windowOptOutEdgeToEdgeEnforcement, value, true);
            auto = !(optOut && value.data != 0);
        }
        if (!force && !auto) return;
        View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            MarginLayoutParams mp = (MarginLayoutParams) v.getLayoutParams();
            mp.leftMargin = bars.left;
            mp.rightMargin = bars.right;
            mp.topMargin = bars.top;
            mp.bottomMargin = Math.max(bars.bottom, ime.bottom);
            v.setLayoutParams(mp);
            return WindowInsetsCompat.CONSUMED;
        });
    }

    @Override
    public void onPause() {
        super.onPause();
        // Persist the Firebase/web session cookies when the app goes to the background.
        android.webkit.CookieManager.getInstance().flush();
    }
}
