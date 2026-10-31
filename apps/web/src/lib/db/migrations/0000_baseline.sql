-- Baseline: the exact schema created by the former EF Core migration 20261031082752_InitialCatalogue.
-- Databases that already ran that EF migration are adopted without executing this file (scripts/db-migrate.ts).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE audit_logs (
    id uuid NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    user_id uuid,
    user_name character varying(256),
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid,
    summary character varying(1000),
    changes jsonb,
    correlation_id character varying(100),
    CONSTRAINT pk_audit_logs PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE data_sources (
    id uuid NOT NULL,
    name character varying(200) NOT NULL,
    homepage_url character varying(500),
    source_type character varying(32) NOT NULL,
    notes character varying(2000),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_data_sources PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE manufacturers (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    country_of_origin character varying(100),
    website_url character varying(500),
    description character varying(4000),
    is_demo boolean NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_manufacturers PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE markets (
    id uuid NOT NULL,
    code character(2) NOT NULL,
    name character varying(100) NOT NULL,
    currency_code character(3) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_markets PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE roles (
    id uuid NOT NULL,
    name character varying(256),
    normalized_name character varying(256),
    concurrency_stamp text,
    CONSTRAINT pk_roles PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE specification_definitions (
    id uuid NOT NULL,
    key character varying(64) NOT NULL,
    label character varying(100) NOT NULL,
    "group" character varying(32) NOT NULL,
    value_type character varying(32) NOT NULL,
    unit character varying(16),
    allowed_values text[] NOT NULL,
    is_filterable boolean NOT NULL,
    sort_order integer NOT NULL,
    description character varying(500),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_specification_definitions PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE users (
    id uuid NOT NULL,
    display_name character varying(100),
    created_at timestamp with time zone NOT NULL,
    is_active boolean NOT NULL,
    user_name character varying(256),
    normalized_user_name character varying(256),
    email character varying(256),
    normalized_email character varying(256),
    email_confirmed boolean NOT NULL,
    password_hash text,
    security_stamp text,
    concurrency_stamp text,
    phone_number text,
    phone_number_confirmed boolean NOT NULL,
    two_factor_enabled boolean NOT NULL,
    lockout_end timestamp with time zone,
    lockout_enabled boolean NOT NULL,
    access_failed_count integer NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id)
);
--> statement-breakpoint
CREATE TABLE source_citations (
    id uuid NOT NULL,
    data_source_id uuid NOT NULL,
    url character varying(1000),
    title character varying(300),
    retrieved_at timestamp with time zone NOT NULL,
    notes character varying(1000),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_source_citations PRIMARY KEY (id),
    CONSTRAINT fk_source_citations_data_sources_data_source_id FOREIGN KEY (data_source_id) REFERENCES data_sources (id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE motorcycle_models (
    id uuid NOT NULL,
    manufacturer_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(160) NOT NULL,
    category character varying(32) NOT NULL,
    availability_status character varying(32) NOT NULL,
    launch_year integer,
    summary character varying(500),
    description character varying(8000),
    publication_status character varying(32) NOT NULL,
    published_at timestamp with time zone,
    is_demo boolean NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_motorcycle_models PRIMARY KEY (id),
    CONSTRAINT fk_motorcycle_models_manufacturers_manufacturer_id FOREIGN KEY (manufacturer_id) REFERENCES manufacturers (id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE role_claims (
    id integer GENERATED BY DEFAULT AS IDENTITY,
    role_id uuid NOT NULL,
    claim_type text,
    claim_value text,
    CONSTRAINT pk_role_claims PRIMARY KEY (id),
    CONSTRAINT fk_role_claims_roles_role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE user_claims (
    id integer GENERATED BY DEFAULT AS IDENTITY,
    user_id uuid NOT NULL,
    claim_type text,
    claim_value text,
    CONSTRAINT pk_user_claims PRIMARY KEY (id),
    CONSTRAINT fk_user_claims_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE user_logins (
    login_provider text NOT NULL,
    provider_key text NOT NULL,
    provider_display_name text,
    user_id uuid NOT NULL,
    CONSTRAINT pk_user_logins PRIMARY KEY (login_provider, provider_key),
    CONSTRAINT fk_user_logins_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_roles_role_id FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE user_tokens (
    user_id uuid NOT NULL,
    login_provider text NOT NULL,
    name text NOT NULL,
    value text,
    CONSTRAINT pk_user_tokens PRIMARY KEY (user_id, login_provider, name),
    CONSTRAINT fk_user_tokens_users_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE motorcycle_variants (
    id uuid NOT NULL,
    model_id uuid NOT NULL,
    name character varying(120) NOT NULL,
    slug character varying(120) NOT NULL,
    model_year integer,
    is_base boolean NOT NULL,
    sort_order integer NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_motorcycle_variants PRIMARY KEY (id),
    CONSTRAINT fk_motorcycle_variants_motorcycle_models_model_id FOREIGN KEY (model_id) REFERENCES motorcycle_models (id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE model_images (
    id uuid NOT NULL,
    model_id uuid NOT NULL,
    variant_id uuid,
    storage_provider character varying(32) NOT NULL,
    storage_key character varying(500) NOT NULL,
    url character varying(1000) NOT NULL,
    alt_text character varying(300) NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    credit character varying(300),
    license_note character varying(500),
    is_primary boolean NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_model_images PRIMARY KEY (id),
    CONSTRAINT fk_model_images_motorcycle_models_model_id FOREIGN KEY (model_id) REFERENCES motorcycle_models (id) ON DELETE CASCADE,
    CONSTRAINT fk_model_images_motorcycle_variants_variant_id FOREIGN KEY (variant_id) REFERENCES motorcycle_variants (id) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE variant_prices (
    id uuid NOT NULL,
    variant_id uuid NOT NULL,
    market_id uuid NOT NULL,
    region_code character varying(16),
    price_type character varying(32) NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency_code character(3) NOT NULL,
    effective_from date NOT NULL,
    is_current boolean NOT NULL,
    provenance character varying(32) NOT NULL,
    source_citation_id uuid,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_variant_prices PRIMARY KEY (id),
    CONSTRAINT ck_variant_prices_amount_positive CHECK (amount > 0),
    CONSTRAINT fk_variant_prices_markets_market_id FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE RESTRICT,
    CONSTRAINT fk_variant_prices_motorcycle_variants_variant_id FOREIGN KEY (variant_id) REFERENCES motorcycle_variants (id) ON DELETE CASCADE,
    CONSTRAINT fk_variant_prices_source_citations_source_citation_id FOREIGN KEY (source_citation_id) REFERENCES source_citations (id) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE variant_specifications (
    id uuid NOT NULL,
    variant_id uuid NOT NULL,
    definition_id uuid NOT NULL,
    numeric_value numeric(12,3),
    text_value character varying(500),
    boolean_value boolean,
    provenance character varying(32) NOT NULL,
    source_citation_id uuid,
    verified_at timestamp with time zone,
    notes character varying(1000),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT pk_variant_specifications PRIMARY KEY (id),
    CONSTRAINT ck_variant_specifications_single_value CHECK (num_nonnulls(numeric_value, text_value, boolean_value) = 1),
    CONSTRAINT fk_variant_specifications_motorcycle_variants_variant_id FOREIGN KEY (variant_id) REFERENCES motorcycle_variants (id) ON DELETE CASCADE,
    CONSTRAINT fk_variant_specifications_source_citations_source_citation_id FOREIGN KEY (source_citation_id) REFERENCES source_citations (id) ON DELETE SET NULL,
    CONSTRAINT fk_variant_specifications_specification_definitions_definition FOREIGN KEY (definition_id) REFERENCES specification_definitions (id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX ix_audit_logs_entity_type_entity_id ON audit_logs (entity_type, entity_id);
--> statement-breakpoint
CREATE INDEX ix_audit_logs_occurred_at ON audit_logs (occurred_at);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_data_sources_name ON data_sources (name);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_manufacturers_name ON manufacturers (name) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX ix_manufacturers_slug ON manufacturers (slug);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_markets_code ON markets (code);
--> statement-breakpoint
CREATE INDEX ix_model_images_model_id_sort_order ON model_images (model_id, sort_order);
--> statement-breakpoint
CREATE INDEX ix_model_images_variant_id ON model_images (variant_id);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_motorcycle_models_manufacturer_id_name ON motorcycle_models (manufacturer_id, name) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX ix_motorcycle_models_name ON motorcycle_models USING gin (name gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX ix_motorcycle_models_publication_status_category ON motorcycle_models (publication_status, category);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_motorcycle_models_slug ON motorcycle_models (slug);
--> statement-breakpoint
CREATE INDEX ix_motorcycle_models_updated_at ON motorcycle_models (updated_at);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_motorcycle_variants_model_id_slug ON motorcycle_variants (model_id, slug);
--> statement-breakpoint
CREATE INDEX ix_role_claims_role_id ON role_claims (role_id);
--> statement-breakpoint
CREATE UNIQUE INDEX "RoleNameIndex" ON roles (normalized_name);
--> statement-breakpoint
CREATE INDEX ix_source_citations_data_source_id ON source_citations (data_source_id);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_specification_definitions_key ON specification_definitions (key);
--> statement-breakpoint
CREATE INDEX ix_user_claims_user_id ON user_claims (user_id);
--> statement-breakpoint
CREATE INDEX ix_user_logins_user_id ON user_logins (user_id);
--> statement-breakpoint
CREATE INDEX ix_user_roles_role_id ON user_roles (role_id);
--> statement-breakpoint
CREATE INDEX "EmailIndex" ON users (normalized_email);
--> statement-breakpoint
CREATE UNIQUE INDEX "UserNameIndex" ON users (normalized_user_name);
--> statement-breakpoint
CREATE INDEX ix_variant_prices_market_id_is_current_amount ON variant_prices (market_id, is_current, amount);
--> statement-breakpoint
CREATE INDEX ix_variant_prices_source_citation_id ON variant_prices (source_citation_id);
--> statement-breakpoint
CREATE INDEX ix_variant_prices_variant_id_market_id_is_current ON variant_prices (variant_id, market_id, is_current);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_variant_prices_variant_id_market_id_region_code_price_type ON variant_prices (variant_id, market_id, region_code, price_type) NULLS NOT DISTINCT WHERE is_current;
--> statement-breakpoint
CREATE INDEX ix_variant_specifications_definition_id_numeric_value ON variant_specifications (definition_id, numeric_value);
--> statement-breakpoint
CREATE INDEX ix_variant_specifications_definition_id_text_value ON variant_specifications (definition_id, text_value);
--> statement-breakpoint
CREATE INDEX ix_variant_specifications_source_citation_id ON variant_specifications (source_citation_id);
--> statement-breakpoint
CREATE UNIQUE INDEX ix_variant_specifications_variant_id_definition_id ON variant_specifications (variant_id, definition_id);
