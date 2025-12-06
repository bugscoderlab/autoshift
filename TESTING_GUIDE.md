# Mobile App Testing Guide - Database Connection

## 🎯 Purpose
Verify that the mobile app is fetching data from the **backend database** instead of mock data.

## ✅ Pre-Test Checklist

### 1. Backend Status
- ✅ Backend is running on `http://172.20.10.18:8000`
- ✅ All endpoints tested and working
- ✅ Database has correct data for John Doe (doctor_id: 1)

### 2. Mobile App Configuration
- ✅ API base URL updated to `172.20.10.18:8000` in `mobile-app/services/api.ts`
- ✅ Console logs enabled in `mobile-app/services/dataHooks.ts`

## 📱 Testing Steps

### Step 1: Reload the Mobile App
```bash
# In terminal, press 'r' to reload or restart the app
# This ensures it picks up the updated API configuration
```

### Step 2: Check Console Logs

Open the Expo console/terminal and watch for these log messages as you navigate through the app:

#### ✅ Expected Log Messages (DATABASE)

**When fetching from database successfully:**
```
📋 [DOCTORS] Fetching doctors with params: {...}
✅ [DOCTORS] Fetched from DATABASE: { count: 15, source: 'DATABASE', sample: 'John Doe' }

📅 [ROSTER] Fetching roster with params: { doctor_id: 1, ... }
✅ [ROSTER] Fetched from DATABASE: { count: 14, source: 'DATABASE', ... }

✈️ [LEAVE] Fetching leave requests with params: { doctor_id: 1 }
✅ [LEAVE] Fetched from DATABASE: { count: 2, source: 'DATABASE', ... }

🔄 [SWAP] Fetching swap requests with params: { doctor_id: 1 }
✅ [SWAP] Fetched from DATABASE: { count: 2, source: 'DATABASE', ... }
```

#### ❌ Bad Log Messages (MOCK)

**If using mock data (this should NOT happen if backend is working):**
```
⚠️ [DOCTORS] Backend unavailable, using mock data
📦 [DOCTORS] Returning MOCK DATA: { count: 7, source: 'MOCK', ... }
```

### Step 3: Test Each Tab

Navigate to each tab and verify the console shows **"✅ Fetched from DATABASE"**:

#### 1️⃣ Home Tab
**Expected Console Logs:**
```
📅 [ROSTER] Fetching roster with params: { doctor_id: 1, year: 2025, month: 12 }
✅ [ROSTER] Fetched from DATABASE: ...

✈️ [LEAVE] Fetching leave requests with params: { doctor_id: 1 }
✅ [LEAVE] Fetched from DATABASE: ...
```

**Expected Data:**
- Doctor Name: **John Doe**
- Leave Days Left: **31 days** (11 annual + 12 medical + 5 emergency + 3 other)
- Shifts This Month: **14 shifts**
- This Week's Shifts: Should show actual shifts from database

#### 2️⃣ Roster Tab
**Expected Console Logs:**
```
📅 [ROSTER] Fetching roster with params: { doctor_id: 1, year: 2025, month: 12 }
✅ [ROSTER] Fetched from DATABASE: { count: 14, source: 'DATABASE', ... }
```

**Expected Data:**
- Calendar should show **one color dot per day** (John Doe's shifts only)
- When clicking a date, should show **all doctors working that day** (3 shifts with 2-3 doctors each)
- Each shift should include **department** information

#### 3️⃣ Leave Tab
**Expected Console Logs:**
```
✈️ [LEAVE] Fetching leave requests with params: { doctor_id: 1 }
✅ [LEAVE] Fetched from DATABASE: { count: 2, source: 'DATABASE', ... }
```

**Expected Data:**
- **Leave Balance Cards:**
  - Annual: **11 days** remaining
  - Medical: **12 days** remaining
  - Emergency: **5 days** remaining
  - Other: **3 days** remaining
  
- **My Leave Requests:**
  - 1 Annual Leave (Dec 13-15) - **3 days** - Approved
  - 1 Medical Leave (Dec 27-28) - **2 days** - Approved

#### 4️⃣ Swap Tab
**Expected Console Logs:**
```
📅 [ROSTER] Fetching roster with params: { doctor_id: 1 }
✅ [ROSTER] Fetched from DATABASE: ...

🔄 [SWAP] Fetching swap requests with params: { doctor_id: 1 }
✅ [SWAP] Fetched from DATABASE: { count: 2, source: 'DATABASE', ... }
```

**Expected Data:**
- **My Shifts:** Should show John Doe's shifts with date, time, and **ward/department**
- **Swap Requests:** Should show 2 requests involving John Doe

#### 5️⃣ Doctors Tab
**Expected Console Logs:**
```
📋 [DOCTORS] Fetching doctors with params: { ... }
✅ [DOCTORS] Fetched from DATABASE: { count: 15, source: 'DATABASE', sample: 'John Doe' }
```

**Expected Data:**
- Should show **15 doctors** from database
- First doctor should be **John Doe**

## 🔍 Troubleshooting

### If you see "⚠️ Backend unavailable" or "MOCK DATA" logs:

1. **Check backend is running:**
   ```bash
   # In backend terminal, ensure you see:
   # INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

2. **Verify IP address:**
   ```bash
   # Run this in PowerShell:
   ipconfig | findstr "IPv4"
   
   # Update mobile-app/services/api.ts if IP changed
   ```

3. **Test backend directly:**
   ```bash
   # From backend directory:
   python test_all_endpoints.py
   
   # Should see: "5/6 tests passed" or "6/6 tests passed"
   ```

4. **Reload mobile app:**
   - Press 'r' in Expo terminal to reload
   - Or restart the app completely

5. **Check network connectivity:**
   - Ensure phone/emulator and computer are on same network
   - Disable any VPN or firewall blocking port 8000

## ✅ Success Criteria

**All these should be TRUE:**

- [ ] Console shows "✅ Fetched from DATABASE" for all data fetches
- [ ] No "⚠️ MOCK DATA" messages in console
- [ ] Home page shows "John Doe" with 31 days leave remaining
- [ ] Roster shows 14 shifts for John Doe in December 2025
- [ ] Leave tab shows 2 approved leaves (3 days + 2 days = 5 days used)
- [ ] Leave balance matches: 11 annual, 12 medical, 5 emergency, 3 other
- [ ] Swap tab shows 2 swap requests
- [ ] Doctors tab shows 15 doctors

## 📊 Expected Data Summary

### John Doe (doctor_id: 1)
- **Department:** Emergency
- **Role:** Senior Consultant
- **Leave Used:** 5 days (3 annual + 2 medical)
- **Leave Remaining:** 31 days (11 annual + 12 medical + 5 emergency + 3 other)
- **Shifts in Dec 2025:** 14 shifts (mix of morning, evening, and night)
- **Swap Requests:** 2 requests (1 as requester, 1 as target)

---

## 🎉 What Success Looks Like

When everything is working correctly, you should see:

1. **Console filled with ✅ green checkmarks** and "DATABASE" source indicators
2. **No mock data warnings**
3. **Real-time data** matching what's in the backend database
4. **Fast loading times** (data comes from local network)
5. **Consistent data** across all tabs

If you see all of this, congratulations! Your mobile app is successfully connected to the backend database! 🎊

