/**
 * Firebase Admin SDK — for sending server-side push notifications
 * 
 * Setup:
 * 1. console.firebase.google.com → Project Settings → Service Accounts
 * 2. Click "Generate new private key" → download JSON
 * 3. Set env vars in backend/.env:
 *    FIREBASE_PROJECT_ID=your-project-id
 *    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
 *    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 */

let adminApp = null;

function isConfigured() {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function getAdmin() {
  if (!isConfigured()) return null;
  if (adminApp) return adminApp;

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    adminApp = admin;
    return admin;
  } catch (err) {
    console.warn('[Firebase Admin] Init failed (non-fatal):', err.message);
    return null;
  }
}

function messaging() {
  const admin = getAdmin();
  return admin ? admin.messaging() : null;
}

module.exports = { isConfigured, getAdmin, messaging };
