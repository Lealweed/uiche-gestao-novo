-- Tabela para conversa privada admin <-> guiche
CREATE TABLE IF NOT EXISTS public.operator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booth_id UUID REFERENCES public.booths(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL DEFAULT 'operator' CHECK (sender_role IN ('operator', 'admin')),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.operator_messages
  ADD COLUMN IF NOT EXISTS booth_id UUID REFERENCES public.booths(id) ON DELETE SET NULL;

ALTER TABLE public.operator_messages
  ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'operator';

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_operator_messages_operator_id ON public.operator_messages(operator_id);
CREATE INDEX IF NOT EXISTS idx_operator_messages_booth_id ON public.operator_messages(booth_id);
CREATE INDEX IF NOT EXISTS idx_operator_messages_read ON public.operator_messages(read);
CREATE INDEX IF NOT EXISTS idx_operator_messages_created_at ON public.operator_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_messages_conversation ON public.operator_messages(operator_id, booth_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.operator_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operadores podem inserir mensagens" ON public.operator_messages;
CREATE POLICY "Operadores podem inserir mensagens" ON public.operator_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = operator_id AND sender_role = 'operator');

DROP POLICY IF EXISTS "Operadores podem ver suas mensagens" ON public.operator_messages;
CREATE POLICY "Operadores podem ver suas mensagens" ON public.operator_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = operator_id);

DROP POLICY IF EXISTS "Operadores podem atualizar mensagens" ON public.operator_messages;
CREATE POLICY "Operadores podem atualizar mensagens" ON public.operator_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = operator_id)
  WITH CHECK (auth.uid() = operator_id);

DROP POLICY IF EXISTS "Admins podem ver todas mensagens" ON public.operator_messages;
CREATE POLICY "Admins podem ver todas mensagens" ON public.operator_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem atualizar mensagens" ON public.operator_messages;
CREATE POLICY "Admins podem atualizar mensagens" ON public.operator_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins podem inserir mensagens" ON public.operator_messages;
CREATE POLICY "Admins podem inserir mensagens" ON public.operator_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
    AND sender_role = 'admin'
  );
