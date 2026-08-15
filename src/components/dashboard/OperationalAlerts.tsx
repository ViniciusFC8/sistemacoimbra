import React from 'react';
import { AlertaOperacional } from '@/types';
import { AlertCircle, AlertTriangle, Info, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

interface OperationalAlertsProps {
  alertas: AlertaOperacional[];
}

export function OperationalAlerts({ alertas }: OperationalAlertsProps) {
  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col shadow-lg inner-highlight">
      <div className="p-5 border-b border-border/60 flex items-center justify-between bg-sidebar/35">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#FF5B64]" />
          <h3 className="font-sora font-semibold text-sm text-foreground">Alertas operacionais</h3>
        </div>
        <span className="bg-[#FF5B64]/10 text-[#FF5B64] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#FF5B64]/15">
          {alertas.length}
        </span>
      </div>
      
      <div className="flex flex-col p-2.5">
        {alertas.map((alerta) => (
          <div key={alerta.id} className={cn(
            "p-3.5 m-1.5 rounded-xl border border-border bg-surface-elevated/20 flex gap-3 items-start hover:border-border-strong hover:bg-surface-elevated/50 transition-all duration-200 border-l-4",
            alerta.tipo === 'critico' && 'border-l-[#FF5B64]',
            alerta.tipo === 'atencao' && 'border-l-[#F4B942]',
            alerta.tipo === 'info' && 'border-l-[#52A3FF]'
          )}>
            <div className="mt-0.5 shrink-0">
              {alerta.tipo === 'critico' && <AlertCircle className="h-4.5 w-4.5 text-[#FF5B64]" />}
              {alerta.tipo === 'atencao' && <AlertTriangle className="h-4.5 w-4.5 text-[#F4B942]" />}
              {alerta.tipo === 'info' && <Info className="h-4.5 w-4.5 text-[#52A3FF]" />}
            </div>
            
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-xs font-sora font-bold text-foreground truncate">
                  {alerta.titulo}
                </h4>
                {alerta.tempoInfo && (
                  <span className="flex items-center text-[9px] text-muted-foreground whitespace-nowrap bg-background-deep/50 border border-border-subtle px-1.5 py-0.5 rounded font-mono">
                    <Clock className="w-2.5 h-2.5 mr-1 text-muted-foreground/75" />
                    {alerta.tempoInfo}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-foreground-secondary leading-relaxed line-clamp-2">
                {alerta.descricao}
              </p>
              
              {alerta.acaoTexto && (
                <div className="mt-1.5 flex">
                  <Button variant="link" className="h-auto p-0 text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-semibold">
                    {alerta.acaoTexto} <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {alertas.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
            Tudo operacional. Nenhum alerta pendente.
          </div>
        )}
      </div>
    </div>
  );
}
