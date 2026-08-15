'use client';

import React, { useEffect, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { dashboardService, DashboardIndicadores } from '@/services/dashboard.service';
import { 
  Plus, 
  Truck, 
  Package, 
  Armchair, 
  ShoppingCart, 
  Clock, 
  AlertCircle, 
  User, 
  Boxes,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { MobileHeaderGreeting } from '@/components/dashboard/MobileHeaderGreeting';
import { CompromissoAgenda, AlertaOperacional } from '@/types';

export default function DashboardPage() {
  const [indicadores, setIndicadores] = useState<DashboardIndicadores>({
    entregasHoje: 0,
    devolucoesHoje: 0,
    devolucoesAtrasadas: 0,
    estoqueAlugadoPercent: 0,
    estoqueAlugadoText: ''
  });
  const [agenda, setAgenda] = useState<CompromissoAgenda[]>([]);
  const [alertas, setAlertas] = useState<AlertaOperacional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [indicadoresData, agendaData, alertasData] = await Promise.all([
          dashboardService.getIndicadores(),
          dashboardService.getAgendaDeHoje(),
          dashboardService.getAlertasOperacionais()
        ]);

        if (active) {
          setIndicadores(indicadoresData);
          setAgenda(agendaData.slice(0, 3));
          setAlertas(alertasData.slice(0, 2));
        }
      } catch (err: any) {
        console.error('Erro ao carregar dashboard:', err);
        if (active) {
          setError(err.message || 'Erro ao carregar indicadores');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, []);

  // Mostrar somente os 3 próximos compromissos
  const proximosCompromissos = agenda;

  // Mostrar no máximo 2 alertas de atenção necessária
  const topAlertas = alertas;

  return (
    <>
      <AppHeader title="Visão geral" />
      <PageContainer className="flex flex-col gap-6 max-md:gap-4 fade-in-slide">
        
        {/* Cabeçalho Compacto (Desktop) */}
        <div className="hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-5">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">Operação ativa</span>
            </div>
            <h2 className="text-xl font-sora font-extrabold tracking-tight text-foreground">Visão geral</h2>
          </div>
          
          <div className="flex gap-3 shrink-0 w-full md:w-auto">
            <Link 
              href="/pedidos?new=true"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-strong text-black font-bold h-10 px-4 rounded-xl border border-primary/10 shadow-[0_0_15px_rgba(0,201,125,0.2)] text-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Novo pedido
            </Link>
          </div>
        </div>

        {/* Cabeçalho Compacto (Mobile) */}
        <div className="flex md:hidden flex-col gap-4 border-b border-border/40 pb-5">
          <MobileHeaderGreeting />
          <Link 
            href="/pedidos?new=true"
            className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-strong text-black font-bold h-10 px-4 rounded-xl border border-primary/10 shadow-[0_0_15px_rgba(0,201,125,0.2)] text-xs transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo pedido
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center gap-2">
            Ocorreu um erro ao carregar os indicadores: {error}
          </div>
        )}

        {/* Resumo do dia: grade compacta 2x2 no mobile, 4 em linha no desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Entregas hoje */}
          <div className="bg-card border border-border p-4 rounded-2xl inner-highlight flex items-center gap-3">
            <div className="bg-primary/10 text-primary p-2 rounded-xl shrink-0">
              <Truck className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Entregas</span>
              {isLoading ? (
                <div className="w-6 h-5 rounded bg-border-subtle animate-pulse mt-1" />
              ) : (
                <span className="font-sora font-extrabold text-base text-foreground mt-0.5">{indicadores.entregasHoje}</span>
              )}
            </div>
          </div>

          {/* Card 2: Devoluções hoje */}
          <div className="bg-card border border-border p-4 rounded-2xl inner-highlight flex items-center gap-3">
            <div className="bg-[#52A3FF]/10 text-[#52A3FF] p-2 rounded-xl shrink-0">
              <Package className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Devoluções</span>
              {isLoading ? (
                <div className="w-6 h-5 rounded bg-border-subtle animate-pulse mt-1" />
              ) : (
                <span className="font-sora font-extrabold text-base text-foreground mt-0.5">{indicadores.devolucoesHoje}</span>
              )}
            </div>
          </div>

          {/* Card 3: Devoluções atrasadas */}
          <div className="bg-card border border-border p-4 rounded-2xl inner-highlight flex items-center gap-3">
            <div className="bg-danger/10 text-danger p-2 rounded-xl shrink-0">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Atrasadas</span>
              {isLoading ? (
                <div className="w-6 h-5 rounded bg-border-subtle animate-pulse mt-1" />
              ) : (
                <span className="font-sora font-extrabold text-base text-foreground mt-0.5">{indicadores.devolucoesAtrasadas}</span>
              )}
            </div>
          </div>

          {/* Card 4: Estoque alugado */}
          <div className="bg-card border border-border p-4 rounded-2xl inner-highlight flex items-center gap-3">
            <div className="bg-warning/10 text-warning p-2 rounded-xl shrink-0">
              <Armchair className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Estoque Alugado</span>
              {isLoading ? (
                <div className="w-6 h-5 rounded bg-border-subtle animate-pulse mt-1" />
              ) : (
                <>
                  <span className="font-sora font-extrabold text-base text-foreground mt-0.5 leading-tight">{indicadores.estoqueAlugadoPercent}%</span>
                  <span className="text-[9px] text-muted-foreground">{indicadores.estoqueAlugadoText}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Três Seções: Agenda de Hoje, Alertas Urgentes e Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-md:gap-4">
          
          {/* Agenda de hoje */}
          <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="font-sora font-bold text-sm text-foreground">Agenda de hoje</h3>
              <span className="text-[9px] font-mono font-bold bg-background-deep border border-border-subtle text-muted-foreground px-2 py-0.5 rounded-full">Próximos 3</span>
            </div>
            
            <div className="flex flex-col gap-3 flex-1">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 p-2.5 bg-surface/30 border border-border-subtle rounded-xl animate-pulse">
                    <div className="flex items-center gap-3 w-full">
                      <div className="bg-border-subtle w-14 h-11 rounded-lg shrink-0" />
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="bg-border-subtle h-3.5 w-3/4 rounded-md" />
                        <div className="bg-border-subtle h-2.5 w-1/2 rounded-md" />
                      </div>
                    </div>
                    <div className="bg-border-subtle h-6 w-16 rounded-full shrink-0" />
                  </div>
                ))
              ) : proximosCompromissos.length > 0 ? (
                proximosCompromissos.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 bg-surface/30 border border-border-subtle rounded-xl hover:bg-surface/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col justify-center items-center bg-background-deep/60 px-2 py-1 rounded-lg text-center w-14 shrink-0 font-mono min-h-[38px]">
                        <Clock className={cn("w-3.5 h-3.5 text-primary", (item.operacao === 'Devolução') ? "" : "mb-0.5")} />
                        {!(item.operacao === 'Devolução') && (
                          <span className="text-[9px] font-bold text-foreground">
                            {new Date(item.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-sora font-bold text-xs text-foreground truncate">{item.cliente}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{item.operacao}</span>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-5">Nenhum compromisso agendado para hoje.</p>
              )}
            </div>
            
            <Link href="/agenda" className="text-center text-xs font-bold text-primary hover:text-primary-strong mt-auto border border-primary/20 bg-primary/5 hover:bg-primary/10 py-2 rounded-xl transition-all">
              Ver agenda completa
            </Link>
          </div>

          {/* Atenção necessária */}
          <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="font-sora font-bold text-sm text-foreground">Atenção necessária</h3>
              <span className="text-[9px] font-mono font-bold bg-[#FF5B64]/10 border border-[#FF5B64]/20 text-[#FF5B64] px-2 py-0.5 rounded-full uppercase">Crítico</span>
            </div>
            
            <div className="flex flex-col gap-3 flex-1">
              {topAlertas.map((alerta) => (
                <div 
                  key={alerta.id} 
                  className={cn(
                    "flex items-start gap-3 p-3 border rounded-xl text-xs",
                    alerta.tipo === 'critico' ? "bg-[#FF5B64]/5 border-[#FF5B64]/15 text-foreground" : "bg-warning/5 border-warning/15 text-foreground"
                  )}
                >
                  <AlertCircle className={cn("w-4 h-4 shrink-0 mt-0.5", alerta.tipo === 'critico' ? "text-[#FF5B64]" : "text-[#F4B942]")} />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold truncate">{alerta.titulo}</span>
                    <span className="text-muted-foreground text-[10px] mt-0.5 leading-relaxed line-clamp-2">{alerta.descricao}</span>
                  </div>
                </div>
              ))}
              {topAlertas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground gap-2">
                  <Check className="w-8 h-8 text-success/70" />
                  <p className="text-xs font-medium">Não há alertas no momento.</p>
                </div>
              )}
            </div>
            
            <Link href="/pedidos" className="text-center text-xs font-bold text-primary hover:text-primary-strong mt-auto border border-primary/20 bg-primary/5 hover:bg-primary/10 py-2 rounded-xl transition-all">
              Ver todos os alertas
            </Link>
          </div>

          {/* Ações rápidas */}
          <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex flex-col gap-4 md:col-span-2 lg:col-span-1">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="font-sora font-bold text-sm text-foreground">Ações rápidas</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 flex-1 content-start">
              <Link 
                href="/pedidos?new=true" 
                className="flex flex-col items-center justify-center p-3 bg-surface/30 border border-border-subtle rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all text-center gap-1.5 min-h-[85px] active:scale-95"
              >
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-bold text-foreground">Novo Pedido</span>
              </Link>
              
              <Link 
                href="/pedidos?new=true" 
                className="flex flex-col items-center justify-center p-3 bg-surface/30 border border-border-subtle rounded-xl hover:border-warning/30 hover:bg-warning/5 transition-all text-center gap-1.5 min-h-[85px] active:scale-95"
              >
                <Armchair className="w-5 h-5 text-warning" />
                <span className="text-[10px] font-bold text-foreground">Nova Locação</span>
              </Link>

              <Link 
                href="/clientes" 
                className="flex flex-col items-center justify-center p-3 bg-surface/30 border border-border-subtle rounded-xl hover:border-[#52A3FF]/30 hover:bg-[#52A3FF]/5 transition-all text-center gap-1.5 min-h-[85px] active:scale-95"
              >
                <User className="w-5 h-5 text-[#52A3FF]" />
                <span className="text-[10px] font-bold text-foreground">Novo Cliente</span>
              </Link>

              <Link 
                href="/estoque" 
                className="flex flex-col items-center justify-center p-3 bg-surface/30 border border-border-subtle rounded-xl hover:border-success/30 hover:bg-success/5 transition-all text-center gap-1.5 min-h-[85px] active:scale-95"
              >
                <Boxes className="w-5 h-5 text-success" />
                <span className="text-[10px] font-bold text-foreground">Estoque</span>
              </Link>
            </div>
          </div>

        </div>

      </PageContainer>
    </>
  );
}
