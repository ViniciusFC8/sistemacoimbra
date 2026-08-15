import { createClient } from '@/utils/supabase/client';
import { ItemEstoque, StatusEstoque } from '@/types';

export const estoqueService = {
  createItem: async (data: { nome: string; tipo: 'venda' | 'locacao'; categoria?: string; unidade?: string; quantidade: number; estoqueMinimo?: number }): Promise<void> => {
    const supabase = createClient();
    const payload = {
      nome: data.nome,
      tipo: data.tipo,
      categoria: data.categoria,
      unidade: data.unidade,
      quantidade_total: data.quantidade,
      estoque_minimo: data.tipo === 'venda' ? data.estoqueMinimo : null,
      qtd_reservada: 0,
      qtd_alugada: 0,
      qtd_manutencao: 0
    };
    
    const { error } = await supabase
      .from('itens_estoque')
      .insert([payload]);

    if (error) throw error;
  },

  updateItem: async (id: string, data: { nome: string; categoria?: string; unidade?: string }): Promise<void> => {
    const supabase = createClient();
    const payload = {
      nome: data.nome,
      categoria: data.categoria,
      unidade: data.unidade
    };
    
    const { error } = await supabase
      .from('itens_estoque')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  },

  adjustStock: async (data: { itemId: string; quantidadeAnterior: number; quantidadeNova: number; motivo: string }): Promise<void> => {
    const supabase = createClient();
    
    // 1. Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 2. Update item quantity
    const { error: updateError } = await supabase
      .from('itens_estoque')
      .update({ quantidade_total: data.quantidadeNova })
      .eq('id', data.itemId);

    if (updateError) throw updateError;

    // 3. Insert audit log
    const { error: logError } = await supabase
      .from('movimentacoes_estoque')
      .insert([{
        item_id: data.itemId,
        quantidade_anterior: data.quantidadeAnterior,
        quantidade_nova: data.quantidadeNova,
        motivo: data.motivo,
        created_by: user.id
      }]);

    if (logError) throw logError;
  },

  getEstoque: async (): Promise<ItemEstoque[]> => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('itens_estoque')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      nome: row.nome,
      tipo: row.tipo as 'venda' | 'locacao',
      categoria: row.categoria || undefined,
      unidade: row.unidade || undefined,
      quantidade: row.quantidade_total,
      estoqueMinimo: row.estoque_minimo || undefined,
      disponivel: row.qtd_disponivel || 0,
      reservado: row.qtd_reservada,
      alugado: row.qtd_alugada,
      manutencao: row.qtd_manutencao,
      status: (row.status || 'Disponível') as StatusEstoque,
      ultimaAtualizacao: new Date(row.updated_at),
      proximaDisponibilidade: row.tipo === 'locacao' ? 'Imediata' : undefined
    }));
  }
};
