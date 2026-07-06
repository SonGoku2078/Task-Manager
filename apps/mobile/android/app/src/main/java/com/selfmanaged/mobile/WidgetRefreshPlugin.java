package com.selfmanaged.mobile;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

/** Lets the web app poke the home-screen widgets after publishing fresh data. */
@CapacitorPlugin(name = "WidgetRefresh")
public class WidgetRefreshPlugin extends Plugin {
    @PluginMethod
    public void refresh(PluginCall call) {
        TaskWidgetProvider.updateAll(getContext());
        call.resolve();
    }
}
