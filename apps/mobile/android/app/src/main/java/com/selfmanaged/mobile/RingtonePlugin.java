package com.selfmanaged.mobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Lets the reminder settings pick a real notification sound from the device
 * (#30) and bakes the choice into the reminder notification channel — a
 * channel's sound is immutable, so a change deletes + recreates it.
 */
@CapacitorPlugin(name = "Ringtone")
public class RingtonePlugin extends Plugin {
    static final String CHANNEL_ID = "rem_custom";

    @PluginMethod
    public void pick(PluginCall call) {
        String currentUri = call.getString("current", null);
        Intent intent = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_NOTIFICATION);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Erinnerungston wählen");
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false);
        if (currentUri != null) {
            intent.putExtra(RingtoneManager.EXTRA_RINGTONE_EXISTING_URI, Uri.parse(currentUri));
        }
        startActivityForResult(call, intent, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        Uri uri = data != null
            ? data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI)
            : null;
        JSObject ret = new JSObject();
        if (uri != null) {
            ret.put("uri", uri.toString());
            Ringtone rt = RingtoneManager.getRingtone(getContext(), uri);
            ret.put("title", rt != null ? rt.getTitle(getContext()) : "Ton");
        } else {
            // User picked "None"/cancelled — leave uri null (caller keeps old).
            ret.put("uri", (String) null);
        }
        call.resolve(ret);
    }

    /** (Re)create the reminder channel with the chosen sound + vibration. */
    @PluginMethod
    public void configureChannel(PluginCall call) {
        String uri = call.getString("uri", null);
        boolean vibrate = Boolean.TRUE.equals(call.getBoolean("vibrate", true));
        boolean sound = Boolean.TRUE.equals(call.getBoolean("sound", true));
        NotificationManager nm =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) { call.resolve(); return; }

        nm.deleteNotificationChannel(CHANNEL_ID);
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_ID, "Erinnerungen",
            sound ? NotificationManager.IMPORTANCE_HIGH : NotificationManager.IMPORTANCE_DEFAULT);
        ch.enableVibration(vibrate);
        if (!sound) {
            ch.setSound(null, null);
        } else if (uri != null) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION).build();
            ch.setSound(Uri.parse(uri), attrs);
        }
        // sound && uri == null → keep the channel's default notification sound.
        nm.createNotificationChannel(ch);
        call.resolve();
    }
}
