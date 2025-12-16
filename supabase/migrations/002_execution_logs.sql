-- Tabela para armazenar logs de execução detalhados
-- Permite debug visual do fluxo de mensagens

CREATE TABLE IF NOT EXISTS execution_logs (
  id BIGSERIAL PRIMARY KEY,
  execution_id UUID NOT NULL, -- Agrupa todos os logs de uma execução
  node_name TEXT NOT NULL, -- Nome do node executado (ex: parseMessage, generateAIResponse)
  input_data JSONB, -- Dados de entrada do node
  output_data JSONB, -- Dados de saída do node
  error JSONB, -- Detalhes do erro (se houver)
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'error')),
  duration_ms INTEGER, -- Tempo de execução em milissegundos
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB, -- Informações adicionais (client_id, user_phone, etc)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX idx_execution_logs_timestamp ON execution_logs(timestamp DESC);
CREATE INDEX idx_execution_logs_node_name ON execution_logs(node_name);
CREATE INDEX idx_execution_logs_status ON execution_logs(status);

-- Índice composto para buscar logs de uma execução específica
CREATE INDEX idx_execution_logs_exec_time ON execution_logs(execution_id, timestamp);

-- Habilitar Row Level Security (opcional, mas recomendado)
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura autenticada
CREATE POLICY "Enable read access for authenticated users" ON execution_logs
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy para permitir insert apenas com service role
CREATE POLICY "Enable insert for service role only" ON execution_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE execution_logs IS 'Logs detalhados de execução de nodes para debug visual';
COMMENT ON COLUMN execution_logs.execution_id IS 'UUID que agrupa todos os logs de uma execução completa';
COMMENT ON COLUMN execution_logs.node_name IS 'Nome do node executado (ex: parseMessage, _START, _END)';
COMMENT ON COLUMN execution_logs.input_data IS 'Snapshot dos dados de entrada do node';
COMMENT ON COLUMN execution_logs.output_data IS 'Snapshot dos dados de saída do node';
COMMENT ON COLUMN execution_logs.duration_ms IS 'Tempo de execução do node em milissegundos';
COMMENT ON COLUMN execution_logs.metadata IS 'Contexto adicional: client_id, user_phone, message_type, etc';
