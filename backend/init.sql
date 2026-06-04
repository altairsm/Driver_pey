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

-- 8. TABELA CEP → BAIRRO → TABELA_MOTORISTA
CREATE TABLE IF NOT EXISTS ceps_bairros (
    id SERIAL PRIMARY KEY,
    cidade VARCHAR(100) NOT NULL,
    cep_ini VARCHAR(8) NOT NULL,
    cep_fim VARCHAR(8) NOT NULL,
    bairro VARCHAR(200) NOT NULL,
    tabela_motorista VARCHAR(10) NOT NULL
);

INSERT INTO ceps_bairros (cidade, cep_ini, cep_fim, bairro, tabela_motorista) VALUES
('Salvador','41230351','41230973','Granjas Rurais Presidente Vargas','Tab_1'),
('Salvador','41230000','41230349','Granjas Rurais Presidente Vargas','Tab_1'),
('Salvador','40240900','40240900','Nazaré','Tab_1'),
('Salvador','40340810','40340810','IAPI','Tab_1'),
('Salvador','40340811','40375973','Liberdade','Tab_1'),
('Salvador','40240901','40045155','Saúde','Tab_1'),
('Salvador','40358680','40358680','Liberdade','Tab_1'),
('Salvador','40040000','40040524','Nazaré','Tab_1'),
('Salvador','40040525','40240899','Saúde','Tab_1'),
('Salvador','40024080','40024136','Barroquinha','Tab_1'),
('Salvador','40010000','40015975','Comércio','Tab_1'),
('Salvador','40020000','40020971','Centro','Tab_1'),
('Salvador','40025000','40025900','Baixa dos Sapateiros','Tab_1'),
('Salvador','40026000','40026902','Centro Histórico','Tab_2'),
('Salvador','40026970','40026970','Pelourinho','Tab_2'),
('Salvador','40050050','40050290','Tororó','Tab_3'),
('Salvador','40060000','40060904','Dois de Julho','Tab_3'),
('Salvador','40070020','40070970','Barris','Tab_3'),
('Salvador','40080001','40080970','Campo Grande','Tab_2'),
('Salvador','40080002','40081400','Vitória','Tab_2'),
('Salvador','40080136','40080901','Politeama','Tab_3'),
('Salvador','40100000','40105970','Garcia','Tab_3'),
('Salvador','40110000','40110913','Canela','Tab_3'),
('Salvador','40130000','40140974','Barra','Tab_1'),
('Salvador','40150000','40150973','Graça','Tab_1'),
('Salvador','40155000','40155970','Jardim Apipema','Tab_1'),
('Salvador','40157130','40157570','Chame-Chame','Tab_1'),
('Salvador','40169500','40170970','Ondina','Tab_1'),
('Salvador','40210245','40231902','Federação','Tab_1'),
('Salvador','40220000','40225520','Engenho Velho da Federação','Tab_1'),
('Salvador','40226000','40226640','Alto das Pombas','Tab_1'),
('Salvador','40240005','40245770','Engenho Velho de Brotas','Tab_1'),
('Salvador','40250000','40254430','Cosme de Farias','Tab_1'),
('Salvador','40255000','40260970','Matatu','Tab_1'),
('Salvador','40260205','40261090','Luiz Anselmo','Tab_1'),
('Salvador','40262000','40262110','Santo Agostinho','Tab_1'),
('Salvador','40265000','40265200','Santa Teresa','Tab_2'),
('Salvador','40270000','40270900','Vila Laura','Tab_2'),
('Salvador','40271000','40271150','Boa Vista de Brotas','Tab_3'),
('Salvador','40275010','40290900','Brotas','Tab_3'),
('Salvador','40275180','40276170','Campinas de Brotas','Tab_3'),
('Salvador','40279640','40280970','Parque Bela Vista','Tab_2'),
('Salvador','40283880','40283880','Daniel Lisboa','Tab_2'),
('Salvador','40290000','40290901','Acupe','Tab_3'),
('Salvador','40295000','40295570','Horto Florestal','Tab_3'),
('Salvador','40296000','40296730','Candeal','Tab_3'),
('Salvador','40300500','40302400','Macaúbas','Tab_1'),
('Salvador','40300750','40301270','Barbalho','Tab_1'),
('Salvador','40301280','40301520','Santo Antônio','Tab_1'),
('Salvador','40310000','40315590','Pau Miúdo','Tab_1'),
('Salvador','40313000','40318170','Cidade Nova','Tab_1'),
('Salvador','40320005','40323900','Caixa D''Água','Tab_1'),
('Salvador','40328000','40328288','Lapinha','Tab_1'),
('Salvador','40335000','40340390','Pero Vaz','Tab_1'),
('Salvador','40342000','40342780','Santa Mônica','Tab_1'),
('Salvador','40349010','40349810','Alto do Peru','Tab_1'),
('Salvador','40349060','40360590','Fazenda Grande do Retiro','Tab_1'),
('Salvador','40365000','40366585','Curuzu','Tab_1'),
('Salvador','40385000','40387540','Boa Vista de São Caetano','Tab_1'),
('Salvador','40388000','40388610','Bom Juá','Tab_2'),
('Salvador','40390000','40391970','São Caetano','Tab_2'),
('Salvador','40393000','40398315','Capelinha','Tab_3'),
('Salvador','40410400','40411970','Calçada','Tab_3'),
('Salvador','40411901','40460900','Água de Meninos','Tab_3'),
('Salvador','40414000','40414610','Boa Viagem','Tab_2'),
('Salvador','40415000','40415890','Bonfim','Tab_2'),
('Salvador','40420000','40421970','Ribeira','Tab_3'),
('Salvador','40425000','40425720','Monte Serrat','Tab_3'),
('Salvador','40430000','40431080','Vila Ruy Barbosa','Tab_3'),
('Salvador','40433004','40436890','Massaranduba','Tab_1'),
('Salvador','40437000','40437530','Mangueira','Tab_1'),
('Salvador','40440030','40440970','Caminho de Areia','Tab_1'),
('Salvador','40444000','40444805','Roma','Tab_1'),
('Salvador','40445000','40445600','Mares','Tab_1'),
('Salvador','40450005','40454290','Uruguai','Tab_1'),
('Salvador','40455010','40455170','Machado','Tab_1'),
('Salvador','40470000','40483390','Lobato','Tab_1'),
('Salvador','40484000','40485770','Alto do Cabrito','Tab_1'),
('Salvador','40486000','40486455','Santa Luzia','Tab_1'),
('Salvador','40487000','40487300','Boa Vista do Lobato','Tab_1'),
('Salvador','40490000','40492190','São João do Cabrito','Tab_1'),
('Salvador','40708000','40718900','Plataforma','Tab_1'),
('Salvador','40710000','40710450','Escada','Tab_2'),
('Salvador','40711000','40712620','Alto da Terezinha','Tab_2'),
('Salvador','40711500','40715300','Ilha Amarela','Tab_3'),
('Salvador','40713011','40715808','Itacaranha','Tab_3'),
('Salvador','40715312','40716690','Rio Sena','Tab_3'),
('Salvador','40719000','40719095','Mirantes de Periperi','Tab_2'),
('Salvador','40719200','40719330','Colinas de Periperi','Tab_2'),
('Salvador','40720000','40740630','Periperi','Tab_3'),
('Salvador','40720580','40725560','Praia Grande','Tab_3'),
('Salvador','40730000','40734150','Fazenda Coutos','Tab_3'),
('Salvador','40732000','40770430','Coutos','Tab_1'),
('Salvador','40748000','40748600','Nova Constituinte','Tab_1'),
('Salvador','40749000','40749185','Vista Alegre','Tab_1'),
('Salvador','40771000','40840133','Paripe','Tab_1'),
('Salvador','40800160','40841560','São Tomé','Tab_1'),
('Salvador','41098010','41098970','Horto Bela Vista','Tab_1'),
('Salvador','41099000','41099620','Saramandaia','Tab_1'),
('Salvador','41100000','41130900','Pernambués','Tab_1'),
('Salvador','41150000','41150970','Cabula','Tab_1'),
('Salvador','41151000','41151150','Retiro','Tab_1'),
('Salvador','41152000','41152972','Resgate','Tab_1'),
('Salvador','41180000','41180900','Saboeiro','Tab_1'),
('Salvador','41181000','41181900','Cabula VI','Tab_1'),
('Salvador','41185000','41190340','São Gonçalo','Tab_2'),
('Salvador','41192000','41192970','Narandiba','Tab_2'),
('Salvador','41194000','41194235','Doron','Tab_3'),
('Salvador','41195000','41197160','Barreiras','Tab_3'),
('Salvador','41200005','41200875','Engomadeira','Tab_3'),
('Salvador','41204000','41204415','Arraial do Retiro','Tab_2'),
('Salvador','41205000','41210895','Tancredo Neves','Tab_2'),
('Salvador','41211000','41211895','Arenoso','Tab_3'),
('Salvador','41213000','41217200','Sussuarana','Tab_3'),
('Salvador','41216100','41216870','Nova Sussuarana','Tab_3'),
('Salvador','41218000','41218770','Novo Horizonte','Tab_1'),
('Salvador','41219005','41225970','Mata Escura','Tab_1'),
('Salvador','41227000','41227410','Calabetão','Tab_1'),
('Salvador','41230250','41230765','Jardim Cajazeiras','Tab_1'),
('Salvador','41231010','41231570','Jardim Santo Inácio','Tab_1'),
('Salvador','41235000','41247260','Pau da Lima','Tab_1'),
('Salvador','41250000','41253972','São Marcos','Tab_1'),
('Salvador','41254105','41255220','São Rafael','Tab_1'),
('Salvador','41256080','41256505','Vale dos Lagos','Tab_1'),
('Salvador','41260000','41260970','Canabrava','Tab_1'),
('Salvador','41262000','41262190','Vila 2 de Julho','Tab_1'),
('Salvador','41270000','41275970','Campinas de Pirajá','Tab_1'),
('Salvador','41280000','41285100','Marechal Rondon','Tab_1'),
('Salvador','41290000','41297490','Pirajá','Tab_2'),
('Salvador','41298025','41299630','Boca da Mata de Valéria','Tab_2'),
('Salvador','41300000','41305620','Valéria','Tab_3'),
('Salvador','41306005','41307810','Nova Brasília de Valéria','Tab_3'),
('Salvador','41306010','41307655','Moradas da Lagoa','Tab_3'),
('Salvador','41308000','41308500','Palestina','Tab_2'),
('Salvador','41310005','41311800','Águas Claras','Tab_2'),
('Salvador','41315000','41315400','Dom Avelar','Tab_3'),
('Salvador','41320010','41322720','Castelo Branco','Tab_3'),
('Salvador','41330005','41338800','Cajazeiras VIII','Tab_3'),
('Salvador','41332010','41332150','Cajazeiras II','Tab_1'),
('Salvador','41334004','41334320','Cajazeiras IV','Tab_1'),
('Salvador','41335000','41335520','Cajazeiras V','Tab_1'),
('Salvador','41336010','41336770','Cajazeiras VI','Tab_1'),
('Salvador','41337100','41337415','Cajazeiras VII','Tab_1'),
('Salvador','41339010','41347270','Fazenda Grande I','Tab_1'),
('Salvador','41340000','41340760','Cajazeiras X','Tab_1'),
('Salvador','41341010','41347970','Cajazeiras XI','Tab_1'),
('Salvador','41342010','41342970','Fazenda Grande II','Tab_1'),
('Salvador','41342495','41342890','Jaguaripe I','Tab_1'),
('Salvador','41343010','41349550','Boca da Mata','Tab_1'),
('Salvador','41343275','41343878','Fazenda Grande III','Tab_1'),
('Salvador','41233000','41269999','Porto Seco Pirajá','Tab_1'),
('Salvador','40323170','40324999','IAPI','Tab_2'),
('Salvador','40325000','40334999','Liberdade','Tab_2'),
('Salvador','40300002','40300499','Baixa de Quintas','Tab_3'),
('Salvador','41345200','41345700','Fazenda Grande IV','Tab_3'),
('Salvador','41350000','41351800','Nova Brasília','Tab_3'),
('Salvador','41370000','41370790','Jardim Nova Esperança','Tab_2'),
('Salvador','41385000','41387340','Sete de Abril','Tab_2'),
('Salvador','41388000','41388350','Novo Marotinho','Tab_3'),
('Salvador','41390000','41391000','Vila Canária','Tab_3'),
('Salvador','41400000','41404000','Nova Esperança','Tab_3'),
('Salvador','41400970','41405000','CEASA','Tab_1'),
('Salvador','41410003','41410455','Barragem de Ipitanga','Tab_1'),
('Salvador','41411000','41412650','Areia Branca','Tab_1'),
('Salvador','41480000','41481628','Mussurunga','Tab_1'),
('Salvador','41480295','41480295','Mussurunga II','Tab_1'),
('Salvador','41483010','41483140','Alphaville II','Tab_1'),
('Salvador','41490000','41490656','Mussurunga I','Tab_1'),
('Salvador','41500008','41520971','São Cristóvão','Tab_1'),
('Salvador','41502010','41502730','Jardim das Margaridas','Tab_1'),
('Salvador','41503000','41504265','Itinga','Tab_1'),
('Salvador','41505020','41507180','Cassange','Tab_1'),
('Salvador','41515000','41515388','Bairro da Paz','Tab_1'),
('Salvador','41600010','41601310','Stella Maris','Tab_1'),
('Salvador','41602000','41602970','Aeroporto','Tab_2'),
('Salvador','41603020','41603580','Praia do Flamengo','Tab_2'),
('Salvador','41610000','41640670','Itapuã','Tab_3'),
('Salvador','41611010','41611761','Nova Brasília de Itapuã','Tab_3'),
('Salvador','41612010','41612445','Jardim Placaford','Tab_3'),
('Salvador','41613010','41613971','Jaguaribe','Tab_2'),
('Salvador','41615000','41615900','Alto do Coqueirinho','Tab_2'),
('Salvador','41650000','41651970','Piatã','Tab_3'),
('Salvador','41680000','41681085','Patamares','Tab_3'),
('Salvador','41701005','41701970','Alphaville I','Tab_3'),
('Salvador','41705000','41710890','Boca do Rio','Tab_1'),
('Salvador','41720000','41720970','Imbuí','Tab_1'),
('Salvador','41730100','41730903','Paralela','Tab_1'),
('Salvador','41740000','41741590','Pituaçu','Tab_1'),
('Salvador','41745001','41745972','Centro Administrativo da Bahia','Tab_1'),
('Salvador','41745018','41745971','Trobogy','Tab_1'),
('Salvador','41750000','41750890','Jardim Armação','Tab_1'),
('Salvador','41750005','41750971','Armação','Tab_1'),
('Salvador','41760000','41760210','Costa Azul','Tab_1'),
('Salvador','41760900','41770890','Stiep','Tab_1'),
('Salvador','41771000','41771100','Aquarius','Tab_1'),
('Salvador','41800700','41830972','Pituba','Tab_1'),
('Salvador','41815000','41825907','Itaigara','Tab_1'),
('Salvador','41820000','41823959','Caminho das Árvores','Tab_2'),
('Salvador','41899520','41900973','Amaralina','Tab_2'),
('Salvador','41905000','41906560','Nordeste de Amaralina','Tab_3'),
('Salvador','41905085','41906170','Nordeste','Tab_3'),
('Salvador','41915010','41927890','Santa Cruz','Tab_3'),
('Salvador','41928000','41928204','Chapada do Rio Vermelho','Tab_2'),
('Salvador','41930000','41930128','Vale das Pedrinhas','Tab_2'),
('Salvador','41940000','41950970','Rio Vermelho','Tab_3'),
('Salvador','42500004','42500092','Santana (Ilha de Maré)','Tab_3'),
('Salvador','42500200','42500230','Itamoabo (Ilha de Maré)','Tab_3'),
('Salvador','42500260','42500290','Neves (Ilha de Maré)','Tab_1'),
('Salvador','42500320','42500360','Engenho de Maré (Ilha de Maré)','Tab_1'),
('Salvador','42500400','42500400','Botelho (Ilha de Maré)','Tab_1'),
('Salvador','42500450','42500450','Oratório (Ilha de Maré)','Tab_1'),
('Salvador','42500500','42500520','Bananeiras (Ilha de Maré)','Tab_1'),
('Salvador','42500530','42500530','Armenda (Ilha de Maré)','Tab_1'),
('Salvador','42500540','42500550','Maracanã (Ilha de Maré)','Tab_1'),
('Salvador','42500570','42500570','Martelo (Ilha de Maré)','Tab_1'),
('Salvador','42500600','42500620','Mata Atlântica (Ilha de Maré)','Tab_1'),
('Salvador','42500700','42500760','Praia Grande (Ilha de Maré)','Tab_1'),
('Salvador','42505010','42505080','Paramana (Ilha dos Frades)','Tab_1'),
('Salvador','42505300','42505310','Costa de Fora (Ilha dos Frades)','Tab_1'),
('Salvador','42505500','42505520','Ponta de Nossa Senhora (Ilha dos Frades)','Tab_1'),
('Salvador','42510005','42510020','Comendador Neiva (Ilha de Bom Jesus dos Passos)','Tab_2'),
('Salvador','42510030','42510060','Alto do Cruzeiro (Ilha de Bom Jesus dos Passos)','Tab_2'),
('Salvador','42510080','42510125','Largo do Tanque (Ilha de Bom Jesus dos Passos)','Tab_3'),
('Salvador','42510140','42510170','Fonte Nova (Ilha de Bom Jesus dos Passos)','Tab_3'),
('Salvador','42510200','42510260','Nova Brasília (Ilha de Bom Jesus dos Passos)','Tab_3'),
('Salvador','42510280','42510280','Pontinha (Ilha de Bom Jesus dos Passos)','Tab_2')
ON CONFLICT DO NOTHING;

-- 9. TABELA FAIXAS DE PESO POR BAIRRO (Tabelas Tab_1, Tab_2, Tab_3)
CREATE TABLE IF NOT EXISTS faixas_peso_entrega_bairro (
    id SERIAL PRIMARY KEY,
    peso_de NUMERIC(10,3) NOT NULL,
    peso_ate NUMERIC(10,3) NOT NULL,
    faixas VARCHAR(30),
    valor_peso NUMERIC(10,2) NOT NULL,
    nome_tabela VARCHAR(10) NOT NULL
);

INSERT INTO faixas_peso_entrega_bairro (peso_de, peso_ate, faixas, valor_peso, nome_tabela) VALUES
(0.001, 1.000,   '0,01 a 1 kg',     3,   'Tab_1'),
(1.010, 3.000,   '1,01 a 3 kg',     3.5, 'Tab_1'),
(3.010, 5.000,   '3,01 a 5 kg',     4.2, 'Tab_1'),
(5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_1'),
(8.010, 15.000,  '8,01 a 15 kg',    7,   'Tab_1'),
(15.010, 9999000,'acima de 15 kg',  12,  'Tab_1'),
(0.001, 1.000,   '0,01 a 1 kg',     2.8, 'Tab_2'),
(1.010, 3.000,   '1,01 a 3 kg',     3,   'Tab_2'),
(3.010, 5.000,   '3,01 a 5 kg',     4,   'Tab_2'),
(5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_2'),
(8.010, 15.000,  '8,01 a 15 kg',    8,   'Tab_2'),
(15.010, 9999000,'acima de 15 kg',  12,  'Tab_2'),
(0.001, 1.000,   '0,01 a 1 kg',     3,   'Tab_3'),
(1.010, 3.000,   '1,01 a 3 kg',     3.5, 'Tab_3'),
(3.010, 5.000,   '3,01 a 5 kg',     4.5, 'Tab_3'),
(5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_3'),
(8.010, 15.000,  '8,01 a 15 kg',    6,   'Tab_3'),
(15.010, 9999000,'acima de 15 kg',  10,  'Tab_3')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ceps_bairros_cep ON ceps_bairros (cep_ini, cep_fim);
CREATE INDEX IF NOT EXISTS idx_faixas_peso_bairro_tabela ON faixas_peso_entrega_bairro (nome_tabela, peso_de, peso_ate);
