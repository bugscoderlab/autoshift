# 🧪 Testing Auto IP Detection

## Quick Test Steps

### 1. Restart Your Mobile App

```bash
# In the Expo terminal, press 'r' to reload
# Or stop and restart:
# Ctrl+C
# npx expo start
```

### 2. Watch the Console

You should see these logs when the app starts:

```
🔍 [API Config] Searching for backend server...
🔍 [API Config] Trying last successful IP: 172.20.10.18
✅ [API Config] Found backend at last IP: 172.20.10.18
🌐 [API] Initialized with base URL: http://172.20.10.18:8000
```

Or if it's the first time:

```
🔍 [API Config] Searching for backend server...
🔍 [API Config] Scanning 65 common IPs...
✅ [API Config] Found backend at: 192.168.1.5
🌐 [API] Initialized with base URL: http://192.168.1.5:8000
```

### 3. Navigate Through the App

Open each tab and verify you see:

```
📋 [DOCTORS] Fetching doctors...
✅ [DOCTORS] Fetched from DATABASE: { count: 15, source: 'DATABASE', ... }

📅 [ROSTER] Fetching roster...
✅ [ROSTER] Fetched from DATABASE: { count: 14, source: 'DATABASE', ... }
```

## Test Scenarios

### ✅ Test 1: Same Device, Same Network
**Expected:** Instant connection using cached IP

**Steps:**
1. Open app
2. Check console for "Found backend at last IP"
3. Navigate to any tab
4. Verify "Fetched from DATABASE"

**Result:** Should connect in < 1 second

---

### ✅ Test 2: Simulate IP Change
**Expected:** Auto-detects new IP

**Steps:**
1. Change your computer's IP (or restart router)
2. Restart mobile app
3. Check console for "Scanning common IPs"
4. Should find new IP within 2-5 seconds

**Result:** Should auto-detect and connect

---

### ✅ Test 3: Different Device
**Expected:** Works without any code changes

**Steps:**
1. Install app on another phone/emulator
2. Start app
3. Check console for auto-detection
4. Navigate through tabs

**Result:** Should work automatically

---

### ✅ Test 4: Backend Offline
**Expected:** Falls back to mock data

**Steps:**
1. Stop the backend server
2. Restart mobile app
3. Check console for "Could not find backend"
4. Navigate to any tab
5. Should see "Using MOCK DATA"

**Result:** App still works with mock data

---

## Success Indicators

✅ **Auto-Detection Working:**
- Console shows "Found backend at: ..."
- Data fetched from DATABASE
- No manual IP configuration needed

✅ **Caching Working:**
- Second launch uses "last successful IP"
- Connects faster (< 1 second)

✅ **Fallback Working:**
- When backend offline, uses mock data
- App doesn't crash

## Troubleshooting

### If auto-detection fails:

1. **Check backend is running:**
   ```bash
   # Should see:
   # INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

2. **Check your computer's IP:**
   ```bash
   ipconfig | findstr "IPv4"
   # Note the IP address
   ```

3. **Verify IP is in common ranges:**
   - 192.168.1.x ✅
   - 192.168.0.x ✅
   - 172.20.10.x ✅
   - 192.168.43.x ✅
   - 10.0.0.x ✅
   
   If your IP is different (e.g., 192.168.50.x), add it to `apiConfig.ts`:
   ```typescript
   const commonPrefixes = [
     '192.168.1',
     '192.168.0',
     '192.168.50',  // Add your range
     // ...
   ];
   ```

4. **Test manually:**
   ```bash
   # From your phone's browser, try:
   http://YOUR_IP:8000/health
   
   # Should see:
   # {"status":"healthy","database":"connected","ai_enabled":true}
   ```

## Expected Console Output (Full Flow)

```
🔍 [API Config] Searching for backend server...
🔍 [API Config] Trying last successful IP: 172.20.10.18
✅ [API Config] Found backend at last IP: 172.20.10.18
🌐 [API] Initialized with base URL: http://172.20.10.18:8000

📋 [DOCTORS] Fetching doctors with params: {}
✅ [API] Backend available at http://172.20.10.18:8000
✅ [DOCTORS] Fetched from DATABASE: { count: 15, source: 'DATABASE', sample: 'John Doe' }

📅 [ROSTER] Fetching roster with params: { doctor_id: 1, year: 2025, month: 12 }
✅ [ROSTER] Fetched from DATABASE: { count: 14, source: 'DATABASE', ... }

✈️ [LEAVE] Fetching leave requests with params: { doctor_id: 1 }
✅ [LEAVE] Fetched from DATABASE: { count: 2, source: 'DATABASE', ... }

🔄 [SWAP] Fetching swap requests with params: { doctor_id: 1 }
✅ [SWAP] Fetched from DATABASE: { count: 2, source: 'DATABASE', ... }
```

**If you see this, everything is working perfectly!** 🎉

