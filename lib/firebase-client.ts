"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function isFcmConfigured() {
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  );
}

export async function getFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!isFcmConfigured()) return null;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  app ??= getApps()[0] ?? initializeApp(config);
  messaging ??= getMessaging(app);

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .catch(() => null);
  if (!registration) return null;

  try {
    return await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (e) {
    console.warn("[fcm] getToken failed:", e);
    return null;
  }
}
