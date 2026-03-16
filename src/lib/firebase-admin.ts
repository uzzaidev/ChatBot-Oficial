import admin from "firebase-admin";

type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const getServiceAccountFromEnv = (): FirebaseServiceAccount | null => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawJson) return null;

  try {
    const parsed = JSON.parse(rawJson);
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      };
    }
  } catch (error) {
    console.warn("[push] Invalid FIREBASE_SERVICE_ACCOUNT_JSON");
  }

  return null;
};

export const getFirebaseMessaging = (): admin.messaging.Messaging | null => {
  if (admin.apps.length > 0) {
    return admin.messaging();
  }

  const serviceAccount = getServiceAccountFromEnv();
  if (!serviceAccount) {
    console.warn("[push] Firebase credentials not configured. Skipping push send.");
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey,
    }),
  });

  return admin.messaging();
};
