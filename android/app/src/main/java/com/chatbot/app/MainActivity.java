package com.uzzai.uzzapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import java.util.Arrays;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    createNotificationChannels();
  }

  private void createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationManager manager = getSystemService(NotificationManager.class);
    if (manager == null) {
      return;
    }

    NotificationChannel critical = new NotificationChannel(
      "critical_notifications",
      "Notificações Urgentes",
      NotificationManager.IMPORTANCE_HIGH
    );
    critical.setDescription("Transferências e alertas críticos");
    critical.enableVibration(true);
    critical.setVibrationPattern(new long[] {0, 500, 200, 500});

    AudioAttributes audioAttributes =
      new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build();

    int urgentSoundId = getResources().getIdentifier("urgent_notification", "raw", getPackageName());
    if (urgentSoundId != 0) {
      Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/" + urgentSoundId);
      critical.setSound(soundUri, audioAttributes);
    } else {
      critical.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), audioAttributes);
    }

    NotificationChannel important = new NotificationChannel(
      "important_notifications",
      "Notificações Importantes",
      NotificationManager.IMPORTANCE_HIGH
    );
    important.setDescription("Novas conversas e alertas de orçamento");
    important.enableVibration(true);
    important.setVibrationPattern(new long[] {0, 300, 200, 300});

    NotificationChannel normal = new NotificationChannel(
      "normal_messages",
      "Mensagens",
      NotificationManager.IMPORTANCE_DEFAULT
    );
    normal.setDescription("Mensagens de conversas existentes");
    normal.enableVibration(true);
    normal.setVibrationPattern(new long[] {0, 200});

    NotificationChannel low = new NotificationChannel(
      "low_priority",
      "Atualizações",
      NotificationManager.IMPORTANCE_LOW
    );
    low.setDescription("Confirmações e status");
    low.enableVibration(false);
    low.setSound(null, null);

    NotificationChannel marketing = new NotificationChannel(
      "marketing",
      "Novidades",
      NotificationManager.IMPORTANCE_LOW
    );
    marketing.setDescription("Anúncios e dicas");
    marketing.enableVibration(false);
    marketing.setSound(null, null);

    manager.createNotificationChannels(
      Arrays.asList(critical, important, normal, low, marketing)
    );
  }
}
