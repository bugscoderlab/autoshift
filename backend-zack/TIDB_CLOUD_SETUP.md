# TiDB Cloud Setup Guide

This guide helps you configure the Hospital Roster Management System to work with TiDB Cloud.

## Prerequisites

- TiDB Cloud account and cluster
- Connection credentials from TiDB Cloud console
- Python environment set up (see main SETUP.md)

## Step 1: Get Your TiDB Cloud Connection String

1. Log in to [TiDB Cloud Console](https://tidbcloud.com)
2. Navigate to your cluster
3. Click **"Connect"** → **"Standard Connection"**
4. You'll see connection details:
   - **Host**: e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`
   - **Port**: `4000` (default)
   - **User**: Usually `root`
   - **Password**: Your cluster password
   - **Database**: Your database name (create one if needed)

## Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```env
# Database (TiDB) Configuration
DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_NAME=hospital_roster
DB_USER=root
DB_PASSWORD=YOUR_PASSWORD_HERE

# FastAPI Configuration
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
FASTAPI_DEBUG=false

# AI Configuration
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_API_BASE_URL=https://api.anthropic.com/v1
GROQ_API_KEY=your_groq_api_key_here
GROQ_API_BASE_URL=https://api.groq.com/openai/v1
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7

# Logging Configuration
LOG_PATH=logs/app.log
LOG_LEVEL=INFO
```

### Configuration Details

- `DB_HOST`: Your TiDB Cloud host (e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`)
- `DB_PORT`: Usually `4000` for TiDB Cloud
- `DB_NAME`: Your database name (create `hospital_roster` if it doesn't exist)
- `DB_USER`: Usually `root` for TiDB Cloud
- `DB_PASSWORD`: Your TiDB Cloud cluster password

**Note**: SSL is automatically enabled when TiDB Cloud host patterns are detected.

## Step 3: Create Database (if needed)

If you haven't created the `hospital_roster` database yet:

1. Connect to your TiDB Cloud cluster using a MySQL client or TiDB Cloud console
2. Run:
   ```sql
   CREATE DATABASE IF NOT EXISTS hospital_roster;
   ```

## Step 4: Initialize Database Schema

Run the initialization script:

```bash
python -m app.db.init_db
```

Or use the SQL script:

```bash
# Using TiDB Cloud console SQL editor, or
# Using mysql client:
mysql -h YOUR_HOST -P 4000 -u root -p hospital_roster < schema.sql
```

## Step 5: Test Connection

Start the application:

```bash
uvicorn main:app --reload
```

Check the health endpoint:

```bash
curl http://localhost:8000/health
```

## SSL/TLS Configuration

TiDB Cloud requires SSL/TLS connections. The system automatically handles this:

1. **Automatic SSL**: If your connection string contains "tidb-cloud" or SSL certificates are configured, SSL will be enabled automatically.

2. **Manual SSL Configuration**: If you have SSL certificate files:
   ```env
   DATABASE_SSL_CA=/path/to/ca.pem
   DATABASE_SSL_CERT=/path/to/client-cert.pem
   DATABASE_SSL_KEY=/path/to/client-key.pem
   ```

3. **SSL Certificate Verification**: Set `DATABASE_SSL_VERIFY_CERT=false` only if you're using self-signed certificates (not recommended for production).

## Troubleshooting

### Connection Timeout
- Check your TiDB Cloud cluster is running
- Verify the host and port are correct
- Ensure your IP is whitelisted in TiDB Cloud (if IP whitelist is enabled)

### SSL Errors
- Ensure `pymysql` and `cryptography` packages are installed
- Check that SSL certificates are valid (if using custom certificates)
- Try setting `DATABASE_SSL_VERIFY_CERT=false` temporarily for testing

### Authentication Errors
- Verify username and password are correct
- Check that the user has proper permissions
- Ensure the database exists

### Port Issues
- TiDB Cloud uses port `4000` by default
- Some regions may use different ports - check your TiDB Cloud console

## Security Best Practices

1. **Never commit `.env` file**: It contains sensitive credentials
2. **Use environment variables in production**: Set them in your deployment platform
3. **Rotate passwords regularly**: Update passwords in TiDB Cloud console
4. **Use SSL**: Always use SSL for TiDB Cloud connections
5. **IP Whitelisting**: Configure IP whitelist in TiDB Cloud for additional security

## Additional Resources

- [TiDB Cloud Documentation](https://docs.pingcap.com/tidbcloud/)
- [TiDB Cloud Connection Guide](https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster)
- [PyMySQL SSL Configuration](https://pymysql.readthedocs.io/en/latest/user/examples.html#ssl-connections)

