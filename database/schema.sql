-- SCHÉMA DE BASE DE DONNÉES POSTGRESQL (Alternative à MongoDB)
-- Ce fichier est fourni en cas d'utilisation de PostgreSQL au lieu de MongoDB
-- Pour le MVP, nous utilisons MongoDB (plus flexible pour le démarrage)

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'collaborateur',
    
    -- Cabinet
    cabinet_nom VARCHAR(255),
    cabinet_logo VARCHAR(500),
    cabinet_adresse TEXT,
    cabinet_telephone VARCHAR(20),
    cabinet_siren VARCHAR(20),
    
    -- Statut
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- Tokens
    reset_password_token VARCHAR(255),
    reset_password_expire TIMESTAMP,
    verification_token VARCHAR(255),
    refresh_token TEXT,
    
    -- Métadonnées
    last_login TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_role CHECK (role IN ('admin', 'collaborateur'))
);

-- Index pour améliorer les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Table des dossiers (à implémenter dans V1)
CREATE TABLE IF NOT EXISTS dossiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(255) NOT NULL,
    numero_dossier VARCHAR(100) UNIQUE,
    type_affaire VARCHAR(100),
    statut VARCHAR(50) DEFAULT 'ouvert',
    description TEXT,
    date_ouverture DATE NOT NULL,
    date_fermeture DATE,
    
    -- Relations
    client_id UUID REFERENCES clients(id),
    responsable_id UUID REFERENCES users(id),
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_statut CHECK (statut IN ('ouvert', 'en_cours', 'clos', 'archive'))
);

-- Table des clients (à implémenter dans V1)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_client VARCHAR(50) DEFAULT 'particulier',
    
    -- Informations personnelles
    civilite VARCHAR(10),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    raison_sociale VARCHAR(255),
    
    -- Contact
    email VARCHAR(255),
    telephone VARCHAR(20),
    adresse TEXT,
    code_postal VARCHAR(10),
    ville VARCHAR(100),
    pays VARCHAR(100) DEFAULT 'France',
    
    -- Identifiants
    siret VARCHAR(14),
    numero_tva VARCHAR(20),
    
    -- Métadonnées
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_type_client CHECK (type_client IN ('particulier', 'entreprise'))
);

-- Table des documents (à implémenter dans V1)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    taille BIGINT,
    url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    
    -- Relations
    dossier_id UUID REFERENCES dossiers(id),
    uploaded_by UUID REFERENCES users(id),
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des factures (à implémenter dans V1)
CREATE TABLE IF NOT EXISTS factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_facture VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'facture',
    statut VARCHAR(50) DEFAULT 'brouillon',
    
    -- Montants
    montant_ht DECIMAL(10, 2) NOT NULL,
    montant_tva DECIMAL(10, 2) NOT NULL,
    montant_ttc DECIMAL(10, 2) NOT NULL,
    
    -- Dates
    date_emission DATE NOT NULL,
    date_echeance DATE NOT NULL,
    date_paiement DATE,
    
    -- Relations
    client_id UUID REFERENCES clients(id),
    dossier_id UUID REFERENCES dossiers(id),
    created_by UUID REFERENCES users(id),
    
    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_type_facture CHECK (type IN ('devis', 'facture', 'avoir')),
    CONSTRAINT chk_statut_facture CHECK (statut IN ('brouillon', 'envoyee', 'payee', 'en_retard', 'annulee'))
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger à toutes les tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dossiers_updated_at BEFORE UPDATE ON dossiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_factures_updated_at BEFORE UPDATE ON factures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

