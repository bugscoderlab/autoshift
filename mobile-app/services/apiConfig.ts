/**
 * API Configuration with Auto IP Detection
 * 
 * This module provides multiple strategies to automatically find the backend server:
 * 1. Try multiple common IPs in your local network range
 * 2. Store the last successful IP for faster reconnection
 * 3. Allow manual override via AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_API_URL = '@autoshift:api_url';
const STORAGE_KEY_LAST_IP = '@autoshift:last_successful_ip';

// Default port
const API_PORT = 8000;

/**
 * Generate common IP addresses to try based on the device's network
 * This covers most home/office network configurations
 */
const generateCommonIPs = (): string[] => {
  const ips: string[] = [];
  
  // Common router IP ranges
  const commonPrefixes = [
    '192.168.1',    // Most common home router range
    '192.168.0',    // Alternative common range
    '192.168.43',   // Mobile hotspot range
    '10.0.0',       // Some corporate networks
    '172.20.10',    // iOS hotspot range
  ];
  
  // For each prefix, try common host numbers
  commonPrefixes.forEach(prefix => {
    // Try common computer IPs (skip router IPs like .1)
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 20, 50, 100].forEach(host => {
      ips.push(`${prefix}.${host}`);
    });
  });
  
  return ips;
};

/**
 * Test if a given IP has the backend running
 */
async function testIP(ip: string, timeout: number = 2000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`http://${ip}:${API_PORT}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Find the backend server by trying multiple IPs
 */
async function findBackendIP(): Promise<string | null> {
  console.log('🔍 [API Config] Searching for backend server...');
  
  // 1. Try last successful IP first (if available)
  try {
    const lastIP = await AsyncStorage.getItem(STORAGE_KEY_LAST_IP);
    if (lastIP) {
      console.log(`🔍 [API Config] Trying last successful IP: ${lastIP}`);
      if (await testIP(lastIP, 1000)) {
        console.log(`✅ [API Config] Found backend at last IP: ${lastIP}`);
        return lastIP;
      }
    }
  } catch (error) {
    console.log('⚠️ [API Config] Could not read last IP from storage');
  }
  
  // 2. Try common IPs in parallel (batches of 5 for efficiency)
  const commonIPs = generateCommonIPs();
  console.log(`🔍 [API Config] Scanning ${commonIPs.length} common IPs...`);
  
  const batchSize = 5;
  for (let i = 0; i < commonIPs.length; i += batchSize) {
    const batch = commonIPs.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (ip) => {
        const success = await testIP(ip, 1500);
        if (success) {
          console.log(`✅ [API Config] Found backend at: ${ip}`);
        }
        return { ip, success };
      })
    );
    
    // Return first successful IP
    const found = results.find(r => r.success);
    if (found) {
      // Save for next time
      await AsyncStorage.setItem(STORAGE_KEY_LAST_IP, found.ip);
      return found.ip;
    }
  }
  
  console.log('❌ [API Config] Could not find backend server on any common IP');
  return null;
}

/**
 * Get or detect the API base URL
 */
export async function getApiBaseUrl(): Promise<string> {
  // For Android emulator, always use special address
  if (Platform.OS === 'android' && __DEV__) {
    // Check if it's an emulator by trying 10.0.2.2
    try {
      if (await testIP('10.0.2.2', 1000)) {
        console.log('✅ [API Config] Using Android emulator address: 10.0.2.2');
        return `http://10.0.2.2:${API_PORT}`;
      }
    } catch {
      // Not an emulator, continue to normal detection
    }
  }
  
  // For web, use localhost
  if (Platform.OS === 'web') {
    return `http://localhost:${API_PORT}`;
  }
  
  // Check if user has manually set an IP
  try {
    const manualUrl = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (manualUrl) {
      console.log(`✅ [API Config] Using manually configured URL: ${manualUrl}`);
      return manualUrl;
    }
  } catch {
    // Ignore storage errors
  }
  
  // Auto-detect the IP
  const detectedIP = await findBackendIP();
  if (detectedIP) {
    return `http://${detectedIP}:${API_PORT}`;
  }
  
  // Fallback to a default (will likely fail, but provides clear error)
  console.log('⚠️ [API Config] Using fallback IP, backend may not be reachable');
  return `http://192.168.1.2:${API_PORT}`;
}

/**
 * Manually set the API URL (for settings screen)
 */
export async function setManualApiUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_API_URL, url);
  console.log(`✅ [API Config] Manually set API URL: ${url}`);
}

/**
 * Clear manual API URL (revert to auto-detection)
 */
export async function clearManualApiUrl(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_API_URL);
  console.log('✅ [API Config] Cleared manual API URL, will auto-detect');
}

/**
 * Get the current API URL (cached or from storage)
 */
let cachedApiUrl: string | null = null;
let lastCacheTime: number = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function getCurrentApiUrl(forceRefresh: boolean = false): Promise<string> {
  const now = Date.now();
  
  if (!forceRefresh && cachedApiUrl && (now - lastCacheTime) < CACHE_DURATION) {
    return cachedApiUrl;
  }
  
  cachedApiUrl = await getApiBaseUrl();
  lastCacheTime = now;
  return cachedApiUrl;
}

/**
 * Test the current configuration
 */
export async function testCurrentConfiguration(): Promise<{ success: boolean; url: string; message: string }> {
  try {
    const url = await getCurrentApiUrl(true);
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        url,
        message: `Connected to backend at ${url}. Status: ${data.status}`
      };
    } else {
      return {
        success: false,
        url,
        message: `Backend responded with error: ${response.status}`
      };
    }
  } catch (error) {
    const url = cachedApiUrl || 'Unknown';
    return {
      success: false,
      url,
      message: `Cannot reach backend: ${String(error)}`
    };
  }
}

