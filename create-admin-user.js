#!/usr/bin/env node

/**
 * Script para criar usuário admin no Supabase
 * 
 * Uso:
 * - Copiar a SERVICE_ROLE_KEY do Supabase Dashboard
 * - Executar: node create-admin-user.js <SERVICE_ROLE_KEY>
 * 
 * Credenciais criadas:
 * - Email: admin@cozidos.com
 * - Senha: admin123
 * - Role: admin
 */

const https = require('https');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Erro: SERVICE_ROLE_KEY não fornecida');
  console.log('\nUso: node create-admin-user.js <SERVICE_ROLE_KEY>');
  console.log('\nObtendo SERVICE_ROLE_KEY:');
  console.log('1. Acesse: https://supabase.com/dashboard/project/ixuzdjxksvtxiwscguad/settings/api');
  console.log('2. Copie o valor de "service_role secret"');
  console.log('3. Execute: node create-admin-user.js <chave_copiada>');
  process.exit(1);
}

const serviceRoleKey = args[0];
const projectUrl = 'https://ixuzdjxksvtxiwscguad.supabase.co';

const payload = JSON.stringify({
  email: 'admin@cozidos.com',
  password: 'admin123',
  user_metadata: {
    role: 'admin'
  },
  email_confirm: true,
  phone_confirm: false
});

const options = {
  hostname: 'ixuzdjxksvtxiwscguad.supabase.co',
  port: 443,
  path: '/auth/v1/admin/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        console.log('✅ Usuário admin criado com sucesso!');
        console.log('\n📋 Credenciais:');
        console.log('  Email: admin@cozidos.com');
        console.log('  Senha: admin123');
        console.log('  Role: admin');
        console.log('\n🔗 Acesse: http://localhost:5173');
      } else if (res.statusCode === 409) {
        console.log('⚠️  Usuário já existe');
        console.log('   Email: admin@cozidos.com');
      } else {
        console.error(`❌ Erro (${res.statusCode}):`, response.msg || response.error || data);
      }
    } catch (e) {
      console.error('❌ Erro ao processar resposta:', e.message);
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erro de conexão:', e.message);
  console.log('\nVerifique:');
  console.log('- SERVICE_ROLE_KEY está correto');
  console.log('- Sua conexão à internet');
  console.log('- Projeto Supabase está ativo');
});

req.write(payload);
req.end();
