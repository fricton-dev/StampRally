-- PostgreSQL bootstrap script for the stamp rally project

-- #############################
-- # Core schema (tenants/users)
-- #############################

CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(32) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50),
    admin_name VARCHAR(100),
    admin_email VARCHAR(255),
    admin_phone VARCHAR(20),
    admin_password_hash VARCHAR(255),
    admin_password_must_change BOOLEAN DEFAULT FALSE,
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(32) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, username),
    UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- #############################
-- # Tenant content
-- #############################

CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(32) NOT NULL,
    store_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    description TEXT,
    image_url TEXT,
    stamp_mark VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, store_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reward_rules (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(32) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    threshold INTEGER NOT NULL,
    label VARCHAR(255) NOT NULL,
    icon VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, threshold)
);

-- #############################
-- # User progress
-- #############################

CREATE TABLE IF NOT EXISTS user_progress (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(32) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    stamps INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_coupons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(32) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    coupon_id VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, coupon_id)
);

CREATE TABLE IF NOT EXISTS user_store_stamps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(32) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    store_id VARCHAR(64) NOT NULL,
    stamped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, store_id),
    FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, store_id) ON DELETE CASCADE
);

-- #############################
-- # Indexes
-- #############################

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_stores_tenant ON stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reward_rules_tenant ON reward_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_store_stamps_user ON user_store_stamps(user_id);

-- #############################
-- # Trigger helpers
-- #############################

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reward_rules_updated_at BEFORE UPDATE ON reward_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_coupons_updated_at BEFORE UPDATE ON user_coupons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- #############################
-- # Schema alignment (idempotent alters)
-- #############################

ALTER TABLE tenants ALTER COLUMN tenant_id TYPE VARCHAR(32);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_password_must_change BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE users ALTER COLUMN tenant_id TYPE VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_tenant_username_unique UNIQUE (tenant_id, username);
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_tenant_email_unique UNIQUE (tenant_id, email);

ALTER TABLE stores ALTER COLUMN tenant_id TYPE VARCHAR(32);
ALTER TABLE reward_rules ALTER COLUMN tenant_id TYPE VARCHAR(32);
ALTER TABLE user_progress ALTER COLUMN tenant_id TYPE VARCHAR(32);
ALTER TABLE user_coupons ALTER COLUMN tenant_id TYPE VARCHAR(32);
ALTER TABLE user_store_stamps ALTER COLUMN tenant_id TYPE VARCHAR(32);

-- #############################
-- # Seed data (development)
-- #############################

-- bcrypt hash for "password123"
DO $$
DECLARE
    default_hash CONSTANT TEXT := '$bcrypt-sha256$v=2,t=2b,r=12$Ig8wlBQaJ7/7M37EZ1SRMe$0tcEc7YLy5r0EWeMOYg8MXWcSquTEBW';
BEGIN
    INSERT INTO tenants (tenant_id, company_name, business_type, admin_name, admin_email, admin_phone, admin_password_hash, admin_password_must_change, config, is_active)
    VALUES
        (
            'takizawa',
            'Takizawa Shopping Street',
            'shopping',
            'Takizawa Admin',
            'admin@takizawa.local',
            '000-0000-0000',
            default_hash,
            FALSE,
            '{
                "tenantName": "TAKIZAWA",
                "backgroundImageUrl": "https://picsum.photos/seed/takizawa-bg/800/1200",
                "initialStamps": 1,
                "initialCoupons": [
                    {
                        "id": "takizawa-welcome",
                        "title": "Welcome Drink Coupon",
                        "description": "Free drink on first visit",
                        "used": false
                    }
                ]
            }'::jsonb,
            TRUE
        ),
        (
            'morioka',
            'Morioka Street',
            'shopping',
            'Morioka Admin',
            'admin@morioka.local',
            '000-0000-1111',
            default_hash,
            FALSE,
            '{
                "tenantName": "MORIOKA STREET",
                "backgroundImageUrl": "https://picsum.photos/seed/morioka-bg/800/1200",
                "initialStamps": 1,
                "initialCoupons": [
                    {
                        "id": "morioka-first",
                        "title": "First Visit Coupon",
                        "description": "10% off one purchase",
                        "used": false
                    }
                ]
            }'::jsonb,
            TRUE
        ),
        (
            'fricton',
            'Fricton HQ',
            'technology',
            'Fricton Admin',
            'admin@fricton.local',
            '000-0000-2222',
            '$bcrypt-sha256$v=2,t=2b,r=12$ppxjb0nZ20.ZfNU.avcysO$UfHeIhnU2KGz9e46ez3KFv/o/Z9Fw3S',
            TRUE,
            '{
                "tenantName": "FRICTON",
                "backgroundImageUrl": "https://picsum.photos/seed/fricton-bg/800/1200",
                "initialStamps": 0,
                "initialCoupons": []
            }'::jsonb,
            TRUE
        )
    ON CONFLICT (tenant_id) DO UPDATE
        SET
            company_name = EXCLUDED.company_name,
            admin_password_hash = COALESCE(EXCLUDED.admin_password_hash, tenants.admin_password_hash),
            admin_password_must_change = EXCLUDED.admin_password_must_change,
            config = EXCLUDED.config,
            is_active = EXCLUDED.is_active;
END $$;

INSERT INTO reward_rules (tenant_id, threshold, label, icon)
VALUES
    ('takizawa', 3, 'Free drink ticket', 'ticket'),
    ('takizawa', 6, 'Special sweets set', 'gift'),
    ('takizawa', 9, '20% OFF voucher', 'trophy'),
    ('morioka', 2, 'Greeting present', 'gift'),
    ('morioka', 5, '10% OFF checkout', 'ticket'),
    ('morioka', 8, 'Anniversary gift', 'trophy')
ON CONFLICT (tenant_id, threshold) DO UPDATE
    SET label = EXCLUDED.label,
        icon = EXCLUDED.icon;

INSERT INTO stores (tenant_id, store_id, name, lat, lng, description, image_url)
VALUES
    ('takizawa', 'takizawa-s1', 'Ukai Elementary School', 39.74172, 141.08414, 'Local friendly elementary school', 'https://picsum.photos/seed/takizawa-a/400/200'),
    ('takizawa', 'takizawa-s2', 'Shinogi Elementary School', 39.71539, 141.06533, 'Popular and lively school', 'https://picsum.photos/seed/takizawa-b/400/200'),
    ('takizawa', 'takizawa-s3', 'Tsuki-ga-oka Elementary School', 39.734899, 141.103943, 'Compact community school', 'https://picsum.photos/seed/takizawa-c/400/200'),
    ('morioka', 'morioka-s1', 'Morioka Coffee Roastery', 39.7017, 141.1543, 'Specialty coffee and sweets', 'https://picsum.photos/seed/morioka-a/400/200'),
    ('morioka', 'morioka-s2', 'Zaimoku Bakery', 39.7039, 141.1462, 'Fresh bread from early morning', 'https://picsum.photos/seed/morioka-b/400/200'),
    ('morioka', 'morioka-s3', 'Cross Teas & Goods', 39.7045, 141.1527, 'Nordic-inspired lifestyle store', 'https://picsum.photos/seed/morioka-c/400/200')
ON CONFLICT (tenant_id, store_id) DO UPDATE
    SET
        name = EXCLUDED.name,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url;

INSERT INTO users (tenant_id, username, email, gender, password_hash, role, is_active)
VALUES
    ('takizawa', 'demo-user', 'demo@takizawa.local', 'unspecified', '$bcrypt-sha256$v=2,t=2b,r=12$Ig8wlBQaJ7/7M37EZ1SRMe$0tcEc7YLy5r0EWeMOYg8MXWcSquTEBW', 'user', TRUE),
    ('morioka', 'demo-user', 'demo@morioka.local', 'unspecified', '$bcrypt-sha256$v=2,t=2b,r=12$Ig8wlBQaJ7/7M37EZ1SRMe$0tcEc7YLy5r0EWeMOYg8MXWcSquTEBW', 'user', TRUE),
    ('takizawa', 'admin', 'admin@takizawa.local', 'unspecified', '$bcrypt-sha256$v=2,t=2b,r=12$Ig8wlBQaJ7/7M37EZ1SRMe$0tcEc7YLy5r0EWeMOYg8MXWcSquTEBW', 'admin', TRUE)
ON CONFLICT (tenant_id, username) DO NOTHING;

INSERT INTO user_progress (user_id, tenant_id, stamps)
SELECT id, tenant_id, 1
FROM users
WHERE username = 'demo-user'
ON CONFLICT (user_id) DO UPDATE SET stamps = EXCLUDED.stamps;

INSERT INTO user_coupons (user_id, tenant_id, coupon_id, title, description, used)
SELECT id, tenant_id, CONCAT(tenant_id, '-welcome'), 'Sample welcome coupon', 'Initial reward coupon', FALSE
FROM users
WHERE username = 'demo-user'
ON CONFLICT (user_id, coupon_id) DO NOTHING;

COMMENT ON TABLE tenants IS 'Tenant master containing organization level configuration.';
COMMENT ON TABLE users IS 'End user accounts scoped per tenant.';
COMMENT ON TABLE sessions IS 'Persisted authentication sessions.';
COMMENT ON TABLE stores IS 'Storefront location master data.';
COMMENT ON TABLE reward_rules IS 'Reward thresholds per tenant.';
COMMENT ON TABLE user_progress IS 'Aggregate stamp counters per user.';
COMMENT ON TABLE user_coupons IS 'Issued coupons per user.';
COMMENT ON TABLE user_store_stamps IS 'Store visit history per user.';
