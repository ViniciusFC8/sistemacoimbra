import React from 'react';
import { cn } from '@/lib/utils'; 
import * as LucideIcons from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  info: string;
  iconName: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function MetricCard({ title, value, info, iconName, className }: MetricCardProps) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.Activity;

  // Render layouts differently based on the card title
  const isEntregas = title.toLowerCase().includes('entregas');
  const isRetiradas = title.toLowerCase().includes('retiradas');
  const isLocacoes = title.toLowerCase().includes('loca');
  const isPedidos = title.toLowerCase().includes('pedido');

  return (
    <div className={cn(
      "bg-card border border-border rounded-2xl p-5 flex flex-col justify-between shadow-md inner-highlight relative overflow-hidden group transition-all duration-200 hover:border-border-strong hover:translate-y-[-2px]",
      isPedidos && value > 0 && "hover:border-warning/30",
      className
    )}>
      {/* Background soft lighting effects */}
      {isEntregas && <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary-glow rounded-full blur-xl opacity-30 pointer-events-none" />}
      {isPedidos && value > 0 && <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-warning/10 rounded-full blur-xl opacity-30 pointer-events-none" />}

      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
          <span className="text-3xl font-sora font-extrabold text-foreground tracking-tight mt-1">{value}</span>
        </div>
        
        <div className={cn(
          "p-2.5 rounded-xl border transition-all duration-200",
          isEntregas && "bg-success/5 border-success/10 text-success group-hover:border-success/30 group-hover:bg-success/10",
          isRetiradas && "bg-info/5 border-info/10 text-info group-hover:border-info/30 group-hover:bg-info/10",
          isLocacoes && "bg-primary-muted border-[#00C97D]/10 text-primary group-hover:border-[#00C97D]/30 group-hover:bg-primary/10",
          isPedidos && "bg-warning/5 border-warning/10 text-warning group-hover:border-warning/30 group-hover:bg-warning/10"
        )}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      
      {/* Customized Composition Sections */}
      <div className="mt-4 flex flex-col gap-1 relative z-10">
        {isEntregas && (
          <div className="flex flex-col gap-1.5">
            <div className="w-full h-1 bg-border-subtle rounded-full overflow-hidden">
              {/* Progress bar: 2 completed out of 5 total (40%) */}
              <div className="w-[40%] h-full bg-gradient-to-r from-success to-primary-strong rounded-full transition-all duration-500" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{info}</span>
          </div>
        )}

        {isRetiradas && (
          <div className="flex flex-col gap-1.5">
            {/* Mini route timeline */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" title="Retirada 1 - Concluída" />
              <span className="w-5 h-[1px] bg-border-strong" />
              <span className="w-1.5 h-1.5 rounded-full bg-warning status-pulse" title="Retirada 2 - Próxima" />
              <span className="w-5 h-[1px] bg-border-subtle" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" title="Retirada 3 - Agendada" />
              <span className="text-[9px] font-mono text-muted-foreground ml-1.5">{info}</span>
            </div>
          </div>
        )}

        {isLocacoes && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
              <span>Frota Alugada</span>
              <span className="text-primary">80%</span>
            </div>
            <div className="w-full h-1 bg-border-subtle rounded-full overflow-hidden">
              <div className="w-[80%] h-full bg-primary rounded-full transition-all duration-500" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{info}</span>
          </div>
        )}

        {isPedidos && (
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground font-medium">{info}</span>
            {value > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/10 border border-warning/15 text-[#F4B942] text-[9px] font-bold uppercase tracking-wider">
                <span className="h-1 w-1 rounded-full bg-warning status-pulse" />
                Atenção
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
