import { createClient } from '@/utils/supabase/client';
import { CompromissoAgenda, AlertaOperacional } from '@/types';
import { mapAgendaRowToCompromisso } from '@/utils/agenda';

export interface DashboardIndicadores {
  entregasHoje: number;
  devolucoesHoje: number;
  devolucoesAtrasadas: number;
  estoqueAlugadoPercent: number;
  estoqueAlugadoText: string;
}

/**
 * Retorna a data de hoje no fuso America/Sao_Paulo no formato YYYY-MM-DD.
 */
function hojeEmSaoPaulo(): string {
  const now = new Date();
  const spString = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // en-CA = YYYY-MM-DD
  return spString;
}

export const dashboardService = {
  /**
   * Busca os 4 indicadores principais da Dashboard em paralelo.
   */
  getIndicadores: async (): Promise<DashboardIndicadores> => {
    const supabase = createClient();
    const hoje = hojeEmSaoPaulo();

    // Queries em paralelo
    const [entregasRes, devolucoesRes, atrasadasRes, estoqueRes] = await Promise.all([
      // 1. Entregas hoje
      supabase
        .from('agenda_eventos')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'Entrega')
        .gte('data_hora', `${hoje}T00:00:00-03:00`)
        .lt('data_hora', `${hoje}T23:59:59-03:00`)
        .neq('status', 'Cancelado'),

      // 2. Devoluções hoje
      supabase
        .from('agenda_eventos')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'Devolução')
        .gte('data_hora', `${hoje}T00:00:00-03:00`)
        .lt('data_hora', `${hoje}T23:59:59-03:00`)
        .neq('status', 'Cancelado'),

      // 3. Devoluções atrasadas
      supabase
        .from('pedidos')
        .select('id, pedidos_itens!inner(item_estoque_id, itens_estoque!inner(tipo))')
        .eq('status', 'Entregue')
        .lt('data_fim_locacao', hoje)
        .eq('pedidos_itens.itens_estoque.tipo', 'locacao'),

      // 4. Estoque alugado
      supabase
        .from('itens_estoque')
        .select('qtd_alugada, quantidade_total')
        .eq('tipo', 'locacao')
    ]);

    if (entregasRes.error) throw entregasRes.error;
    if (devolucoesRes.error) throw devolucoesRes.error;
    if (atrasadasRes.error) throw atrasadasRes.error;
    if (estoqueRes.error) throw estoqueRes.error;

    // 3. Contar cada pedido de devolução atrasada apenas uma vez
    const devolucoesAtrasadas = new Set((atrasadasRes.data || []).map((p: any) => p.id)).size;

    // 4. Calcular percentual de estoque alugado
    let qtdAlugada = 0;
    let qtdTotal = 0;
    (estoqueRes.data || []).forEach((item: any) => {
      qtdAlugada += item.qtd_alugada || 0;
      qtdTotal += item.quantidade_total || 0;
    });

    const estoqueAlugadoPercent = qtdTotal > 0 ? Math.round((qtdAlugada / qtdTotal) * 100) : 0;
    const estoqueAlugadoText = `${qtdAlugada} de ${qtdTotal} itens`;

    return {
      entregasHoje: entregasRes.count || 0,
      devolucoesHoje: devolucoesRes.count || 0,
      devolucoesAtrasadas,
      estoqueAlugadoPercent,
      estoqueAlugadoText
    };
  },

  /**
   * Busca os eventos da agenda previstos para o dia de hoje.
   */
  getAgendaDeHoje: async (): Promise<CompromissoAgenda[]> => {
    const supabase = createClient();
    const hoje = hojeEmSaoPaulo();

    const { data, error } = await supabase
      .from('agenda_eventos')
      .select(`
        id,
        pedido_id,
        tipo,
        data_hora,
        status,
        resumo_itens,
        endereco,
        responsavel,
        observacoes,
        pedidos (
          status,
          clientes (
            nome
          )
        )
      `)
      .gte('data_hora', `${hoje}T00:00:00-03:00`)
      .lt('data_hora', `${hoje}T23:59:59-03:00`)
      .order('data_hora', { ascending: true });

    if (error) throw error;

    const agora = new Date();
    return (data || []).map((row: any) => mapAgendaRowToCompromisso(row, agora));
  },

  /**
   * Busca as devoluções atrasadas e formata como alertas operacionais.
   */
  getAlertasDevolucoesAtrasadas: async (): Promise<AlertaOperacional[]> => {
    const supabase = createClient();
    const hoje = hojeEmSaoPaulo();

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, data_fim_locacao, clientes!inner(nome), pedidos_itens!inner(item_estoque_id, itens_estoque!inner(tipo))')
      .eq('status', 'Entregue')
      .lt('data_fim_locacao', hoje)
      .eq('pedidos_itens.itens_estoque.tipo', 'locacao');

    if (error) throw error;

    // Deduplicate by order ID (Set wasn't enough because we need the data)
    const uniqueOrders = new Map<string, any>();
    (data || []).forEach((row: any) => {
      if (!uniqueOrders.has(row.id)) {
        uniqueOrders.set(row.id, row);
      }
    });

    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);

    const alertas: AlertaOperacional[] = Array.from(uniqueOrders.values()).map(order => {
      // Ajustar para interpretar a data como meia-noite local, ignorando fuso
      const [year, month, day] = order.data_fim_locacao.split('-');
      const dataFim = new Date(Number(year), Number(month) - 1, Number(day));
      dataFim.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(hojeDate.getTime() - dataFim.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const diasStr = diffDays === 1 ? '1 dia' : `${diffDays} dias`;
      
      return {
        id: `atraso-${order.id}`,
        tipo: 'critico',
        titulo: 'Devolução Atrasada',
        descricao: `Devolução de ${order.clientes?.nome || 'Cliente'} está atrasada há ${diasStr}.`,
        tempoInfo: `${diasStr} de atraso`
      } as AlertaOperacional;
    });

    return alertas;
  },

  /**
   * Busca itens de locação que estejam classificados com estoque baixo (ou indisponível)
   * e os converte em alertas operacionais de Atenção.
   */
  getAlertasEstoqueBaixoLocacao: async (): Promise<AlertaOperacional[]> => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('itens_estoque')
      .select('id, nome, qtd_disponivel, status')
      .eq('tipo', 'locacao')
      .in('status', ['Estoque baixo', 'Indisponível']);
      
    if (error) throw error;

    return (data || []).map(item => {
      const isZero = item.status === 'Indisponível' || item.qtd_disponivel === 0;
      const qtdText = isZero ? 'nenhuma unidade disponível' : `apenas ${item.qtd_disponivel || 0} unidades disponíveis`;
      
      return {
        id: `estoque-locacao-${item.id}`,
        tipo: 'atencao',
        titulo: isZero ? 'Estoque Indisponível' : 'Estoque Baixo',
        descricao: `${item.nome} com ${qtdText}.`
      } as AlertaOperacional;
    });
  },

  /**
   * Consolida todos os alertas operacionais do sistema,
   * ordenando-os por prioridade (crítico > atenção > info).
   */
  getAlertasOperacionais: async (): Promise<AlertaOperacional[]> => {
    const [devolucoes, estoque] = await Promise.all([
      dashboardService.getAlertasDevolucoesAtrasadas(),
      dashboardService.getAlertasEstoqueBaixoLocacao()
    ]);

    const alertas = [...devolucoes, ...estoque];
    
    const priority = { 'critico': 1, 'atencao': 2, 'info': 3 };
    alertas.sort((a, b) => priority[a.tipo] - priority[b.tipo]);
    
    return alertas;
  }
};
