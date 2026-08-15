import React from 'react';
import { cn } from '@/lib/utils';
import { StatusPedido, StatusLocacao, StatusEstoque } from '@/types';

type AnyStatus = StatusPedido | StatusLocacao | StatusEstoque | string;

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let colorClass = '';

  const s = status.toLowerCase();

  if (['pronto', 'disponível', 'devolvida', 'finalizado', 'concluído', 'realizado'].includes(s)) {
    colorClass = 'bg-success/5 text-[#00E58F] border-[#00C97D]/20';
  } else if (['confirmado', 'confirmada', 'aguardando confirmação', 'aguardando entrega', 'aguardando retirada', 'estoque baixo', 'reservado', 'reservada', 'agendada'].includes(s)) {
    colorClass = 'bg-warning/5 text-[#F4B942] border-[#F4B942]/20';
  } else if (['cancelado', 'cancelada', 'atrasada', 'indisponível', 'em manutenção'].includes(s)) {
    colorClass = 'bg-danger/5 text-[#FF5B64] border-[#FF5B64]/20';
  } else if (['saiu para entrega', 'em separação', 'entregue', 'em andamento'].includes(s)) {
    colorClass = 'bg-info/5 text-[#52A3FF] border-[#52A3FF]/20';
  } else {
    colorClass = 'bg-surface-elevated text-muted-foreground border-border-subtle';
  }

  let displayStatus = status;
  if (status === 'Confirmado') displayStatus = 'Pedido confirmado';

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border', colorClass, className)}>
      {displayStatus}
    </span>
  );
}
