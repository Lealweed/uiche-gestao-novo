const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ROLE_KEY, // USANDO SERVICE ROLE
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function forceCreateAdmin() {
  const email = 'admin@centralviagens.com.br';
  const password = 'admin123';
  const fullName = 'Administrador Central';

  console.log(`--- Iniciando criação forcada para ${email} ---`);

  // 1. Tentar criar o usuário no Auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  let userId;
  if (userError) {
    if (userError.message.includes('already exists') || userError.status === 422) {
      console.log('⚠️ Usuário já existe no Auth. Buscando ID...');
      // Buscar ID
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        console.log(`✅ ID encontrado: ${userId}`);
        
        // Resetar senha garantidamente
        await supabase.auth.admin.updateUserById(userId, { password });
        console.log('✅ Senha resetada para admin123');
      } else {
        console.error('❌ Falha ao encontrar usuário existente:', listError?.message);
        return;
      }
    } else {
      console.error('❌ Erro ao criar usuário:', userError.message);
      return;
    }
  } else {
    userId = userData.user.id;
    console.log(`✅ Novo usuário criado com sucesso! ID: ${userId}`);
  }

  // 2. Inserir/Atualizar perfil com service_role (ignorando RLS)
  console.log('--- Atualizando tabela de perfis (profiles) ---');
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      full_name: fullName,
      role: 'admin',
      active: true
    }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('❌ Erro ao atualizar perfil:', profileError.message);
  } else {
    console.log('✅ Perfil de Administrador configurado com sucesso!');
    console.log('\n--- TUDO PRONTO ---');
    console.log(`E-mail: ${email}`);
    console.log(`Senha: ${password}`);
  }
}

forceCreateAdmin();
