# 🗄️ Database Migration Guide - Quick Reference

## ⚡ Quick Start (Easiest Method)

```bash
cd fastapi-backend
source myvenv/bin/activate
python migrate.py
```

That's it! The script handles everything automatically.

---

## 📋 Step-by-Step Instructions

### 1. **Backup Your Database First!** ⚠️

```bash
# Stop your FastAPI server first
# Then backup:

# For SQLite:
cp hospital_roster.db hospital_roster.db.backup

# For TiDB/MySQL:
mysqldump -h your-host -u your-user -p hospital_roster > backup_$(date +%Y%m%d).sql
```

### 2. **Run the Migration**

**Method A: Using Python Script (Recommended)**
```bash
cd fastapi-backend
source myvenv/bin/activate
python migrate.py
```

**Method B: Manual SQL (if needed)**
```bash
# For TiDB/MySQL:
mysql -h your-host -u your-user -p hospital_roster < migrations/001_remove_shift_types.sql

# For SQLite:
sqlite3 hospital_roster.db < migrations/001_remove_shift_types_sqlite.sql
```

### 3. **Verify the Migration**

```bash
python check_db.py
```

Check the output - you should only see these shift types:
- ✅ morning
- ✅ afternoon  
- ✅ evening
- ✅ night

❌ No more: resus, edx, auc

### 4. **Test Your Application**

```bash
python run.py
```

Try these actions:
- ✅ View the roster calendar
- ✅ Generate a new roster
- ✅ Create shift requests
- ✅ Create leave requests

### 5. **Clean Up (Optional)**

Once everything works, remove backup tables:

```sql
DROP TABLE IF EXISTS monthlyroster_backup;
DROP TABLE IF EXISTS shiftrequest_backup;
```

---

## 🔄 What the Migration Does

### Data Changes:
```
resus  → morning  ✅
edx    → morning  ✅
auc    → morning  ✅
off    → deleted  🗑️
```

### Schema Changes:
- Updates `monthlyroster` table to only allow 4 shift types
- Updates `shiftrequest` table to only allow 4 shift types
- Updates `weeklyfixedpattern` entries with old shift types

---

## 🆘 Troubleshooting

### Problem: "Permission Denied"
**Solution:**
```bash
chmod +x migrate.py
# Or run with: python migrate.py
```

### Problem: "Database connection failed"
**Solution:**
Check your `.env` file:
```bash
cat .env
# Verify DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
```

### Problem: "Migration already run"
**Solution:**
Check if backup tables exist:
```sql
SHOW TABLES LIKE '%backup%';
-- If they exist, migration was already run
```

### Problem: "Need to rollback"
**Solution:**
```bash
# Restore from your backup
cp hospital_roster.db.backup hospital_roster.db

# Or from SQL dump:
mysql -h host -u user -p database < backup_20250106.sql
```

---

## 📊 Verification Queries

Run these to check your data after migration:

```sql
-- Check shift type distribution
SELECT shift_type, COUNT(*) as count 
FROM monthlyroster 
GROUP BY shift_type;

-- Check for any old shift types (should return 0)
SELECT COUNT(*) 
FROM monthlyroster 
WHERE shift_type IN ('resus', 'edx', 'auc', 'off');

-- Check weekly patterns
SELECT pattern_name, day_1, day_2, day_3, day_4, day_5 
FROM weeklyfixedpattern;
```

---

## 🎯 Expected Results

After migration, your database should have:

| Shift Type | Time Range | Count |
|------------|-----------|-------|
| morning | 08:00-16:00 | varies |
| afternoon | 12:00-20:00 | varies |
| evening | 16:00-00:00 | varies |
| night | 00:00-08:00 | varies |

All your old `resus`, `edx`, and `auc` shifts should now be `morning` shifts.

---

## 📞 Need Help?

1. Check `migrations/README.md` for detailed documentation
2. Review the SQL files in `migrations/` directory
3. Run `python check_db.py` to diagnose issues
4. Check application logs: `tail -f logs/app.log`

---

## ✅ Checklist

- [ ] Backup database
- [ ] Stop FastAPI server
- [ ] Run migration (`python migrate.py`)
- [ ] Verify results (`python check_db.py`)
- [ ] Test application
- [ ] Remove backup tables
- [ ] Restart application in production

---

**Remember:** Always backup before running migrations! 💾

