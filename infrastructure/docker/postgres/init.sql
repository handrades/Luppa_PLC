-- PostgreSQL initialization script for Luppa PLC Inventory System
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create development database if it doesn't exist
-- Note: The main database is already created via POSTGRES_DB environment variable

-- Set up database configuration for development
ALTER DATABASE luppa_dev SET timezone TO 'UTC';
ALTER DATABASE luppa_dev SET log_statement TO 'all';
ALTER DATABASE luppa_dev SET log_duration TO 'on';

-- Grant necessary permissions to the default user
-- Note: User is already created via POSTGRES_USER environment variable
GRANT ALL PRIVILEGES ON DATABASE luppa_dev TO postgres;

-- Connect to the main database for schema creation
\c luppa_dev;

-- Create schemas for multi-app architecture
CREATE SCHEMA IF NOT EXISTS core AUTHORIZATION postgres;
CREATE SCHEMA IF NOT EXISTS plc_inventory AUTHORIZATION postgres;
CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION postgres;

-- Grant schema permissions
GRANT ALL ON SCHEMA core TO postgres;
GRANT ALL ON SCHEMA plc_inventory TO postgres;
GRANT ALL ON SCHEMA audit TO postgres;

-- Set search path to include all schemas
ALTER DATABASE luppa_dev SET search_path TO core,plc_inventory,audit,public;

-- Core foundation tables for multi-app framework

-- Users table with authentication
CREATE TABLE core.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Roles table for RBAC
CREATE TABLE core.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE core.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User roles junction table
CREATE TABLE core.user_roles (
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES core.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES core.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Role permissions junction table
CREATE TABLE core.role_permissions (
    role_id UUID REFERENCES core.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES core.permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES core.users(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Audit logging table for ISO compliance
CREATE TABLE audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES core.users(id),
    user_ip INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    application VARCHAR(50) DEFAULT 'plc_inventory'
);

-- App settings table
CREATE TABLE core.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_name VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(app_name, setting_key)
);

-- Feature flags table
CREATE TABLE core.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    description TEXT,
    target_apps TEXT[] DEFAULT '{}',
    target_roles UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE core.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT false,
    action_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- PLC Inventory specific tables

-- Sites table for organizational hierarchy
CREATE TABLE plc_inventory.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Cells table for site organization
CREATE TABLE plc_inventory.cells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES plc_inventory.sites(id) ON DELETE CASCADE,
    cell_id VARCHAR(50) NOT NULL,
    cell_type VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, cell_id)
);

-- Equipment table for physical equipment mapping
CREATE TABLE plc_inventory.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id UUID REFERENCES plc_inventory.cells(id) ON DELETE CASCADE,
    equipment_id VARCHAR(100) NOT NULL,
    equipment_type VARCHAR(100) NOT NULL,
    description TEXT,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cell_id, equipment_id)
);

-- PLC records table - main inventory entity
CREATE TABLE plc_inventory.plc_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES plc_inventory.equipment(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    ip INET,
    port INTEGER DEFAULT 502,
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
    firmware_version VARCHAR(50),
    last_communication TIMESTAMPTZ,
    communication_status VARCHAR(20) DEFAULT 'unknown' CHECK (communication_status IN ('online', 'offline', 'error', 'unknown')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance

-- Users indexes
CREATE INDEX idx_users_username ON core.users(username);
CREATE INDEX idx_users_email ON core.users(email);
CREATE INDEX idx_users_active ON core.users(is_active);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_table_record ON audit.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit.audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit.audit_logs(action);

-- PLC records indexes
CREATE INDEX idx_plc_records_equipment ON plc_inventory.plc_records(equipment_id);
CREATE INDEX idx_plc_records_make_model ON plc_inventory.plc_records(make, model);
CREATE INDEX idx_plc_records_status ON plc_inventory.plc_records(status);
CREATE INDEX idx_plc_records_communication ON plc_inventory.plc_records(communication_status);
CREATE UNIQUE INDEX idx_plc_records_ip_unique ON plc_inventory.plc_records(ip) WHERE ip IS NOT NULL;

-- GIN index for tags array search
CREATE INDEX idx_plc_records_tags ON plc_inventory.plc_records USING GIN(tags);

-- Site and cell indexes
CREATE INDEX idx_cells_site ON plc_inventory.cells(site_id);
CREATE INDEX idx_equipment_cell ON plc_inventory.equipment(cell_id);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON core.notifications(user_id);
CREATE INDEX idx_notifications_unread ON core.notifications(user_id, is_read) WHERE is_read = false;

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON core.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON core.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON core.app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON core.feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON plc_inventory.sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON plc_inventory.cells FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON plc_inventory.equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plc_records_updated_at BEFORE UPDATE ON plc_inventory.plc_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system data

-- Default roles
INSERT INTO core.roles (name, description, is_system_role) VALUES
('admin', 'System Administrator with full access', true),
('process_engineer', 'Process Engineer with PLC management access', false),
('operator', 'Operator with read-only access', false),
('maintenance', 'Maintenance technician with limited write access', false);

-- Default permissions
INSERT INTO core.permissions (name, description, resource, action) VALUES
('users.read', 'View user information', 'users', 'read'),
('users.write', 'Create and modify users', 'users', 'write'),
('users.delete', 'Delete users', 'users', 'delete'),
('plc.read', 'View PLC inventory', 'plc', 'read'),
('plc.write', 'Create and modify PLC records', 'plc', 'write'),
('plc.delete', 'Delete PLC records', 'plc', 'delete'),
('equipment.read', 'View equipment information', 'equipment', 'read'),
('equipment.write', 'Create and modify equipment', 'equipment', 'write'),
('equipment.delete', 'Delete equipment', 'equipment', 'delete'),
('audit.read', 'View audit logs', 'audit', 'read'),
('settings.read', 'View application settings', 'settings', 'read'),
('settings.write', 'Modify application settings', 'settings', 'write');

-- Assign permissions to default admin role
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r, core.permissions p
WHERE r.name = 'admin';

-- Assign limited permissions to process engineer role
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r, core.permissions p
WHERE r.name = 'process_engineer'
AND p.name IN ('plc.read', 'plc.write', 'equipment.read', 'equipment.write', 'audit.read');

-- Assign read-only permissions to operator role
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r, core.permissions p
WHERE r.name = 'operator'
AND p.name IN ('plc.read', 'equipment.read');

-- Create default admin user (password: admin123 - should be changed in production)
INSERT INTO core.users (username, email, password_hash, first_name, last_name)
VALUES ('admin', 'admin@luppa.local', '$2b$10$8K6p3p3p3p3p3p3p3p3p3.O', 'System', 'Administrator');

-- Assign admin role to default admin user
INSERT INTO core.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM core.users u, core.roles r
WHERE u.username = 'admin' AND r.name = 'admin';

-- Default application settings
INSERT INTO core.app_settings (app_name, setting_key, setting_value) VALUES
('plc_inventory', 'max_records_per_page', '50'),
('plc_inventory', 'default_communication_timeout', '5000'),
('plc_inventory', 'enable_auto_discovery', 'true'),
('core', 'session_timeout_minutes', '60'),
('core', 'password_min_length', '8'),
('core', 'enable_audit_logging', 'true');

-- Sample data for development
INSERT INTO plc_inventory.sites (site_name, description, location) VALUES
('Main Plant', 'Primary manufacturing facility', 'Building A'),
('Secondary Plant', 'Secondary production line', 'Building B');

INSERT INTO plc_inventory.cells (site_id, cell_id, cell_type, description)
SELECT s.id, 'CELL_001', 'Production', 'Main production cell'
FROM plc_inventory.sites s WHERE s.site_name = 'Main Plant';

INSERT INTO plc_inventory.cells (site_id, cell_id, cell_type, description)
SELECT s.id, 'CELL_002', 'Quality', 'Quality control cell'
FROM plc_inventory.sites s WHERE s.site_name = 'Main Plant';

INSERT INTO plc_inventory.equipment (cell_id, equipment_id, equipment_type, description, manufacturer, model)
SELECT c.id, 'EQ_001', 'PLC_RACK', 'Main control rack', 'Allen Bradley', 'CompactLogix 5380'
FROM plc_inventory.cells c WHERE c.cell_id = 'CELL_001';

INSERT INTO plc_inventory.plc_records (equipment_id, description, make, model, ip, tags)
SELECT e.id, 'Main Production Line PLC', 'Allen Bradley', 'CompactLogix 5380', '192.168.1.100', ARRAY['production', 'main_line', 'critical']
FROM plc_inventory.equipment e WHERE e.equipment_id = 'EQ_001';

-- Log initialization completion
INSERT INTO audit.audit_logs (table_name, action, new_values, user_id, application)
VALUES ('database', 'INITIALIZE', '{"status": "completed", "tables_created": 15, "indexes_created": 12}', NULL, 'system');

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Luppa PLC Inventory Database initialized successfully!';
    RAISE NOTICE 'Created schemas: core, plc_inventory, audit';
    RAISE NOTICE 'Default admin user: admin / admin123 (change password!)';
END $$;