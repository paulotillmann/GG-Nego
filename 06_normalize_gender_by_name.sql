-- Habilita a extensão de remoção de acentos se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Normalização de gênero para a tabela de Titulares (pessoa)
UPDATE public.pessoa
SET gender = CASE
  -- Nomes Masculinos Explícitos ou Sufixos Específicos
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) IN (
    'caua', 'luca', 'lucca', 'jeova', 'noah', 'yuri', 'davi', 'henry', 'valdir', 'valdeir',
    'jean', 'alan', 'juan', 'ravi', 'maicon', 'igor', 'altamir', 'arnaldo', 'afonso', 'wagner',
    'wellington', 'cleber', 'robson', 'walter', 'warley', 'welton', 'weuller', 'weverton', 'wilker',
    'willian', 'ygor', 'natan', 'noel', 'ariel', 'daniel', 'samuel', 'gabriel', 'rafael', 'miguel',
    'michel', 'abel', 'israel', 'ezequiel', 'natanael', 'valdecir', 'valcidio', 'valdivino', 'vanderlei',
    'wesley', 'anthony', 'donizete', 'jose', 'nikolas', 'nicolas',
    'luiz', 'lucas', 'euripedes', 'arthur', 'alexandre', 'kauan', 'devair', 'joaquim', 'osmar',
    'elias', 'eder', 'elvis', 'elvys', 'feliph', 'gean', 'james', 'jamir', 'jeovandir', 'jonas',
    'jonathan', 'josef', 'josnei', 'jurandir', 'leonan', 'liemar', 'lindomar', 'luan', 'luzencourt',
    'melquesedec', 'odair', 'patrick', 'raul', 'ronald', 'ruan', 'thales', 'thallys', 'tharik',
    'thauan', 'walker', 'wender', 'worlen', 'alef', 'alexxand', 'benjamim', 'braz', 'charles',
    'claudivan', 'david', 'diosefer', 'aguinomar', 'vilmondes'
  ) THEN 'Masculino'
  
  -- Nomes Femininos Explícitos ou Sufixos Específicos
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) IN (
    'beatriz', 'alice', 'cleide', 'deide', 'irene', 'ivete', 'ivone', 'janete', 'neide',
    'neusa', 'neuza', 'roseli', 'sueli', 'marli', 'rosemeire', 'rosimeire', 'meire', 'nair',
    'ruth', 'ester', 'esther', 'abigail', 'miriam', 'iris', 'ines', 'elis', 'solange', 'elisangela',
    'rosangela', 'eliane', 'cristiane', 'viviane', 'tatiane', 'lidiane', 'daiane',
    'geisiane', 'keliane', 'luciele', 'lucimeire', 'sirleide', 'sirlene', 'tania', 'vania', 'vanda',
    'elen', 'ellen', 'evelyn', 'ingryd', 'iraci', 'jennyfer', 'jhulie', 'kathlen', 'kellen', 'kethlin',
    'liege', 'lindamar', 'lislei', 'sarah', 'soneli', 'suselei', 'thays', 'vivian', 'yasmim', 'yasmin',
    'claudmeire', 'maris', 'naide'
  ) THEN 'Feminino'
  
  -- Regras comuns de Sufixos Masculinos
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%o' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%os' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%on' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%or' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%us' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%el' THEN 'Masculino'
  
  -- Termina com 'a' ou 'as' é feminino
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%a' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%as' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('lucas', 'marcos', 'jonas', 'elias', 'dimas', 'nikolas', 'nicolas') THEN 'Feminino'
  
  -- Terminações comuns femininas
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%ne' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%ce' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%te' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('donizete') THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%le' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%ly' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%y' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('yuri', 'henry', 'wesley', 'anthony', 'elvis', 'elvys', 'thallys') THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%se' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('jose', 'josef') THEN 'Feminino'
  ELSE gender -- Mantém o gênero cadastrado em caso de não identificação
END
WHERE gender = 'Não definido' OR gender IS NULL;

-- Normalização de gênero para a tabela de Dependentes (dependentes)
UPDATE public.dependentes
SET gender = CASE
  -- Nomes Masculinos Explícitos ou Sufixos Específicos
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) IN (
    'caua', 'luca', 'lucca', 'jeova', 'noah', 'yuri', 'davi', 'henry', 'valdir', 'valdeir',
    'jean', 'alan', 'juan', 'ravi', 'maicon', 'igor', 'altamir', 'arnaldo', 'afonso', 'wagner',
    'wellington', 'cleber', 'robson', 'walter', 'warley', 'welton', 'weuller', 'weverton', 'wilker',
    'willian', 'ygor', 'natan', 'noel', 'ariel', 'daniel', 'samuel', 'gabriel', 'rafael', 'miguel',
    'michel', 'abel', 'israel', 'ezequiel', 'natanael', 'valdecir', 'valcidio', 'valdivino', 'vanderlei',
    'wesley', 'anthony', 'donizete', 'jose', 'nikolas', 'nicolas',
    'luiz', 'lucas', 'euripedes', 'arthur', 'alexandre', 'kauan', 'devair', 'joaquim', 'osmar',
    'elias', 'eder', 'elvis', 'elvys', 'feliph', 'gean', 'james', 'jamir', 'jeovandir', 'jonas',
    'jonathan', 'josef', 'josnei', 'jurandir', 'leonan', 'liemar', 'lindomar', 'luan', 'luzencourt',
    'melquesedec', 'odair', 'patrick', 'raul', 'ronald', 'ruan', 'thales', 'thallys', 'tharik',
    'thauan', 'walker', 'wender', 'worlen', 'alef', 'alexxand', 'benjamim', 'braz', 'charles',
    'claudivan', 'david', 'diosefer', 'aguinomar', 'vilmondes'
  ) THEN 'Masculino'
  
  -- Nomes Femininos Explícitos ou Sufixos Específicos
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) IN (
    'beatriz', 'alice', 'cleide', 'deide', 'irene', 'ivete', 'ivone', 'janete', 'neide',
    'neusa', 'neuza', 'roseli', 'sueli', 'marli', 'rosemeire', 'rosimeire', 'meire', 'nair',
    'ruth', 'ester', 'esther', 'abigail', 'miriam', 'iris', 'ines', 'elis', 'solange', 'elisangela',
    'rosangela', 'eliane', 'cristiane', 'viviane', 'tatiane', 'lidiane', 'daiane',
    'geisiane', 'keliane', 'luciele', 'lucimeire', 'sirleide', 'sirlene', 'tania', 'vania', 'vanda',
    'elen', 'ellen', 'evelyn', 'ingryd', 'iraci', 'jennyfer', 'jhulie', 'kathlen', 'kellen', 'kethlin',
    'liege', 'lindamar', 'lislei', 'sarah', 'soneli', 'suselei', 'thays', 'vivian', 'yasmim', 'yasmin',
    'claudmeire', 'maris', 'naide'
  ) THEN 'Feminino'
  
  -- Regras comuns de Sufixos Masculinos
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%o' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%os' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%on' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%or' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%us' THEN 'Masculino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%el' THEN 'Masculino'
  
  -- Termina com 'a' ou 'as' é feminino
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%a' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%as' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('lucas', 'marcos', 'jonas', 'elias', 'dimas', 'nikolas', 'nicolas') THEN 'Feminino'
  
  -- Terminações comuns femininas
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%ne' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%ce' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%te' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('donizete') THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%le' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%ly' THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%y' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('yuri', 'henry', 'wesley', 'anthony', 'elvis', 'elvys', 'thallys') THEN 'Feminino'
  WHEN unaccent(lower(split_part(trim(full_name), ' ', 1))) LIKE '%se' AND unaccent(lower(split_part(trim(full_name), ' ', 1))) NOT IN ('jose', 'josef') THEN 'Feminino'
  ELSE gender -- Mantém o gênero cadastrado em caso de não identificação
END
WHERE gender = 'Não definido' OR gender IS NULL;
