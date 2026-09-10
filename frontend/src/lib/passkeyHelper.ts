/**
 * Production-Quality Supabase Auth WebAuthn Passkey System for Arogya Rakshaa
 * Works like GitHub's passkey system:
 * - Direct browser/device WebAuthn APIs via Supabase Auth GoTrue
 * - No custom QR codes or fake device trust
 * - Zero private key storage in database or frontend
 * - Cryptographically verified by Supabase Auth backend
 * - Cross-device sync via native FIDO2 / Passkey managers (iCloud Keychain, Google Password Manager, Windows Hello)
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SupabasePasskeyItem {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

/**
 * Checks if the current browser and platform support WebAuthn Passkeys.
 */
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

/**
 * Formats Supabase Auth and WebAuthn errors into clear, user-friendly messages.
 */
export function formatPasskeyError(err: any): string {
  if (!err) return 'An unexpected passkey error occurred.';

  const code = (err.code || err.name || '').toString().toLowerCase();
  const msg = (err.message || '').toString().toLowerCase();

  // 1. Not found or ceremony cancelled
  if (
    code.includes('notallowed') ||
    code.includes('aborted') ||
    code.includes('cancel') ||
    msg.includes('notallowed') ||
    msg.includes('cancelled') ||
    msg.includes('canceled') ||
    msg.includes('no credential') ||
    msg.includes('not found') ||
    code === 'webauthn_credential_not_found'
  ) {
    return 'No passkey is available on this device. Please sign in using your email/Google account and add a passkey from Security Settings.';
  }

  // 2. Passkey disabled on Supabase project
  if (code.includes('disabled') || msg.includes('disabled') || code === 'passkey_disabled') {
    return 'Passkey authentication is not enabled in your Supabase project. Please enable it in Authentication → Passkeys in your Supabase Dashboard.';
  }

  // 3. Credential already registered
  if (code.includes('already_registered') || code.includes('exists') || code === 'webauthn_credential_exists') {
    return 'A passkey for this device or account is already registered.';
  }

  // 4. Challenge expired / timed out
  if (code.includes('expired') || code.includes('timeout') || code === 'webauthn_challenge_expired') {
    return 'Passkey ceremony timed out. Please try again.';
  }

  // 5. Verification failed
  if (code.includes('verification_failed') || code === 'webauthn_verification_failed') {
    return 'Passkey cryptographic verification failed. Please try again or sign in with your password.';
  }

  // 6. Email not confirmed
  if (code.includes('email_not_confirmed') || msg.includes('email not confirmed')) {
    return 'Your email address is not verified. Please verify your email before using passkeys.';
  }

  // 7. User banned / deactivated
  if (code.includes('user_banned') || msg.includes('banned') || msg.includes('deactivated')) {
    return 'This account has been deactivated.';
  }

  // 8. Unsupported browser
  if (msg.includes('support') && msg.includes('webauthn')) {
    return 'Your current browser does not support WebAuthn passkeys. Please use a modern browser like Chrome, Edge, or Safari.';
  }

  return err.message || 'Passkey authentication failed. Please try again.';
}

/**
 * Sign in with a Passkey (discoverable credential ceremony).
 * Does NOT require the user to enter an email first.
 * The browser's native passkey picker discovers the registered passkey.
 */
export async function signInWithSupabasePasskey(): Promise<{
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot authenticate passkey on server side.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const supported = await isPasskeySupported();
  if (!supported) {
    return {
      success: false,
      error: 'WebAuthn passkeys are not supported on this browser or platform.',
    };
  }

  try {
    // Calling Supabase official signInWithPasskey API
    const res = await supabase.auth.signInWithPasskey();

    if (res.error) {
      return {
        success: false,
        error: formatPasskeyError(res.error),
      };
    }

    if (!res.data?.session || !res.data?.user) {
      return {
        success: false,
        error: 'No active session returned after passkey authentication.',
      };
    }

    return {
      success: true,
      user: res.data.user,
      session: res.data.session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatPasskeyError(err),
    };
  }
}

/**
 * Register a new Passkey for the currently authenticated user.
 * Opens native prompt (Windows Hello, Touch ID, Face ID, PIN, or Password Manager).
 */
export async function registerSupabasePasskey(friendlyName?: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Cannot register passkey on server side.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const supported = await isPasskeySupported();
  if (!supported) {
    return {
      success: false,
      error: 'WebAuthn passkeys are not supported on this browser or platform.',
    };
  }

  // Ensure user is authenticated before registering a passkey
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session?.user) {
    return {
      success: false,
      error: 'You must be signed in to add a passkey. Please sign in first.',
    };
  }

  try {
    // Calling Supabase official registerPasskey API
    const res = await supabase.auth.registerPasskey();

    if (res.error) {
      return {
        success: false,
        error: formatPasskeyError(res.error),
      };
    }

    // Optionally update friendly name if provided and passkey ID is available
    if (friendlyName && res.data?.id && typeof supabase.auth.passkey?.update === 'function') {
      try {
        await supabase.auth.passkey.update({
          passkeyId: res.data.id,
          friendlyName,
        });
      } catch (nameErr) {
        console.warn('Could not update passkey friendly name:', nameErr);
      }
    }

    return {
      success: true,
      data: res.data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatPasskeyError(err),
    };
  }
}

/**
 * Lists all passkeys registered for the current authenticated user from Supabase Auth.
 */
export async function listSupabasePasskeys(): Promise<{
  success: boolean;
  passkeys: SupabasePasskeyItem[];
  error?: string;
}> {
  if (!isSupabaseConfigured || typeof window === 'undefined') {
    return { success: true, passkeys: [] };
  }

  try {
    if (typeof supabase.auth.passkey?.list === 'function') {
      const res = await supabase.auth.passkey.list();
      if (res.error) {
        return { success: false, passkeys: [], error: formatPasskeyError(res.error) };
      }
      return { success: true, passkeys: (res.data || []) as SupabasePasskeyItem[] };
    }
    return { success: true, passkeys: [] };
  } catch (err: any) {
    return { success: false, passkeys: [], error: formatPasskeyError(err) };
  }
}

/**
 * Renames a registered passkey.
 */
export async function renameSupabasePasskey(
  passkeyId: string,
  friendlyName: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    if (typeof supabase.auth.passkey?.update === 'function') {
      const res = await supabase.auth.passkey.update({
        passkeyId,
        friendlyName,
      });
      if (res.error) {
        return { success: false, error: formatPasskeyError(res.error) };
      }
      return { success: true };
    }
    return { success: false, error: 'Passkey rename is not supported on this client.' };
  } catch (err: any) {
    return { success: false, error: formatPasskeyError(err) };
  }
}

/**
 * Deletes/revokes a registered passkey.
 */
export async function deleteSupabasePasskey(
  passkeyId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    if (typeof supabase.auth.passkey?.delete === 'function') {
      const res = await supabase.auth.passkey.delete({
        passkeyId,
      });
      if (res.error) {
        return { success: false, error: formatPasskeyError(res.error) };
      }
      return { success: true };
    }
    return { success: false, error: 'Passkey delete is not supported on this client.' };
  } catch (err: any) {
    return { success: false, error: formatPasskeyError(err) };
  }
}

// Backward-compatibility aliases for existing imports
export const authenticateWithPasskey = signInWithSupabasePasskey;
export const registerDevicePasskey = registerSupabasePasskey;
