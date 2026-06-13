import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { getUltimaImportacaoReclamacoes, saveFcmToken } from './api';
import { Capacitor } from '@capacitor/core';

export async function initNotifications() {
  if (Capacitor.getPlatform() === 'web') return;

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
    console.log('FCM Token recebido do Capacitor:', token.value);
    localStorage.setItem('fcm_token', token.value);
    localStorage.removeItem('fcm_failed');

    const userToken = localStorage.getItem('token');
    if (userToken) {
      console.log('Enviando token para o servidor...');
      saveFcmToken(token.value).catch(err => console.error('Falha ao salvar token no servidor:', err));
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Erro no registro de Push:', err);
    localStorage.setItem('fcm_failed', 'true');
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push recebida em tempo real:', notification);
  });
}

export async function sendFcmTokenWithRetry(maxRetries = 15, intervalMs = 1500) {
  for (let i = 0; i < maxRetries; i++) {
    const userToken = localStorage.getItem('token');
    const fcmToken = localStorage.getItem('fcm_token');

    if (userToken && fcmToken) {
      try {
        await saveFcmToken(fcmToken);
        console.log('Token FCM enviado com sucesso');
        return true;
      } catch (err) {
        console.error('Erro ao enviar token FCM, retentando...', err);
      }
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }

  if (localStorage.getItem('fcm_failed')) {
    console.warn('FCM: registro falhou permanentemente');
  } else {
    console.warn('FCM: token não disponível após o tempo limite');
  }
  return false;
}

export async function checkNewComplaints() {
  try {
    const token = localStorage.getItem('token');
    if (!token || window.location.pathname === '/login') return;

    const data = await getUltimaImportacaoReclamacoes();
    if (!data || !data.ultima_importacao) return;

    const serverDate = new Date(data.ultima_importacao).getTime();
    const lastChecked = localStorage.getItem('last_complaints_check');

    if (lastChecked) {
      const lastDate = parseInt(lastChecked);
      if (serverDate > lastDate) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: "📝 Nova Acareação ❌",
              body: "Entre em contato com a BASE e resolver a acareação",
              id: 1,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: null,
            }
          ]
        });
      }
    }

    localStorage.setItem('last_complaints_check', serverDate.toString());
  } catch (err) {
    console.error('Erro ao verificar novas reclamações:', err);
  }
}
