import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

let cached: App | null | undefined;

function getApp(): App | null {
  if (cached !== undefined) return cached;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    cached = null;
    return null;
  }
  try {
    const credential = cert(JSON.parse(raw));
    cached =
      getApps().find((a) => a.name === "meydan") ??
      initializeApp({ credential }, "meydan");
    return cached;
  } catch (e) {
    console.warn("[fcm] failed to init firebase admin:", e);
    cached = null;
    return null;
  }
}

export async function sendPush(
  token: string | null | undefined,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (!token) return;
  const app = getApp();
  if (!app) return;
  try {
    await getMessaging(app).send({
      token,
      notification: { title, body },
      data,
      android: { priority: "high" },
    });
  } catch (e) {
    console.warn("[fcm] send failed:", e);
  }
}
