# Data Migration Guide

This guide explains how to migrate all your data (database, uploaded files, Redis cache) from one machine to another.

## Overview

Your application data is stored in three places:
1. **PostgreSQL Database** - All structured data (users, indices, requirements, evidence metadata, etc.)
2. **Uploaded Files** - Evidence documents, attachments, etc. (in `/app/uploads` or Docker volume)
3. **Redis** - Cache and session data

## Option 1: Complete System Migration (Recommended)

This method migrates everything including Docker volumes.

### On Source Machine (Current)

```bash
# 1. Stop the containers
cd /Users/aub/Documents/boo/index-tracker
docker-compose down

# 2. Create backup directory
mkdir -p ~/backup/index-tracker-data

# 3. Export PostgreSQL database
docker-compose up -d postgres
docker exec raqib-postgres pg_dump -U raqib_user -d raqib_db -F c -f /tmp/database_backup.dump
docker cp raqib-postgres:/tmp/database_backup.dump ~/backup/index-tracker-data/

# 4. Backup uploaded files (evidence, attachments, etc.)
# Method A: If using bind mount
cp -r api/uploads ~/backup/index-tracker-data/uploads

# Method B: If using Docker volume
docker run --rm -v index-tracker_uploads:/uploads -v ~/backup/index-tracker-data:/backup alpine tar czf /backup/uploads.tar.gz -C /uploads .

# 5. Package everything for transfer
cd ~
tar czf index-tracker-full-backup.tar.gz backup/index-tracker-data

# 6. Transfer to new machine (choose one method):
# Via SCP:
scp index-tracker-full-backup.tar.gz user@new-machine:/path/to/destination/

# Via external drive:
# Copy index-tracker-full-backup.tar.gz to external drive
```

### On Target Machine (New)

```bash
# 1. Install prerequisites
# Install Docker and Docker Compose if not already installed
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 2. Clone the repository
git clone https://github.com/0aub/index-tracker.git
cd index-tracker

# 3. Extract backup
tar xzf ~/index-tracker-full-backup.tar.gz -C ~/

# 4. Restore database
# Start only PostgreSQL first
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
sleep 10

# Restore the database
docker cp ~/backup/index-tracker-data/database_backup.dump raqib-postgres:/tmp/
docker exec raqib-postgres pg_restore -U raqib_user -d raqib_db -c /tmp/database_backup.dump

# 5. Restore uploaded files
# Method A: If using bind mount
mkdir -p api/uploads
cp -r ~/backup/index-tracker-data/uploads/* api/uploads/

# Method B: If using Docker volume
docker run --rm -v index-tracker_uploads:/uploads -v ~/backup/index-tracker-data:/backup alpine tar xzf /backup/uploads.tar.gz -C /uploads

# 6. Update .env file with your settings
cp .env.example .env
nano .env  # Update database credentials, secrets, etc.

# 7. Start all services
docker-compose up -d

# 8. Verify everything is working
docker-compose ps
docker logs raqib-api
docker logs raqib-postgres
```

## Option 2: Database-Only Migration (Faster)

If you only need to migrate the database and can regenerate other data:

### On Source Machine

```bash
# Export database
docker exec raqib-postgres pg_dump -U raqib_user -d raqib_db > database_backup.sql

# Compress it
gzip database_backup.sql

# Transfer to new machine
scp database_backup.sql.gz user@new-machine:/path/
```

### On Target Machine

```bash
# Clone repo and setup
git clone https://github.com/0aub/index-tracker.git
cd index-tracker
cp .env.example .env
nano .env  # Configure settings

# Start PostgreSQL
docker-compose up -d postgres
sleep 10

# Restore database
gunzip database_backup.sql.gz
docker exec -i raqib-postgres psql -U raqib_user -d raqib_db < database_backup.sql

# Start all services
docker-compose up -d
```

## Option 3: Using Docker Volume Backup/Restore

### On Source Machine

```bash
# Stop containers
docker-compose down

# List volumes
docker volume ls | grep index-tracker

# Backup each volume
docker run --rm -v index-tracker_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
docker run --rm -v index-tracker_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
docker run --rm -v index-tracker_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz -C /data .

# Transfer tar.gz files to new machine
```

### On Target Machine

```bash
# Clone repo
git clone https://github.com/0aub/index-tracker.git
cd index-tracker

# Create volumes
docker-compose up -d postgres redis
docker-compose down

# Restore volumes
docker run --rm -v index-tracker_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
docker run --rm -v index-tracker_redis_data:/data -v $(pwd):/backup alpine tar xzf /backup/redis_data.tar.gz -C /data
docker run --rm -v index-tracker_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/uploads.tar.gz -C /data

# Start all services
docker-compose up -d
```

## Important Configuration Files

Make sure to copy/update these files on the new machine:

1. **`.env`** - Environment variables (database credentials, secrets, etc.)
2. **`docker-compose.yml`** - Should already be in the repo
3. **`nginx.conf`** (if customized) - Nginx configuration for UI

## Verification Checklist

After migration, verify:

- [ ] All containers are running: `docker-compose ps`
- [ ] Database is accessible: `docker exec raqib-postgres psql -U raqib_user -d raqib_db -c "SELECT COUNT(*) FROM users;"`
- [ ] Uploaded files exist: `docker exec raqib-api ls -lah /app/uploads`
- [ ] API is responding: `curl http://localhost:8000/health`
- [ ] UI is accessible: Open `http://localhost:8080` in browser
- [ ] Login works with existing credentials
- [ ] Can view indices, requirements, and evidence
- [ ] Can upload new files

## Docker Volume Locations

Your Docker volumes are stored at:
- **Linux**: `/var/lib/docker/volumes/`
- **macOS**: `~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/`
- **Windows**: `C:\ProgramData\Docker\volumes\`

## Troubleshooting

### Database connection errors
```bash
# Check PostgreSQL logs
docker logs raqib-postgres

# Verify database credentials in .env match docker-compose.yml
```

### Missing uploaded files
```bash
# Check volume mount
docker inspect raqib-api | grep -A 10 Mounts

# Verify files in volume
docker exec raqib-api ls -lah /app/uploads
```

### Permission issues
```bash
# Fix permissions on uploaded files
docker exec raqib-api chown -R root:root /app/uploads
docker exec raqib-api chmod -R 755 /app/uploads
```

## Performance Optimization

For large databases (>1GB), consider:

1. **Use pg_dump custom format** (already done in Option 1)
2. **Compress backups**: Already using gzip/tar.gz
3. **Use parallel transfer**: `rsync -avz --progress`
4. **Split large files**:
   ```bash
   split -b 500M database_backup.dump database_backup.dump.part
   # Transfer parts separately, then reassemble:
   cat database_backup.dump.part* > database_backup.dump
   ```

## Automated Backup Script

Create a backup script for regular backups:

```bash
#!/bin/bash
# save as backup.sh

BACKUP_DIR=~/backups/index-tracker/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
docker exec raqib-postgres pg_dump -U raqib_user -d raqib_db -F c -f /tmp/backup.dump
docker cp raqib-postgres:/tmp/backup.dump $BACKUP_DIR/

# Backup uploads
docker run --rm -v index-tracker_uploads:/uploads -v $BACKUP_DIR:/backup alpine tar czf /backup/uploads.tar.gz -C /uploads .

echo "Backup completed: $BACKUP_DIR"

# Keep only last 7 days of backups
find ~/backups/index-tracker/ -type d -mtime +7 -exec rm -rf {} \;
```

Make it executable and run:
```bash
chmod +x backup.sh
./backup.sh
```

Add to crontab for daily backups:
```bash
crontab -e
# Add this line for daily backup at 2 AM:
0 2 * * * /path/to/backup.sh
```

## Support

If you encounter issues during migration:
1. Check Docker logs: `docker-compose logs`
2. Verify all containers are running: `docker-compose ps`
3. Check database connectivity: `docker exec raqib-postgres psql -U raqib_user -d raqib_db -c "\l"`
4. Review this guide's troubleshooting section
