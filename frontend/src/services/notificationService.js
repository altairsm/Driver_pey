import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { getUltimaImportacaoReclamacoes, saveFcmToken } from './api';
import { Capacitor } from '@capacitor/core';

export async function initNotifications() {
  if (Capacitor.getPlatform() === 'web') return;

  // Notificações Locais (Permissão)
  const localPerm = await LocalNotifications.checkPermissions();
  if (localPerm.display !== 'granted') {
    await LocalNotifications.requestPermissions();
  }

  // Push Notifications (Firebase)
  let pushPerm = await PushNotifications.checkPermissions();
  if (pushPerm.receive !== 'granted') {
    pushPerm = await PushNotifications.requestPermissions();
  }

  if (pushPerm.receive === 'granted') {
    await PushNotifications.register();
  }

  // Listeners para Push
  PushNotifications.addListener('registration', (token) => {
    console.log('FCM Token:', token.value);
    localStorage.setItem('fcm_token', token.value);
    // Se o usuário já estiver logado, envia o token pro backend
    const userToken = localStorage.getItem('token');
    if (userToken) {
      saveFcmToken(token.value).catch(console.error);
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Erro no registro de Push:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push recebida:', notification);
  });
}

// Esta função ainda é útil como fallback ou para checagem manual
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
              title: "Nova Atualização de Reclamações",
              body: "O relatório de reclamações foi atualizado. Verifique se há pendências.",
              id: 1,
              schedule: { at: new Date(Date.now() + 1000) },
              sound: null,
              attachments: null,
              actionTypeId: "",
              extra: null
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
