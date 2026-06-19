// Foreground/background notification handler for FCM.
// Loads firebase compat scripts and renders the system notification.
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

const env = self.MEYDAN_FCM_CONFIG || {};

if (env.apiKey && env.projectId && env.messagingSenderId && env.appId) {
  firebase.initializeApp(env);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(({ notification, data }) => {
    if (!notification) return;
    self.registration.showNotification(notification.title || "MEÝDAN", {
      body: notification.body || "",
      icon: "/icons/icon-192.png",
      data,
    });
  });
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.openWindow(url));
});
