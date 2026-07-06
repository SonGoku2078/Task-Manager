package com.selfmanaged.mobile;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Reads the snapshot the app publishes via Capacitor Preferences (#30). */
final class WidgetData {
    static final class Item {
        final String id;
        final String title;
        final String meta;
        Item(String id, String title, String meta) { this.id = id; this.title = title; this.meta = meta; }
    }

    private static JSONObject load(Context ctx) {
        try {
            SharedPreferences cap = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String raw = cap.getString("widget-data", null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    static String serverUrl(Context ctx) {
        JSONObject data = load(ctx);
        String url = data == null ? null : data.optString("serverUrl", null);
        return (url == null || url.isEmpty()) ? null : url;
    }

    /** Epoch-ms when the app last published data (0 if none). */
    static long updatedAt(Context ctx) {
        JSONObject data = load(ctx);
        return data == null ? 0L : data.optLong("updatedAt", 0L);
    }

    static List<Item> tasks(Context ctx, String viewKey) {
        List<Item> out = new ArrayList<>();
        JSONObject data = load(ctx);
        if (data == null) return out;
        try {
            JSONArray list = data.getJSONObject("views").optJSONArray(viewKey);
            if (list == null) return out;
            for (int i = 0; i < list.length(); i++) {
                JSONObject t = list.getJSONObject(i);
                out.add(new Item(t.optString("id"), t.optString("t"), t.optString("m", "")));
            }
        } catch (Exception ignored) { }
        return out;
    }

    private WidgetData() { }
}
