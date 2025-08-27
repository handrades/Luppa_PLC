# Docker Swarm Deployment Guide

This guide covers the complete setup and deployment of the Luppa PLC Inventory System using Docker Swarm for production environments.

## Prerequisites

### System Requirements

- **Docker Engine**: 20.10.0 or later
- **Docker Compose**: 2.0.0 or later
- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: Minimum 8GB, Recommended 16GB+
- **CPU**: Minimum 4 cores, Recommended 8 cores
- **Storage**: Minimum 100GB free space for data persistence

### Network Requirements

- Ports 80 (HTTP) and 443 (HTTPS) accessible from client machines
- Port 2377 (TCP) for Docker Swarm cluster management
- Ports 7946 (TCP/UDP) and 4789 (UDP) for overlay networking
- Internal network connectivity between all cluster nodes

## Quick Start

### 1. Initialize Production Environment

```powershell
# Navigate to the project root
cd /path/to/Luppa_PLC

# Copy production environment template
Copy-Item .env.production.example .env.production

# Edit production environment variables
# IMPORTANT: Change all default passwords and secrets!
nano .env.production
```

### 2. Initialize and Deploy

```powershell
# Run the deployment script with initialization
.\infrastructure\swarm\deploy.ps1 -Initialize
```

This will:

- Initialize Docker Swarm
- Create required directories
- Set node labels
- Create Docker secrets
- Deploy the complete stack
- Show deployment status

### 3. Verify Deployment

```powershell
# Check stack status
docker stack services luppa

# Check service logs
docker service logs luppa_api
docker service logs luppa_nginx
```

### 4. Access Applications

- **Main Application**: <https://your-domain.com>
- **Grafana Monitoring**: <https://your-domain.com/grafana>
- **API Health Check**: <https://your-domain.com/api/health>

## Detailed Setup Instructions

### Step 1: Environment Configuration

#### Production Environment Variables

Edit `.env.production` with your specific values:

```bash
# Critical security settings - MUST be changed!
GRAFANA_ADMIN_PASSWORD=your_secure_admin_password
GRAFANA_SECRET_KEY=your_grafana_secret_key_32_chars
CORS_ORIGIN=https://your-production-domain.com
VITE_API_URL=https://your-production-domain.com/api/v1

# SSL configuration
SSL_COMMON_NAME=your-production-domain.com

# Resource limits (adjust based on your hardware)
POSTGRES_MEMORY_LIMIT=2g
REDIS_MEMORY_LIMIT=2g
API_REPLICAS=2
WEB_REPLICAS=2
```

#### Docker Secrets

The deployment script will prompt for these sensitive values:

1. **PostgreSQL Password**: Database admin password
2. **Redis Password**: Redis authentication password
3. **JWT Secret**: Application JWT signing key (minimum 32 characters)
4. **SSL Certificates**: Provide paths or generate self-signed

### Step 2: SSL Certificate Setup

#### Option 1: Self-Signed Certificates (Development/Internal)

```bash
# The deployment script will generate these automatically
# Or manually run:
./infrastructure/ssl/generate-self-signed-cert.sh
```

#### Option 2: Production Certificates

```bash
# Place your certificates in infrastructure/ssl/
cp your-cert.crt infrastructure/ssl/server.crt
cp your-private-key.key infrastructure/ssl/server.key

# Create Docker secrets
docker secret create ssl-cert infrastructure/ssl/server.crt
docker secret create ssl-key infrastructure/ssl/server.key
```

### Step 3: Docker Swarm Initialization

#### Single Node Setup

```bash
# Initialize swarm
docker swarm init

# Label the node for service placement
docker node update --label-add postgres=true $(docker node ls -q)
docker node update --label-add redis=true $(docker node ls -q)
docker node update --label-add monitoring=true $(docker node ls -q)
```

#### Multi-Node Cluster

```bash
# On manager node
docker swarm init --advertise-addr <MANAGER-IP>

# On worker nodes (use token from manager)
docker swarm join --token <TOKEN> <MANAGER-IP>:2377

# Label nodes for service placement
docker node update --label-add postgres=true <NODE-ID>
docker node update --label-add redis=true <NODE-ID>
docker node update --label-add monitoring=true <MANAGER-NODE-ID>
```

### Step 4: Data Persistence

#### Create Data Directories

```bash
# Create directories for persistent data
sudo mkdir -p /opt/luppa/data/{postgres,redis,grafana,prometheus}
sudo chown -R root:root /opt/luppa/data
sudo chmod -R 755 /opt/luppa/data
```

#### Backup Configuration

Set up regular backups for critical data:

```bash
# PostgreSQL backup script (example)
#!/bin/bash
docker exec luppa_postgres pg_dump -U postgres luppa_prod > /backup/luppa_$(date +%Y%m%d).sql

# Redis backup (RDB files are automatically saved to /opt/luppa/data/redis)
```

### Step 5: Deploy the Stack

```bash
# Navigate to swarm directory
cd infrastructure/swarm

# Deploy with environment file
docker stack deploy --env-file ../../.env.production --compose-file docker-compose.swarm.yml luppa
```

## Service Configuration

### Service Scaling

```bash
# Scale API service
docker service scale luppa_api=3

# Scale web service
docker service scale luppa_web=2
```

### Rolling Updates

```bash
# Update API service
docker service update --image luppa-api:v2.0.0 luppa_api

# Update with zero downtime
docker service update --update-parallelism 1 --update-delay 10s luppa_api
```

### Service Monitoring

```bash
# View service status
docker stack ps luppa

# Check service logs
docker service logs -f luppa_api

# Monitor resource usage
docker stats $(docker ps -q)
```

## Monitoring Setup

### Grafana Configuration

1. Access Grafana at `https://your-domain.com/grafana`
2. Login with admin credentials from `.env.production`
3. Dashboards are automatically provisioned
4. Prometheus data source is pre-configured

### Prometheus Configuration

- Metrics collection interval: 15 seconds
- Data retention: 30 days
- Storage location: `/opt/luppa/data/prometheus`

### Custom Dashboards

Add custom dashboards to:

```text
infrastructure/monitoring/grafana/dashboards/
```

## Maintenance Operations

### Health Checks

```bash
# Check all services
docker stack ps luppa --no-trunc

# Test application endpoints
curl -k https://your-domain.com/health
curl -k https://your-domain.com/api/health

# Check database connectivity
docker exec -it luppa_postgres pg_isready
```

### Log Management

```bash
# View service logs
docker service logs luppa_api --tail 100 --follow

# Container logs
docker logs <container-id> --tail 100 --follow

# System logs
journalctl -u docker --since "1 hour ago"
```

### Database Maintenance

```bash
# Connect to PostgreSQL
docker exec -it luppa_postgres psql -U postgres -d luppa_prod

# Run VACUUM and ANALYZE
docker exec luppa_postgres psql -U postgres -d luppa_prod -c "VACUUM ANALYZE;"

# Check database size
docker exec luppa_postgres psql -U postgres -d luppa_prod -c "SELECT pg_size_pretty(pg_database_size('luppa_prod'));"
```

## Security Considerations

### Network Security

- All inter-service communication uses encrypted overlay networks
- External access only through Nginx reverse proxy
- Rate limiting configured for all endpoints

### Secrets Management

- All sensitive data stored as Docker secrets
- Secrets are encrypted at rest and in transit
- Regular secret rotation recommended

### SSL/TLS Configuration

- TLS 1.2 and 1.3 only
- Strong cipher suites configured
- HSTS headers enabled
- Certificate auto-renewal setup recommended

## Performance Tuning

### Resource Allocation

Adjust resource limits in `docker-compose.swarm.yml`:

```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: "2.0"
    reservations:
      memory: 1G
      cpus: "1.0"
```

### Database Optimization

PostgreSQL performance tuning is applied via `infrastructure/postgres/initdb/01-performance.sql`:

- Connection pooling via PgBouncer
- Optimized memory settings
- WAL configuration for performance
- Vacuum and statistics configuration

### Redis Optimization

Redis is configured for optimal performance:

- AOF and RDB persistence
- Memory eviction policy: `allkeys-lru`
- Connection keep-alive
- Compression enabled

## Troubleshooting

See [Docker Troubleshooting Guide](./docker-troubleshooting.md) for common issues and solutions.

## Disaster Recovery

### Backup Procedures

1. **Database Backup**:

   ```bash
   docker exec luppa_postgres pg_dump -U postgres luppa_prod > backup.sql
   ```

2. **Volume Backup**:

   ```bash
   docker run --rm -v luppa_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data.tar.gz -C /data .
   ```

3. **Configuration Backup**:

   ```bash
   tar czf config-backup.tar.gz infrastructure/ .env.production
   ```

### Recovery Procedures

1. **Restore Database**:

   ```bash
   docker exec -i luppa_postgres psql -U postgres -d luppa_prod < backup.sql
   ```

2. **Restore Volumes**:

   ```bash
   docker run --rm -v luppa_postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-data.tar.gz -C /data
   ```

## Air-Gapped Environment Considerations

For deployment in air-gapped networks:

1. **Image Management**:
   - Pre-pull all required Docker images
   - Set up local Docker registry if needed
   - Update image references in compose files

2. **Certificate Management**:
   - Use internal CA certificates
   - Configure custom root certificates

3. **Time Synchronization**:
   - Configure local NTP servers
   - Ensure accurate time across all nodes

4. **DNS Configuration**:
   - Set up internal DNS resolution
   - Configure custom DNS servers
