package com.selfmanaged.mobile;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before the bridge starts so load() runs during init.
        registerPlugin(ShareTargetPlugin.class);
        super.onCreate(savedInstanceState);
        // Cold start: the app was launched by a share intent.
        ShareTargetPlugin.handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Warm start: a share arrived while the app was already running.
        ShareTargetPlugin.handleIntent(intent);
    }
}
