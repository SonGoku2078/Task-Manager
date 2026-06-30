package com.selfmanaged.mobile;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Receives "Share → SelfManaged" (ACTION_SEND text) intents and hands the
// content to the web layer. MainActivity stashes the latest shared text via
// handleIntent(); the JS side pulls it with consume() on launch/resume, and a
// "shareReceived" event pings it for the warm-start case.
@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {
    private static String pendingText;
    private static String pendingSubject;
    private static ShareTargetPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    // Called by MainActivity for every incoming intent (cold + warm).
    static void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        if (Intent.ACTION_SEND.equals(action) && type != null && type.startsWith("text/")) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text == null) return;
            pendingText = text;
            pendingSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            // If the web layer is already alive, ping it to come pull the share.
            if (instance != null) {
                instance.notifyListeners("shareReceived", new JSObject());
            }
        }
    }

    // JS pulls (and clears) the shared content. Returns {} when nothing pending.
    @PluginMethod
    public void consume(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("text", pendingText);
        ret.put("subject", pendingSubject);
        pendingText = null;
        pendingSubject = null;
        call.resolve(ret);
    }
}
