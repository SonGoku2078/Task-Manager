package com.selfmanaged.mobile;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Feeds the widget ListView from the published snapshot (#30). */
public class TaskWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        int widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID);
        return new Factory(getApplicationContext(), widgetId);
    }

    static class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private final int widgetId;
        private List<WidgetData.Item> items = new ArrayList<>();
        private Set<String> selection;

        Factory(Context ctx, int widgetId) {
            this.ctx = ctx;
            this.widgetId = widgetId;
        }

        @Override public void onCreate() { reload(); }
        @Override public void onDataSetChanged() { reload(); }

        private void reload() {
            String viewKey = TaskWidgetProvider.getViewKey(ctx, widgetId);
            items = WidgetData.tasks(ctx, viewKey);
            selection = TaskWidgetProvider.getSelection(ctx, widgetId);
        }

        @Override
        public RemoteViews getViewAt(int position) {
            WidgetData.Item item = items.get(position);
            RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_task_item);
            boolean selected = selection.contains(item.id);
            rv.setTextViewText(R.id.item_check, selected ? "✓" : "○");
            rv.setTextColor(R.id.item_check, selected ? Color.parseColor("#2e7d32") : Color.parseColor("#9e9e9e"));
            rv.setTextViewText(R.id.item_title, item.title);
            rv.setTextColor(R.id.item_title, selected ? Color.parseColor("#2e7d32") : Color.parseColor("#212121"));
            Intent fill = new Intent();
            fill.putExtra(TaskWidgetProvider.EXTRA_TASK_ID, item.id);
            fill.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
            rv.setOnClickFillInIntent(R.id.item_row, fill);
            return rv;
        }

        @Override public int getCount() { return items.size(); }
        @Override public RemoteViews getLoadingView() { return null; }
        @Override public int getViewTypeCount() { return 1; }
        @Override public long getItemId(int position) { return position; }
        @Override public boolean hasStableIds() { return false; }
        @Override public void onDestroy() { }
    }
}
