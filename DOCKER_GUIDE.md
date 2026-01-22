# 🐳 MentorLink Docker Deployment Guide

This guide explains how to deploy MentorLink using Docker containers.

## 📋 Prerequisites

1. **Docker Desktop** installed on your system
   - [Download for Windows](https://docs.docker.com/desktop/install/windows-install/)
   - [Download for Mac](https://docs.docker.com/desktop/install/mac-install/)
   - [Download for Linux](https://docs.docker.com/engine/install/)

2. **Docker Compose** (included with Docker Desktop)

3. **Git** (to clone the repository)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/mentorlink.git
cd mentorlink
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your values
# Windows: notepad .env
# Mac/Linux: nano .env
```

### 3. Update Environment Variables
Edit the `.env` file and set your values:

```env
# Database credentials
MONGO_USERNAME=admin
MONGO_PASSWORD=your_secure_password_here

# JWT Secret (minimum 32 characters)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email SMTP (Gmail example)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Client URL
CLIENT_URL=http://localhost
```

### 4. Build and Start Containers
```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### 5. Access the Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017

## 📦 Docker Services

| Service | Container Name | Port | Description |
|---------|----------------|------|-------------|
| Frontend | mentorlink-frontend | 80 | React app served by Nginx |
| Backend | mentorlink-backend | 5000 | Node.js Express API |
| MongoDB | mentorlink-mongodb | 27017 | Database |

## 🛠️ Common Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### View Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Rebuild Containers
```bash
# Rebuild all containers
docker-compose up --build -d

# Rebuild specific container
docker-compose up --build -d backend
```

### Check Container Status
```bash
docker-compose ps
```

### Access Container Shell
```bash
# Access backend container
docker exec -it mentorlink-backend sh

# Access MongoDB container
docker exec -it mentorlink-mongodb mongosh
```

## 🔧 Development Mode

For development with hot-reload:

```bash
# Run only MongoDB in Docker
docker-compose up -d mongodb

# Run frontend locally
npm run dev

# Run backend locally (in another terminal)
cd backend
npm run dev
```

## 📊 Health Checks

All services have built-in health checks:

```bash
# Check health status
docker-compose ps

# Manual health check
curl http://localhost:5000/api/health
curl http://localhost
```

## 🔄 Database Management

### Backup MongoDB
```bash
# Create backup
docker exec mentorlink-mongodb mongodump --out /data/backup --authenticationDatabase admin -u admin -p your_password

# Copy backup to host
docker cp mentorlink-mongodb:/data/backup ./mongodb-backup
```

### Restore MongoDB
```bash
# Copy backup to container
docker cp ./mongodb-backup mentorlink-mongodb:/data/backup

# Restore backup
docker exec mentorlink-mongodb mongorestore /data/backup --authenticationDatabase admin -u admin -p your_password
```

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend

# Rebuild from scratch
docker-compose down -v
docker-compose up --build
```

### MongoDB Connection Issues
```bash
# Verify MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker exec -it mentorlink-mongodb mongosh --eval "db.runCommand({ping:1})"
```

### Port Already in Use
```bash
# Find process using port 80
netstat -ano | findstr :80

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or change ports in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead
```

### Clear Everything and Start Fresh
```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v --rmi all

# Remove all unused Docker resources
docker system prune -a

# Rebuild
docker-compose up --build
```

## 🔐 Security Notes

1. **Never commit `.env` files** to version control
2. Use strong passwords for MongoDB and JWT secrets
3. In production, use HTTPS with proper SSL certificates
4. Keep Docker images updated for security patches

## 📝 Production Deployment

For production deployment:

1. Use a reverse proxy (Nginx/Traefik) with SSL
2. Set `NODE_ENV=production`
3. Use managed database services (MongoDB Atlas)
4. Enable container resource limits
5. Set up proper logging and monitoring

```yaml
# Example production limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

## 📞 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure all ports are available
4. Check Docker Desktop is running

---

Happy deploying! 🚀
