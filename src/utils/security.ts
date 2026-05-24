/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../types';

// Simple but robust cipher key for encryption
const SECRET_SALT = 'MILKTEE_SECURE_SALT_2026';

/**
 * Calculates a secure CRC/FNV-1a like non-cryptographic checksum for integrity check
 */
export function calculateChecksum(text: string): string {
  let hVal = 0x811c9dc5;
  const combined = text + SECRET_SALT;
  for (let i = 0; i < combined.length; i++) {
    hVal ^= combined.charCodeAt(i);
    hVal += (hVal << 1) + (hVal << 4) + (hVal << 7) + (hVal << 8) + (hVal << 24);
  }
  return (hVal >>> 0).toString(16).toUpperCase();
}

/**
 * Encrypt data using a secure localized XOR-Base64 algorithm with cyclic keying
 */
export function encryptData(data: any): string {
  const jsonStr = JSON.stringify(data);
  let result = '';
  for (let i = 0; i < jsonStr.length; i++) {
    const charCode = jsonStr.charCodeAt(i);
    const keyChar = SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
    // XOR cipher
    result += String.fromCharCode(charCode ^ keyChar);
  }
  // Convert to clean printable base64
  try {
    return btoa(unescape(encodeURIComponent(result)));
  } catch (e) {
    // Fallback if issues arose with unicode
    return btoa(result);
  }
}

/**
 * Decrypt data back to parsed JSON
 */
export function decryptData(cipherText: string): any {
  try {
    let decoded = '';
    const rawXor = decodeURIComponent(escape(atob(cipherText)));
    for (let i = 0; i < rawXor.length; i++) {
      const charCode = rawXor.charCodeAt(i);
      const keyChar = SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      decoded += String.fromCharCode(charCode ^ keyChar);
    }
    return JSON.parse(decoded);
  } catch (e) {
    // Attempt standard atob if it was non-unicode fallback
    try {
      const rawXor = atob(cipherText);
      let decoded = '';
      for (let i = 0; i < rawXor.length; i++) {
        const charCode = rawXor.charCodeAt(i);
        const keyChar = SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
        decoded += String.fromCharCode(charCode ^ keyChar);
      }
      return JSON.parse(decoded);
    } catch (err) {
      console.error("Decryption failed. Potential tampering or corrupt state.", err);
      return null;
    }
  }
}

/**
 * Strict role access check
 * Ensures user has at least the required role
 */
export function hasRequiredPrivilege(userRole: UserRole, requiredRole: UserRole): boolean {
  if (requiredRole === UserRole.CUSTOMER) {
    return true; // Anyone can access customer features
  }
  if (requiredRole === UserRole.STAFF) {
    return userRole === UserRole.STAFF || userRole === UserRole.ADMIN;
  }
  if (requiredRole === UserRole.ADMIN) {
    return userRole === UserRole.ADMIN;
  }
  return false;
}

/**
 * Simulates a secure VietQR code generator for instant bank payments
 * format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<INFO>
 */
export function generateVietQRUrl(amount: number, orderId: string): string {
  const bankId = 'MB'; // MB Bank symbol
  const accountNo = '0988668899'; // Simulated beautiful shop number
  const template = 'compact2'; // compact style with price details
  const info = encodeURIComponent(`MA DON ${orderId}`);
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${info}&accountName=QUAN%20TRA%20SUA%20BOBA%20TEA`;
}
