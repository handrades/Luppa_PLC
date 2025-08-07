# Docker Troubleshooting Guide

This guide covers common Docker and Docker Swarm issues encountered during deployment and operation of the Luppa PLC Inventory System.

## Quick Diagnostic Commands

```bash
# Check system status
docker system info
docker system df
docker system events --since "1h"

# Check swarm status
docker node ls
docker service ls
docker stack ps luppa

# Check service health
docker service ps luppa_api --no-trunc
docker service logs luppa_api --tail 50
```

## Common Issues and Solutions

### 1. Docker Swarm Issues

#### Issue: Swarm Not Initialized

**Symptoms**: `This node is not a swarm manager`

**Solution**:

```bash
# Initialize swarm
docker swarm init

# Or join existing swarm
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

#### Issue: Node Not Available

**Symptoms**: Services not scheduling on nodes

**Diagnosis**:

```bash
docker node ls
docker node inspect <NODE-ID>
```

**Solutions**:

```bash
# Reactivate unavailable node
docker node update --availability active <NODE-ID>

# Rejoin node to swarm
docker swarm leave --force
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

#### Issue: Service Not Starting

**Symptoms**: Services stuck in "Pending" or "Starting" state

**Diagnosis**:

```bash
docker service ps luppa_api --no-trunc
docker service inspect luppa_api --pretty
```

**Common Causes and Solutions**:

1. **Resource Constraints**:

   ```bash
   # Check available resources
   docker system df
   docker stats
   
   # Reduce resource requirements
   docker service update --limit-memory 512m luppa_api
   ```

2. **Placement Constraints**:

   ```bash
   # Check node labels
   docker node inspect <NODE-ID> | grep -A 10 Labels
   
   # Add required labels
   docker node update --label-add postgres=true <NODE-ID>
   ```

3. **Image Pull Issues**:

   ```bash
   # Pull image manually on all nodes
   docker pull luppa-api:latest
   
   # Or use local registry
   docker service update --image localhost:5000/luppa-api:latest luppa_api
   ```

### 2. Container Health Issues

#### Issue: Container Keeps Restarting

**Symptoms**: Containers in restart loop

**Diagnosis**:

```bash
docker service logs luppa_api --tail 100
docker inspect <CONTAINER-ID>
```

**Common Solutions**:

1. **Application Startup Issues**:

   ```bash
   # Check application logs
   docker service logs luppa_api --tail 100 --follow
   
   # Increase startup timeout
   docker service update --health-start-period 120s luppa_api
   ```

2. **Resource Exhaustion**:

   ```bash
   # Increase memory limit
   docker service update --limit-memory 1g luppa_api
   
   # Check memory usage
   docker stats --no-stream
   ```

3. **Dependency Issues**:

   ```bash
   # Verify dependencies are healthy
   docker service ps luppa_postgres
   docker service ps luppa_redis
   
   # Restart dependent services
   docker service update --force luppa_api
   ```

#### Issue: Health Check Failures

**Symptoms**: Services marked as unhealthy

**Diagnosis**:

```bash
docker service inspect luppa_api | grep -A 10 Healthcheck
docker service logs luppa_api | grep health
```

**Solutions**:

```bash
# Test health check manually
docker exec <CONTAINER-ID> curl -f http://localhost:3000/health

# Adjust health check timing
docker service update --health-timeout 30s --health-retries 5 luppa_api

# Temporarily disable health check
docker service update --no-healthcheck luppa_api
```

### 3. Network Issues

#### Issue: Service Discovery Not Working

**Symptoms**: Services cannot connect to each other

**Diagnosis**:

```bash
docker network ls
docker network inspect luppa-prod-network
```

**Solutions**:

```bash
# Verify overlay network
docker network inspect luppa-prod-network | grep -A 5 Containers

# Test connectivity between services
docker exec -it <CONTAINER-ID> nslookup postgres
docker exec -it <CONTAINER-ID> ping postgres

# Recreate network if needed
docker network rm luppa-prod-network
docker stack deploy --compose-file docker-compose.swarm.yml luppa
```

#### Issue: External Access Not Working

**Symptoms**: Cannot access application from outside

**Diagnosis**:

```bash
# Check published ports
docker service inspect luppa_nginx | grep -A 10 Ports

# Test locally
curl -k https://localhost/health
```

**Solutions**:

```bash
# Check firewall rules
sudo ufw status
sudo firewall-cmd --list-all

# Verify port mapping
docker service update --publish-add 80:80 --publish-add 443:443 luppa_nginx

# Check load balancer configuration
docker service ps luppa_nginx
```

### 4. SSL/TLS Issues

#### Issue: SSL Certificate Problems

**Symptoms**: HTTPS not working, certificate errors

**Diagnosis**:

```bash
# Check certificate
openssl x509 -in infrastructure/ssl/server.crt -text -noout

# Verify certificate in container
docker exec luppa_nginx ls -la /etc/ssl/certs/
```

**Solutions**:

```bash
# Regenerate self-signed certificate
./infrastructure/ssl/generate-self-signed-cert.sh

# Update Docker secret
docker secret rm ssl-cert
docker secret create ssl-cert infrastructure/ssl/server.crt

# Restart nginx service
docker service update --force luppa_nginx
```

#### Issue: Mixed Content Warnings

**Symptoms**: Browser security warnings

**Solutions**:

1. Ensure all resources use HTTPS
2. Update `VITE_API_BASE_URL` to use HTTPS
3. Check CSP headers in Nginx configuration

### 5. Database Issues

#### Issue: PostgreSQL Connection Failures

**Symptoms**: Application cannot connect to database

**Diagnosis**:

```bash
docker service logs luppa_postgres
docker exec -it <POSTGRES-CONTAINER> pg_isready -U postgres
```

**Solutions**:

```bash
# Check database service
docker service ps luppa_postgres

# Test connection manually
docker exec -it <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod -c "SELECT 1;"

# Verify secrets
docker secret inspect postgres-password

# Check PgBouncer
docker service logs luppa_pgbouncer
```

#### Issue: Database Performance Problems

**Symptoms**: Slow queries, high CPU usage

**Diagnosis**:

```bash
# Check database performance
docker exec -it <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod -c "SELECT * FROM pg_stat_activity;"

# Check slow queries
docker exec -it <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

**Solutions**:

```bash
# Increase database resources
docker service update --limit-memory 4g --limit-cpus 2 luppa_postgres

# Run maintenance
docker exec <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod -c "VACUUM ANALYZE;"

# Update statistics
docker exec <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod -c "ANALYZE;"
```

### 6. Redis Issues

#### Issue: Redis Connection Failures

**Symptoms**: Session/cache operations failing

**Diagnosis**:

```bash
docker service logs luppa_redis
docker exec -it <REDIS-CONTAINER> redis-cli ping
```

**Solutions**:

```bash
# Test Redis connectivity
docker exec -it <REDIS-CONTAINER> redis-cli -a "$(docker secret inspect redis-password --format '{{.Spec.Data}}')" ping

# Check Redis configuration
docker exec -it <REDIS-CONTAINER> redis-cli CONFIG GET "*"

# Monitor Redis performance
docker exec -it <REDIS-CONTAINER> redis-cli INFO stats
```

### 7. Monitoring Issues

#### Issue: Grafana Not Accessible

**Symptoms**: Cannot access monitoring dashboard

**Diagnosis**:

```bash
docker service logs luppa_grafana
docker service ps luppa_grafana
```

**Solutions**:

```bash
# Check Grafana service
curl -k https://localhost/grafana/api/health

# Reset admin password
docker exec -it <GRAFANA-CONTAINER> grafana-cli admin reset-admin-password newpassword

# Verify configuration
docker config inspect grafana-config
```

#### Issue: Prometheus Not Collecting Metrics

**Symptoms**: No metrics data in Grafana

**Diagnosis**:

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check configuration
docker config inspect prometheus-config
```

**Solutions**:

```bash
# Reload Prometheus configuration
curl -X POST http://localhost:9090/-/reload

# Check service discovery
docker service logs luppa_prometheus
```

### 8. Performance Issues

#### Issue: High Resource Usage

**Symptoms**: System slow, high CPU/memory usage

**Diagnosis**:

```bash
# Check resource usage
docker stats --no-stream
docker system df

# Check service resources
docker service inspect luppa_api | grep -A 10 Resources
```

**Solutions**:

```bash
# Scale services
docker service scale luppa_api=3 luppa_web=2

# Increase resource limits
docker service update --limit-memory 2g --limit-cpus 2 luppa_api

# Clean up unused resources
docker system prune -f
docker volume prune -f
```

#### Issue: Slow Application Performance

**Symptoms**: Long response times, timeouts

**Diagnosis**:

```bash
# Check application metrics
curl https://localhost/api/metrics

# Monitor database performance
docker exec -it <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

**Solutions**:

1. Scale application services
2. Optimize database queries
3. Increase connection pool size
4. Enable Redis caching
5. Review and optimize resource limits

## Logging and Debugging

### Enable Debug Logging

```bash
# API service debug logging
docker service update --env-add LOG_LEVEL=debug luppa_api

# Nginx debug logging
docker service update --env-add NGINX_LOG_LEVEL=debug luppa_nginx
```

### Log Collection

```bash
# Collect all service logs
for service in $(docker service ls --format "{{.Name}}"); do
    echo "=== $service ===" >> all-logs.txt
    docker service logs $service --tail 100 >> all-logs.txt
    echo "" >> all-logs.txt
done
```

### System Monitoring

```bash
# Monitor system resources
watch -n 5 'docker stats --no-stream && echo "--- Disk Usage ---" && df -h'

# Monitor service status
watch -n 10 'docker stack ps luppa'
```

## Emergency Procedures

### Complete System Recovery

```bash
# 1. Stop all services
docker stack rm luppa

# 2. Clean up resources
docker system prune -af
docker volume prune -f
docker network prune -f

# 3. Redeploy from backup
docker stack deploy --compose-file docker-compose.swarm.yml luppa
```

### Data Recovery

```bash
# 1. Stop affected services
docker service scale luppa_api=0 luppa_web=0

# 2. Restore database from backup
docker exec -i <POSTGRES-CONTAINER> psql -U postgres -d luppa_prod < backup.sql

# 3. Restart services
docker service scale luppa_api=2 luppa_web=2
```

### Service Isolation

```bash
# Remove problematic service from load balancer
docker service update --replicas 0 luppa_api

# Run single instance for debugging
docker run -it --rm --network luppa-prod-network luppa-api:latest /bin/bash
```

## Support and Escalation

### Information Collection

When reporting issues, collect:

1. **System Information**:

   ```bash
   docker version
   docker system info
   uname -a
   free -h
   df -h
   ```

2. **Service Status**:

   ```bash
   docker stack ps luppa --no-trunc > service-status.txt
   docker service ls > service-list.txt
   ```

3. **Logs**:

   ```bash
   docker service logs luppa_api --tail 200 > api-logs.txt
   docker service logs luppa_nginx --tail 200 > nginx-logs.txt
   ```

4. **Configuration**:

   ```bash
   # Sanitize and include (remove sensitive data)
   cat .env.production | sed 's/PASSWORD=.*/PASSWORD=***/' > config.txt
   ```

### Performance Baseline

Establish performance baselines:

```bash
# CPU usage baseline
docker stats --no-stream | grep luppa

# Memory usage baseline  
docker service inspect luppa_api | jq '.[] | .Spec.TaskTemplate.Resources'

# Response time baseline
curl -w "@curl-format.txt" -o /dev/null -s https://localhost/api/health
```

Create `curl-format.txt`:

```text
     time_namelookup:  %{time_namelookup}s\n
        time_connect:  %{time_connect}s\n
     time_appconnect:  %{time_appconnect}s\n
    time_pretransfer:  %{time_pretransfer}s\n
       time_redirect:  %{time_redirect}s\n
  time_starttransfer:  %{time_starttransfer}s\n
                     ----------\n
          time_total:  %{time_total}s\n
```
