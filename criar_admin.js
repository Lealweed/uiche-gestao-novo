const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const args = process.argv.slice(2);
const email = args[0] || 'admin@centralviagens.com.br';
const password = args[1] || 'admin123';
const role = args[2] || 'admin';
const name = args[3] || 'Administrador Central';

async function createUser() {
  console.log(`\nCriando/Autenticando usuario: ${email}`);
  
  // 1. SignUp
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: name }
    })
  });
  
  const data = await res.json();
  
  if (data.error) {
    console.error('Erro no Auth Supabase:', data.error.message);
    return;
  }
  
  const userId = data.user ? data.user.id : (data.id || null);
  
  if (!userId) {
     console.error('Nao foi possivel ler o ID do usuario gerado.');
     return;
  }
  
  console.log(`✅ Conta de Autenticacao gerada no Auth! ID: ${userId}`);
  console.log('--- Atribuindo cargo de ' + role + ' na tabela profiles ---');
  
  // 2. Insert into profiles
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      user_id: userId,
      full_name: name,
      role: role,
      active: true
    })
  });

  if (profileRes.ok || profileRes.status === 201) {
       console.log(`✅ Sucesso! O usuario ${email} agora tem o cargo de ${role}!`);
       console.log(`Pode logar com senha: ${password}`);
  } else {
       const text = await profileRes.text();
       console.log('⚠️ Aviso ao salvar profile (pode ter sido bloqueado por RLS, ou a trigger auto-criou o profile sem o role). Repare pelo painel do Supabase se necessario.');
       console.log(text);
  }
}

createUser();
