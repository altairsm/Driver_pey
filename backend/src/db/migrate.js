import { pool } from './index.js';

const seedMatriculas = `
  INSERT INTO matriculos_jad ("OperadorMatricula", nome_completo, cpf, telefone, pgro) VALUES
  (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '12345678901', '5571999999991', 'Por Entrega'),
  (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '04791538501', '5571984242886', 'Por Entrega'),
  (133209, 'CARLOS DANIEL SANTOS LIMA',      '98765432101', '5571999999992', 'Alpha'),
  (135439, 'DIEGO MAGNO LIMA SANTOS',        '11122233344', '5571999999993', 'Por Entrega'),
  (138721, 'EDUARDO HENRIQUE SILVA SOUSA',   '55566677788', '5571999999994', 'Volumoso')
  ON CONFLICT ("OperadorMatricula") DO NOTHING`;

const seedFaixasPeso = `
  INSERT INTO faixas_peso (peso_de, peso_ate, valor_peso) VALUES
  (0, 5, 5.00), (5.01, 10, 8.00), (10.01, 15, 12.00),
  (15.01, 20, 18.00), (20.01, 30, 25.00), (30.01, 50, 35.00), (50.01, 100, 50.00)`;

const seedFreteMotorista = `
  INSERT INTO tabela_frete_motorista (matricula, metrica, valor_frete) VALUES
  (127704, 'Por Entrega', 3.00), (127704, 'Alpha', 1.50), (127704, 'Volumoso', 12.00),
  (130354, 'Por Entrega', 3.00), (130354, 'Alpha', 1.00), (130354, 'Volumoso', 12.00),
  (133209, 'Por Entrega', 2.80), (133209, 'Alpha', 1.20), (133209, 'Volumoso', 11.00),
  (135439, 'Por Entrega', 3.00), (135439, 'Alpha', 1.50), (135439, 'Volumoso', 12.00),
  (138721, 'Por Entrega', 3.50), (138721, 'Alpha', 1.80), (138721, 'Volumoso', 14.00)`;

const seedCepsBairros = `
  INSERT INTO ceps_bairros (cidade, cep_ini, cep_fim, bairro, tabela_motorista) VALUES
  ('Salvador','40010000','40015999','Comercio','Tab_2'),
  ('Salvador','40020000','40020999','Centro','Tab_2'),
  ('Salvador','40024000','40024999','Barroquinha','Tab_2'),
  ('Salvador','40025000','40025999','Baixa dos Sapateiros','Tab_2'),
  ('Salvador','40026000','40026999','Centro Historico','Tab_2'),
  ('Salvador','40040000','40240080','Nazare','Tab_2'),
  ('Salvador','40040525','40045999','Saude','Tab_2'),
  ('Salvador','40050050','40050290','Tororo','Tab_2'),
  ('Salvador','40060000','40060999','Dois de Julho','Tab_2'),
  ('Salvador','40070020','40070999','Barris','Tab_2'),
  ('Salvador','40080000','40080121','Campo Grande','Tab_2'),
  ('Salvador','40080002','40081999','Vitoria','Tab_2'),
  ('Salvador','40100000','40105999','Garcia','Tab_2'),
  ('Salvador','40110000','40110999','Canela','Tab_2'),
  ('Salvador','40130000','40140999','Barra','Tab_1'),
  ('Salvador','40150000','40150999','Graca','Tab_2'),
  ('Salvador','40155000','40155999','Jardim Apipema','Tab_1'),
  ('Salvador','40157000','40157999','Chame-Chame','Tab_2'),
  ('Salvador','40169000','40169999','Ondina','Tab_1'),
  ('Salvador','40170000','40170999','Ondina','Tab_1'),
  ('Salvador','40210245','40231999','Federacao','Tab_3'),
  ('Salvador','40220000','40225600','Engenho Velho da Federacao','Tab_3'),
  ('Salvador','40226000','40226999','Alto das Pombas','Tab_3'),
  ('Salvador','40240000','40245999','Engenho Velho de Brotas','Tab_2'),
  ('Salvador','40250000','40254999','Cosme de Farias','Tab_2'),
  ('Salvador','40255000','40260195','Matatu','Tab_2'),
  ('Salvador','40260200','40261999','Luiz Anselmo','Tab_2'),
  ('Salvador','40262000','40262999','Santo Agostinho','Tab_2'),
  ('Salvador','40265000','40265999','Santa Teresa','Tab_2'),
  ('Salvador','40270000','40270999','Vila Laura','Tab_2'),
  ('Salvador','40275000','40287999','Brotas','Tab_2'),
  ('Salvador','40279640','40280971','Parque Bela Vista','Tab_2'),
  ('Salvador','40283000','40283880','Daniel Lisboa','Tab_2'),
  ('Salvador','40288080','40288090','Boa Vista de Brotas','Tab_2'),
  ('Salvador','40290000','40290999','Acupe','Tab_2'),
  ('Salvador','40295000','40295999','Horto Florestal','Tab_2'),
  ('Salvador','40296000','40296999','Candeal','Tab_2'),
  ('Salvador','40300000','40303999','Baixa de Quintas','Tab_2'),
  ('Salvador','40300500','40302999','Macaubas','Tab_2'),
  ('Salvador','40300750','40301270','Barbalho','Tab_2'),
  ('Salvador','40301280','40301520','Santo Antonio','Tab_2'),
  ('Salvador','40310000','40315999','Pau Miudo','Tab_3'),
  ('Salvador','40313000','40318200','Cidade Nova','Tab_3'),
  ('Salvador','40320000','40323150','Caixa D''Agua','Tab_3'),
  ('Salvador','40323170','40340999','IAPI','Tab_3'),
  ('Salvador','40325000','40375999','Liberdade','Tab_3'),
  ('Salvador','40328000','40328999','Lapinha','Tab_3'),
  ('Salvador','40335000','40340390','Pero Vaz','Tab_3'),
  ('Salvador','40342000','40342999','Santa Monica','Tab_3'),
  ('Salvador','40349000','40360997','Fazenda Grande do Retiro','Tab_3'),
  ('Salvador','40365000','40366999','Curuzu','Tab_3'),
  ('Salvador','40385000','40387999','Boa Vista de Sao Caetano','Tab_3'),
  ('Salvador','40390000','40392999','Sao Caetano','Tab_3'),
  ('Salvador','40393000','40398999','Capelinha','Tab_3'),
  ('Salvador','40410000','40411999','Calcada','Tab_2'),
  ('Salvador','40414000','40414999','Boa Viagem','Tab_2'),
  ('Salvador','40415000','40415999','Bonfim','Tab_2'),
  ('Salvador','40420000','40421999','Ribeira','Tab_2'),
  ('Salvador','40425000','40425999','Monte Serrat','Tab_2'),
  ('Salvador','40430000','40431999','Vila Ruy Barbosa','Tab_2'),
  ('Salvador','40433000','40436999','Massaranduba','Tab_2'),
  ('Salvador','40437000','40437999','Mangueira','Tab_2'),
  ('Salvador','40440000','40441999','Caminho de Areia','Tab_2'),
  ('Salvador','40444000','40444999','Roma','Tab_2'),
  ('Salvador','40445000','40445999','Mares','Tab_2'),
  ('Salvador','40450000','40454999','Uruguai','Tab_2'),
  ('Salvador','40455000','40455999','Machado','Tab_2'),
  ('Salvador','40460000','40460999','Agua de Meninos','Tab_2'),
  ('Salvador','40470000','40483999','Lobato','Tab_3'),
  ('Salvador','40484000','40485999','Alto do Cabrito','Tab_3'),
  ('Salvador','40486000','40486999','Santa Luzia','Tab_3'),
  ('Salvador','40487000','40488999','Boa Vista do Lobato','Tab_3'),
  ('Salvador','40490000','40491999','Sao Joao do Cabrito','Tab_3'),
  ('Salvador','40708000','40709999','Plataforma','Tab_3'),
  ('Salvador','40710000','40710470','Escada','Tab_3'),
  ('Salvador','40710500','40718999','Plataforma','Tab_3'),
  ('Salvador','40711000','40711999','Alto da Terezinha','Tab_3'),
  ('Salvador','40713000','40714999','Itacaranha','Tab_3'),
  ('Salvador','40715000','40715300','Ilha Amarela','Tab_3'),
  ('Salvador','40715310','40715999','Rio Sena','Tab_3'),
  ('Salvador','40719000','40719199','Mirantes de Periperi','Tab_3'),
  ('Salvador','40719200','40719399','Colinas de Periperi','Tab_3'),
  ('Salvador','40720000','40740999','Periperi','Tab_3'),
  ('Salvador','40720580','40725560','Praia Grande','Tab_3'),
  ('Salvador','40730000','40731999','Fazenda Coutos','Tab_3'),
  ('Salvador','40748000','40748999','Nova Constituinte','Tab_3'),
  ('Salvador','40749000','40749999','Vista Alegre','Tab_3'),
  ('Salvador','40750000','40770999','Coutos','Tab_3'),
  ('Salvador','40771000','40773999','Paripe','Tab_3'),
  ('Salvador','40800000','40840999','Paripe','Tab_3'),
  ('Salvador','40800160','40800399','Sao Tome','Tab_3'),
  ('Salvador','40841000','40841999','Sao Tome','Tab_3'),
  ('Salvador','41098000','41098100','Horto Bela Vista','Tab_3'),
  ('Salvador','41099000','41099999','Saramandaia','Tab_3'),
  ('Salvador','41100000','41130999','Pernambues','Tab_3'),
  ('Salvador','41150000','41150999','Cabula','Tab_2'),
  ('Salvador','41151000','41151999','Retiro','Tab_3'),
  ('Salvador','41152000','41152999','Resgate','Tab_2'),
  ('Salvador','41180000','41180999','Saboeiro','Tab_2'),
  ('Salvador','41181000','41181999','Cabula VI','Tab_2'),
  ('Salvador','41183900','41183900','Saboeiro','Tab_2'),
  ('Salvador','41185000','41190999','Sao Goncalo','Tab_2'),
  ('Salvador','41192000','41192999','Narandiba','Tab_2'),
  ('Salvador','41194000','41194999','Doron','Tab_2'),
  ('Salvador','41195000','41197999','Barreiras','Tab_2'),
  ('Salvador','41200000','41202999','Engomadeira','Tab_2'),
  ('Salvador','41204000','41204999','Arraial do Retiro','Tab_2'),
  ('Salvador','41205000','41210999','Tancredo Neves','Tab_3'),
  ('Salvador','41211000','41211999','Arenoso','Tab_3'),
  ('Salvador','41213000','41217999','Sussuarana','Tab_2'),
  ('Salvador','41218000','41218999','Novo Horizonte','Tab_2'),
  ('Salvador','41219000','41225999','Mata Escura','Tab_3'),
  ('Salvador','41227000','41228999','Calabetao','Tab_3'),
  ('Salvador','41230000','41230250','Granjas Rurais Presidente Vargas','Tab_3'),
  ('Salvador','41230300','41230999','Jardim Cajazeiras','Tab_3'),
  ('Salvador','41231000','41231999','Jardim Santo Inacio','Tab_3'),
  ('Salvador','41233000','41233999','Porto Seco Piraja','Tab_3'),
  ('Salvador','41235000','41247270','Pau da Lima','Tab_3'),
  ('Salvador','41250000','41253999','Sao Marcos','Tab_3'),
  ('Salvador','41254000','41255999','Sao Rafael','Tab_3'),
  ('Salvador','41256000','41256999','Vale dos Lagos','Tab_2'),
  ('Salvador','41260000','41261999','Canabrava','Tab_3'),
  ('Salvador','41262000','41262999','Vila 2 de Julho','Tab_2'),
  ('Salvador','41270000','41275999','Campinas de Piraja','Tab_3'),
  ('Salvador','41280000','41285999','Marechal Rondon','Tab_3'),
  ('Salvador','41290000','41297999','Piraja','Tab_3'),
  ('Salvador','41298000','41299999','Boca da Mata de Valeria','Tab_3'),
  ('Salvador','41300000','41305999','Valeria','Tab_4'),
  ('Salvador','41306000','41307999','Moradas da Lagoa','Tab_3'),
  ('Salvador','41308000','41309999','Palestina','Tab_3'),
  ('Salvador','41310000','41311999','Aguas Claras','Tab_4'),
  ('Salvador','41315000','41316999','Dom Avelar','Tab_4'),
  ('Salvador','41320000','41325999','Castelo Branco','Tab_4'),
  ('Salvador','41330000','41338999','Cajazeiras VIII','Tab_3'),
  ('Salvador','41332000','41332999','Cajazeiras II','Tab_3'),
  ('Salvador','41334000','41334999','Cajazeiras IV','Tab_3'),
  ('Salvador','41335000','41335999','Cajazeiras V','Tab_3'),
  ('Salvador','41336000','41336999','Cajazeiras VI','Tab_3'),
  ('Salvador','41337000','41337999','Cajazeiras VII','Tab_3'),
  ('Salvador','41339000','41347270','Fazenda Grande I','Tab_3'),
  ('Salvador','41340000','41340999','Cajazeiras X','Tab_3'),
  ('Salvador','41341000','41347999','Cajazeiras XI','Tab_3'),
  ('Salvador','41342000','41342489','Fazenda Grande II','Tab_3'),
  ('Salvador','41342490','41342999','Jaguaripe I','Tab_3'),
  ('Salvador','41343000','41349999','Boca da Mata','Tab_3'),
  ('Salvador','41343275','41343999','Fazenda Grande III','Tab_3'),
  ('Salvador','41345200','41345999','Fazenda Grande IV','Tab_3'),
  ('Salvador','41350000','41351999','Nova Brasilia','Tab_2'),
  ('Salvador','41370000','41370999','Jardim Nova Esperanca','Tab_3'),
  ('Salvador','41385000','41387999','Sete de Abril','Tab_3'),
  ('Salvador','41388000','41388999','Novo Marotinho','Tab_3'),
  ('Salvador','41390000','41391999','Vila Canaria','Tab_3'),
  ('Salvador','41400000','41405000','Nova Esperanca','Tab_4'),
  ('Salvador','41410000','41410999','Barragem de Ipitanga','Tab_4'),
  ('Salvador','41411000','41412999','Areia Branca','Tab_4'),
  ('Salvador','41480000','41481999','Mussurunga','Tab_4'),
  ('Salvador','41483000','41483199','Alphaville II','Tab_4'),
  ('Salvador','41490000','41490999','Mussurunga I','Tab_4'),
  ('Salvador','41500000','41510999','Sao Cristovao','Tab_4'),
  ('Salvador','41502000','41502999','Jardim das Margaridas','Tab_4'),
  ('Salvador','41503000','41504999','Itinga','Tab_4'),
  ('Salvador','41505000','41507999','Cassange','Tab_4'),
  ('Salvador','41515000','41515999','Bairro da Paz','Tab_1'),
  ('Salvador','41600000','41601999','Stella Maris','Tab_1'),
  ('Salvador','41602000','41602999','Aeroporto','Tab_1'),
  ('Salvador','41603000','41603999','Praia do Flamengo','Tab_1'),
  ('Salvador','41610000','41640999','Itapua','Tab_1'),
  ('Salvador','41611000','41611999','Nova Brasilia de Itapua','Tab_1'),
  ('Salvador','41612000','41612499','Jardim Placaford','Tab_1'),
  ('Salvador','41613000','41613999','Jaguaribe','Tab_1'),
  ('Salvador','41615000','41615999','Alto do Coqueirinho','Tab_1'),
  ('Salvador','41650000','41651999','Piata','Tab_1'),
  ('Salvador','41680000','41681999','Patamares','Tab_1'),
  ('Salvador','41701000','41701199','Alphaville I','Tab_2'),
  ('Salvador','41705000','41710999','Boca do Rio','Tab_1'),
  ('Salvador','41720000','41720999','Imbui','Tab_1'),
  ('Salvador','41730100','41730500','Paralela','Tab_2'),
  ('Salvador','41740000','41741999','Pituacu','Tab_1'),
  ('Salvador','41745000','41745016','Centro Administrativo da Bahia','Tab_2'),
  ('Salvador','41745017','41745999','Trobogy','Tab_2'),
  ('Salvador','41750000','41750999','Armacao','Tab_1'),
  ('Salvador','41760000','41760999','Costa Azul','Tab_1'),
  ('Salvador','41770000','41770999','Stiep','Tab_1'),
  ('Salvador','41771000','41771999','Aquarius','Tab_1'),
  ('Salvador','41800700','41830999','Pituba','Tab_1'),
  ('Salvador','41815000','41825020','Itaigara','Tab_1'),
  ('Salvador','41820000','41820999','Caminho das Arvores','Tab_1'),
  ('Salvador','41889000','41900999','Amaralina','Tab_3'),
  ('Salvador','41905000','41906999','Nordeste','Tab_3'),
  ('Salvador','41915001','41927999','Santa Cruz','Tab_3'),
  ('Salvador','41928000','41928999','Chapada do Rio Vermelho','Tab_3'),
  ('Salvador','41930000','41930999','Vale das Pedrinhas','Tab_3'),
  ('Salvador','41940000','41950999','Rio Vermelho','Tab_1'),
  ('Salvador','42500001','42500119','Santana (Ilha de Mare)','Tab_5'),
  ('Salvador','42500200','42500239','Itamoabo (Ilha de Mare)','Tab_5'),
  ('Salvador','42500260','42500299','Neves (Ilha de Mare)','Tab_5'),
  ('Salvador','42500320','42500369','Engenho de Mare (Ilha de Mare)','Tab_5'),
  ('Salvador','42500400','42500429','Botelho (Ilha de Mare)','Tab_5'),
  ('Salvador','42500450','42500459','Oratorio (Ilha de Mare)','Tab_5'),
  ('Salvador','42500500','42500529','Bananeiras (Ilha de Mare)','Tab_5'),
  ('Salvador','42500530','42500539','Armenda (Ilha de Mare)','Tab_5'),
  ('Salvador','42500540','42500550','Maracana (Ilha de Mare)','Tab_5'),
  ('Salvador','42500570','42500579','Martelo (Ilha de Mare)','Tab_5'),
  ('Salvador','42500600','42500629','Mata Atlantica (Ilha de Mare)','Tab_5'),
  ('Salvador','42500700','42500769','Praia Grande (Ilha de Mare)','Tab_5'),
  ('Salvador','42505001','42505099','Paramana (Ilha dos Frades)','Tab_5'),
  ('Salvador','42505300','42505319','Costa de Fora (Ilha dos Frades)','Tab_5'),
  ('Salvador','42505500','42505549','Ponta de Nossa Senhora (Ilha dos Frades)','Tab_5'),
  ('Salvador','42510001','42510029','Comendador Neiva (Ilha de Bom Jesus dos Passos)','Tab_5'),
  ('Salvador','42510030','42510079','Alto do Cruzeiro (Ilha de Bom Jesus dos Passos)','Tab_5'),
  ('Salvador','42510080','42510139','Largo do Tanque (Ilha de Bom Jesus dos Passos)','Tab_5'),
  ('Salvador','42510140','42510179','Fonte Nova (Ilha de Bom Jesus dos Passos)','Tab_5'),
  ('Salvador','42510180','42510279','Nova Brasilia (Ilha de Bom Jesus dos Passos)','Tab_5'),
  ('Salvador','42510280','42510299','Pontinha (Ilha de Bom Jesus dos Passos)','Tab_5')`;

const seedListas = `
  INSERT INTO lista_entregas ("Número", "Qtd", "Peso", "Valor", "Data Emissão", "Data Baixa", "Tipo", "Rota", status, metrica_da_lista, matricula_motorista, revisado, ok_motorista) VALUES
  (2576, 1, 0.14, 4.00, '2026-03-28', '2026-03-28', 'Domicílio', 'DIEGO MAGNO LIMA SANTOS', 'Finalizado', 'Por Entrega', '135439', true, true),
  (3333, 0, 0, 0, '2026-03-23', '2026-03-23', 'Domicílio', 'ALESSANDRO MELO DE OLIVEIRA', 'Finalizado', 'Por Entrega', '127704', false, false),
  (4101, 3, 18.50, 45.00, '2026-03-20', '2026-03-21', 'Domicílio', 'BRUNO CESAR BARBOSA DOS SANTOS', 'Finalizado', 'Por Entrega', '130354', false, false),
  (4102, 5, 22.30, 78.00, '2026-03-21', '2026-03-22', 'Domicílio', 'BRUNO CESAR BARBOSA DOS SANTOS', 'Finalizado', 'Alpha', '130354', false, false),
  (4103, 1, 45.00, 90.00, '2026-03-22', '2026-03-23', 'Domicílio', 'CARLOS DANIEL SANTOS LIMA', 'Finalizado', 'Volumoso', '133209', false, false),
  (4104, 2, 8.00, 25.00, '2026-03-25', '2026-03-26', 'Domicílio', 'EDUARDO HENRIQUE SILVA SOUSA', 'Finalizado', 'Por Entrega', '138721', false, false),
  (4105, 4, 12.00, 38.00, '2026-03-26', '2026-03-27', 'Domicílio', 'ALESSANDRO MELO DE OLIVEIRA', 'Finalizado', 'Alpha', '127704', false, false)
  ON CONFLICT ("Número") DO NOTHING`;

const seedRelatorio = `
  INSERT INTO relatorioentrega_export ("OperadorMatricula", "OperadorNome", "NCTE", "Lista", "Peso", "Cep", "Evento", "Data", "Hora", "TaxaEntrega", "Expedidor", "BairroDestino", "CidadeDestino", "controle_duplicidade")
  SELECT * FROM (VALUES
    (135439, 'DIEGO MAGNO LIMA SANTOS',       '18015952809981', '2576', 0.14,  '41305410', 'entrega', '2026-03-28', '16:18:21', 4.00, 'in glow brasil', 'Valéria', 'Salvador', '135439257618015952809981'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809982', '4101', 5.00,  '40275010', 'entrega', '2026-03-27', '09:15:00', 4.00, 'in glow brasil', 'Brotas',   'Salvador', '130354410118015952809982'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809983', '4101', 8.20,  '40280000', 'entrega', '2026-03-27', '09:20:00', 4.00, 'in glow brasil', 'Brotas',   'Salvador', '130354410118015952809983'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809984', '4101', 5.30,  '40285000', 'entrega', '2026-03-27', '09:25:00', 4.00, 'in glow brasil', 'Brotas',   'Salvador', '130354410118015952809984'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809985', '4102', 22.30, '41810000', 'entrega', '2026-03-27', '10:00:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809985'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809986', '4102', 22.30, '41815000', 'entrega', '2026-03-27', '10:05:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809986'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809987', '4102', 22.30, '41820000', 'entrega', '2026-03-27', '10:10:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809987'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809988', '4102', 22.30, '41825000', 'entrega', '2026-03-27', '10:15:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809988'),
    (130354, 'BRUNO CESAR BARBOSA DOS SANTOS', '18015952809989', '4102', 22.30, '41830000', 'entrega', '2026-03-27', '10:20:00', 4.00, 'in glow brasil', 'Pituba',   'Salvador', '130354410218015952809989'),
    (133209, 'CARLOS DANIEL SANTOS LIMA',      '18015952809990', '4103', 45.00, '41820000', 'entrega', '2026-03-26', '14:00:00', 5.00, 'amazon servicos', 'Caminho das Árvores', 'Salvador', '133209410318015952809990'),
    (138721, 'EDUARDO HENRIQUE SILVA SOUSA',   '18015952809991', '4104', 8.00,  '41720000', 'entrega', '2026-03-25', '11:30:00', 4.00, 'in glow brasil', 'Imbuí',    'Salvador', '138721410418015952809991'),
    (138721, 'EDUARDO HENRIQUE SILVA SOUSA',   '18015952809992', '4104', 8.00,  '41720500', 'entrega', '2026-03-25', '11:35:00', 4.00, 'in glow brasil', 'Imbuí',    'Salvador', '138721410418015952809992'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809993', '4105', 12.00, '41940000', 'entrega', '2026-03-26', '08:00:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809993'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809994', '4105', 12.00, '41942000', 'entrega', '2026-03-26', '08:05:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809994'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809995', '4105', 12.00, '41945000', 'entrega', '2026-03-26', '08:10:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809995'),
    (127704, 'ALESSANDRO MELO DE OLIVEIRA',    '18015952809996', '4105', 12.00, '41948000', 'entrega', '2026-03-26', '08:15:00', 4.00, 'in glow brasil', 'Rio Vermelho', 'Salvador', '127704410518015952809996')
  ) AS seed_data
  WHERE NOT EXISTS (SELECT 1 FROM relatorioentrega_export WHERE "NCTE" = '18015952809981')`;

const fixSeedStatus = `
  UPDATE lista_entregas
  SET status = 'Finalizado', "Data Baixa" = COALESCE("Data Baixa", "Data Emissão")
  WHERE status = 'Aberto' AND "Número" IN (2576, 3333, 4101, 4102, 4103, 4104, 4105)`;

const seedFaixasBairro = `
  INSERT INTO faixas_peso_entrega_bairro (peso_de, peso_ate, faixas, valor_peso, nome_tabela) VALUES
  (0.000, 1.000,   '0 a 1 kg',     3,   'Tab_1'),
  (1.010, 3.000,   '1,01 a 3 kg',     3.5, 'Tab_1'),
  (3.010, 5.000,   '3,01 a 5 kg',     4.2, 'Tab_1'),
  (5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_1'),
  (8.010, 15.000,  '8,01 a 15 kg',    7,   'Tab_1'),
  (15.010, 9999000,'acima de 15 kg',  12,  'Tab_1'),
  (0.000, 1.000,   '0 a 1 kg',     2.8, 'Tab_2'),
  (1.010, 3.000,   '1,01 a 3 kg',     3,   'Tab_2'),
  (3.010, 5.000,   '3,01 a 5 kg',     4,   'Tab_2'),
  (5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_2'),
  (8.010, 15.000,  '8,01 a 15 kg',    8,   'Tab_2'),
  (15.010, 9999000,'acima de 15 kg',  12,  'Tab_2'),
  (0.000, 1.000,   '0 a 1 kg',     3,   'Tab_3'),
  (1.010, 3.000,   '1,01 a 3 kg',     3.5, 'Tab_3'),
  (3.010, 5.000,   '3,01 a 5 kg',     4.5, 'Tab_3'),
  (5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_3'),
  (8.010, 15.000,  '8,01 a 15 kg',    6,   'Tab_3'),
  (15.010, 9999000,'acima de 15 kg',  10,  'Tab_3'),
  (0.000, 1.000,   '0 a 1 kg',        3,   'Tab_4'),
  (1.010, 3.000,   '1,01 a 3 kg',     3.5, 'Tab_4'),
  (3.010, 5.000,   '3,01 a 5 kg',     4.2, 'Tab_4'),
  (5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_4'),
  (8.010, 15.000,  '8,01 a 15 kg',    7,   'Tab_4'),
  (15.010, 9999000,'acima de 15 kg',  12,  'Tab_4'),
  (0.000, 1.000,   '0 a 1 kg',        3,   'Tab_5'),
  (1.010, 3.000,   '1,01 a 3 kg',     3.5, 'Tab_5'),
  (3.010, 5.000,   '3,01 a 5 kg',     4.2, 'Tab_5'),
  (5.010, 8.000,   '5,01 a 8 kg',     5,   'Tab_5'),
  (8.010, 15.000,  '8,01 a 15 kg',    7,   'Tab_5'),
  (15.010, 9999000,'acima de 15 kg',  12,  'Tab_5')`;

const fixFaixasStart = `
  UPDATE faixas_peso_entrega_bairro
  SET peso_de = 0.000, faixas = '0 a 1 kg'
  WHERE peso_de = 0.001 AND faixas = '0,01 a 1 kg'`;

const seedFaturamento = `
  INSERT INTO tabela_faturamento (peso_de, peso_ate, faixas, valor_fixo, valor_excedente_kg) VALUES
  (0.000, 1.000,   '0 a 1 kg',         5.80, 0),
  (1.010, 3.000,   '1,01 a 3 kg',      6.40, 0),
  (3.010, 5.000,   '3,01 a 5 kg',      7.00, 0),
  (5.010, 8.000,   '5,01 a 8 kg',      8.50, 0),
  (8.010, 15.000,  '8,01 a 15 kg',     9.00, 0),
  (15.010, 9999000,'acima de 15 kg',   9.00, 0.80)`;

const fixFaturamento = `
  UPDATE tabela_faturamento SET faixas = '0 a 1 kg' WHERE faixas = '0,01 a 1 kg'`;

async function seedIfEmpty(table, sql) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM ${table}`);
  if (rows[0].cnt === 0) {
    await pool.query(sql);
    console.log(`  Seed data inserted into ${table}`);
  } else {
    console.log(`  ${table} already has data, skipping seed`);
  }
}

export async function runMigrations() {
  try {
    // ── STEP 1: Backup old ceps_bairros before creating tables ──
    console.log('Migrations: checking ceps_bairros for legacy data...');
    try {
      const { rows: tableExists } = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM information_schema.tables WHERE table_name = 'ceps_bairros'`
      );
      if (tableExists[0].cnt > 0) {
        const { rows: oldData } = await pool.query(
          `SELECT COUNT(*)::int AS cnt FROM ceps_bairros WHERE bairro LIKE '%Nazar%' AND tabela_motorista = 'Tab_1'`
        );
        if (oldData[0].cnt > 0) {
          await pool.query('DROP TABLE IF EXISTS ceps_bairros_backup CASCADE');
          await pool.query('ALTER TABLE ceps_bairros RENAME TO ceps_bairros_backup');
          console.log('  ceps_bairros backed up → ceps_bairros_backup (legacy data replaced)');
        } else {
          const { rows: newData } = await pool.query(
            `SELECT COUNT(*)::int AS cnt FROM ceps_bairros WHERE bairro = 'Comercio' AND tabela_motorista = 'Tab_2'`
          );
          if (newData[0].cnt > 0) {
            console.log('  ceps_bairros already has new data, no backup needed');
          } else {
            console.log('  ceps_bairros exists but has unknown data, backed up just in case');
            await pool.query('DROP TABLE IF EXISTS ceps_bairros_backup CASCADE');
            await pool.query('ALTER TABLE ceps_bairros RENAME TO ceps_bairros_backup');
          }
        }
      } else {
        console.log('  ceps_bairros table does not exist yet');
      }
    } catch (err) {
      console.log('  ceps_bairros backup check skipped:', err.message);
    }

    // ── STEP 2: Create all tables (one query per table to avoid multi-statement issues) ──
    console.log('Migrations: creating/verifying tables...');

    await pool.query(`CREATE TABLE IF NOT EXISTS matriculos_jad (
      "OperadorMatricula" BIGINT PRIMARY KEY,
      nome_completo VARCHAR(200) NOT NULL,
      cpf VARCHAR(11) NOT NULL,
      telefone VARCHAR(20),
      pgro VARCHAR(100)
    )`);
    console.log('  -> matriculos_jad');

    await pool.query(`CREATE TABLE IF NOT EXISTS faixas_peso (
      id SERIAL PRIMARY KEY,
      peso_de NUMERIC(10,2) NOT NULL,
      peso_ate NUMERIC(10,2) NOT NULL,
      valor_peso NUMERIC(10,2) NOT NULL
    )`);
    console.log('  -> faixas_peso');

    await pool.query(`CREATE TABLE IF NOT EXISTS tabela_frete_motorista (
      id SERIAL PRIMARY KEY,
      matricula BIGINT NOT NULL,
      metrica VARCHAR(100) NOT NULL,
      valor_frete NUMERIC(10,2) NOT NULL
    )`);
    console.log('  -> tabela_frete_motorista');

    await pool.query(`CREATE TABLE IF NOT EXISTS lista_entregas (
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
    )`);
    console.log('  -> lista_entregas');

    await pool.query(`CREATE TABLE IF NOT EXISTS relatorioentrega_export (
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
    )`);
    console.log('  -> relatorioentrega_export');

    await pool.query(`CREATE TABLE IF NOT EXISTS consulta (
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
    )`);
    console.log('  -> consulta');

    await pool.query(`CREATE TABLE IF NOT EXISTS acareacaojad (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(50) UNIQUE,
      "OperadorMatricula" BIGINT,
      "NCTE" VARCHAR(50),
      assunto VARCHAR(100),
      motivo TEXT,
      status_original VARCHAR(50),
      data_criacao DATE DEFAULT CURRENT_DATE
    )`);
    console.log('  -> acareacaojad');

    await pool.query(`CREATE TABLE IF NOT EXISTS ceps_bairros (
      id SERIAL PRIMARY KEY,
      cidade VARCHAR(100) NOT NULL,
      cep_ini VARCHAR(8) NOT NULL,
      cep_fim VARCHAR(8) NOT NULL,
      bairro VARCHAR(200) NOT NULL,
      tabela_motorista VARCHAR(10)
    )`);
    console.log('  -> ceps_bairros');

    await pool.query(`CREATE TABLE IF NOT EXISTS faixas_peso_entrega_bairro (
      id SERIAL PRIMARY KEY,
      peso_de NUMERIC(10,3) NOT NULL,
      peso_ate NUMERIC(10,3) NOT NULL,
      faixas VARCHAR(30),
      valor_peso NUMERIC(10,2) NOT NULL,
      nome_tabela VARCHAR(10) NOT NULL
    )`);
    console.log('  -> faixas_peso_entrega_bairro');

    await pool.query(`CREATE TABLE IF NOT EXISTS tabela_faturamento (
      id SERIAL PRIMARY KEY,
      peso_de NUMERIC(10,3) NOT NULL,
      peso_ate NUMERIC(10,3) NOT NULL,
      faixas VARCHAR(30),
      valor_fixo NUMERIC(10,2) NOT NULL,
      valor_excedente_kg NUMERIC(10,2) DEFAULT 0
    )`);
    console.log('  -> tabela_faturamento');

    await pool.query(`CREATE TABLE IF NOT EXISTS solicitacoes_pagamento (
      id SERIAL PRIMARY KEY,
      matricula BIGINT NOT NULL,
      lista_numero BIGINT NOT NULL,
      valor_solicitado NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pendente',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      aprovado_em TIMESTAMP,
      recusado_em TIMESTAMP,
      UNIQUE (matricula, lista_numero)
    )`);
    console.log('  -> solicitacoes_pagamento');

    await pool.query(`CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      dias_uteis_pagamento INTEGER NOT NULL DEFAULT 4,
      eficiencia_minima_adiantamento NUMERIC(5,2) NOT NULL DEFAULT 98.00,
      taxa_adiantamento NUMERIC(5,2) NOT NULL DEFAULT 0.00,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('  -> configuracoes');

    // ── Step 3: Create indexes ──
    console.log('Migrations: creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_ceps_bairros_cep ON ceps_bairros (cep_ini, cep_fim)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_faixas_peso_bairro_tabela ON faixas_peso_entrega_bairro (nome_tabela, peso_de, peso_ate)');
    console.log('  indexes created');

    // ── Step 4: Diagnóstico acareacaojad columns ──
    try {
      const { rows: cols } = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'acareacaojad'
          AND column_name IN ('ticket_id','assunto','status_original')
        ORDER BY column_name
      `);
      console.log(`  acareacaojad columns found: [${cols.map(c=>c.column_name).join(', ')}]`);
    } catch {
      console.log('  acareacaojad table not yet available for diagnostic');
    }

    // ── Step 5: acareacaojad structural migrations ──
    await pool.query('ALTER TABLE acareacaojad ADD COLUMN IF NOT EXISTS ticket_id VARCHAR(50)');
    await pool.query('ALTER TABLE acareacaojad ADD COLUMN IF NOT EXISTS assunto VARCHAR(100)');
    await pool.query('ALTER TABLE acareacaojad ADD COLUMN IF NOT EXISTS status_original VARCHAR(50)');
    await pool.query('ALTER TABLE acareacaojad ADD COLUMN IF NOT EXISTS importado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    console.log('  acareacaojad columns expanded');

    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'acareacaojad_ticket_id_key') THEN
          ALTER TABLE acareacaojad ADD CONSTRAINT acareacaojad_ticket_id_key UNIQUE (ticket_id);
        END IF;
      END $$;
    `);
    console.log('  acareacaojad UNIQUE constraint added');

    // ── Step 6: solicitacoes_pagamento column migrations ──
    await pool.query('ALTER TABLE solicitacoes_pagamento ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP');
    await pool.query('ALTER TABLE solicitacoes_pagamento ADD COLUMN IF NOT EXISTS recusado_em TIMESTAMP');
    await pool.query('ALTER TABLE solicitacoes_pagamento ADD COLUMN IF NOT EXISTS taxa_aplicada NUMERIC(5,2)');
    console.log('  solicitacoes_pagamento columns expanded');

    // ── Step 7: Seeds ──
    console.log('Migrations: checking seed data...');

    await seedIfEmpty('faixas_peso', seedFaixasPeso);
    await seedIfEmpty('tabela_frete_motorista', seedFreteMotorista);
    await seedIfEmpty('ceps_bairros', seedCepsBairros);
    await seedIfEmpty('faixas_peso_entrega_bairro', seedFaixasBairro);

    await pool.query(seedMatriculas);
    console.log('  Seed data inserted into matriculos_jad (ON CONFLICT DO NOTHING)');

    await pool.query(seedListas);
    console.log('  Seed data inserted into lista_entregas (ON CONFLICT DO NOTHING)');

    await pool.query(seedRelatorio);
    console.log('  Seed data inserted into relatorioentrega_export (conditional)');

    await pool.query(fixSeedStatus);
    console.log('  Seed list status fixed (Aberto → Finalizado)');

    await pool.query(fixFaixasStart);
    console.log('  Faixas start updated (0.001 → 0.000)');

    await seedIfEmpty('tabela_faturamento', seedFaturamento);
    await pool.query(fixFaturamento);
    console.log('  Faturamento table seeded / fixed');

    await pool.query(`
      INSERT INTO configuracoes (id, dias_uteis_pagamento, eficiencia_minima_adiantamento, taxa_adiantamento)
      VALUES (1, 4, 98.00, 0.00)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('  Configuracoes seeded');

    console.log('Migrations: all seed data done');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}
