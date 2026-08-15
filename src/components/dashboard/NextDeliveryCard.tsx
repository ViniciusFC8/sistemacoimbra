import React from 'react';
import { Truck, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';

export function NextDeliveryCard() {
  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-6 text-foreground flex flex-col gap-5 relative overflow-hidden shadow-lg shadow-black/50 inner-highlight tech-grid group hover:border-primary/30 transition-all duration-200">
      {/* Radial soft glow lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-glow/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary-glow rounded-full blur-2xl opacity-40 pointer-events-none group-hover:scale-110 transition-transform duration-300" />
      
      <div className="flex justify-between items-center relative z-10">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary status-pulse" />
            Operação Imediata
          </span>
          <h3 className="font-sora font-semibold text-sm text-foreground tracking-tight">Próxima entrega</h3>
        </div>
        <div className="bg-primary-muted p-2 rounded-xl text-primary border border-primary/10">
          <Truck className="w-4.5 h-4.5" />
        </div>
      </div>
      
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sora font-extrabold text-3xl text-foreground tracking-tight">09:00</span>
          <span className="text-muted-foreground text-xs font-medium">com</span>
          <span className="font-sora font-bold text-sm text-foreground-secondary">Ana Paula</span>
        </div>
        
        <p className="text-xs text-foreground-secondary leading-relaxed bg-background-deep/40 border border-border-subtle p-3 rounded-lg">
          <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1 tracking-wider font-mono">Carga Reservada</span>
          10 mesas, 40 cadeiras e 1 freezer
        </p>
        
        {/* Simple route steps */}
        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
            <span>Rota Central</span>
            <span className="text-primary">Carregamento 100%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-full h-1 bg-success rounded-full" />
            <span className="w-full h-1 bg-success rounded-full" />
            <span className="w-full h-1 bg-border-strong rounded-full" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-xs text-foreground-secondary bg-surface p-2.5 rounded-lg border border-border-subtle">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">Setor Central, Catalão</span>
        </div>
      </div>
      
      <div className="mt-1 relative z-10">
        <Button className="w-full h-10 bg-primary hover:bg-primary-strong text-black font-bold rounded-lg border border-primary/10 shadow-[0_0_15px_rgba(0,201,125,0.15)] flex items-center justify-center gap-2">
          Ver rota no mapa <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1 duration-200" />
        </Button>
      </div>
    </div>
  );
}
