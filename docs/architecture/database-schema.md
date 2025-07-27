# Database Schema

```sql
-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE equipment_type AS ENUM ('PRESS', 'ROBOT', 'OVEN', 'CONVEYOR', 'ASSEMBLY_TABLE', 'OTHER');
CREATE TYPE tag_data_type AS ENUM ('BOOL', 'INT', 'DINT', 'REAL', 'STRING', 'TIMER', 'COUNTER');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Roles table (shared across framework)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    permissions JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table (shared across framework)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

-- Sites table
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_sites_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_sites_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Cells table
CREATE TABLE cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    line_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_cells_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    CONSTRAINT fk_cells_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_cells_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT uk_cells_site_line UNIQUE (site_id, line_number)
);

-- Equipment table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    equipment_type equipment_type NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_equipment_cell FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE CASCADE,
    CONSTRAINT fk_equipment_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_equipment_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- PLCs table
CREATE TABLE plcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL,
    tag_id VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    ip_address INET,
    firmware_version VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_plcs_equipment FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    CONSTRAINT fk_plcs_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_plcs_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT uk_plcs_ip_address UNIQUE (ip_address),
    CONSTRAINT check_ip_format CHECK (ip_address IS NULL OR family(ip_address) = 4)
);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plc_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    data_type tag_data_type NOT NULL,
    description TEXT,
    address VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    CONSTRAINT fk_tags_plc FOREIGN KEY (plc_id) REFERENCES plcs(id) ON DELETE CASCADE,
    CONSTRAINT fk_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_tags_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),
    CONSTRAINT uk_tags_plc_name UNIQUE (plc_id, name)
);

-- Audit logs table (enhanced for ISO compliance)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    risk_level risk_level DEFAULT 'LOW',
    compliance_notes TEXT,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Notifications table (framework feature)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_cells_site_id ON cells(site_id);
CREATE INDEX idx_equipment_cell_id ON equipment(cell_id);
CREATE INDEX idx_plcs_equipment_id ON plcs(equipment_id);
CREATE INDEX idx_plcs_make_model ON plcs(make, model);
CREATE INDEX idx_plcs_tag_id ON plcs(tag_id);
CREATE INDEX idx_tags_plc_id ON tags(plc_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_data_type ON tags(data_type);

-- Audit log indexes
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level) WHERE risk_level IN ('HIGH', 'CRITICAL');

-- Created/Updated by indexes for all tables
CREATE INDEX idx_sites_created_by ON sites(created_by);
CREATE INDEX idx_sites_updated_by ON sites(updated_by);
CREATE INDEX idx_cells_created_by ON cells(created_by);
CREATE INDEX idx_cells_updated_by ON cells(updated_by);
CREATE INDEX idx_equipment_created_by ON equipment(created_by);
CREATE INDEX idx_equipment_updated_by ON equipment(updated_by);
CREATE INDEX idx_plcs_created_by ON plcs(created_by);
CREATE INDEX idx_plcs_updated_by ON plcs(updated_by);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_tags_updated_by ON tags(updated_by);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON cells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plcs_updated_at BEFORE UPDATE ON plcs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create comprehensive audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_user_id UUID;
    audit_ip INET;
    audit_user_agent TEXT;
    audit_session_id VARCHAR(255);
    changed_fields TEXT[];
    risk_level risk_level;
BEGIN
    -- Get audit context from session variables
    audit_user_id := current_setting('app.current_user_id', true)::UUID;
    audit_ip := current_setting('app.client_ip', true)::INET;
    audit_user_agent := current_setting('app.user_agent', true);
    audit_session_id := current_setting('app.session_id', true);
    
    -- Determine risk level
    risk_level := CASE 
        WHEN TG_TABLE_NAME IN ('users', 'roles') THEN 'HIGH'
        WHEN TG_TABLE_NAME = 'plcs' AND TG_OP = 'DELETE' THEN 'HIGH'
        WHEN TG_TABLE_NAME = 'plcs' AND OLD.ip_address IS DISTINCT FROM NEW.ip_address THEN 'MEDIUM'
        WHEN TG_OP = 'DELETE' THEN 'MEDIUM'
        ELSE 'LOW'
    END;
    
    -- Calculate changed fields for UPDATE
    IF (TG_OP = 'UPDATE') THEN
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
    END IF;
    
    -- Insert audit record
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values,
            changed_fields, user_id, ip_address, user_agent, session_id, risk_level
        ) VALUES (
            TG_TABLE_NAME, OLD.id, TG_OP::audit_action, to_jsonb(OLD), NULL,
            NULL, audit_user_id, audit_ip, audit_user_agent, audit_session_id, risk_level
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values,
            changed_fields, user_id, ip_address, user_agent, session_id, risk_level
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP::audit_action, to_jsonb(OLD), to_jsonb(NEW),
            changed_fields, audit_user_id, audit_ip, audit_user_agent, audit_session_id, risk_level
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values,
            changed_fields, user_id, ip_address, user_agent, session_id, risk_level
        ) VALUES (
            TG_TABLE_NAME, NEW.id, TG_OP::audit_action, NULL, to_jsonb(NEW),
            NULL, audit_user_id, audit_ip, audit_user_agent, audit_session_id, risk_level
        );
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to all tables
CREATE TRIGGER audit_sites AFTER INSERT OR UPDATE OR DELETE ON sites
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_cells AFTER INSERT OR UPDATE OR DELETE ON cells
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_plcs AFTER INSERT OR UPDATE OR DELETE ON plcs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_tags AFTER INSERT OR UPDATE OR DELETE ON tags
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create views for common queries

-- Enhanced hierarchy view for PLCs with all tags
CREATE VIEW v_plc_hierarchy AS
SELECT 
    p.id as plc_id,
    p.tag_id,
    p.description as plc_description,
    p.make,
    p.model,
    p.ip_address,
    p.firmware_version,
    e.id as equipment_id,
    e.name as equipment_name,
    e.equipment_type,
    c.id as cell_id,
    c.name as cell_name,
    c.line_number,
    s.id as site_id,
    s.name as site_name,
    CONCAT(s.name, ' > ', c.name, ' > ', e.name, ' > ', p.tag_id) as full_path,
    -- Aggregate tags as JSON array
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', t.id,
                'name', t.name,
                'data_type', t.data_type,
                'description', t.description,
                'address', t.address
            ) ORDER BY t.name
        ) FILTER (WHERE t.id IS NOT NULL), 
        '[]'::json
    ) as tags
FROM plcs p
JOIN equipment e ON p.equipment_id = e.id
JOIN cells c ON e.cell_id = c.id
JOIN sites s ON c.site_id = s.id
LEFT JOIN tags t ON p.id = t.plc_id
GROUP BY 
    p.id, p.tag_id, p.description, p.make, p.model, p.ip_address, p.firmware_version,
    e.id, e.name, e.equipment_type,
    c.id, c.name, c.line_number,
    s.id, s.name;

-- Alternative view with tags as separate rows (for different use cases)
CREATE VIEW v_plc_hierarchy_with_tag_rows AS
SELECT 
    p.id as plc_id,
    p.tag_id as plc_tag_id,
    p.description as plc_description,
    p.make,
    p.model,
    p.ip_address,
    p.firmware_version,
    e.id as equipment_id,
    e.name as equipment_name,
    e.equipment_type,
    c.id as cell_id,
    c.name as cell_name,
    c.line_number,
    s.id as site_id,
    s.name as site_name,
    CONCAT(s.name, ' > ', c.name, ' > ', e.name, ' > ', p.tag_id) as full_path,
    t.id as tag_id,
    t.name as tag_name,
    t.data_type as tag_data_type,
    t.description as tag_description,
    t.address as tag_address
FROM plcs p
JOIN equipment e ON p.equipment_id = e.id
JOIN cells c ON e.cell_id = c.id
JOIN sites s ON c.site_id = s.id
LEFT JOIN tags t ON p.id = t.plc_id
ORDER BY s.name, c.line_number, e.name, p.tag_id, t.name;

-- View for PLC summary with tag counts
CREATE VIEW v_plc_summary AS
SELECT 
    p.id as plc_id,
    p.tag_id,
    p.description,
    p.make,
    p.model,
    p.ip_address,
    e.name as equipment_name,
    e.equipment_type,
    c.name as cell_name,
    s.name as site_name,
    COUNT(t.id) as tag_count,
    STRING_AGG(DISTINCT t.data_type::text, ', ' ORDER BY t.data_type::text) as tag_data_types
FROM plcs p
JOIN equipment e ON p.equipment_id = e.id
JOIN cells c ON e.cell_id = c.id
JOIN sites s ON c.site_id = s.id
LEFT JOIN tags t ON p.id = t.plc_id
GROUP BY 
    p.id, p.tag_id, p.description, p.make, p.model, p.ip_address,
    e.name, e.equipment_type, c.name, s.name;

-- PLC count by site
CREATE VIEW v_site_plc_counts AS
SELECT 
    s.id,
    s.name,
    COUNT(DISTINCT c.id) as cell_count,
    COUNT(DISTINCT e.id) as equipment_count,
    COUNT(DISTINCT p.id) as plc_count,
    COUNT(DISTINCT t.id) as tag_count
FROM sites s
LEFT JOIN cells c ON s.id = c.site_id
LEFT JOIN equipment e ON c.id = e.cell_id
LEFT JOIN plcs p ON e.id = p.equipment_id
LEFT JOIN tags t ON p.id = t.plc_id
GROUP BY s.id, s.name;

-- Recent audit events view
CREATE VIEW v_recent_audit_events AS
SELECT 
    al.timestamp,
    al.table_name,
    al.action,
    al.risk_level,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    al.ip_address,
    al.changed_fields
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY al.timestamp DESC
LIMIT 1000;

-- Initial data insertion
INSERT INTO roles (name, permissions, description, is_system) VALUES
('Admin', '{"sites": {"create": true, "read": true, "update": true, "delete": true}, "cells": {"create": true, "read": true, "update": true, "delete": true}, "equipment": {"create": true, "read": true, "update": true, "delete": true}, "plcs": {"create": true, "read": true, "update": true, "delete": true}, "tags": {"create": true, "read": true, "update": true, "delete": true}, "users": {"create": true, "read": true, "update": true, "delete": true}, "audit": {"read": true, "export": true}}', 'Full system access', true),
('Engineer', '{"sites": {"create": false, "read": true, "update": false, "delete": false}, "cells": {"create": false, "read": true, "update": false, "delete": false}, "equipment": {"create": true, "read": true, "update": true, "delete": false}, "plcs": {"create": true, "read": true, "update": true, "delete": false}, "tags": {"create": true, "read": true, "update": true, "delete": true}, "users": {"create": false, "read": false, "update": false, "delete": false}, "audit": {"read": true, "export": false}}', 'Equipment management access', true),
('Viewer', '{"sites": {"create": false, "read": true, "update": false, "delete": false}, "cells": {"create": false, "read": true, "update": false, "delete": false}, "equipment": {"create": false, "read": true, "update": false, "delete": false}, "plcs": {"create": false, "read": true, "update": false, "delete": false}, "tags": {"create": false, "read": true, "update": false, "delete": false}, "users": {"create": false, "read": false, "update": false, "delete": false}, "audit": {"read": false, "export": false}}', 'Read-only access', true);

-- Initial Admin User Setup
-- ========================
-- For security reasons, the initial admin user must be created through a secure 
-- provisioning process that is NOT committed to source control.
-- 
-- Options for admin user creation:
-- 1. Use a secure setup script that prompts for credentials during installation
-- 2. Create through environment-specific configuration management tools
-- 3. Use a one-time initialization endpoint that is disabled after first use
-- 
-- The admin user creation script should:
-- - Prompt for a strong password or generate one securely
-- - Hash the password using bcrypt with appropriate cost factor
-- - Associate the user with the 'Admin' role
-- - Log the creation for audit purposes
-- - Never store plaintext passwords or commit hashes to version control
```
