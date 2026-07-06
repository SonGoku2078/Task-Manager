package com.selfmanaged.mobile;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Minimal HTTP for the widget: complete a task via the app's REST API.
 * HttpURLConnection rejects the PATCH verb, so we tunnel it through the
 * X-HTTP-Method-Override header — the server route accepts it (see
 * server/src/index.ts method-override middleware).
 */
final class WidgetHttp {
    static boolean completeTask(String serverUrl, String taskId) {
        try {
            URL url = new URL(serverUrl + "/api/tasks/" + taskId);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(8000);
            conn.setDoOutput(true);
            String body = "{\"completed\":true,\"completedAt\":\"" +
                java.time.Instant.now().toString() + "\"}";
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
            int code = conn.getResponseCode();
            conn.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        }
    }

    private WidgetHttp() { }
}
