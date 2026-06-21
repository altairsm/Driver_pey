import { Capacitor } from '@capacitor/core';
import { saveFcmToken } from './api';

export async function initNotifications() {
  if (Capacitor.getPlatform() === 'web') return;

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const localPerm = await LocalNotifications.checkPermissions();
    if (localPerm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    let pushPerm = await PushNotifications.checkPermissions();
    if (pushPerm.receive !== 'granted') {
      pushPerm = await PushNotifications.requestPermissions();
    }

    if (pushPerm.receive === 'granted') {
      await PushNotifications.register();
    }

    PushNotifications.addListener('registration', (token) => {
      localStorage.setItem('fcm_token', token.value);
      localStorage.removeItem('fcm_failed');
      const userToken = localStorage.getItem('token');
      if (userToken) {
        saveFcmToken(token.value).catch(() => {});
      }
    });

    PushNotifications.addListener('registrationError', () => {
      localStorage.setItem('fcm_failed', 'true');
    });

    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      const { LocalNotifications: LN } = await import('@capacitor/local-notifications');
      await LN.schedule({
        notifications: [{
          title: notification.title || 'Driver PIX',
          body: notification.body || '',
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
        }]
      });
    });
  } catch (err) {
    console.error('Erro ao inicializar notificações:', err);
  }
}

export async function sendFcmTokenWithRetry(maxRetries = 15, intervalMs = 1500) {
  for (let i = 0; i < maxRetries; i++) {
    const userToken = localStorage.getItem('token');
    const fcmToken = localStorage.getItem('fcm_token');
    if (userToken && fcmToken) {
      try {
        await saveFcmToken(fcmToken);
        return true;
      } catch {}
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return false;
}
