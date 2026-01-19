import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

const functions = getFunctions(app);

/**
 * Tək istifadəçiyə bildiriş göndər
 * @param {string} userId - İstifadəçi ID-si
 * @param {string} title - Bildiriş başlığı
 * @param {string} body - Bildiriş mətni
 * @param {object} data - Əlavə məlumat (optional)
 */
export const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const sendNotification = httpsCallable(functions, 'sendNotification');
    const result = await sendNotification({
      userId,
      title,
      body,
      notificationData: data,
    });
    console.log('Bildiriş göndərildi:', result.data);
    return result.data;
  } catch (error) {
    console.error('Bildiriş göndərmə xətası:', error);
    throw error;
  }
};

/**
 * Bütün istifadəçilərə bildiriş göndər
 * @param {string} title - Bildiriş başlığı
 * @param {string} body - Bildiriş mətni
 * @param {object} data - Əlavə məlumat (optional)
 */
export const sendNotificationToAll = async (title, body, data = {}) => {
  try {
    const sendBroadcast = httpsCallable(functions, 'sendBroadcastNotification');
    const result = await sendBroadcast({
      title,
      body,
      notificationData: data,
    });
    console.log('Toplu bildiriş göndərildi:', result.data);
    return result.data;
  } catch (error) {
    console.error('Toplu bildiriş xətası:', error);
    throw error;
  }
};

/**
 * Təşkilatçının izləyicilərinə bildiriş göndər
 * @param {string} organiserId - Təşkilatçı ID-si
 * @param {string} title - Bildiriş başlığı
 * @param {string} body - Bildiriş mətni
 * @param {object} data - Əlavə məlumat (optional)
 */
export const sendNotificationToFollowers = async (organiserId, title, body, data = {}) => {
  try {
    const sendToFollowers = httpsCallable(functions, 'sendNotificationToFollowers');
    const result = await sendToFollowers({
      organiserId,
      title,
      body,
      notificationData: data,
    });
    console.log('İzləyicilərə bildiriş göndərildi:', result.data);
    return result.data;
  } catch (error) {
    console.error('İzləyici bildiriş xətası:', error);
    throw error;
  }
};
