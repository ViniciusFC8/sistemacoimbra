'use server';

import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

// Validação dos dados de entrada
const createUserSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha não pode ser vazia.'),
  papel: z.enum(['administrador', 'atendente', 'operacao'], {
    errorMap: () => ({ message: 'Papel inválido. Deve ser administrador, atendente ou operacao.' })
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export async function createInternalUser(data: CreateUserInput) {
  // 1. Valida o payload de entrada
  const validatedData = createUserSchema.parse(data);

  // 2. Verifica a autenticação do solicitante (client normal)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Não autorizado: Usuário não autenticado.');
  }

  // 3. Verifica o perfil do solicitante para confirmar que é administrador ativo
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('ativo, papel')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Não autorizado: Perfil não encontrado.');
  }

  if (profile.ativo !== true || profile.papel !== 'administrador') {
    throw new Error('Não autorizado: Apenas administradores ativos podem criar usuários.');
  }

  // 4. Cria o usuário usando a API Administrativa
  const supabaseAdmin = createAdminClient();
  
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: validatedData.email,
    password: validatedData.password,
    email_confirm: true,
    user_metadata: {
      nome: validatedData.nome,
      papel: validatedData.papel,
    }
  });

  if (createError) {
    console.error('Erro na Supabase Admin API ao criar usuário:', createError.message);
    throw new Error(`Falha ao criar usuário: ${createError.message}`);
  }

  // 5. Sucesso (O trigger de banco cuidará do INSERT em public.profiles)
  return {
    success: true,
    user: {
      id: newUser.user.id,
      email: newUser.user.email,
      nome: validatedData.nome,
      papel: validatedData.papel
    }
  };
}

// Validação de entrada para ativação/desativação
const setInternalUserActiveSchema = z.object({
  userId: z.string().uuid('ID de usuário inválido.'),
  ativo: z.boolean(),
});

export type SetInternalUserActiveInput = z.infer<typeof setInternalUserActiveSchema>;

export async function setInternalUserActive(data: SetInternalUserActiveInput) {
  // 1. Valida o payload de entrada
  const validatedData = setInternalUserActiveSchema.parse(data);

  // 2. Verifica a autenticação do solicitante (client normal)
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Não autorizado: Usuário não autenticado.');
  }

  // 3. Proteção contra auto-desativação
  if (validatedData.userId === user.id && !validatedData.ativo) {
    throw new Error('Você não pode desativar a própria conta.');
  }

  // 4. Verifica o perfil do solicitante para confirmar que é administrador ativo
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('ativo, papel')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Não autorizado: Perfil não encontrado.');
  }

  if (profile.ativo !== true || profile.papel !== 'administrador') {
    throw new Error('Não autorizado: Apenas administradores ativos podem alterar o status de usuários.');
  }

  // 5. Proteções no usuário alvo
  const supabaseAdmin = createAdminClient();

  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('papel, ativo')
    .eq('id', validatedData.userId)
    .single();

  if (targetError || !targetProfile) {
    throw new Error('Usuário alvo não encontrado.');
  }

  // Se estiver tentando desativar um administrador, verificar se é o último ativo
  if (!validatedData.ativo && targetProfile.papel === 'administrador' && targetProfile.ativo === true) {
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('papel', 'administrador')
      .eq('ativo', true);
      
    if (countError) {
      throw new Error('Erro ao validar a quantidade de administradores.');
    }

    if (count !== null && count <= 1) {
      throw new Error('Não é possível desativar o último administrador ativo do sistema.');
    }
  }

  // 6. Atualização Segura
  if (!validatedData.ativo) {
    // DESATIVAÇÃO
    // Primeiro, atualiza o profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ ativo: false })
      .eq('id', validatedData.userId);

    if (updateProfileError) {
      throw new Error(`Falha ao atualizar o perfil: ${updateProfileError.message}`);
    }

    // Depois, bloqueia no Auth usando ban_duration
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(validatedData.userId, {
      ban_duration: '876000h' // Bloqueio por ~100 anos
    });

    if (banError) {
      // Reverte o profile se falhar no auth
      await supabaseAdmin.from('profiles').update({ ativo: true }).eq('id', validatedData.userId);
      console.error('Erro na Supabase Admin API ao bloquear usuário:', banError.message);
      throw new Error(`Falha ao desativar acesso no Supabase Auth: ${banError.message}`);
    }

  } else {
    // REATIVAÇÃO
    // Primeiro, remove o bloqueio no Auth
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(validatedData.userId, {
      ban_duration: 'none'
    });

    if (unbanError) {
      console.error('Erro na Supabase Admin API ao desbloquear usuário:', unbanError.message);
      throw new Error(`Falha ao reativar acesso no Supabase Auth: ${unbanError.message}`);
    }

    // Depois, atualiza o profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ ativo: true })
      .eq('id', validatedData.userId);

    if (updateProfileError) {
      // Reverte o ban se falhar no profile
      await supabaseAdmin.auth.admin.updateUserById(validatedData.userId, { ban_duration: '876000h' });
      throw new Error(`Falha ao atualizar o perfil: ${updateProfileError.message}`);
    }
  }

  return { success: true };
}
