-- Criação das tabelas do banco de dados

-- Tabela de Usuários
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(100),
    setor VARCHAR(100),
    telefone VARCHAR(20),
    senha_hash VARCHAR(255),
    salt VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    must_change_password BOOLEAN DEFAULT false,
    login_attempts INTEGER DEFAULT 0,
    ultimo_acesso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Fornecedores
CREATE TABLE fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    endereco VARCHAR(255),
    cep VARCHAR(10),
    contato_principal VARCHAR(100),
    telefone VARCHAR(20),
    email VARCHAR(255),
    dias_permitidos VARCHAR(255),
    periodo_recebimento VARCHAR(50),
    horario_inicial TIME,
    horario_final TIME,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Entregas (Notas Fiscais)
CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES fornecedores(id),
    numero_nf VARCHAR(50) NOT NULL,
    peso_total NUMERIC(10, 2) NOT NULL,
    quantidade_volumes INTEGER NOT NULL,
    data_entrega_desejada DATE NOT NULL,
    criticidade VARCHAR(50) DEFAULT 'normal',
    status VARCHAR(50) DEFAULT 'pending',
    observacoes TEXT,
    responsavel VARCHAR(100),
    predio VARCHAR(10),
    box VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Cargas
CREATE TABLE cargas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_carga VARCHAR(50) UNIQUE NOT NULL,
    rota VARCHAR(50) NOT NULL,
    data_programada DATE NOT NULL,
    peso_total NUMERIC(10, 2) DEFAULT 0,
    quantidade_volumes INTEGER DEFAULT 0,
    percentual_ocupacao NUMERIC(5, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planning',
    data_envio TIMESTAMP,
    hora_envio TIME,
    usuario_envio UUID REFERENCES usuarios(id),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Itens da Carga
CREATE TABLE itens_carga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carga_id UUID NOT NULL REFERENCES cargas(id),
    entrega_id UUID NOT NULL REFERENCES entregas(id),
    sequencia INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Histórico de Acessos
CREATE TABLE historico_acessos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    data_acesso DATE NOT NULL,
    hora_acesso TIME NOT NULL,
    endereco_ip VARCHAR(50),
    ultimo_acesso TIMESTAMP,
    ultima_atividade TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Auditoria
CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    acao VARCHAR(50) NOT NULL,
    tabela VARCHAR(100),
    registro_id VARCHAR(255),
    dados_anteriores JSONB,
    dados_novos JSONB,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_entregas_supplier ON entregas(supplier_id);
CREATE INDEX idx_entregas_data ON entregas(data_entrega_desejada);
CREATE INDEX idx_entregas_status ON entregas(status);
CREATE INDEX idx_cargas_data ON cargas(data_programada);
CREATE INDEX idx_cargas_status ON cargas(status);
CREATE INDEX idx_itens_carga_id ON itens_carga(carga_id);
CREATE INDEX idx_historico_usuario ON historico_acessos(usuario_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);

-- Inserir usuário administrador padrão
INSERT INTO usuarios (
    username,
    full_name,
    email,
    cargo,
    setor,
    telefone,
    senha_hash,
    salt,
    role,
    status,
    must_change_password
) VALUES (
    'MMIRANDA',
    'Marcos Miranda',
    'marcos@example.com',
    'Gerente de Logística',
    'Logística',
    '(11) 98765-4321',
    'temp',
    'temp',
    'admin_master',
    'active',
    true
);
