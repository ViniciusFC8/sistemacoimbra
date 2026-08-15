import React from 'react';
import { CompromissoAgenda } from '@/types';
import { format } from 'date-fns';
import { MoreHorizontal, Truck, Package, MapPin, ClipboardList } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { Button } from '../ui/button';

interface TodayScheduleProps {
  compromissos: CompromissoAgenda[];
}

export function TodaySchedule({ compromissos }: TodayScheduleProps) {
  // Map locations for mock data IDs
  const getLocalizacao = (id: string) => {
    switch (id) {
      case '1': return 'Setor Central, Catalão';
      case '2': return 'Bairro Ipê, Catalão';
      case '3': return 'Vila Margarida, Catalão';
      case '4': return 'Santo Antônio, Catalão';
      default: return 'Catalão, GO';
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-lg inner-highlight">
      <div className="p-5 border-b border-border/60 flex items-center justify-between bg-sidebar/35">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-sora font-semibold text-sm text-foreground">Agenda de hoje</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary-strong">Ver agenda completa</Button>
      </div>
      
      <div className="p-6 relative">
        {compromissos.length > 1 && (
          // Vertical connecting line running down the timeline items
          <div className="absolute left-[39px] top-10 bottom-10 w-[1.5px] bg-border-strong/70 pointer-events-none" />
        )}
        
        <div className="flex flex-col gap-6">
          {compromissos.map((item) => {
            const isEntrega = item.operacao.toLowerCase() === 'entrega';
            const location = getLocalizacao(item.id);
            const isPendente = item.status.toLowerCase().includes('pendente');
            const isAtrasado = item.status.toLowerCase().includes('atrasada');
            
            return (
              <div key={item.id} className="flex gap-4 relative group items-start">
                
                {/* Time Indicator column */}
                <div className="w-14 shrink-0 text-right pt-1">
                  <span className="font-sora font-bold text-xs text-foreground tracking-tight">
                    {format(item.horario, 'HH:mm')}
                  </span>
                </div>

                {/* Timeline node icon */}
                <div className="relative z-10 flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300
                    ${isEntrega 
                      ? 'bg-success/5 border-success/20 text-[#00E58F] group-hover:bg-success/15 group-hover:border-success/40' 
                      : 'bg-info/5 border-info/20 text-[#52A3FF] group-hover:bg-info/15 group-hover:border-info/40'
                    }
                  `}>
                    {isEntrega ? <Truck className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
                  </div>
                  
                  {/* Status glow bulb */}
                  {(isPendente || isAtrasado) && (
                    <span className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-card status-pulse
                      ${isAtrasado ? 'bg-danger' : 'bg-warning'}
                    `} />
                  )}
                </div>

                {/* Item Details Card Container */}
                <div className="flex-1 bg-surface-elevated/40 border border-border/70 hover:border-border-strong hover:bg-surface-elevated/80 rounded-xl p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.cliente}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        {item.operacao}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                        <MapPin className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <p className="text-xs text-foreground-secondary leading-relaxed">
                      {item.resumoItens}
                    </p>
                  </div>

                  {/* Actions / Status */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <StatusBadge status={item.status} />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>

                </div>

              </div>
            );
          })}

          {compromissos.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
              Nenhum compromisso agendado para hoje.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
