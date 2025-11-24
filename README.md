# راقب | Raqib - Index Management Platform

A comprehensive platform for managing and tracking organizational maturity indices with evidence-based assessment.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd index-tracker
```

2. Copy the environment configuration file
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:

#### Required Configuration

**Admin User Credentials:**
```env
ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

**JWT Secret Key:**
```bash
# Generate a secure secret key
openssl rand -hex 32
```
Then add it to `.env`:
```env
SECRET_KEY=your-generated-secret-key
```

**Email/SMTP Configuration:**
```env
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=your-email@example.com
```

**Frontend URL:**
```env
FRONTEND_URL=http://localhost:8080
```

4. Start the application
```bash
docker-compose up -d
```

5. Access the application
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Admin Credentials Management

### Changing Admin Credentials

The admin account is fully configurable through environment variables. To change the admin credentials:

1. **Edit the `.env` file:**
```env
ADMIN_EMAIL=new-admin@example.com
ADMIN_USERNAME=new-admin
ADMIN_PASSWORD=new-secure-password
```

2. **Update the database with new credentials:**
```bash
docker exec -t raqib-api python3 /app/scripts/seed_admin.py
```

3. **Restart the API container (if needed):**
```bash
docker-compose restart api
```

4. **Log in with your new credentials** at http://localhost:8080

### First-Time Setup

When you run the system for the first time, the admin account is automatically created using the credentials from your `.env` file.

**Default credentials** (if not configured in `.env`):
- Email: `admin@example.com`
- Username: `admin`
- Password: `Admin123`

⚠️ **Important**: Always change the default password in production environments.

## User Management

### Creating New Users

Administrators can create new users through the User Management interface:

1. Log in with admin credentials
2. Navigate to **User Management** → **System Users**
3. Click **Add New User**
4. Enter the user's email address
5. A temporary password will be sent to the user
6. Users complete their profile on first login

### User Roles

- **Admin**: Full system access and user management
- **Index Manager**: Manage indices and requirements
- **Section Coordinator**: Coordinate specific sections
- **Contributor**: Submit evidence and updates

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Database
- **Redis**: Caching and sessions
- **SQLAlchemy**: ORM
- **Alembic**: Database migrations

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool
- **Tailwind CSS**: Styling with RTL support
- **Zustand**: State management

## Project Structure

```
index-tracker/
├── api/                    # Backend API
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── models/        # Database models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utilities
│   ├── scripts/           # Management scripts
│   │   └── seed_admin.py  # Admin user setup
│   └── templates/         # Index templates
├── ui/                    # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # State management
│   │   └── utils/         # Utilities
│   └── public/            # Static assets
├── docker-compose.yml     # Docker orchestration
├── .env.example           # Environment template
└── README.md             # This file
```

## Docker Services

- **postgres**: PostgreSQL database (port 5432)
- **redis**: Redis cache (port 6379)
- **api**: FastAPI backend (port 8000)
- **ui**: React frontend (port 8080)

## Common Tasks

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f ui
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart api
```

### Rebuild Containers
```bash
# Rebuild all
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose build --no-cache ui
```

### Stop Application
```bash
docker-compose down
```

### Reset Database
```bash
docker-compose down -v
docker-compose up -d
```

## Database Management

### Access PostgreSQL
```bash
docker exec -it raqib-postgres psql -U raqib_user -d raqib_db
```

### Run Migrations
```bash
docker exec -t raqib-api alembic upgrade head
```

### Seed Sample Data
```bash
docker exec -t raqib-api python3 /app/scripts/seed_users.py
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_EMAIL` | Admin account email | `admin@example.com` |
| `ADMIN_USERNAME` | Admin account username | `admin` |
| `ADMIN_PASSWORD` | Admin account password | `Admin123` |
| `SECRET_KEY` | JWT signing key | *required* |
| `SMTP_USER` | SMTP account username | - |
| `SMTP_PASSWORD` | SMTP account password | - |
| `SMTP_FROM_EMAIL` | Email sender address | - |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:8080` |

## Features

### Index Management
- Create and manage multiple indices
- Import requirements from Excel templates
- Track progress and maturity levels
- Evidence-based assessments

### Requirements Tracking
- Hierarchical requirement structure
- Multiple maturity levels (0-5)
- Evidence submission and review
- Automated calculations

### User Management
- Role-based access control
- Email-based user creation
- First-time setup workflow
- Organizational hierarchy

### Reporting & Analytics
- Real-time dashboards
- Visual analytics and charts
- Gap analysis
- Export capabilities

### Bilingual Support
- Full Arabic and English interface
- RTL/LTR automatic switching
- Localized content

## Security Best Practices

1. **Always use strong passwords** for admin accounts
2. **Keep `.env` file secure** and never commit it to version control
3. **Generate unique SECRET_KEY** for each environment
4. **Use HTTPS** in production environments
5. **Regularly update** admin passwords
6. **Enable firewall** rules for database ports

## Troubleshooting

### Cannot log in with admin credentials
1. Verify credentials in `.env` file
2. Run the seed script: `docker exec -t raqib-api python3 /app/scripts/seed_admin.py`
3. Check API logs: `docker-compose logs -f api`

### Containers won't start
1. Check Docker is running
2. Verify port availability (5432, 6379, 8000, 8080)
3. Review logs: `docker-compose logs`

### UI shows old cached version
1. Clear browser cache
2. Rebuild UI: `docker-compose build --no-cache ui && docker-compose up -d ui`
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

## Support

For issues, questions, or contributions, please contact the development team.

## License

Proprietary - Ministry of Environment, Water and Agriculture

---

Built for the Saudi National Indices Platform
