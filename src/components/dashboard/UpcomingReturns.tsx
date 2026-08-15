import React from 'react';
import { Button } from '../ui/button';
import { StatusBadge } from '../shared/StatusBadge';
import { CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Devolucao {
  id: string;
  cliente: string;
  itens: string;
  data: string;
  status: string;
}

interface UpcomingReturnsProps {
  devolucoes: Devolucao[];
}

export function UpcomingReturns({ devolucoes }: UpcomingReturnsProps) {
  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col shadow-lg inner-highlight">
      <div className="p-5 border-b border-border/60 flex items-center justify-between bg-sidebar/35">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          <h3 className="font-sora font-semibold text-sm text-foreground">Próximas devoluções</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary-strong">Ver todas</Button>
      </div>
      
      <div className="flex flex-col p-2.5">
        {devolucoes.map((item) => (
          <div key={item.id} className="p-3.5 m-1 flex items-center justify-between border-b border-border-subtle/50 last:border-0 hover:bg-surface-elevated/30 rounded-xl transition-all duration-150">
            <div className="flex items-center gap-3 min-w-0 mr-3">
              {/* Risk status bullet */}
              <span className={cn(
                "h-1.5 w-1.5 rounded-full shrink-0",
                item.data.toLowerCase().includes('hoje') && 'bg-warning status-pulse',
                item.status.toLowerCase().includes('atrasada') && 'bg-danger status-pulse',
                item.data.toLowerCase().includes('amanhã') && 'bg-info',
                !item.data.toLowerCase().includes('hoje') && !item.data.toLowerCase().includes('amanhã') && !item.status.toLowerCase().includes('atrasada') && 'bg-muted-foreground/30'
              )} />
              
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-sora font-bold text-foreground truncate">{item.cliente}</span>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  <span className="truncate">{item.itens}</span>
                  <span>•</span>
                  <span className="text-foreground-secondary whitespace-nowrap">{item.data}</span>
                </div>
              </div>
            </div>
            
            <StatusBadge status={item.status} className="shrink-0" />
          </div>
        ))}
        
        {devolucoes.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
            Nenhuma devolução pendente ou agendada.
          </div>
        )}
      </div>
    </div>
  );
}
