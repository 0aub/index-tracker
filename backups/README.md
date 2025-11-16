# Database Backup & Restore Instructions

This directory contains database backups for the Raqib Index Tracker application.

## Creating a Backup (on current device)

To create a new backup, run:

```bash
docker exec raqib-postgres pg_dump -U raqib_user raqib_db > backups/database_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Restoring Data on Another Device

After cloning the repository on a new device, follow these steps:

### 1. Copy the Backup File

Copy the latest backup file (e.g., `database_backup_20251116_033525.sql`) to the `backups/` directory on your new device.

### 2. Start the Services

On the new device, start the Docker containers:

```bash
docker compose up -d
```

Wait for all services to be healthy (about 30-60 seconds).

### 3. Restore the Database

Import the backup into the database:

```bash
docker exec -i raqib-postgres psql -U raqib_user -d raqib_db < backups/database_backup_YYYYMMDD_HHMMSS.sql
```

Replace `YYYYMMDD_HHMMSS` with your actual backup filename timestamp.

### 4. Verify the Restoration

Check that the data was restored correctly:

```bash
# Check number of tables
docker exec raqib-postgres psql -U raqib_user -d raqib_db -c "\dt"

# Check number of requirements (example)
docker exec raqib-postgres psql -U raqib_user -d raqib_db -c "SELECT COUNT(*) FROM requirements;"
```

### 5. Access the Application

Open your browser and navigate to:
- UI: http://localhost:8080
- API: http://localhost:8000/docs

## Alternative: Fresh Start on New Device

If you want to start fresh without importing data:

1. Clone the repository
2. Run `docker compose up -d`
3. The database will be created automatically with empty tables

## Troubleshooting

### Database Connection Issues

If you get connection errors, ensure all containers are healthy:

```bash
docker compose ps
```

All services should show "healthy" status.

### Import Errors

If the import fails, try dropping and recreating the database first:

```bash
# Stop the services
docker compose down

# Remove the volume
docker volume rm index-tracker_postgres_data

# Start services again
docker compose up -d

# Wait for healthy status, then import
docker exec -i raqib-postgres psql -U raqib_user -d raqib_db < backups/your_backup.sql
```

## Database Credentials

- **User**: raqib_user
- **Password**: raqib_pass
- **Database**: raqib_db
- **Port**: 5432

These are defined in `docker-compose.yml`.
