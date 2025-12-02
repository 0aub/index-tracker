# Server Migration Guide - Raqib Index Tracker

Complete guide to migrate the entire Raqib application to a new server.

## 📋 What Will Be Migrated

- Docker containers and images
- PostgreSQL database with all data
- Redis cache data
- Uploaded files and evidence documents
- Application code
- Environment configuration
- Docker volumes

---

## 🔧 Prerequisites on New Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt-get update && sudo apt-get install -y git

# Verify installations
docker --version
docker-compose --version
git --version
```

---

## 📦 Step 1: Backup on Current Server

### 1.1 Create Backup Directory
```bash
cd /Users/aub/Documents/boo/index-tracker
mkdir -p migration_backup
cd migration_backup
```

### 1.2 Export Database
```bash
# Create PostgreSQL backup
docker exec raqib-postgres pg_dump -U raqib_user raqib_db > database_backup.sql

# Verify backup file
ls -lh database_backup.sql
```

### 1.3 Export Docker Volumes
```bash
# Backup PostgreSQL volume
docker run --rm -v index-tracker_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_volume.tar.gz -C /data .

# Check if volume backup exists
ls -lh postgres_volume.tar.gz
```

### 1.4 Backup Uploaded Files (Evidence Documents)
```bash
# Backup uploads directory from API container
docker cp raqib-api:/app/uploads ./uploads_backup

# Verify uploads backup
ls -lah uploads_backup/
```

### 1.5 Backup Environment Files
```bash
# Copy .env file (IMPORTANT: Contains secrets!)
cd ..
cp .env migration_backup/.env.backup

# Create environment template for new server
cat > migration_backup/.env.template << 'EOF'
# Database Configuration
POSTGRES_USER=raqib_user
POSTGRES_PASSWORD=<YOUR_STRONG_PASSWORD>
POSTGRES_DB=raqib_db
DATABASE_URL=postgresql://raqib_user:<YOUR_STRONG_PASSWORD>@postgres:5432/raqib_db

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# API Configuration
API_SECRET_KEY=<GENERATE_NEW_SECRET_KEY>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Frontend Configuration (for production)
# VITE_API_URL=https://your-domain.com/api
EOF
```

### 1.6 Create Full Application Archive
```bash
cd /Users/aub/Documents/boo/index-tracker

# Create tarball of entire application (excluding node_modules, venv, etc.)
tar --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='.git' \
    --exclude='migration_backup/uploads_backup' \
    -czf migration_backup/application_code.tar.gz .

# Verify archive
ls -lh migration_backup/application_code.tar.gz
```

### 1.7 Create Migration Package
```bash
cd migration_backup

# Create final migration package
tar -czf ../raqib_migration_package.tar.gz .

cd ..
ls -lh raqib_migration_package.tar.gz
```

---

## 🚀 Step 2: Transfer to New Server

### Option A: Using SCP (Secure Copy)
```bash
# From current server, copy to new server
scp raqib_migration_package.tar.gz username@new-server-ip:/home/username/

# Or using rsync for better progress tracking
rsync -avz --progress raqib_migration_package.tar.gz username@new-server-ip:/home/username/
```

### Option B: Using Cloud Storage (AWS S3, Google Cloud Storage, etc.)
```bash
# Upload to S3 (example)
aws s3 cp raqib_migration_package.tar.gz s3://your-bucket/raqib_migration_package.tar.gz

# Download on new server
aws s3 cp s3://your-bucket/raqib_migration_package.tar.gz .
```

### Option C: Using USB/External Drive (for local migration)
```bash
# Copy to external drive
cp raqib_migration_package.tar.gz /Volumes/ExternalDrive/

# Then physically connect to new server and copy
```

---

## 🏗️ Step 3: Setup on New Server

### 3.1 Extract Migration Package
```bash
# SSH into new server
ssh username@new-server-ip

# Create application directory
mkdir -p ~/raqib-app
cd ~/raqib-app

# Extract migration package
tar -xzf ~/raqib_migration_package.tar.gz

# Extract application code
tar -xzf application_code.tar.gz

ls -la
```

### 3.2 Configure Environment
```bash
# Create .env file from backup
cp .env.backup .env

# IMPORTANT: Generate new secrets
# Generate new SECRET_KEY
openssl rand -hex 32

# Edit .env file with new secrets
nano .env
# Update:
# - POSTGRES_PASSWORD (use a strong password)
# - API_SECRET_KEY (use generated key above)
# - DATABASE_URL (update with new password)
# - ALLOWED_ORIGINS (update with new domain if applicable)
```

### 3.3 Restore Database
```bash
# Start only PostgreSQL first
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
sleep 10

# Restore database
docker exec -i raqib-postgres psql -U raqib_user -d raqib_db < database_backup.sql

# Verify database restoration
docker exec -it raqib-postgres psql -U raqib_user -d raqib_db -c "SELECT COUNT(*) FROM users;"
docker exec -it raqib-postgres psql -U raqib_user -d raqib_db -c "SELECT COUNT(*) FROM indices;"
docker exec -it raqib-postgres psql -U raqib_user -d raqib_db -c "SELECT COUNT(*) FROM requirements;"
```

### 3.4 Restore Uploaded Files
```bash
# Copy uploads back to API container (after starting it)
docker-compose up -d api

# Wait for container to be ready
sleep 5

# Copy uploads directory
docker cp uploads_backup/. raqib-api:/app/uploads/

# Verify uploads
docker exec raqib-api ls -la /app/uploads/
```

### 3.5 Start All Services
```bash
# Start all remaining services
docker-compose up -d

# Check all containers are running
docker-compose ps

# Check logs for any errors
docker-compose logs -f --tail=50
```

### 3.6 Run Database Migrations (if any)
```bash
# Create notifications table (if not already created)
docker exec raqib-api python3 /app/scripts/create_notifications_table.py

# Verify migrations
docker exec -it raqib-postgres psql -U raqib_user -d raqib_db -c "\dt"
```

---

## ✅ Step 4: Verification

### 4.1 Check Container Status
```bash
# All containers should be running
docker-compose ps

# Expected output:
# raqib-postgres   running
# raqib-redis      running
# raqib-api        running
# raqib-ui         running
```

### 4.2 Check Database
```bash
# Connect to database
docker exec -it raqib-postgres psql -U raqib_user -d raqib_db

# Run verification queries
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as index_count FROM indices;
SELECT COUNT(*) as requirement_count FROM requirements;
SELECT COUNT(*) as evidence_count FROM evidence;
SELECT COUNT(*) as task_count FROM tasks;
SELECT COUNT(*) as notification_count FROM notifications;

# Exit
\q
```

### 4.3 Check API
```bash
# Test API health
curl http://localhost:8000/health || curl http://localhost:8000/

# Test API docs
curl http://localhost:8000/docs
```

### 4.4 Check Frontend
```bash
# Test frontend (adjust port if different)
curl http://localhost:3000 || curl http://localhost:80
```

### 4.5 Check Uploads Directory
```bash
# Verify uploads are accessible
docker exec raqib-api ls -la /app/uploads/

# Check file count
docker exec raqib-api find /app/uploads/ -type f | wc -l
```

---

## 🔒 Step 5: Security Hardening (Production)

### 5.1 Configure Firewall
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 5.2 Setup Nginx Reverse Proxy (Optional but Recommended)
```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/raqib

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/raqib /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.3 Setup SSL with Let's Encrypt (Recommended for Production)
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test renewal
sudo certbot renew --dry-run
```

---

## 🔄 Step 6: Setup Automatic Backups on New Server

### 6.1 Create Backup Script
```bash
# Create backup directory
mkdir -p ~/backups

# Create backup script
cat > ~/backup_raqib.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR=~/raqib-app

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Backup database
docker exec raqib-postgres pg_dump -U raqib_user raqib_db > $BACKUP_DIR/$DATE/database.sql

# Backup uploads
docker cp raqib-api:/app/uploads $BACKUP_DIR/$DATE/

# Compress backup
cd $BACKUP_DIR
tar -czf raqib_backup_$DATE.tar.gz $DATE
rm -rf $DATE

# Keep only last 7 backups
ls -t raqib_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup completed: $BACKUP_DIR/raqib_backup_$DATE.tar.gz"
EOF

# Make executable
chmod +x ~/backup_raqib.sh
```

### 6.2 Setup Cron Job for Daily Backups
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * ~/backup_raqib.sh >> ~/backups/backup.log 2>&1
```

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL logs
docker logs raqib-postgres

# Reset database password
docker exec -it raqib-postgres psql -U postgres
ALTER USER raqib_user WITH PASSWORD 'new_password';
```

### Container Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port Conflicts
```bash
# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :3000
sudo lsof -i :8000
sudo lsof -i :5432
sudo lsof -i :6379

# Update docker-compose.yml ports if needed
```

### Uploads Not Accessible
```bash
# Check permissions
docker exec raqib-api ls -la /app/uploads/

# Fix permissions
docker exec raqib-api chown -R root:root /app/uploads/
docker exec raqib-api chmod -R 755 /app/uploads/
```

---

## 📞 Support

If you encounter any issues during migration:

1. Check container logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Check database connectivity: `docker exec -it raqib-postgres psql -U raqib_user -d raqib_db`
4. Review this guide step by step

---

## ✨ Success Checklist

- [ ] All containers running (postgres, redis, api, ui)
- [ ] Database restored with all data
- [ ] Uploads directory restored
- [ ] Can access frontend at http://[server-ip]:80
- [ ] Can access API at http://[server-ip]:8000
- [ ] Can login with existing credentials
- [ ] Can see existing indices and requirements
- [ ] Can upload new evidence
- [ ] Notifications working
- [ ] Tasks working
- [ ] Backups configured
- [ ] Firewall configured (if production)
- [ ] SSL configured (if production)

---

**Note**: This migration can be done with zero or minimal downtime by setting up the new server while the old one is still running, then switching DNS/traffic when ready.
