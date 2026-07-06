package com.selfmanaged.mobile;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Home-screen task widget (#30). Shows one of the app views (Heute, Next Week,
 * Nächste Aktion, Inbox) from the snapshot the app publishes into the
 * Capacitor preferences. Tapping a row marks it with a green check; the header
 * check button completes all marked tasks via the app's HTTP API.
 */
public class TaskWidgetProvider extends AppWidgetProvider {
    static final String PREFS = "TaskWidget";
    static final String ACTION_TOGGLE = "com.selfmanaged.mobile.WIDGET_TOGGLE";
    static final String ACTION_CONFIRM = "com.selfmanaged.mobile.WIDGET_CONFIRM";
    static final String ACTION_REFRESH = "com.selfmanaged.mobile.WIDGET_REFRESH";
    static final String EXTRA_TASK_ID = "taskId";

    static String viewLabel(String key) {
        switch (key) {
            case "nextweek": return "Next Week";
            case "priority": return "Nächste Aktion";
            case "inbox": return "Inbox";
            default: return "Heute";
        }
    }

    static Set<String> getSelection(Context ctx, int widgetId) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return new HashSet<>(p.getStringSet("sel_" + widgetId, new HashSet<>()));
    }

    static void setSelection(Context ctx, int widgetId, Set<String> sel) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putStringSet("sel_" + widgetId, sel).apply();
    }

    static String getViewKey(Context ctx, int widgetId) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("view_" + widgetId, "today");
    }

    static void updateWidget(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_tasks);
        String viewKey = getViewKey(ctx, widgetId);
        rv.setTextViewText(R.id.widget_title, viewLabel(viewKey));

        // List content comes from the RemoteViewsService factory.
        Intent svc = new Intent(ctx, TaskWidgetService.class);
        svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
        rv.setRemoteAdapter(R.id.widget_list, svc);
        rv.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // Row taps fill this template with the task id (toggle green check).
        Intent toggle = new Intent(ctx, TaskWidgetProvider.class).setAction(ACTION_TOGGLE);
        toggle.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        toggle.setData(Uri.parse("selfmanaged://widget/" + widgetId));
        rv.setPendingIntentTemplate(R.id.widget_list, PendingIntent.getBroadcast(
            ctx, widgetId, toggle, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE));

        // Header: confirm (visible only with a selection) + refresh.
        int selCount = getSelection(ctx, widgetId).size();
        rv.setViewVisibility(R.id.widget_confirm, selCount > 0 ? View.VISIBLE : View.GONE);
        rv.setTextViewText(R.id.widget_confirm, "✓ " + selCount + " erledigen");
        Intent confirm = new Intent(ctx, TaskWidgetProvider.class).setAction(ACTION_CONFIRM);
        confirm.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        confirm.setData(Uri.parse("selfmanaged://widget-confirm/" + widgetId));
        rv.setOnClickPendingIntent(R.id.widget_confirm, PendingIntent.getBroadcast(
            ctx, widgetId + 10000, confirm, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent refresh = new Intent(ctx, TaskWidgetProvider.class).setAction(ACTION_REFRESH);
        refresh.setData(Uri.parse("selfmanaged://widget-refresh/" + widgetId));
        rv.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(
            ctx, widgetId + 20000, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        mgr.updateAppWidget(widgetId, rv);
        mgr.notifyAppWidgetViewDataChanged(widgetId, R.id.widget_list);
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, TaskWidgetProvider.class));
        for (int id : ids) updateWidget(ctx, mgr, id);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] widgetIds) {
        for (int id : widgetIds) updateWidget(ctx, mgr, id);
    }

    @Override
    public void onDeleted(Context ctx, int[] widgetIds) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        for (int id : widgetIds) e.remove("sel_" + id).remove("view_" + id);
        e.apply();
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String action = intent.getAction();
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID);

        if (ACTION_TOGGLE.equals(action) && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            if (taskId == null) return;
            Set<String> sel = getSelection(ctx, widgetId);
            if (!sel.remove(taskId)) sel.add(taskId);
            setSelection(ctx, widgetId, sel);
            updateWidget(ctx, AppWidgetManager.getInstance(ctx), widgetId);
        } else if (ACTION_CONFIRM.equals(action) && widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
            completeSelected(ctx, widgetId);
        } else if (ACTION_REFRESH.equals(action)) {
            updateAll(ctx);
        }
    }

    /** Complete all selected tasks via HTTP, then prune them from the snapshot. */
    private void completeSelected(Context ctx, int widgetId) {
        final Set<String> sel = getSelection(ctx, widgetId);
        if (sel.isEmpty()) return;
        new Thread(() -> {
            String server = WidgetData.serverUrl(ctx);
            boolean anyOk = false;
            for (String taskId : sel) {
                if (server != null && WidgetHttp.completeTask(server, taskId)) anyOk = true;
            }
            if (anyOk) pruneFromSnapshot(ctx, sel);
            setSelection(ctx, widgetId, new HashSet<>());
            updateAll(ctx);
        }).start();
    }

    /** Remove completed ids from the cached snapshot so the widget reflects
     *  the change immediately (the app rewrites the snapshot on next sync). */
    private static void pruneFromSnapshot(Context ctx, Set<String> ids) {
        try {
            SharedPreferences cap = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String raw = cap.getString("widget-data", null);
            if (raw == null) return;
            JSONObject data = new JSONObject(raw);
            JSONObject views = data.getJSONObject("views");
            for (java.util.Iterator<String> it = views.keys(); it.hasNext(); ) {
                String key = it.next();
                JSONArray list = views.getJSONArray(key);
                JSONArray kept = new JSONArray();
                for (int i = 0; i < list.length(); i++) {
                    JSONObject t = list.getJSONObject(i);
                    if (!ids.contains(t.optString("id"))) kept.put(t);
                }
                views.put(key, kept);
            }
            cap.edit().putString("widget-data", data.toString()).apply();
        } catch (Exception ignored) { }
    }
}
