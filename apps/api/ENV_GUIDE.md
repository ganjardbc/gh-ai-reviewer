# Environment Configuration Guide

## 📋 Overview

This document explains the environment variables used in the GH Skeleton API project.

## 🚀 Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Update the values** in `.env` according to your local setup

3. **Verify database connection:**
   ```bash
   mysql -u root -h localhost -P 3306 db_gh_skeleton
   ```

## 📝 Environment Variables

### Database Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | MySQL connection string | `mysql://root:@localhost:3306/db_project_skeleton` | ✅ Yes |

**Format:** `mysql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]`

### Application Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | ✅ Yes |
| `NODE_ENV` | Environment mode | `development` | ✅ Yes |

**NODE_ENV Options:** `development`, `production`, `test`

### JWT Authentication

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT signing | `your_secret_here` | ✅ Yes |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` | ✅ Yes |

⚠️ **IMPORTANT:** Change `JWT_SECRET` to a strong random string in production!

**Generate secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### API Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_PREFIX` | API route prefix | `api` | ❌ No |
| `API_VERSION` | API version | `v1` | ❌ No |

**Result:** Routes will be accessible at `/api/v1/*`

### CORS Configuration

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `CORS_ORIGIN` | Allowed origins (comma-separated) | `http://localhost:3000,http://localhost:5173` | ✅ Yes |

**For production:**
```env
CORS_ORIGIN="https://yourdomain.com,https://app.yourdomain.com"
```

### Logging

| Variable | Description | Options | Required |
|----------|-------------|---------|----------|
| `LOG_LEVEL` | Logging verbosity | `error`, `warn`, `info`, `debug` | ❌ No |

### Optional: Rate Limiting

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `RATE_LIMIT_TTL` | Time window in seconds | `60` | ❌ No |
| `RATE_LIMIT_MAX` | Max requests per window | `100` | ❌ No |

### Optional: File Upload

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MAX_FILE_SIZE` | Max file size in bytes | `5242880` (5MB) | ❌ No |
| `UPLOAD_PATH` | Upload directory | `./uploads` | ❌ No |

## 🔒 Security Best Practices

### Development
- ✅ Use `.env` for local development
- ✅ Keep `.env` in `.gitignore`
- ✅ Use simple secrets for testing

### Production
- ⚠️ **NEVER** commit `.env` to version control
- ⚠️ Use strong, random `JWT_SECRET` (32+ characters)
- ⚠️ Use environment-specific secrets
- ⚠️ Enable HTTPS only
- ⚠️ Restrict CORS origins
- ⚠️ Enable rate limiting
- ⚠️ Use database user with limited privileges
- ⚠️ Set strong database password

## 🧪 Testing Configuration

Create `.env.test` for testing:

```env
DATABASE_URL="mysql://root:@localhost:3306/db_project_skeleton_test"
NODE_ENV=test
JWT_SECRET="test_secret_do_not_use_in_production"
JWT_EXPIRES_IN="1h"
LOG_LEVEL="error"
```

## 📚 Additional Resources

- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## ✅ Verification Checklist

Before running the application:

- [ ] `.env` file exists
- [ ] `DATABASE_URL` is correct
- [ ] Database exists and is accessible
- [ ] `JWT_SECRET` is set (and changed from default in production)
- [ ] `PORT` is available
- [ ] `CORS_ORIGIN` includes your frontend URL
- [ ] All required variables are set

## 🆘 Troubleshooting

### Database Connection Failed

```bash
# Test MySQL connection
mysql -u root -h localhost -P 3306 db_project_skeleton

# Check if database exists
mysql -u root -e "SHOW DATABASES LIKE 'db_project_skeleton';"
```

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Or change PORT in .env
PORT=3001
```

### JWT Secret Not Set

```bash
# Generate a secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
