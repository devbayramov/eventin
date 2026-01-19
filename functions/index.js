const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Expo } = require('expo-server-sdk');

initializeApp();
const db = getFirestore();
const expo = new Expo();

// ============================================
// 1. YENİ TƏDBİR YARADILANDA - İZLƏYİCİLƏRƏ BİLDİRİŞ
// ============================================
exports.onNewEventCreated = onDocumentCreated('events/{eventId}', async (event) => {
  const snap = event.data;
  if (!snap) return null;

  const eventData = snap.data();
  const eventId = event.params.eventId;

  // Deaktiv və ya ictimai olmayan tədbirləri keç
  if (eventData.deActive || eventData.eventTarget !== 'İctimaiyyətə açıq') {
    return null;
  }

  const organiserId = eventData.odenerID || eventData.odenerid;
  if (!organiserId) return null;

  // Təşkilatçının izləyicilərini tap
  const followersSnapshot = await db.collection('users')
    .where('followedOrganisers', 'array-contains', organiserId)
    .get();

  const messages = [];

  for (const userDoc of followersSnapshot.docs) {
    const userData = userDoc.data();
    const pushToken = userData.expoPushToken;

    if (pushToken && Expo.isExpoPushToken(pushToken)) {
      messages.push({
        to: pushToken,
        sound: 'default',
        title: 'Yeni Tədbir! 🎉',
        body: `${eventData.eventname || 'Yeni tədbir'} əlavə edildi`,
        data: { eventId, type: 'new_event' },
      });
    }
  }

  if (messages.length > 0) {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`${messages.length} izləyiciyə bildiriş göndərildi`);
  }

  return null;
});

// ============================================
// 2. HƏR GÜN SAAT 09:00 - SABAHKI TƏDBİRLƏR ÜÇÜN XATIRLATMA
// ============================================
exports.sendDailyEventReminders = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'Asia/Baku',
}, async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const eventsSnapshot = await db.collection('events')
    .where('eventstartdate', '==', tomorrowStr)
    .where('deActive', '==', false)
    .where('checkedEvent', '==', true)
    .get();

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    const registrationsSnapshot = await db.collection('registrations')
      .where('eventId', '==', eventDoc.id)
      .get();

    const messages = [];

    for (const regDoc of registrationsSnapshot.docs) {
      const userId = regDoc.data().odenerID || regDoc.data().odenerid || regDoc.data().userId;
      if (!userId) continue;

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const pushToken = userData.expoPushToken;

      if (pushToken && Expo.isExpoPushToken(pushToken)) {
        messages.push({
          to: pushToken,
          sound: 'default',
          title: 'Tədbir Xatırlatması ⏰',
          body: `Sabah "${event.eventname}" tədbiri başlayır!`,
          data: { eventId: eventDoc.id, type: 'event_reminder' },
        });
      }
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`${event.eventname}: ${messages.length} xatırlatma göndərildi`);
    }
  }

  return null;
});

// ============================================
// 3. TƏDBİRDƏN 1 SAAT ƏVVƏL XATIRLATMA
// ============================================
exports.sendHourlyEventReminders = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'Asia/Baku',
}, async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const todayStr = now.toISOString().split('T')[0];
  const targetHour = oneHourLater.getHours().toString().padStart(2, '0');
  const targetTime = `${targetHour}:00`;

  const eventsSnapshot = await db.collection('events')
    .where('eventstartdate', '==', todayStr)
    .where('eventstarttime', '==', targetTime)
    .where('deActive', '==', false)
    .get();

  for (const eventDoc of eventsSnapshot.docs) {
    const event = eventDoc.data();

    const registrationsSnapshot = await db.collection('registrations')
      .where('eventId', '==', eventDoc.id)
      .get();

    const messages = [];

    for (const regDoc of registrationsSnapshot.docs) {
      const userId = regDoc.data().odenerID || regDoc.data().userId;
      if (!userId) continue;

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const pushToken = userData.expoPushToken;

      if (pushToken && Expo.isExpoPushToken(pushToken)) {
        messages.push({
          to: pushToken,
          sound: 'default',
          title: '1 Saat Qaldı! ⏳',
          body: `"${event.eventname}" tədbiri 1 saat sonra başlayır`,
          data: { eventId: eventDoc.id, type: 'event_reminder_1h' },
        });
      }
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    }
  }

  return null;
});

// ============================================
// 4. QEYDİYYAT TƏSDİQLƏNDİKDƏ BİLDİRİŞ
// ============================================
exports.onRegistrationConfirmed = onDocumentCreated('registrations/{regId}', async (event) => {
  const snap = event.data;
  if (!snap) return null;

  const registration = snap.data();
  const userId = registration.odenerID || registration.userId;
  const eventId = registration.eventId;

  if (!userId || !eventId) return null;

  const [userDoc, eventDoc] = await Promise.all([
    db.collection('users').doc(userId).get(),
    db.collection('events').doc(eventId).get()
  ]);

  if (!userDoc.exists || !eventDoc.exists) return null;

  const userData = userDoc.data();
  const eventData = eventDoc.data();
  const pushToken = userData.expoPushToken;

  if (!pushToken || !Expo.isExpoPushToken(pushToken)) return null;

  const message = {
    to: pushToken,
    sound: 'default',
    title: 'Qeydiyyat Uğurlu! ✅',
    body: `"${eventData.eventname}" tədbirinə qeydiyyatınız təsdiqləndi`,
    data: { eventId, type: 'registration_confirmed' },
  };

  await expo.sendPushNotificationsAsync([message]);
  return null;
});

// ============================================
// 5. TƏK İSTİFADƏÇİYƏ BİLDİRİŞ GÖNDƏR
// ============================================
exports.sendNotification = onCall(async (request) => {
  const { userId, title, body, notificationData } = request.data;

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'İstifadəçi tapılmadı');
  }

  const userData = userDoc.data();
  const pushToken = userData.expoPushToken;

  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    throw new HttpsError('failed-precondition', 'Push token yoxdur');
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: notificationData || {},
  };

  const ticket = await expo.sendPushNotificationsAsync([message]);
  return { success: true, ticket };
});

// ============================================
// 6. BÜTÜN İSTİFADƏÇİLƏRƏ BİLDİRİŞ
// ============================================
exports.sendBroadcastNotification = onCall(async (request) => {
  const { title, body, notificationData } = request.data;

  const usersSnapshot = await db.collection('users')
    .where('expoPushToken', '!=', null)
    .get();

  const messages = [];

  usersSnapshot.forEach(doc => {
    const userData = doc.data();
    const pushToken = userData.expoPushToken;

    if (pushToken && Expo.isExpoPushToken(pushToken)) {
      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: notificationData || {},
      });
    }
  });

  if (messages.length === 0) {
    return { success: false, message: 'Göndəriləcək istifadəçi yoxdur' };
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
    tickets.push(...ticketChunk);
  }

  return { success: true, sent: messages.length, tickets };
});

// ============================================
// 7. TƏŞKİLATÇININ İZLƏYİCİLƏRİNƏ BİLDİRİŞ
// ============================================
exports.sendNotificationToFollowers = onCall(async (request) => {
  const { organiserId, title, body, notificationData } = request.data;

  if (!organiserId) {
    throw new HttpsError('invalid-argument', 'Təşkilatçı ID tələb olunur');
  }

  const followersSnapshot = await db.collection('users')
    .where('followedOrganisers', 'array-contains', organiserId)
    .get();

  const messages = [];

  followersSnapshot.forEach(doc => {
    const userData = doc.data();
    const pushToken = userData.expoPushToken;

    if (pushToken && Expo.isExpoPushToken(pushToken)) {
      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: notificationData || {},
      });
    }
  });

  if (messages.length === 0) {
    return { success: true, sent: 0, message: 'İzləyici tapılmadı' };
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
    tickets.push(...ticketChunk);
  }

  return { success: true, sent: messages.length, tickets };
});
