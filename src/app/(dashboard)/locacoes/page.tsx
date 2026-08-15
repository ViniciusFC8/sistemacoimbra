'use client';

import React, { useState, useEffect } from 'react';
import { 
  Armchair, 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronRight, 
  AlertTriangle
} from 'lucide-react';
import { Locacao, StatusLocacao } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer } from '@/components/shared/Drawer';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

function LocacoesContent() {
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoParam = searchParams.get('pedido');
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  
  // Modais/Drawers state
  const [selectedLocacao, setSelectedLocacao] = useState<Locacao | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          status,
          data_entrega,
          data_fim_locacao,
          endereco_entrega,
          valor_total,
          observacoes,
          clientes ( id, nome, endereco, bairro, whatsapp ),
          pedidos_itens!inner (
            quantidade,
            itens_estoque!inner ( id, nome, tipo )
          )
        `)
        .eq('pedidos_itens.itens_estoque.tipo', 'locacao')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter and Map
      const mapped: Locacao[] = [];

      for (const p of pedidos || []) {
        const itensLocacao = p.pedidos_itens || [];
        if (itensLocacao.length === 0) continue;

        let locStatus: StatusLocacao = 'Orçamento';
        
        if (p.status === 'Confirmado') locStatus = 'Reservada';
        else if (p.status === 'Entregue') locStatus = 'Em andamento';
        else if (p.status === 'Finalizado') locStatus = 'Devolvida';
        else if (p.status === 'Cancelado') locStatus = 'Cancelada';
        else locStatus = 'Orçamento'; // Rascunho

        const dataFim = p.data_fim_locacao ? new Date(p.data_fim_locacao + 'T00:00:00-03:00') : new Date();
        const dataInicio = p.data_entrega ? new Date(p.data_entrega + 'T00:00:00-03:00') : new Date();

        if (p.status !== 'Finalizado' && p.status !== 'Cancelado' && p.data_fim_locacao) {
          // Check for delay
          // Atrasada = data fim locacao já passou (dia anterior) ao dia de hoje
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          const dataFimStartOfDay = new Date(dataFim);
          dataFimStartOfDay.setHours(0, 0, 0, 0);
          if (dataFimStartOfDay.getTime() < hoje.getTime()) {
            locStatus = 'Atrasada';
          }
        }

        const mappedItens = itensLocacao.map((pi: any) => ({
          quantidade: pi.quantidade,
          item: {
            id: pi.itens_estoque.id,
            nome: pi.itens_estoque.nome,
            tipo: pi.itens_estoque.tipo,
            quantidade: 0,
            status: 'Disponível' as const
          }
        }));

        mapped.push({
          id: p.id,
          pedidoId: p.id,
          cliente: (p.clientes || { id: 'balcao', nome: 'Balcão / Consumidor', endereco: '', bairro: '', whatsapp: '' }) as any,
          itens: mappedItens,
          status: locStatus,
          dataInicio: dataInicio,
          dataFim: dataFim,
          enderecoEntrega: p.endereco_entrega || (p.clientes as any)?.endereco || '',
          valorTotal: p.valor_total,
          observacoes: p.observacoes || undefined
        });
      }

      setLocacoes(mapped);
    } catch (error) {
      console.error('Error loading locacoes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered list
  const filteredLocacoes = locacoes.filter(l => {
    if (pedidoParam) {
      return l.id === pedidoParam;
    }
    const matchesSearch = (l.cliente?.nome || 'Balcão / Consumidor').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          l.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'todos' || 
                          (selectedStatus === 'atrasadas' && l.status === 'Atrasada') ||
                          (selectedStatus !== 'atrasadas' && l.status === selectedStatus);
    return matchesSearch && matchesStatus;
  });

  // Helper: count items from lease array safely grouping by name
  const getItemQty = (l: Locacao, searchKey: string) => {
    const items = l.itens.filter(i => i.item?.nome.toLowerCase().includes(searchKey.toLowerCase()));
    return items.reduce((acc, curr) => acc + curr.quantidade, 0);
  };

  // Helper: Natural language time remaining
  const getTimeRemaining = (dateFim: Date, status: StatusLocacao) => {
    if (status === 'Devolvida' || status === 'Cancelada') return status === 'Devolvida' ? 'Finalizado' : 'Cancelado';
    
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const dateFimMidnight = new Date(dateFim);
    dateFimMidnight.setHours(0,0,0,0);
    
    const diff = dateFimMidnight.getTime() - hoje.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return `Atrasado há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`;
    if (days === 0) return 'Devolve Hoje';
    if (days === 1) return 'Devolve Amanhã';
    return `Restam ${days} dias`;
  };

  // Stepper lifecycle nodes for desktop
  const lifecycleSteps = ['Orçamento', 'Confirmada', 'Aguardando entrega', 'Em andamento', 'Aguardando retirada', 'Devolvida'];
  const getLifecycleIndex = (status: StatusLocacao) => {
    if (status === 'Atrasada') return 3; // Em andamento
    if (status === 'Reservada') return 1; // Confirmada
    if (status === 'Cancelada') return -1;
    return lifecycleSteps.indexOf(status);
  };

  return (
    <>
      <AppHeader title="Controle de Locações" />
      <div className="flex flex-col gap-6 p-6 max-md:p-4 min-h-[calc(100vh-3.5rem)] bg-background animate-fade-in">
      {/* Top Banner Header */}
      <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4 shrink-0 bg-card border border-border p-5 rounded-2xl inner-highlight tech-grid relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sora font-extrabold text-xl text-foreground tracking-tight">Controle de Locações</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Acompanhe equipamentos locados, devoluções e atrasos.</p>
          </div>
        </div>
      </div>

      {/* Estatísticas e Status Indicators */}
      {!pedidoParam && (
        <div className="flex gap-4 overflow-x-auto pb-1 max-md:-mx-4 max-md:px-4">
          {[
            { label: 'Todas', value: 'todos', count: locacoes.length },
            { label: 'Em Andamento', value: 'Em andamento', count: locacoes.filter(l => l.status === 'Em andamento').length },
            { label: 'Reservadas', value: 'Reservada', count: locacoes.filter(l => l.status === 'Reservada').length },
            { label: 'Atrasadas ⚠️', value: 'atrasadas', count: locacoes.filter(l => l.status === 'Atrasada').length },
            { label: 'Devolvidas', value: 'Devolvida', count: locacoes.filter(l => l.status === 'Devolvida').length }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setSelectedStatus(item.value)}
              className={cn(
                "px-4 py-2.5 rounded-xl border text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-2",
                selectedStatus === item.value 
                  ? "bg-primary/10 border-primary/20 text-primary" 
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{item.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono",
                selectedStatus === item.value ? "bg-primary text-black" : "bg-background-deep text-muted-foreground border border-border-subtle"
              )}>
                {item.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Container */}
      <div className="bg-card border border-border rounded-2xl inner-highlight p-5 flex flex-col gap-5">
        {pedidoParam ? (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-4 rounded-xl text-primary text-xs">
            <span className="font-semibold">Exibindo resultado da busca global</span>
            <Button variant="ghost" className="h-8 text-primary hover:bg-primary/20 hover:text-primary-strong cursor-pointer" onClick={() => router.push('/locacoes')}>
              Ver todas as locações
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center gap-4 max-md:flex-col max-md:items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente ou código do pedido..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9.5 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl"
              />
            </div>
            <span className="text-[10px] font-mono font-bold bg-background-deep border border-border-subtle text-muted-foreground px-3 py-1.5 rounded-xl text-center shrink-0">
              {filteredLocacoes.length} {filteredLocacoes.length === 1 ? 'locação encontrada' : 'locações encontradas'}
            </span>
          </div>
        )}

        {/* Desktop Tabela */}
        <div className="overflow-x-auto max-md:hidden border border-border-subtle rounded-xl bg-background-deep/15">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-sidebar/25 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                <th className="p-4 pl-5">Pedido</th>
                <th className="p-4">Cliente</th>
                <th className="p-4 text-center">Mesas</th>
                <th className="p-4 text-center">Cadeiras</th>
                <th className="p-4 text-center">Freezers</th>
                <th className="p-4">Prazos</th>
                <th className="p-4">Prazo Restante</th>
                <th className="p-4 text-right">Valor do Pedido</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-5 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground text-xs font-semibold">Buscando locações do Supabase...</td></tr>
              ) : filteredLocacoes.map((l) => (
                <tr 
                  key={l.id}
                  onClick={() => setSelectedLocacao(l)}
                  className="border-b border-border-subtle/50 last:border-0 hover:bg-surface-elevated/15 transition-colors cursor-pointer text-xs group"
                >
                  <td className="p-4 pl-5 font-mono font-bold text-primary">#{l.id.split('-')[0]}</td>
                  <td className="p-4 font-sora font-bold text-foreground truncate max-w-[150px]">
                    <div className="flex flex-col">
                      <span>{l.cliente?.nome || 'Balcão / Consumidor'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono text-foreground-secondary">{getItemQty(l, 'mesa')}</td>
                  <td className="p-4 text-center font-mono text-foreground-secondary">{getItemQty(l, 'cadeira')}</td>
                  <td className="p-4 text-center font-mono text-foreground-secondary">{getItemQty(l, 'freezer')}</td>
                  <td className="p-4 text-foreground-secondary">
                    <span className="block font-semibold">Entrega: {l.dataInicio.toLocaleDateString('pt-BR')}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Devol.: {l.dataFim.toLocaleDateString('pt-BR')}</span>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "text-[10px] font-bold font-mono px-2 py-0.5 rounded border block w-fit",
                      l.status === 'Atrasada' && 'bg-danger/10 border-danger/10 text-[#FF5B64]',
                      l.status === 'Devolvida' && 'bg-success/10 border-success/10 text-success',
                      l.status !== 'Atrasada' && l.status !== 'Devolvida' && 'bg-background-deep border-border-subtle text-foreground-secondary'
                    )}>
                      {getTimeRemaining(l.dataFim, l.status)}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold text-foreground">
                    R$ {(l.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="p-4 pr-5 text-right">
                    <button className="p-1 rounded-lg border border-border-subtle hover:border-primary/30 bg-surface text-muted-foreground group-hover:text-primary transition-all duration-150 active:scale-90">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && filteredLocacoes.length === 0 && (
            pedidoParam ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-4">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div>
                  <h3 className="font-sora font-bold text-foreground text-sm">Locação não encontrada.</h3>
                  <p className="text-xs text-muted-foreground mt-1">O pedido informado não existe, não possui itens de locação ou você não tem permissão para acessá-lo.</p>
                </div>
                <Button onClick={() => router.push('/locacoes')} className="mt-2 text-xs h-9 cursor-pointer">
                  Voltar para locações
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
                Nenhuma locação correspondente encontrada.
              </div>
            )
          )}
        </div>

        {/* Mobile Cards */}
        <div className="hidden max-md:flex flex-col gap-3">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-semibold border border-border-subtle rounded-xl">Buscando locações do Supabase...</div>
          ) : filteredLocacoes.map((l) => (
            <div 
              key={l.id}
              onClick={() => setSelectedLocacao(l)}
              className="bg-surface-elevated/15 border border-border-subtle hover:border-border/80 p-4 rounded-xl transition-all duration-150 flex flex-col gap-3.5 cursor-pointer relative"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-extrabold text-xs text-primary">#{l.id.split('-')[0]}</span>
                <StatusBadge status={l.status} />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-sora font-bold text-sm text-foreground truncate">{l.cliente?.nome || 'Balcão / Consumidor'}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Bairro: {l.cliente?.bairro || 'N/A'}</span>
              </div>

              {/* Furniture Items Qty in Chips */}
              <div className="flex flex-wrap gap-1.5 my-0.5">
                {getItemQty(l, 'mesa') > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-primary/10 bg-primary-muted text-primary">
                    {getItemQty(l, 'mesa')} Mesas
                  </span>
                )}
                {getItemQty(l, 'cadeira') > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-[#52A3FF]/10 bg-[#52A3FF]/5 text-[#52A3FF]">
                    {getItemQty(l, 'cadeira')} Cadeiras
                  </span>
                )}
                {getItemQty(l, 'freezer') > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-warning/10 bg-warning/5 text-warning">
                    {getItemQty(l, 'freezer')} Freezer
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border-subtle/50 pt-3 text-[11px] text-foreground-secondary">
                <div className="flex items-center gap-1 min-w-0 font-mono text-[10px]">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">Devolução: {l.dataFim.toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1 justify-end font-mono font-extrabold text-foreground">
                  R$ {(l.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}

          {!isLoading && filteredLocacoes.length === 0 && (
            pedidoParam ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[250px] gap-4">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div>
                  <h3 className="font-sora font-bold text-foreground text-sm">Locação não encontrada.</h3>
                  <p className="text-xs text-muted-foreground mt-1">O pedido informado não existe ou não possui itens de locação.</p>
                </div>
                <Button onClick={() => router.push('/locacoes')} className="mt-2 text-xs h-9 cursor-pointer">
                  Voltar para locações
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[250px]">
                <Armchair className="h-6 w-6 text-muted-foreground mb-3" />
                <span className="text-xs font-semibold text-foreground">Nenhuma locação ativa</span>
                <span className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Nenhum contrato corresponde a esta seleção.</span>
              </div>
            )
          )}
        </div>

      </div>

      {/* Drawer: Detalhes da Locação */}
      <Drawer
        isOpen={selectedLocacao !== null}
        onClose={() => setSelectedLocacao(null)}
        title={`Detalhes do Pedido #${selectedLocacao?.id?.split('-')[0] || ''}`}
      >
        {selectedLocacao && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sora font-extrabold text-sm text-foreground">{selectedLocacao.cliente?.nome || 'Balcão / Consumidor'}</h4>
                  <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">
                    WhatsApp: {selectedLocacao.cliente?.whatsapp || 'Não informado'}
                  </span>
                </div>
              </div>
              <StatusBadge status={selectedLocacao.status} />
            </div>

            {/* Ciclo de vida visual para Desktop */}
            {selectedLocacao.status !== 'Cancelada' && (
              <div className="flex flex-col gap-2 bg-background-deep/30 border border-border-subtle p-4 rounded-xl max-md:hidden">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono mb-2 block">Ciclo de Operação</span>
                <div className="flex items-center justify-between relative mt-2 px-1">
                  <div className="absolute left-1 right-1 h-0.5 bg-border-strong top-2 z-0" />
                  <div 
                    className="absolute left-1 h-0.5 bg-primary top-2 z-0 transition-all duration-300"
                    style={{ 
                      width: `${Math.max(0, getLifecycleIndex(selectedLocacao.status)) * 20}%` 
                    }}
                  />
                  {lifecycleSteps.map((step, idx) => {
                    const isPassed = idx <= getLifecycleIndex(selectedLocacao.status);
                    const isCurrent = idx === getLifecycleIndex(selectedLocacao.status);
                    return (
                      <div key={idx} className="flex flex-col items-center z-10 relative">
                        <div className={cn(
                          "w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold font-mono transition-colors",
                          isPassed ? "bg-primary border-primary text-black" : "bg-card border-border-strong text-muted-foreground",
                          isCurrent && "shadow-[0_0_8px_rgba(0,201,125,0.3)] animate-pulse"
                        )}>
                          {idx + 1}
                        </div>
                        <span className={cn(
                          "text-[8px] font-semibold mt-1 text-center max-w-[65px] leading-tight",
                          isPassed ? "text-foreground-secondary font-bold" : "text-muted-foreground/60"
                        )}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantidade Detalhada */}
            <div className="flex flex-col gap-2 bg-background-deep/40 border border-border-subtle p-4 rounded-xl">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Equipamentos Locados</span>
              <div className="grid grid-cols-3 gap-2.5 mt-2">
                <div className="flex flex-col items-center bg-background-deep/50 border border-border-subtle p-2 rounded-lg">
                  <span className="text-[9px] text-muted-foreground font-mono">Mesas</span>
                  <span className="font-sora font-extrabold text-base text-foreground mt-0.5">{getItemQty(selectedLocacao, 'mesa')}</span>
                </div>
                <div className="flex flex-col items-center bg-background-deep/50 border border-border-subtle p-2 rounded-lg">
                  <span className="text-[9px] text-muted-foreground font-mono">Cadeiras</span>
                  <span className="font-sora font-extrabold text-base text-foreground mt-0.5">{getItemQty(selectedLocacao, 'cadeira')}</span>
                </div>
                <div className="flex flex-col items-center bg-background-deep/50 border border-border-subtle p-2 rounded-lg">
                  <span className="text-[9px] text-muted-foreground font-mono">Freezer</span>
                  <span className="font-sora font-extrabold text-base text-foreground mt-0.5">{getItemQty(selectedLocacao, 'freezer')}</span>
                </div>
              </div>
            </div>

            {/* Calendário e Local */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                  <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Entrega Agendada</span>
                    <span className="mt-1 block leading-relaxed font-semibold">{selectedLocacao.dataInicio.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                  <Clock className="w-4 h-4 text-[#52A3FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Devolução Prevista</span>
                    <span className="mt-1 block leading-relaxed font-semibold">{selectedLocacao.dataFim.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Endereço do Local</span>
                  <span className="mt-1 block leading-relaxed">{[selectedLocacao.enderecoEntrega, selectedLocacao.bairroEntrega, selectedLocacao.cidadeEntrega].filter(Boolean).join(', ')}</span>
                </div>
              </div>

              {selectedLocacao.status === 'Atrasada' && (
                <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/10 text-[#FF5B64] rounded-xl text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Esta locação ultrapassou a data de devolução e está gerando taxas adicionais por atraso.</span>
                </div>
              )}

              {selectedLocacao.observacoes && (
                <div className="flex flex-col gap-1 border-t border-border/40 pt-4 mt-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Instruções Internas do Pedido</span>
                  <p className="text-xs text-foreground-secondary leading-relaxed mt-1 bg-background-deep/20 border border-border-subtle p-3 rounded-lg whitespace-pre-wrap">{selectedLocacao.observacoes}</p>
                </div>
              )}
              
              <div className="flex flex-col gap-2 p-3.5 bg-primary/5 border border-primary/10 rounded-xl text-xs mt-2">
                <div className="flex items-start gap-2 font-semibold text-primary">
                  <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Central de Acompanhamento</span>
                </div>
                <span className="text-muted-foreground leading-relaxed">
                  As locações são exibidas de forma automática baseando-se no Pedido #{selectedLocacao.id.split('-')[0]}. Para confirmar devolução, alterar quantitativos ou remarcar prazos, gerencie diretamente o pedido correspondente.
                </span>
                <Button
                  onClick={() => {
                    router.push(`/pedidos?edit=${selectedLocacao.id}`);
                  }}
                  className="mt-1 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/15 font-bold h-8.5 rounded-lg w-full text-[10px]"
                >
                  Abrir Pedido Original
                </Button>
              </div>

              {/* Total final */}
              <div className="mt-2 border-t border-border/40 pt-4 flex justify-between items-center bg-background-deep/25 p-3 rounded-xl border border-border-subtle">
                <span className="font-sora font-semibold text-xs text-foreground">Valor Total do Pedido</span>
                <span className="font-sora font-extrabold text-base text-primary">R$ {(selectedLocacao.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-4 pt-4 border-t border-border/40">
              <Button 
                onClick={() => setSelectedLocacao(null)}
                className="flex-1 text-xs font-bold h-9.5 rounded-xl cursor-pointer"
              >
                Voltar
              </Button>
            </div>
          </div>
        )}
      </Drawer>

    </div>
    </>
  );
}

export default function LocacoesPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs">Carregando locações...</div>}>
      <LocacoesContent />
    </React.Suspense>
  );
}
