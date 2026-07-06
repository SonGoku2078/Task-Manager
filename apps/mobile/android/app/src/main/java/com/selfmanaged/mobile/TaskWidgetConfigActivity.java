package com.selfmanaged.mobile;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Widget setup (#30): pick which app view the new widget shows. */
public class TaskWidgetConfigActivity extends Activity {
    private static final String[][] VIEWS = {
        { "today", "⭐ Heute" },
        { "nextweek", "🗓️ Next Week" },
        { "priority", "📌 Nächste Aktion" },
        { "inbox", "📥 Inbox" },
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setResult(RESULT_CANCELED);

        Bundle extras = getIntent().getExtras();
        final int widgetId = extras == null
            ? AppWidgetManager.INVALID_APPWIDGET_ID
            : extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Welche Ansicht soll das Widget zeigen?");
        title.setTextSize(18);
        root.addView(title);

        for (String[] v : VIEWS) {
            final String key = v[0];
            Button b = new Button(this);
            b.setText(v[1]);
            b.setAllCaps(false);
            b.setOnClickListener(view -> {
                getSharedPreferences(TaskWidgetProvider.PREFS, Context.MODE_PRIVATE)
                    .edit().putString("view_" + widgetId, key).apply();
                TaskWidgetProvider.updateWidget(this, AppWidgetManager.getInstance(this), widgetId);
                Intent result = new Intent();
                result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
                setResult(RESULT_OK, result);
                finish();
            });
            root.addView(b, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        }
        setContentView(root);
    }
}
