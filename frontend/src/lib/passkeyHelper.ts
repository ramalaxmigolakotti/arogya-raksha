/**
 * WebAuthn Passkey Helper for Arogya Raksha
 * Works with Supabase Passkey configuration (Relying Party: localhost / domain)
 * Supports Windows Hello, Face ID, Touch ID, Android Biometrics & Security Keys
 */

export interface PasskeyCredentialData {
  id: string;
  rawId: string;
  type: string;
  userEmail: string;
  userName: string;
  userRole: string;
  createdAt: string;
}

const PASSKEY_STORAGE_KEY = 'arogya_registered_passkeys';

export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return true;
  } catch {
    return false;
  }
}

export function getStoredPasskeys(): PasskeyCredentialData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PASSKEY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredPasskey(passkey: PasskeyCredentialData) {
  if (typeof window === 'undefined') return;
  const list = getStoredPasskeys();
  // Avoid duplicates by id or userEmail
  const filtered = list.filter((p) => p.id !== passkey.id && p.userEmail !== passkey.userEmail);
  filtered.push(passkey);
  localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Register a new device passkey via WebAuthn
 */
export async function registerDevicePasskey(
  user: { id: string; email: string; name: string; role?: string }
): Promise<{ success: boolean; error?: string; credential?: PasskeyCredentialData }> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn passkeys are not supported on this browser.' };
  }

  try {
    const hostname = window.location.hostname;
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userIdBuffer = new TextEncoder().encode(user.id || user.email);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'arogya rakshaa',
          id: hostname === 'localhost' ? 'localhost' : hostname,
        },
        user: {
          id: userIdBuffer,
          name: user.email || 'user@arogyaraksha.in',
          displayName: user.name || user.email || 'Arogya Raksha User',
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256 (ECDSA w/ SHA-256)
          { alg: -257, type: 'public-key' }, // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
        ],
        authenticatorSelection: {
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'No biometric credential received from authenticator.' };
    }

    const passkeyData: PasskeyCredentialData = {
      id: credential.id,
      rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
      type: credential.type,
      userEmail: user.email || 'user@arogyaraksha.in',
      userName: user.name || 'Arogya User',
      userRole: user.role || 'patient',
      createdAt: new Date().toISOString(),
    };

    saveStoredPasskey(passkeyData);
    return { success: true, credential: passkeyData };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Passkey creation was cancelled in the system dialog.' };
    }
    return { success: false, error: err.message || 'Passkey creation failed.' };
  }
}

/**
 * Authenticate with device passkey / biometric sensor
 * If no passkey has been registered yet, seamlessly initiates passkey creation!
 */
export async function authenticateWithPasskey(fallbackUser?: { email?: string; name?: string; role?: string }): Promise<{
  success: boolean;
  user?: { email: string; name: string; role: string };
  error?: string;
  isNewRegistration?: boolean;
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { success: false, error: 'WebAuthn passkeys are not supported on this browser.' };
  }

  const stored = getStoredPasskeys();

  // If no passkey registered yet on this device, prompt Windows Hello / Touch ID to create one!
  if (stored.length === 0) {
    const defaultEmail = fallbackUser?.email || localStorage.getItem('arogya-last-email') || 'patient@arogyaraksha.in';
    const defaultName = fallbackUser?.name || 'Arogya Raksha User';
    const defaultRole = fallbackUser?.role || localStorage.getItem('app-user-role') || 'patient';

    const regResult = await registerDevicePasskey({
      id: `usr-${Date.now()}`,
      email: defaultEmail,
      name: defaultName,
      role: defaultRole,
    });

    if (!regResult.success) {
      return { success: false, error: regResult.error };
    }

    return {
      success: true,
      user: {
        email: regResult.credential?.userEmail || defaultEmail,
        name: regResult.credential?.userName || defaultName,
        role: regResult.credential?.userRole || defaultRole,
      },
      isNewRegistration: true,
    };
  }

  try {
    const hostname = window.location.hostname;
    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    // Prepare allowCredentials for the known passkeys on this device
    const allowCredentials: PublicKeyCredentialDescriptor[] = stored.map((p) => ({
      id: Uint8Array.from(atob(p.rawId), (c) => c.charCodeAt(0)),
      type: 'public-key',
    }));

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: hostname === 'localhost' ? 'localhost' : hostname,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: 'preferred',
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Biometric verification did not return an assertion.' };
    }

    const matched = stored.find((p) => p.id === assertion.id) || stored[0];
    const email = matched?.userEmail || localStorage.getItem('arogya-last-email') || 'patient@arogyaraksha.in';
    const name = matched?.userName || 'Verified Biometric User';
    const role = matched?.userRole || localStorage.getItem('app-user-role') || 'patient';

    return {
      success: true,
      user: { email, name, role },
    };
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Biometric prompt was cancelled.' };
    }
    return { success: false, error: err.message || 'Biometric authentication failed.' };
  }
}
