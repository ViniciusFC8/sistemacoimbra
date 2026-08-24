import { createClient } from '@/utils/supabase/client';
import { GlobalSearchPedidoResult } from '@/types';

export const pedidoService = {
  searchPedidos: async (query: string): Promise<GlobalSearchPedidoResult[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        valor_total,
        status,
        clientes!inner (
          nome
        ),
        pedidos_itens (
          itens_estoque ( tipo )
        )
      `)
      .ilike('clientes.nome', `%${trimmedQuery}%`)
      .limit(5);

    if (error) {
      console.error('Error searching pedidos:', error);
      throw new Error(error.message);
    }

    return (data || []).map((row: any) => {
      const pItens = row.pedidos_itens || [];
      const possuiLocacao = pItens.some((pi: any) => pi.itens_estoque?.tipo === 'locacao');

      return {
        id: row.id,
        clienteNome: row.clientes?.nome || 'Balcão / Consumidor',
        valorTotal: row.valor_total,
        status: row.status,
        possuiLocacao
      };
    });
  },

  async createPedido(data: {
    cliente_id: string | null;
    status: string;
    tipo_entrega: string;
    data_entrega: string;
    data_fim_locacao: string | null;
    horario_entrega: string | null;
    forma_pagamento: string | null;
    responsavel: string | null;
    observacoes: string | null;
    bebidas_por_escrito: string | null;
    valor_total: number;
    endereco_entrega: string | null;
    bairro_entrega: string | null;
    cidade_entrega: string | null;
    itens: { item_estoque_id: string; quantidade: number }[];
  }) {
    const supabase = createClient();
    
    const { data: rpcData, error } = await supabase.rpc('criar_pedido', {
      p_cliente_id: data.cliente_id as any,
      p_status: data.status,
      p_tipo_entrega: data.tipo_entrega,
      p_data_entrega: data.data_entrega,
      p_data_fim_locacao: data.data_fim_locacao as any,
      p_horario_entrega: data.horario_entrega as any,
      p_forma_pagamento: data.forma_pagamento as any,
      p_responsavel: data.responsavel as any,
      p_observacoes: data.observacoes as any,
      p_bebidas_por_escrito: data.bebidas_por_escrito as any,
      p_valor_total: data.valor_total,
      p_endereco_entrega: data.endereco_entrega as any,
      p_bairro_entrega: data.bairro_entrega as any,
      p_cidade_entrega: data.cidade_entrega as any,
      p_itens: data.itens as any
    });

    if (error) {
      console.error('Error in criar_pedido RPC:', error);
      throw new Error(error.message);
    }

    return rpcData;
  },

  async updatePedido(id: string, data: {
    cliente_id: string | null;
    tipo_entrega: string;
    data_entrega: string;
    data_fim_locacao: string | null;
    horario_entrega: string | null;
    forma_pagamento: string | null;
    responsavel: string | null;
    observacoes: string | null;
    bebidas_por_escrito: string | null;
    valor_total: number;
    endereco_entrega: string | null;
    bairro_entrega: string | null;
    cidade_entrega: string | null;
    itens: { item_estoque_id: string; quantidade: number }[];
  }) {
    const supabase = createClient();
    
    const { data: rpcData, error } = await supabase.rpc('atualizar_pedido', {
      p_pedido_id: id as any,
      p_cliente_id: data.cliente_id as any,
      p_tipo_entrega: data.tipo_entrega,
      p_data_entrega: data.data_entrega,
      p_data_fim_locacao: data.data_fim_locacao as any,
      p_horario_entrega: data.horario_entrega as any,
      p_forma_pagamento: data.forma_pagamento as any,
      p_responsavel: data.responsavel as any,
      p_observacoes: data.observacoes as any,
      p_bebidas_por_escrito: data.bebidas_por_escrito as any,
      p_valor_total: data.valor_total,
      p_endereco_entrega: data.endereco_entrega as any,
      p_bairro_entrega: data.bairro_entrega as any,
      p_cidade_entrega: data.cidade_entrega as any,
      p_itens: data.itens as any
    });

    if (error) {
      console.error('Error in atualizar_pedido RPC:', error);
      throw new Error(error.message);
    }

    return rpcData;
  },

  async getPedidos(): Promise<any[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        clientes (id, nome, telefone, email, endereco, bairro),
        pedidos_itens (
          quantidade,
          itens_estoque (id, nome, tipo, categoria)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pedidos:', error);
      throw new Error(error.message);
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      cliente: p.clientes ? {
        id: p.clientes.id,
        nome: p.clientes.nome,
        telefone: p.clientes.telefone || '-',
        email: p.clientes.email || '-',
        endereco: p.clientes.endereco || '',
        bairro: p.clientes.bairro || ''
      } : {
        id: 'anonymous',
        nome: 'Balcão / Consumidor',
        telefone: '-',
        email: '-',
        endereco: 'Venda Balcão',
        bairro: 'Centro'
      },
      itens: (p.pedidos_itens || []).map((pi: any) => ({
        quantidade: pi.quantidade,
        item: {
          id: pi.itens_estoque.id,
          nome: pi.itens_estoque.nome,
          tipo: pi.itens_estoque.tipo,
          categoria: pi.itens_estoque.categoria,
          status: 'Disponível',
          quantidade: 0
        }
      })),
      status: p.status,
      dataCriacao: new Date(p.created_at),
      dataEntrega: p.data_entrega ? new Date(p.data_entrega + 'T00:00:00-03:00') : new Date(),
      dataFimLocacao: p.data_fim_locacao ? new Date(p.data_fim_locacao + 'T00:00:00-03:00') : undefined,
      valorTotal: p.valor_total,
      tipoEntrega: p.tipo_entrega,
      horarioEntrega: p.horario_entrega,
      responsavel: p.responsavel,
      formaPagamento: p.forma_pagamento,
      observacoes: p.observacoes,
      bebidasPorEscrito: p.bebidas_por_escrito,
      enderecoEntrega: p.endereco_entrega,
      bairroEntrega: p.bairro_entrega,
      cidadeEntrega: p.cidade_entrega
    }));
  },

  async updatePedidoStatus(id: string, status: 'Confirmado' | 'Entregue' | 'Finalizado') {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('pedidos')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating pedido status:', error);
      throw new Error(error.message);
    }
    return data;
  },

  async deletePedido(id: string) {
    const supabase = createClient();
    const { error } = await supabase.rpc('excluir_pedido_seguro', { p_pedido_id: id });
    if (error) {
      console.error('Error deleting pedido:', error);
      throw new Error(error.message);
    }
  }
};
