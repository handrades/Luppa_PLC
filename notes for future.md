# PLC DB

Some fields I thought about

* plc_id
* plc_description
* plc_make
* plc_model
* plc_ip
* plc_tags
* plc_tag_name
* plc_tag_type

* site_name

* cell_type
* cell_id

* equipment_id
* equipment_type

* each should have:
* created_at
* updated_at

## code from previous run that can be taken into consideration for tables above

-- One-time extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

### Database Design for Performance

**Table Structure:**

```sql
  cell_type VARCHAR(50) NOT NULL,
  cell_number VARCHAR(20) NOT NULL,
  equipment VARCHAR(100) NOT NULL,
  tag TEXT[] NOT NULL,
  description TEXT,
  ip INET,
  plc_model VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_country_site   ON plc_inventory(country, site);
CREATE INDEX idx_cell_line      ON plc_inventory(cell_type, cell_number);
CREATE INDEX idx_equipment      ON plc_inventory(equipment);
CREATE INDEX idx_plc_model      ON plc_inventory(plc_model);
CREATE INDEX idx_created_date   ON plc_inventory(created_at);
CREATE INDEX idx_tag            ON plc_inventory USING GIN(tag);
CREATE UNIQUE INDEX idx_ip ON plc_inventory(ip) WHERE ip IS NOT NULL;

-- Audit table for ISO compliance
CREATE TABLE plc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plc_id UUID REFERENCES plc_inventory(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id) NOT NULL,
  event_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit table indexes
CREATE INDEX idx_plc_audit   ON plc_audit_log(plc_id, event_at, action);
CREATE INDEX idx_user_audit  ON plc_audit_log(user_id, event_at);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION set_plc_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plc_inventory_updated_at
BEFORE UPDATE ON plc_inventory
FOR EACH ROW
WHEN (OLD IS DISTINCT FROM NEW)               -- only if something changed
EXECUTE FUNCTION set_plc_inventory_updated_at();
```
