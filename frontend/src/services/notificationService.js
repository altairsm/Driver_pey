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
    console.log('FCM Token recebido do Capacitor:', token.value);
    localStorage.setItem('fcm_token', token.value);
    localStorage.removeItem('fcm_error'); // Limpa erro se conseguiu registrar

    // Tenta enviar imediatamente se já estiver logado
    sendFcmTokenToServer(token.value);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Erro fatal no registro de Push:', err.error);
    localStorage.setItem('fcm_error', err.error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push recebida em tempo real:', notification);
  });
}

/**
 * Tenta enviar o token para o servidor se o usuário estiver autenticado.
 */
export async function sendFcmTokenToServer(tokenValue) {
  const userToken = localStorage.getItem('token');
  const token = tokenValue || localStorage.getItem('fcm_token');

  if (userToken && token) {
    try {
      console.log('Enviando FCM Token para a VPS...');
      await saveFcmToken(token);
      console.log('FCM Token salvo com sucesso na tabela fcm_tokens.');
      return true;
    } catch (err) {
      console.error('Erro ao enviar token para a VPS:', err.message);
      return false;
    }
  }
  return false;
}

/**
 * Tenta enviar o token com sistema de repetição (Retry)
 * Útil para quando o app acaba de abrir e o token do Google ainda não chegou.
 */
export async function sendFcmTokenWithRetry(maxRetries = 10, delay = 1500) {
  let attempts = 0;

  const attempt = async () => {
    attempts++;
    const success = await sendFcmTokenToServer();

    if (success) {
      console.log(`Token sincronizado após ${attempts} tentativas.`);
      return;
    }

    if (attempts < maxRetries) {
      console.log(`Tentativa ${attempts}/${maxRetries} falhou. Retentando em ${delay}ms...`);
      setTimeout(attempt, delay);
    } else {
      console.warn('Esgotadas as tentativas de sincronização do Token de Notificação.');
    }
  };

  attempt();
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
              title: "Nova Atualização de Reclamações",
              body: "O relatório de reclamações foi atualizado. Verifique se há pendências.",
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
