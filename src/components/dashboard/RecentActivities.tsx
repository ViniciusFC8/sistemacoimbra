import React from 'react';
import { AtividadeRecente } from '@/types';
import { ShoppingCart, Users, Armchair, Truck, Boxes } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface RecentActivitiesProps {
  atividades: AtividadeRecente[];
}

export function RecentActivities({ atividades }: RecentActivitiesProps) {
  const getIconAndColor = (tipo: AtividadeRecente['tipo']) => {
    switch (tipo) {
      case 'pedido':
        return { icon: ShoppingCart, color: 'text-info', bg: 'bg-info/10' };
      case 'cliente':
        return { icon: Users, color: 'text-primary', bg: 'bg-primary/10' };
      case 'locacao':
        return { icon: Armchair, color: 'text-warning', bg: 'bg-warning/10' };
      case 'entrega':
        return { icon: Truck, color: 'text-success', bg: 'bg-success/10' };
      case 'estoque':
        return { icon: Boxes, color: 'text-muted-foreground', bg: 'bg-muted' };
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col shadow-lg inner-highlight">
      <div className="p-5 border-b border-border/60 flex items-center justify-between bg-sidebar/35">
        <h3 className="font-sora font-semibold text-sm text-foreground">Atividades recentes</h3>
      </div>
      
      <div className="flex flex-col p-6 relative gap-5">
        {atividades.length > 1 && (
          // Vertical connecting line
          <div className="absolute left-[39px] top-9 bottom-9 w-[1.5px] bg-border-strong/70 pointer-events-none" />
        )}
        
        {atividades.map((atividade) => {
          const { icon: Icon } = getIconAndColor(atividade.tipo);
          
          return (
            <div key={atividade.id} className="flex gap-4 items-start relative group">
              {/* Timeline dot icon container */}
              <div className={cn(
                "relative z-10 w-8 h-8 rounded-full border flex items-center justify-center bg-background-deep shrink-0 transition-transform duration-200 group-hover:scale-105",
                atividade.tipo === 'pedido' && 'border-info/10 text-info',
                atividade.tipo === 'cliente' && 'border-success/15 text-primary',
                atividade.tipo === 'locacao' && 'border-warning/15 text-warning',
                atividade.tipo === 'entrega' && 'border-success/20 text-[#00E58F]',
                atividade.tipo === 'estoque' && 'border-border-subtle text-muted-foreground'
              )}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              
              <div className="flex-1 min-w-0 bg-surface-elevated/20 hover:bg-surface-elevated/45 border border-border-subtle hover:border-border/80 p-3 rounded-xl transition-all duration-150 flex flex-col gap-1">
                <p className="text-xs text-foreground-secondary leading-relaxed">
                  {atividade.descricao}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[9px] font-mono text-muted-foreground uppercase">
                  {atividade.responsavel && (
                    <>
                      <span>{atividade.responsavel}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>
                    {formatDistanceToNow(atividade.horario, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {atividades.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
            Nenhuma atividade recente registrada.
          </div>
        )}
      </div>
    </div>
  );
}
