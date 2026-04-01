-- Tabela para mensagens dos operadores para o admin
CREATE TABLE IF NOT EXISTS operator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_operator_messages_operator_id ON operator_messages(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_messages_read ON operator_messages(read);
CREATE INDEX IF NOT EXISTS idx_operator_messages_created_at ON operator_messages(created_at DESC);

-- RLS Policies
ALTER TABLE operator_messages ENABLE ROW LEVEL SECURITY;

-- Operadores podem inserir e ler suas proprias mensagens
CREATE POLICY "Operadores podem inserir mensagens" ON operator_messages
  FOR INSERT WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Operadores podem ver suas mensagens" ON operator_messages
  FOR SELECT USING (auth.uid() = operator_id);

-- Admins podem ver e atualizar todas as mensagens
CREATE POLICY "Admins podem ver todas mensagens" ON operator_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins podem atualizar mensagens" ON operator_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
