import { createClient } from '@/utils/supabase/client';

export interface DadosEmpresa {
  id?: string;
  nome_juridico: string;
  nome_fantasia: string;
  whatsapp: string;
  endereco: string;
  cidade_estado: string;
  cep: string;
}

export interface Profile {
  id: string;
  nome: string;
  papel: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const configuracoesService = {
  getDadosEmpresa: async (): Promise<DadosEmpresa | null> => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('configuracoes_empresa')
      .select('*')
      .limit(1)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar dados da empresa:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      throw error;
    }
    
    return data as DadosEmpresa | null;
  },
  
  updateDadosEmpresa: async (dados: Partial<DadosEmpresa>): Promise<DadosEmpresa> => {
    const supabase = createClient();
    
    let targetId = dados.id;
    if (!targetId) {
      const existing = await configuracoesService.getDadosEmpresa();
      if (existing) {
        targetId = existing.id;
      }
    }
    
    if (targetId) {
      const { data, error } = await supabase
        .from('configuracoes_empresa')
        .update(dados)
        .eq('id', targetId)
        .select()
        .single();
        
      if (error) {
        console.error('Erro ao atualizar dados da empresa:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        throw error;
      }
      return data as DadosEmpresa;
    } else {
      const { data, error } = await supabase
        .from('configuracoes_empresa')
        .insert(dados as any)
        .select()
        .single();
        
      if (error) {
        console.error('Erro ao inserir dados da empresa:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        throw error;
      }
      return data as DadosEmpresa;
    }
  },
  
  getCurrentUserRole: async (): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('papel')
        .eq('id', user.id)
        .single();
        
      return profile?.papel || null;
    } catch (e) {
      console.error('Erro ao buscar perfil do usuário atual:', e);
      return null;
    }
  },

  getCurrentUserId: async (): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (e) {
      console.error('Erro ao buscar ID do usuário atual:', e);
      return null;
    }
  },

  getAllProfiles: async (): Promise<Profile[]> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar perfis:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        throw error;
      }
      return data as Profile[];
    } catch (e) {
      console.error('Erro geral ao buscar perfis:', e);
      throw e;
    }
  }
};
