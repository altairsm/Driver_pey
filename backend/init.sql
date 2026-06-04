-- =============================================================
-- Driver_Pey — Inicialização do Banco de Dados
-- =============================================================

-- 1. MOTORISTAS
CREATE TABLE IF NOT EXISTS matriculos_jad (
    "OperadorMatricula" BIGINT PRIMARY KEY,
    nome_completo VARCHAR(200) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    telefone VARCHAR(20),
    pgro VARCHAR(100)
);

INSERT INTO matriculos_jad ("OperadorMatricula", nome_completo, cpf, telefone, pgro) VALUES
(127704, 'ALESSANDRO MELO DE OLIVEIRA',    '12345678901', '5571999999991', 'Por Entrega'),
(130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '04791538501', '5571984242886', 'Por Entrega'),
(133209, 'CARLOS DANIEL SANTOS LIMA',      '98765432101', '5571999999992', 'Alpha'),
(135439, 'DIEGO MAGNO LIMA SANTOS',        '11122233344', '5571999999993', 'Por Entrega'),
(138721, 'EDUARDO HENRIQUE SILVA SOUSA',   '55566677788', '5571999999994', 'Volumoso')
ON CONFLICT ("OperadorMatricula") DO NOTHING;

-- 2. FAIXAS DE PESO
CREATE TABLE IF NOT EXISTS faixas_peso (
    id SERIAL PRIMARY KEY,
    peso_de NUMERIC(10,2) NOT NULL,
    peso_ate NUMERIC(10,2) NOT NULL,
    valor_peso NUMERIC(10,2) NOT NULL
);

INSERT INTO faixas_peso (peso_de, peso_ate, valor_peso) VALUES
(0,    5,   5.00),
(5.01, 10,  8.00),
(10.01, 15, 12.00),
(15.01, 20, 18.00),
(20.01, 30, 25.00),
(30.01, 50, 35.00),
(50.01, 100, 50.00)
ON CONFLICT DO NOTHING;

-- 3. TABELA DE FRETE DOS MOTORISTAS
CREATE TABLE IF NOT EXISTS tabela_frete_motorista (
    id SERIAL PRIMARY KEY,
    matricula BIGINT NOT NULL,
    metrica VARCHAR(100) NOT NULL,
    valor_frete NUMERIC(10,2) NOT NULL
);

INSERT INTO tabela_frete_motorista (matricula, metrica, valor_frete) VALUES
(127704, 'Por Entrega', 3.00),
(127704, 'Alpha',       1.50),
(127704, 'Volumoso',   12.00),
(130354, 'Por Entrega', 3.00),
(130354, 'Alpha',       1.00),
(130354, 'Volumoso',   12.00),
(133209, 'Por Entrega', 2.80),
(133209, 'Alpha',       1.20),
(133209, 'Volumoso',   11.00),
(135439, 'Por Entrega', 3.00),
(135439, 'Alpha',       1.50),
(135439, 'Volumoso',   12.00),
(138721, 'Por Entrega', 3.50),
(138721, 'Alpha',       1.80),
(138721, 'Volumoso',   14.00)
ON CONFLICT DO NOTHING;

-- 4. LISTA DE ENTREGAS
CREATE TABLE IF NOT EXISTS lista_entregas (
    "Número" BIGINT PRIMARY KEY,
    "Qtd" INTEGER DEFAULT 0,
    "Peso" NUMERIC(10,2) DEFAULT 0,
    "Valor" NUMERIC(10,2) DEFAULT 0,
    "Data Emissão" DATE,
    "Data Baixa" DATE,
    "Tipo" VARCHAR(50),
    "Rota" VARCHAR(200),
    status VARCHAR(50),
    pago BOOLEAN DEFAULT false,
    metrica_da_lista VARCHAR(100),
    matricula_motorista VARCHAR(20),
    obs TEXT,
    revisado BOOLEAN DEFAULT false,
    ok_motorista BOOLEAN DEFAULT false,
    revisao_motorista BOOLEAN DEFAULT false,
    qtd_ctes INTEGER
);

INSERT INTO lista_entregas ("Número", "Qtd", "Peso", "Valor", "Data Emissão", "Tipo", "Rota", status, metrica_da_lista, matricula_motorista, revisado, ok_motorista) VALUES
(2576,  1, 0.14,   4.00, '2026-03-28', 'Domicílio', 'DIEGO MAGNO LIMA SANTOS',     'Aberto',    'Por Entrega', '135439', true,  true),
(3333,  0, 0,      0,    '2026-03-23', 'Domicílio', 'ALESSANDRO MELO DE OLIVEIRA', 'Aberto',    'Por Entrega', '127704', false, false),
(4101,  3, 18.50, 45.00, '2026-03-20', 'Domicílio', 'BRUNO CESAR BARBOSA DOS SANTOS', 'Aberto', 'Por Entrega', '130354', false, false),
(4102,  5, 22.30, 78.00, '2026-03-21', 'Domicílio', 'BRUNO CESAR BARBOSA DOS SANTOS', 'Aberto', 'Alpha',       '130354', false, false),
(4103,  1, 45.00, 90.00, '2026-03-22', 'Domicílio', 'CARLOS DANIEL SANTOS LIMA',      'Aberto',  'Volumoso',   '133209', false, false),
(4104,  2, 8.00,  25.00, '2026-03-25', 'Domicílio', 'EDUARDO HENRIQUE SILVA SOUSA',   'Aberto',  'Por Entrega', '138721', false, false),
(4105,  4, 12.00, 38.00, '2026-03-26', 'Domicílio', 'ALESSANDRO MELO DE OLIVEIRA',    'Aberto',  'Alpha',       '127704', false, false)
ON CONFLICT ("Número") DO NOTHING;

-- 5. RELATÓRIO DE ENTREGAS (CT-es)
CREATE TABLE IF NOT EXISTS relatorioentrega_export (
    id SERIAL PRIMARY KEY,
    "OperadorMatricula" BIGINT,
    "OperadorNome" VARCHAR(200),
    "NCTE" VARCHAR(50) NOT NULL,
    "Lista" VARCHAR(20),
    "Peso" NUMERIC(10,2) DEFAULT 0,
    "Cep" VARCHAR(10),
    "Evento" VARCHAR(50),
    "Data" DATE,
    "Hora" VARCHAR(10),
    "TaxaEntrega" NUMERIC(10,2) DEFAULT 0,
    "TaxaInterior" NUMERIC(10,2) DEFAULT 0,
    "Expedidor" VARCHAR(200),
    "Tarifa" VARCHAR(10),
    "BairroDestino" VARCHAR(100),
    "CidadeDestino" VARCHAR(100),
    "Modalidade" VARCHAR(50),
    "NomePonto" VARCHAR(200),
    "RazaoPonto" VARCHAR(200),
    "QPacotes" INTEGER DEFAULT 0,
    "controle_duplicidade" VARCHAR(100) UNIQUE NOT NULL
);

-- Seed de CT-es de exemplo (para testar o cálculo de pagamento)
INSERT INTO relatorioentrega_export ("OperadorMatricula", "OperadorNome", "NCTE", "Lista", "Peso", "Cep", "Evento", "Data", "Hora", "TaxaEntrega", "Expedidor", "BairroDestino", "CidadeDestino", "controle_duplicidade")
SELECT * FROM (VALUES
    (135439, 'DIEGO MAGNO LIMA SANTOS',       '18015952809981', '2576', 0.14,  '41305410', 'entrega', '2026-03-28', '16:18:21', 4.00, 'in glow brasil', 'Valéria', 'Salvador', '135439257618015952809981'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809982', '4101', 5.00,  '41305001', 'entrega', '2026-03-27', '09:15:00', 4.00, 'in glow brasil', 'Brotas',   'Salvador', '130354410118015952809982'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809983', '4101', 8.20,  '41305002', 'entrega', '2026-03-27', '09:20:00', 4.00, 'in glow brasil', 'Brotas',   'Salvador', '130354410118015952809983'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809984', '4101', 5.30,  '41305003', 'entrega', '2026-03-27', '09:25:00', 4.00, 'in glow brasil', 'Brotas',   'Salvador', '130354410118015952809984'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809985', '4102', 22.30, '41305004', 'entrega', '2026-03-27', '10:00:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809985'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809986', '4102', 22.30, '41305005', 'entrega', '2026-03-27', '10:05:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809986'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809987', '4102', 22.30, '41305006', 'entrega', '2026-03-27', '10:10:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809987'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809988', '4102', 22.30, '41305007', 'entrega', '2026-03-27', '10:15:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809988'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809989', '4102', 22.30, '41305008', 'entrega', '2026-03-27', '10:20:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809989'),
    (133209, 'CARLOS DANIEL SANTOS LIMA',      '18015952809990', '4103', 45.00, '41305009', 'entrega', '2026-03-26', '14:00:00', 5.00, 'amazon servicos', 'Caminho das Árvores', 'Salvador', '133209410318015952809990'),
    (138721, 'EDUARDO HENRIQUE SILVA SOUSA',   '18015952809991', '4104', 8.00,  '41305010', 'entrega', '2026-03-25', '11:30:00', 4.00, 'in glow brasil', 'Imbuí',    'Salvador', '138721410418015952809991'),
    (138721, 'EDUARDO HENRIQUE SILVA SOUSA',   '18015952809992', '4104', 8.00,  '41305011', 'entrega', '2026-03-25', '11:35:00', 4.00, 'in glow brasil', 'Imbuí',    'Salvador', '138721410418015952809992'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809993', '4105', 12.00, '41305012', 'entrega', '2026-03-26', '08:00:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809993'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809994', '4105', 12.00, '41305013', 'entrega', '2026-03-26', '08:05:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809994'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809995', '4105', 12.00, '41305014', 'entrega', '2026-03-26', '08:10:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809995'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809996', '4105', 12.00, '41305015', 'entrega', '2026-03-26', '08:15:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809996')
) AS seed_data
WHERE NOT EXISTS (SELECT 1 FROM relatorioentrega_export);

-- Atualizar qtd_ctes nas listas
UPDATE lista_entregas le
SET qtd_ctes = (
    SELECT COUNT(*) FROM relatorioentrega_export re
    WHERE re."Lista" = le."Número"::text
);

-- 6. TABELA CONSULTA (rastreamento de CT-es)
CREATE TABLE IF NOT EXISTS consulta (
    id SERIAL PRIMARY KEY,
    "Código" VARCHAR(50),
    "Status" VARCHAR(50),
    "Cliente" VARCHAR(200),
    "Unidade Atual" VARCHAR(100),
    "Valor Declarado" VARCHAR(20),
    "Dt Evento" VARCHAR(20),
    dt_evento_corrigido DATE,
    "Descrição" TEXT,
    dt_previsao_corrigido DATE
);

-- 7. AVERBAÇÃO / RECLAMAÇÕES
CREATE TABLE IF NOT EXISTS acareacaojad (
    id SERIAL PRIMARY KEY,
    "OperadorMatricula" BIGINT,
    "NCTE" VARCHAR(50),
    motivo TEXT,
    data_criacao DATE DEFAULT CURRENT_DATE
);
