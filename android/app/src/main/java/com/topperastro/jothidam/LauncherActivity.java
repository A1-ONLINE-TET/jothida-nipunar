package com.topperastro.jothidam;

import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;

/** Launches the Trusted Web Activity; all settings are meta-data in AndroidManifest.xml. */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keeps the splash screen in portrait; the browser applies the SCREEN_ORIENTATION
        // meta-data to the web content itself. Requesting an orientation from a translucent
        // activity crashes on Android 8.0, so it is only done on newer versions.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }
}
