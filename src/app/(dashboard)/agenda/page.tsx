'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  MapPin, 
  User, 
  FileText,
  Calendar,
  Trash2,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { CompromissoAgenda } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Drawer } from '@/components/shared/Drawer';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { mapAgendaRowToCompromisso } from '@/utils/agenda';

// Form validation schema
const compromissoSchema = z.object({
  tipo: z.enum(['Manutenção', 'Compromisso']),
  horarioStr: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (ex: 09:00)'),
  responsavel: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional()
});

type CompromissoFormValues = z.infer<typeof compromissoSchema>;

export default function AgendaPage() {
  const [compromissos, setCompromissos] = useState<CompromissoAgenda[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  
  // Profile & Permissions
  const [userProfile, setUserProfile] = useState<{ id: string; papel: string } | null>(null);

  // Loading and Error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Modais/Drawers state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [selectedCompromisso, setSelectedCompromisso] = useState<CompromissoAgenda | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompromissoFormValues>({
    resolver: zodResolver(compromissoSchema),
    defaultValues: {
      tipo: 'Compromisso',
      horarioStr: '09:00',
      responsavel: '',
      endereco: '',
      observacoes: ''
    }
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !userProfile) {
        const { data: profile } = await supabase.from('profiles').select('id, papel').eq('id', user.id).single();
        if (profile) setUserProfile(profile);
      }

      const { data, error: sbError } = await supabase
        .from('agenda_eventos')
        .select(`
          id,
          pedido_id,
          tipo,
          data_hora,
          status,
          resumo_itens,
          endereco,
          responsavel,
          observacoes,
          pedidos (
            status,
            clientes (
              nome
            )
          )
        `)
        .order('data_hora', { ascending: true });

      if (sbError) throw sbError;

      const agora = new Date();
      
      const mapped = (data || []).map((row: any) => mapAgendaRowToCompromisso(row, agora));

      setCompromissos(mapped);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar a agenda.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered list
  const filteredCompromissos = compromissos.filter(item => {
    const itemDate = new Date(item.horario);
    const isSameDay = itemDate.getDate() === selectedDate.getDate() &&
                     itemDate.getMonth() === selectedDate.getMonth() &&
                     itemDate.getFullYear() === selectedDate.getFullYear();

    const matchesSearch = item.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.resumoItens.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'todos' || item.operacao === selectedType;
    const matchesStatus = selectedStatus === 'todos' || item.status === selectedStatus;

    return isSameDay && matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => new Date(a.horario).getTime() - new Date(b.horario).getTime());

  // Date handlers
  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(selectedDate.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { error: delError } = await supabase.from('agenda_eventos').delete().eq('id', eventToDelete);
      if (delError) throw delError;
      await loadData();
      setEventToDelete(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao excluir o evento.');
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, novoStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { error: updError } = await supabase.from('agenda_eventos').update({ status: novoStatus }).eq('id', id);
      if (updError) throw updError;
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao atualizar status');
      setIsLoading(false);
    }
  };

  const handleConfirmarDevolucao = async (pedidoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { error: updError } = await supabase.from('pedidos').update({ status: 'Finalizado' }).eq('id', pedidoId);
      if (updError) throw updError;

      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao confirmar devolução');
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(id);
  };

  // Form submit handler
  const onSubmit = async (data: CompromissoFormValues) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      const [hours, minutes] = data.horarioStr.split(':').map(Number);
      const date = new Date(selectedDate);
      date.setHours(hours, minutes, 0, 0);

      const novo = {
        tipo: data.tipo,
        data_hora: date.toISOString(),
        status: 'Agendado',
        responsavel: data.responsavel || null,
        endereco: data.endereco || null,
        observacoes: data.observacoes || null
      };

      const supabase = createClient();
      const { error: insertError } = await supabase.from('agenda_eventos').insert(novo);

      if (insertError) throw insertError;

      await loadData();
      setIsNewModalOpen(false);
      reset();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Erro ao agendar evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date display
  const formatDateTitle = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Generate current week list for navigation
  const getWeekDays = () => {
    const current = new Date(selectedDate);
    const week = [];
    current.setDate(current.getDate() - current.getDay() + 1); // Start from Monday
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return week;
  };

  return (
    <>
      <AppHeader title="Agenda" />
      <div className="flex flex-col gap-6 p-6 max-md:p-4 min-h-[calc(100vh-3.5rem)] bg-background animate-fade-in w-full max-w-full overflow-x-hidden">
      {/* Top Banner Header */}
      <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4 shrink-0 bg-card border border-border p-5 rounded-2xl inner-highlight tech-grid relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sora font-extrabold text-xl text-foreground tracking-tight">Agenda Operacional</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Controle completo de coletas, montagens e carregamentos.</p>
          </div>
        </div>
        {userProfile?.papel !== 'atendente' && (
          <Button 
            onClick={() => setIsNewModalOpen(true)}
            className="bg-primary hover:bg-primary-strong text-black font-bold h-10 px-4 rounded-xl border border-primary/10 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,201,125,0.15)] max-md:w-full max-md:justify-center z-10"
          >
            <Plus className="w-4 h-4" /> Novo Compromisso
          </Button>
        )}
      </div>

      {/* Date Navigation & View Toggles */}
      <div className="flex justify-between items-center max-md:flex-col max-md:gap-3 bg-card border border-border p-4 rounded-2xl inner-highlight">
        <div className="flex items-center gap-3">
          <Button 
            onClick={handlePrevDay} 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 rounded-xl border-border hover:bg-surface cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <span className="font-sora font-semibold text-xs text-foreground text-center min-w-[190px] capitalize">
            {formatDateTitle(selectedDate)}
          </span>
          <Button 
            onClick={handleNextDay} 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 rounded-xl border-border hover:bg-surface cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button 
            onClick={handleToday} 
            variant="ghost" 
            size="sm" 
            className="text-xs text-primary hover:text-primary-strong cursor-pointer font-bold px-2"
          >
            Hoje
          </Button>
        </div>

        {/* Quick Weekday selector */}
        <div className="flex gap-1.5 overflow-x-auto max-md:w-full pb-1 max-md:justify-start scrollbar-none">
          {getWeekDays().map((day, idx) => {
            const isSelected = day.getDate() === selectedDate.getDate() && 
                             day.getMonth() === selectedDate.getMonth();
            const isToday = day.getDate() === new Date().getDate() && 
                            day.getMonth() === new Date().getMonth();
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-center transition-all min-w-[55px] cursor-pointer shrink-0 flex flex-col items-center gap-0.5",
                  isSelected 
                    ? "bg-primary border-primary text-black font-bold shadow-[0_0_12px_rgba(0,201,125,0.15)]" 
                    : "bg-surface border-border hover:border-border-strong text-muted-foreground hover:text-foreground",
                  isToday && !isSelected && "border-primary/40 text-primary"
                )}
              >
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold">
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3)}
                </span>
                <span className="text-xs font-sora font-bold">{day.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Filters Button */}
      <div className="xl:hidden w-full">
        <Button 
          onClick={() => setIsFiltersModalOpen(true)}
          className="w-full bg-surface-elevated border-border text-foreground hover:bg-surface font-semibold h-11 rounded-xl flex items-center justify-center gap-2 border"
        >
          <Filter className="w-4 h-4" /> Filtros Operacionais
        </Button>
      </div>

      {/* Grid of Search, Filters and Timeline Content */}
      <div className="grid grid-cols-4 gap-6 items-start max-xl:grid-cols-1 w-full">
        
        {/* Filters Sidebar Card */}
        <div className="col-span-1 flex flex-col gap-4 bg-card border border-border p-5 rounded-2xl inner-highlight max-xl:hidden">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono border-b border-border/60 pb-3">
            <Filter className="w-3.5 h-3.5" />
            Filtros operacionais
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente ou item..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Operação</label>
            <div className="flex flex-wrap gap-1">
              {['todos', 'Entrega', 'Retirada', 'Devolução', 'Pedido', 'Locação', 'Manutenção'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    selectedType === type 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === 'todos' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Status</label>
            <div className="flex flex-wrap gap-1">
              {['todos', 'Confirmada', 'Pendente', 'Em separação', 'Agendada', 'Atrasada'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    selectedStatus === status 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status === 'todos' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chronological Timeline Container */}
        <div className="col-span-3 bg-card border border-border p-6 max-md:p-4 rounded-2xl inner-highlight flex flex-col gap-6 max-xl:col-span-4 min-h-[400px] relative">
          
          <div className="flex justify-between items-center border-b border-border/60 pb-4 shrink-0">
            <h3 className="font-sora font-semibold text-sm text-foreground">Timeline Operacional</h3>
            <span className="text-[10px] font-mono font-bold bg-background-deep border border-border-subtle text-muted-foreground px-2 py-0.5 rounded-full">
              {filteredCompromissos.length} {filteredCompromissos.length === 1 ? 'evento' : 'eventos'}
            </span>
          </div>

          {/* Chronological timeline layout */}
          <div className="flex flex-col relative pl-6 gap-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[300px] w-full">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                <h3 className="text-sm font-sora font-semibold text-foreground mb-1.5">Carregando...</h3>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[300px] w-full">
                <h3 className="text-sm font-sora font-semibold text-danger mb-1.5">{error}</h3>
              </div>
            ) : (
              <>
                {filteredCompromissos.length > 1 && (
                  // Connected vertical line
                  <div className="absolute left-[3px] top-3 bottom-3 w-[1.5px] bg-border-strong/70 pointer-events-none" />
                )}

                {filteredCompromissos.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedCompromisso(item)}
                    className="flex items-start gap-4 relative group cursor-pointer"
                  >
                    {/* Node indicator */}
                    <div className="absolute left-[-27px] top-1.5 z-10 w-2.5 h-2.5 rounded-full border border-card bg-background-deep flex items-center justify-center shrink-0">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        item.operacao === 'Entrega' && 'bg-primary',
                        item.operacao === 'Retirada' && 'bg-warning',
                        item.operacao === 'Devolução' && 'bg-[#52A3FF]',
                        item.operacao === 'Pedido' && 'bg-success',
                        item.operacao === 'Locação' && 'bg-[#9f52ff]',
                        item.operacao === 'Manutenção' && 'bg-[#FF5B64]'
                      )} />
                    </div>

                    {/* Event Card content */}
                    <div className="flex-1 w-full bg-surface-elevated/20 hover:bg-surface-elevated/45 border border-border-subtle hover:border-border/80 p-4 rounded-xl transition-all duration-150 flex justify-between items-center gap-4 max-md:flex-col max-md:items-start max-md:gap-3 min-w-0">
                      <div className="flex items-start gap-3.5 min-w-0 w-full max-md:flex-col max-md:items-start max-md:gap-3">
                        {/* Time indicator */}
                        <div className="flex max-md:flex-row flex-col items-center bg-background-deep/50 border border-border-subtle p-2 max-md:px-3 rounded-lg shrink-0 w-16 max-md:w-auto max-md:gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary max-md:mb-0 mb-1" />
                          <span className={cn(
                            "font-mono font-bold text-foreground",
                            item.operacao === 'Devolução' ? "text-[10px]" : "text-xs"
                          )}>
                            {item.operacao === 'Devolução' ? 'Dia inteiro' : item.horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex flex-col min-w-0 w-full gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sora font-bold text-sm text-foreground max-md:w-full break-words">{item.cliente}</span>
                            {!!item.pedidoId && (
                              <span className={cn(
                                "text-[9px] font-bold font-mono px-2 py-0.5 rounded-md border shrink-0",
                                item.operacao === 'Entrega' && 'bg-primary-muted text-primary border-primary/10',
                                item.operacao === 'Retirada' && 'bg-warning/10 text-warning border-warning/10',
                                item.operacao === 'Devolução' && 'bg-[#52A3FF]/10 text-[#52A3FF] border-[#52A3FF]/10',
                                item.operacao === 'Pedido' && 'bg-success/10 text-success border-success/10',
                                item.operacao === 'Locação' && 'bg-[#9f52ff]/10 text-[#9f52ff] border-[#9f52ff]/10',
                                item.operacao === 'Manutenção' && 'bg-[#FF5B64]/10 text-[#FF5B64] border-[#FF5B64]/10'
                              )}>
                                {item.operacao}
                              </span>
                            )}
                            {item.pedidoId && (
                              <span className="text-[8px] font-bold font-mono text-primary bg-primary/10 border border-primary/15 px-1.5 py-0.5 rounded uppercase shrink-0 break-words">
                                Pedido #{item.pedidoId.split('-')[0]}
                              </span>
                            )}
                          </div>
                          
                          {item.resumoItens && (
                            <p className="text-xs text-foreground-secondary leading-relaxed break-words">{item.resumoItens}</p>
                          )}
                          
                          {item.observacoes && (
                            <p className="text-xs text-foreground-secondary leading-relaxed break-words whitespace-pre-wrap">
                              {item.observacoes}
                            </p>
                          )}
                          
                          {item.endereco && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground w-full">
                              <MapPin className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                              <span className="break-words min-w-0 flex-1">{item.endereco}</span>
                            </div>
                          )}

                          {/* MOBILE: Ação "Marcar como realizado" embutida no card (abaixo das observações/endereço) */}
                          {!item.pedidoId && userProfile?.papel !== 'atendente' && (item.status === 'Agendada' || item.status === 'Atrasada') && (
                            <button
                              onClick={(e) => handleUpdateStatus(item.id, 'Concluído', e)}
                              className="md:hidden mt-2.5 w-fit px-4 py-2 text-xs bg-success/10 text-success border border-success/20 hover:bg-success/20 rounded-xl transition-colors flex items-center justify-center gap-1.5 font-bold shadow-sm whitespace-nowrap"
                            >
                              <Check className="w-4 h-4 shrink-0" /> Marcar como realizado
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3 max-md:w-full max-md:justify-between max-md:border-t max-md:border-border-subtle/55 max-md:pt-3">
                        {item.responsavel ? (
                          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 truncate">
                            <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                            <span className="truncate">{item.responsavel}</span>
                          </span>
                        ) : (
                           <div />
                        )}
                        <div className="flex items-center gap-3 max-md:ml-auto">
                          <StatusBadge status={item.status} className="shrink-0" />
                          
                          {item.pedidoId && userProfile?.papel !== 'atendente' && item.operacao === 'Devolução' && item.pedidoStatus === 'Entregue' && (
                            <button
                              onClick={(e) => handleConfirmarDevolucao(item.pedidoId!, e)}
                              className="px-2 py-1.5 text-xs text-background bg-[#52A3FF] hover:bg-[#52A3FF]/90 font-bold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Confirmar devolução
                            </button>
                          )}

                          {!item.pedidoId && userProfile?.papel !== 'atendente' && (
                            <>
                              {(item.status === 'Agendada' || item.status === 'Atrasada') && (
                                <>
                                  <button
                                    onClick={(e) => handleUpdateStatus(item.id, 'Concluído', e)}
                                    className="max-md:hidden p-1.5 text-xs text-muted-foreground hover:text-success hover:bg-success/10 rounded-md transition-colors flex items-center gap-1 font-semibold"
                                    title="Marcar como realizado"
                                  >
                                    <Check className="w-4 h-4 shrink-0" /> Marcar como realizado
                                  </button>
                                  <button
                                    onClick={(e) => handleUpdateStatus(item.id, 'Cancelado', e)}
                                    className="p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-md transition-colors shrink-0"
                                    title="Cancelar evento"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={(e) => handleDeleteEvent(item.id, e)}
                                className="p-1.5 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-md transition-colors shrink-0"
                                title="Excluir evento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ))}

                {filteredCompromissos.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[300px] w-full">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 border border-border-subtle">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-sora font-semibold text-foreground mb-1.5">Nenhum evento agendado</h3>
                    <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">Não há nenhum compromisso operacional correspondente à pesquisa ou data filtrada.</p>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Drawer: Novo compromisso */}
      <Drawer
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Novo Evento Manual"
        footer={
          <>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsNewModalOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-surface"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-strong text-black font-bold h-9 px-4 rounded-xl border border-primary/10 flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(0,201,125,0.15)] disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Agendar'}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4">
          {submitError && <div className="text-xs text-danger font-semibold p-2 bg-danger/10 rounded-md border border-danger/20">{submitError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Tipo de Evento *</label>
              <select 
                className="h-9.5 px-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
                {...register('tipo')}
              >
                <option value="Manutenção">Manutenção</option>
                <option value="Compromisso">Compromisso</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Horário (HH:MM) *</label>
              <Input 
                placeholder="ex: 14:30"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('horarioStr')}
              />
              {errors.horarioStr && <span className="text-[10px] text-danger font-semibold">{errors.horarioStr.message}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Endereço (opcional)</label>
            <Input 
              placeholder="Rua, Número, Bairro"
              className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
              {...register('endereco')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Responsável (opcional)</label>
            <Input 
              placeholder="Nome do responsável"
              className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
              {...register('responsavel')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Observações (opcional)</label>
            <textarea 
              placeholder="Detalhes adicionais do evento..."
              rows={3}
              className="p-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
              {...register('observacoes')}
            />
          </div>
        </form>
      </Drawer>

      {/* Drawer: Filtros Mobile */}
      <Drawer
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        title="Filtros Operacionais"
      >
        <div className="flex flex-col gap-5 py-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente ou item..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl"
            />
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Operação</label>
            <div className="flex flex-wrap gap-1.5">
              {['todos', 'Entrega', 'Retirada', 'Devolução', 'Pedido', 'Locação', 'Manutenção'].map((type) => (
                <button
                  key={`mob-type-${type}`}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                    selectedType === type 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {type === 'todos' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {['todos', 'Confirmada', 'Pendente', 'Em separação', 'Agendada', 'Atrasada'].map((status) => (
                <button
                  key={`mob-status-${status}`}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer",
                    selectedStatus === status 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status === 'todos' ? 'Todos' : status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Modal centralizado de exclusão de evento manual */}
      {eventToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-4 shrink-0">
              <AlertTriangle className="w-6 h-6 text-danger" />
            </div>
            <h3 className="font-sora font-bold text-lg text-foreground mb-2">
              Excluir compromisso?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Esta ação não poderá ser desfeita.
            </p>
            <div className="flex gap-3 w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEventToDelete(null)}
                className="flex-1 h-10 rounded-xl font-semibold border-border hover:bg-surface"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={confirmDelete}
                disabled={isLoading}
                className="flex-1 bg-danger hover:bg-danger/90 text-white h-10 rounded-xl font-bold border border-danger/20 disabled:opacity-50"
              >
                {isLoading ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Detalhes do Compromisso */}
      <Drawer
        isOpen={selectedCompromisso !== null}
        onClose={() => setSelectedCompromisso(null)}
        title="Detalhes do Compromisso"
      >
        {selectedCompromisso && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="flex flex-col items-center bg-background-deep/50 border border-border-subtle p-2.5 rounded-xl shrink-0 w-16">
                <Clock className="w-4 h-4 text-primary mb-1" />
                <span className="font-mono text-xs font-bold text-foreground">
                  {selectedCompromisso.horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div>
                <h4 className="font-sora font-extrabold text-base text-foreground leading-tight">{selectedCompromisso.cliente}</h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn(
                    "text-[9px] font-bold font-mono px-2 py-0.5 rounded border",
                    selectedCompromisso.operacao === 'Entrega' && 'bg-primary-muted text-primary border-primary/10',
                    selectedCompromisso.operacao === 'Retirada' && 'bg-warning/10 text-warning border-warning/10',
                    selectedCompromisso.operacao === 'Devolução' && 'bg-[#52A3FF]/10 text-[#52A3FF] border-[#52A3FF]/10',
                    selectedCompromisso.operacao === 'Pedido' && 'bg-success/10 text-success border-success/10',
                    selectedCompromisso.operacao === 'Locação' && 'bg-[#9f52ff]/10 text-[#9f52ff] border-[#9f52ff]/10',
                    selectedCompromisso.operacao === 'Manutenção' && 'bg-[#FF5B64]/10 text-[#FF5B64] border-[#FF5B64]/10'
                  )}>
                    {selectedCompromisso.operacao}
                  </span>
                  <StatusBadge status={selectedCompromisso.status} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 bg-background-deep/40 border border-border-subtle p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Itens Vinculados
                </span>
                <p className="text-xs text-foreground mt-2 font-medium leading-relaxed">{selectedCompromisso.resumoItens}</p>
              </div>

              {selectedCompromisso.endereco && (
                <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Endereço de Entrega / Retirada</span>
                    <span className="mt-1 block leading-relaxed">{selectedCompromisso.endereco}</span>
                  </div>
                </div>
              )}

              {selectedCompromisso.responsavel && (
                <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                  <User className="w-4 h-4 text-[#52A3FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Responsável pela Equipe</span>
                    <span className="mt-1 block leading-relaxed font-mono font-semibold">{selectedCompromisso.responsavel}</span>
                  </div>
                </div>
              )}

              {selectedCompromisso.pedidoId && (
                <div className="flex flex-col gap-2 p-3.5 bg-primary/5 border border-primary/10 rounded-xl text-xs mt-2">
                  <div className="flex items-start gap-2 font-semibold text-primary">
                    <Calendar className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Compromisso Vinculado a Pedido</span>
                  </div>
                  <span className="text-muted-foreground leading-relaxed">
                    Este compromisso é gerado automaticamente a partir do **Pedido #{selectedCompromisso.pedidoId}**. Para alterar a data, os itens ou a logística, por favor edite o pedido original.
                  </span>
                  <Button
                    onClick={() => {
                      setSelectedCompromisso(null);
                      router.push(`/pedidos?edit=${selectedCompromisso.pedidoId}`);
                    }}
                    className="mt-1 bg-primary/10 hover:bg-primary text-primary hover:text-black border border-primary/15 font-bold h-8.5 rounded-lg w-full text-[10px]"
                  >
                    Ir para Edição do Pedido Original
                  </Button>
                </div>
              )}

              {selectedCompromisso.observacoes && (
                <div className="flex flex-col gap-1 border-t border-border/40 pt-4 mt-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Observações Internas</span>
                  <p className="text-xs text-foreground-secondary leading-relaxed mt-1 bg-background-deep/20 border border-border-subtle p-3 rounded-lg">{selectedCompromisso.observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-4 border-t border-border/40 pt-5">
              {selectedCompromisso.operacao === 'Entrega' && selectedCompromisso.endereco && (
                <Button 
                  onClick={() => {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedCompromisso.endereco || '')}`, '_blank');
                  }}
                  className="flex-1 text-xs font-bold h-9.5 rounded-xl cursor-pointer gap-2 bg-[#52A3FF] hover:bg-[#408CFF] text-white border border-[#408CFF]/15"
                >
                  <MapPin className="w-4 h-4 shrink-0" /> Ver Rota
                </Button>
              )}
              <Button 
                onClick={() => setSelectedCompromisso(null)}
                className="flex-1 text-xs font-bold h-9.5 rounded-xl cursor-pointer"
              >
                Voltar à Agenda
              </Button>
            </div>
          </div>
        )}
      </Drawer>

    </div>
    </>
  );
}
