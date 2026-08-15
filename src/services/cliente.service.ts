import { createClient } from '@/utils/supabase/client';
import { Cliente, GlobalSearchClienteResult } from '@/types';

export const clienteService = {
  searchClientes: async (query: string): Promise<GlobalSearchClienteResult[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .or(`nome.ilike.%${trimmedQuery}%,telefone.ilike.%${trimmedQuery}%`)
      .limit(5);

    if (error) {
      console.error('Error searching clientes:', error);
      throw new Error(error.message);
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nome: row.nome,
      telefone: row.telefone || undefined
    }));
  },


  getClientes: async (): Promise<Cliente[]> => {
    const supabase = createClient();
    
    // Buscar clientes junto com seus pedidos e os tipos dos itens
    const { data, error } = await supabase
      .from('clientes')
      .select(`
        *,
        pedidos (
          id,
          pedidos_itens (
            itens_estoque ( tipo )
          )
        )
      `)
      .order('nome', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => {
      const pedidos = row.pedidos || [];
      const totalPedidos = pedidos.length;
      let totalLocacoes = 0;

      pedidos.forEach((p: any) => {
        const hasLocacao = (p.pedidos_itens || []).some((pi: any) => pi.itens_estoque?.tipo === 'locacao');
        if (hasLocacao) {
          totalLocacoes++;
        }
      });

      return {
      id: row.id,
      nome: row.nome,
      telefone: row.telefone,
      whatsapp: row.whatsapp || undefined,
      email: row.email || undefined,
      endereco: row.endereco,
      bairro: row.bairro,
      cidade: row.cidade,
      observacoes: row.observacoes || undefined,
      ativo: row.ativo,
      created_by: row.created_by || undefined,
      dataCadastro: new Date(row.created_at),
      totalPedidos,
      totalLocacoes
    };
  });
  },

  createCliente: async (cliente: Omit<Cliente, 'id'>): Promise<Cliente> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: cliente.nome,
        telefone: cliente.telefone || '',
        whatsapp: cliente.whatsapp || null,
        email: cliente.email || null,
        endereco: cliente.endereco || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || 'Catalão',
        observacoes: cliente.observacoes || null,
        ativo: true,
        created_by: user?.id || null
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      nome: data.nome,
      telefone: data.telefone,
      whatsapp: data.whatsapp || undefined,
      email: data.email || undefined,
      endereco: data.endereco,
      bairro: data.bairro,
      cidade: data.cidade,
      observacoes: data.observacoes || undefined,
      ativo: data.ativo,
      created_by: data.created_by || undefined,
      dataCadastro: new Date(data.created_at)
    };
  },

  updateCliente: async (id: string, cliente: Partial<Cliente>): Promise<Cliente> => {
    const supabase = createClient();
    
    const updateData: any = {};
    if (cliente.nome !== undefined) updateData.nome = cliente.nome;
    if (cliente.telefone !== undefined) updateData.telefone = cliente.telefone;
    if (cliente.whatsapp !== undefined) updateData.whatsapp = cliente.whatsapp || null;
    if (cliente.email !== undefined) updateData.email = cliente.email || null;
    if (cliente.endereco !== undefined) updateData.endereco = cliente.endereco;
    if (cliente.bairro !== undefined) updateData.bairro = cliente.bairro;
    if (cliente.cidade !== undefined) updateData.cidade = cliente.cidade;
    if (cliente.observacoes !== undefined) updateData.observacoes = cliente.observacoes || null;
    if (cliente.ativo !== undefined) updateData.ativo = cliente.ativo;

    const { data, error } = await supabase
      .from('clientes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      nome: data.nome,
      telefone: data.telefone,
      whatsapp: data.whatsapp || undefined,
      email: data.email || undefined,
      endereco: data.endereco,
      bairro: data.bairro,
      cidade: data.cidade,
      observacoes: data.observacoes || undefined,
      ativo: data.ativo,
      created_by: data.created_by || undefined,
      dataCadastro: new Date(data.created_at)
    };
  },

  getCurrentUserRole: async (): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('papel')
        .eq('id', user.id)
        .single();

      if (error || !data) return null;
      return data.papel;
    } catch {
      return null;
    }
  }
};
