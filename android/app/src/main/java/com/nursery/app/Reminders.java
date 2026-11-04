package com.nursery.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * تنبيهات شهرية بتتجدول على الموبايل نفسه (من غير سيرفر):
 * اشتراك الحضانة لأولياء الأمور، والالتزامات (إيجار، مرتبات...) للإدارة.
 * بتشتغل حتى لو التطبيق مقفول، وبتتعاد جدولتها بعد إعادة تشغيل الموبايل.
 */
public class Reminders extends BroadcastReceiver {
    private static final String PREFS = "baraem_reminders";
    static final String CHANNEL = "baraem";

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "إشعارات الحضانة", NotificationManager.IMPORTANCE_HIGH);
            c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    static void show(Context c, String title, String body) {
        ensureChannel(c);
        Intent open = new Intent(c, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_notify).setContentTitle(title).setContentText(body)
                .setStyle(new Notification.BigTextStyle().bigText(body)).setAutoCancel(true).setContentIntent(pi);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify((int) (System.currentTimeMillis() % 1000000), b.build());
    }

    /** يحفظ القائمة الجديدة ويجدولها (ويلغي القديم اللي اتشال). */
    static void save(Context c, String json) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> old = new HashSet<>(p.getStringSet("ids", new HashSet<>()));
        Set<String> now = new HashSet<>();
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) now.add(arr.getJSONObject(i).getString("id"));
        } catch (Exception e) { return; }
        old.removeAll(now);
        for (String id : old) cancel(c, id);
        p.edit().putString("list", json).putStringSet("ids", now).apply();
        scheduleAll(c);
    }

    static void scheduleAll(Context c) {
        String json = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("list", "[]");
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) schedule(c, arr.getJSONObject(i));
        } catch (Exception ignored) { }
    }

    private static PendingIntent intentFor(Context c, String id) {
        Intent i = new Intent(c, Reminders.class);
        i.setAction("com.nursery.app.REMINDER");
        i.putExtra("id", id);
        return PendingIntent.getBroadcast(c, id.hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void cancel(Context c, String id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(intentFor(c, id));
    }

    private static void schedule(Context c, JSONObject r) throws Exception {
        int day = r.optInt("day", 1), hour = r.optInt("hour", 10), minute = r.optInt("minute", 0);
        Calendar cal = Calendar.getInstance();
        for (int k = 0; k < 2; k++) {
            Calendar t = (Calendar) cal.clone();
            t.add(Calendar.MONTH, k);
            t.set(Calendar.DAY_OF_MONTH, Math.min(day, t.getActualMaximum(Calendar.DAY_OF_MONTH)));
            t.set(Calendar.HOUR_OF_DAY, hour); t.set(Calendar.MINUTE, minute); t.set(Calendar.SECOND, 0); t.set(Calendar.MILLISECOND, 0);
            if (t.getTimeInMillis() > System.currentTimeMillis() + 5000) {
                AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
                PendingIntent pi = intentFor(c, r.getString("id"));
                if (Build.VERSION.SDK_INT >= 23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.getTimeInMillis(), pi);
                else am.set(AlarmManager.RTC_WAKEUP, t.getTimeInMillis(), pi);
                return;
            }
        }
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.MY_PACKAGE_REPLACED".equals(action)) {
            scheduleAll(c);
            return;
        }
        String id = intent.getStringExtra("id");
        String json = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("list", "[]");
        try {
            JSONArray arr = new JSONArray(json);
            Calendar now = Calendar.getInstance();
            String month = String.format(Locale.US, "%04d-%02d", now.get(Calendar.YEAR), now.get(Calendar.MONTH) + 1);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject r = arr.getJSONObject(i);
                if (!r.getString("id").equals(id)) continue;
                // لو اتدفع الشهر ده، ما نبعتش التنبيه
                if (!month.equals(r.optString("skipMonth", ""))) show(c, r.optString("title"), r.optString("body"));
            }
        } catch (Exception ignored) { }
        scheduleAll(c);
    }
}
