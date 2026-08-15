import { CompromissoAgenda } from '@/types';

/**
 * Mapeia uma linha retornada da tabela agenda_eventos (com join em pedidos e clientes)
 * para o objeto padronizado CompromissoAgenda, calculando atrasos e regras de exibição de status.
 */
export function mapAgendaRowToCompromisso(row: any, agora: Date = new Date()): CompromissoAgenda {
  const dataHora = new Date(row.data_hora);
  
  let displayStatus = row.status;
  if (row.status === 'Agendado') {
    if (row.tipo === 'Devolução') {
      const endOfDay = new Date(dataHora);
      endOfDay.setHours(23, 59, 59, 999);
      displayStatus = endOfDay < agora ? 'Atrasada' : 'Agendada';
    } else {
      displayStatus = dataHora < agora ? 'Atrasada' : 'Agendada';
    }
  } else if (row.status === 'Concluído') {
    if (row.tipo === 'Compromisso' || row.tipo === 'Manutenção') displayStatus = 'Realizado';
    else displayStatus = 'Concluído';
  } else if (row.status === 'Cancelado') {
    displayStatus = 'Cancelada';
  }

  // Se não houver pedido vinculado (ex: Compromisso manual), usar o tipo (ex: 'Manutenção') ou um nome genérico
  // Apenas garantindo não quebrar se cliente for undefined
  const clienteNome = row.pedidos?.clientes?.nome || row.cliente || row.tipo;

  return {
    id: row.id,
    pedidoId: row.pedido_id,
    pedidoStatus: row.pedidos?.status,
    horario: dataHora,
    cliente: clienteNome,
    operacao: row.tipo,
    resumoItens: row.resumo_itens || '',
    status: displayStatus,
    endereco: row.endereco,
    responsavel: row.responsavel,
    observacoes: row.observacoes
  } as CompromissoAgenda;
}
