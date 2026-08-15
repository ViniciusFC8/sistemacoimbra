'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  MessageSquare, 
  ChevronRight, 
  UserPlus, 
  Activity, 
  Layers, 
  FileText,
  ExternalLink,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { clienteService } from '@/services/cliente.service';
import { createClient } from '@/utils/supabase/client';
import { Cliente } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer } from '@/components/shared/Drawer';
import { cn } from '@/lib/utils';

// Form validation schema
const clienteSchema = z.object({
  nome: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido (ex: 64992111234)'),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').or(z.literal('')),
  endereco: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres'),
  bairro: z.string().min(3, 'Bairro deve ter no mínimo 3 caracteres'),
  cidade: z.string().min(3, 'Cidade deve ter no mínimo 3 caracteres'),
  observacoes: z.string().optional()
});

type ClienteFormValues = z.infer<typeof clienteSchema>;

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Modais/Drawers state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clientMetrics, setClientMetrics] = useState({ totalLocacoes: 0, totalPedidos: 0, isLoading: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      email: '',
      cidade: 'Catalão',
      observacoes: ''
    }
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await clienteService.getClientes();
      setClientes(data);
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao carregar clientes do servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const [data, role] = await Promise.all([
          clienteService.getClientes(),
          clienteService.getCurrentUserRole()
        ]);
        if (active) {
          setClientes(data);
          setUserRole(role);
        }
      } catch (e: any) {
        if (active) {
          setErrorMessage(e.message || 'Erro de conexão com o banco.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    fetch();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedCliente) return;

    const fetchMetrics = async () => {
      setClientMetrics({ totalLocacoes: 0, totalPedidos: 0, isLoading: true });
      try {
        const supabase = createClient();
        
        // 1. Total de Pedidos
        const { count: pedidosCount, error: err1 } = await supabase
          .from('pedidos')
          .select('*', { count: 'exact', head: true })
          .eq('cliente_id', selectedCliente.id);
          
        if (err1) throw err1;

        // 2. Total de Locações
        const { data: locacoesData, error: err2 } = await supabase
          .from('pedidos')
          .select('id, pedidos_itens!inner(item_estoque_id, itens_estoque!inner(tipo))')
          .eq('cliente_id', selectedCliente.id)
          .eq('pedidos_itens.itens_estoque.tipo', 'locacao');
          
        if (err2) throw err2;
        
        const locacoesCount = new Set(locacoesData?.map(p => p.id)).size;

        if (active) {
          setClientMetrics({
            totalPedidos: pedidosCount || 0,
            totalLocacoes: locacoesCount,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('Erro ao buscar métricas do cliente:', err);
        if (active) {
          setClientMetrics({ totalPedidos: 0, totalLocacoes: 0, isLoading: false });
        }
      }
    };

    fetchMetrics();
    return () => { active = false; };
  }, [selectedCliente]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get('search');
    if (searchVal) {
      setSearchQuery(searchVal);
    }
  }, []);

  // Filtered list
  const filteredClientes = clientes.filter(c => {
    const query = searchQuery.toLowerCase();
    return c.nome.toLowerCase().includes(query) ||
           (c.telefone && c.telefone.includes(query)) ||
           (c.endereco && c.endereco.toLowerCase().includes(query)) ||
           (c.bairro && c.bairro.toLowerCase().includes(query)) ||
           (c.cidade && c.cidade.toLowerCase().includes(query));
  });

  // Form submit handler
  const onSubmit = async (data: ClienteFormValues) => {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const formattedWhatsapp = data.whatsapp || '55' + data.telefone.replace(/\D/g, '');
      const clientData = {
        nome: data.nome,
        telefone: data.telefone,
        whatsapp: formattedWhatsapp,
        email: data.email || undefined,
        endereco: data.endereco,
        bairro: data.bairro,
        cidade: data.cidade || 'Catalão',
        observacoes: data.observacoes || undefined
      };

      if (editingCliente) {
        await clienteService.updateCliente(editingCliente.id, clientData);
      } else {
        await clienteService.createCliente(clientData);
      }

      await loadData();
      setIsFormOpen(false);
      setEditingCliente(null);
      reset();
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao salvar cliente no Supabase.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleAtivo = async (cliente: Cliente) => {
    if (!confirm(`Deseja realmente ${cliente.ativo !== false ? 'desativar' : 'reativar'} o cliente ${cliente.nome}?`)) {
      return;
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const updated = await clienteService.updateCliente(cliente.id, { ativo: !cliente.ativo });
      if (selectedCliente && selectedCliente.id === cliente.id) {
        setSelectedCliente(updated);
      }
      await loadData();
    } catch (e: any) {
      setErrorMessage(e.message || 'Erro ao alterar status do cliente no Supabase.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEditClick = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsFormOpen(true);
    reset({
      nome: cliente.nome,
      telefone: cliente.telefone || '',
      whatsapp: cliente.whatsapp || '',
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || 'Catalão',
      observacoes: cliente.observacoes || ''
    });
  };

  const handleNewClick = () => {
    setEditingCliente(null);
    setIsFormOpen(true);
    reset({
      nome: '',
      telefone: '',
      whatsapp: '',
      email: '',
      endereco: '',
      bairro: '',
      cidade: 'Catalão',
      observacoes: ''
    });
  };

  // Quick statistics
  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.ativo !== false).length;
  const inativos = clientes.filter(c => c.ativo === false).length;

  return (
    <>
      <AppHeader title="Clientes" />
      <div className="flex flex-col gap-6 p-6 max-md:p-4 min-h-[calc(100vh-3.5rem)] bg-background animate-fade-in">
      
      {/* Mensagem de Erro */}
      {errorMessage && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl text-xs font-semibold leading-relaxed animate-in fade-in duration-150">
          {errorMessage}
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4 shrink-0 bg-card border border-border p-5 rounded-2xl inner-highlight tech-grid relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sora font-extrabold text-xl text-foreground tracking-tight">Cadastro de Clientes</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gerencie os parceiros e o histórico operacional de locações.</p>
          </div>
        </div>
        {(userRole === 'administrador' || userRole === 'atendente') && (
          <Button 
            onClick={handleNewClick}
            className="bg-primary hover:bg-primary-strong text-black font-bold h-10 px-4 rounded-xl border border-primary/10 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,201,125,0.15)] max-md:w-full max-md:justify-center z-10"
          >
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        )}
      </div>

      {/* Grid de Estatísticas Rápidas */}
      <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
        <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex items-center gap-4">
          <div className="bg-primary-muted text-primary border border-primary/10 p-3 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Total de Clientes</span>
            <span className="font-sora font-extrabold text-2xl text-foreground mt-1">{totalClientes}</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex items-center gap-4">
          <div className="bg-[#52A3FF]/10 text-[#52A3FF] border border-[#52A3FF]/15 p-3 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Clientes Ativos</span>
            <span className="font-sora font-extrabold text-2xl text-foreground mt-1">{clientesAtivos}</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex items-center gap-4">
          <div className="bg-warning/10 text-warning border border-warning/15 p-3 rounded-xl">
            <UserPlus className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Clientes Inativos</span>
            <span className="font-sora font-extrabold text-2xl text-foreground mt-1">{inativos}</span>
          </div>
        </div>
      </div>

      {/* Listagem de Clientes */}
      <div className="bg-card border border-border rounded-2xl inner-highlight flex flex-col gap-5 p-5">
        {/* Search bar & statistics status */}
        <div className="flex justify-between items-center gap-4 max-md:flex-col max-md:items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome, telefone, endereço, bairro ou cidade..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl"
            />
          </div>
          <span className="text-[10px] font-mono font-bold bg-background-deep border border-border-subtle text-muted-foreground px-3 py-1.5 rounded-xl text-center">
            {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </span>
        </div>

        {/* Desktop Tabela */}
        <div className="overflow-x-auto max-md:hidden border border-border-subtle rounded-xl bg-background-deep/15">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-xs font-semibold flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              Carregando clientes do Supabase...
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-sidebar/25 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                  <th className="p-4 pl-5">Nome</th>
                  <th className="p-4">Contato</th>
                  <th className="p-4">Endereço</th>
                  <th className="p-4 text-center">Locações</th>
                  <th className="p-4 text-center">Pedidos</th>
                  <th className="p-4 pr-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((c) => (
                  <tr 
                    key={c.id}
                    onClick={() => setSelectedCliente(c)}
                    className="border-b border-border-subtle/50 last:border-0 hover:bg-surface-elevated/15 transition-colors cursor-pointer text-xs group"
                  >
                    <td className="p-4 pl-5 font-sora font-bold text-foreground truncate max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{c.nome}</span>
                        {c.ativo === false && (
                          <span className="text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700 px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider shrink-0">
                            Inativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-foreground-secondary">{c.telefone}</span>
                        <span className="text-[9px] text-muted-foreground truncate">{c.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="truncate max-w-[250px] text-foreground-secondary">{c.endereco}</span>
                        <span className="text-[9px] text-primary font-semibold">{c.bairro} - {c.cidade || 'Catalão'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-mono font-semibold text-foreground-secondary">{c.totalLocacoes || 0}</td>
                    <td className="p-4 text-center font-mono font-semibold text-foreground-secondary">{c.totalPedidos || 0}</td>
                    <td className="p-4 pr-5 text-right">
                      <button className="p-1 rounded-lg border border-border-subtle hover:border-primary/30 bg-surface text-muted-foreground group-hover:text-primary transition-all duration-150 active:scale-90">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && filteredClientes.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
              Nenhum cliente correspondente encontrado.
            </div>
          )}
        </div>

        {/* Mobile Cards (Substitutes wide table) */}
        <div className="hidden max-md:flex flex-col gap-3">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground text-xs font-semibold flex flex-col items-center justify-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              Carregando clientes do Supabase...
            </div>
          ) : (
            filteredClientes.map((c) => (
              <div 
                key={c.id}
                onClick={() => setSelectedCliente(c)}
                className="bg-surface-elevated/15 border border-border-subtle hover:border-border/80 p-4 rounded-xl transition-all duration-150 flex flex-col gap-3.5 cursor-pointer relative"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sora font-bold text-sm text-foreground truncate">{c.nome}</span>
                      {c.ativo === false && (
                        <span className="text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700 px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider shrink-0">
                          Inativo
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">Cidade: {c.cidade || 'Catalão'}</span>
                  </div>
                  <button className="p-1.5 rounded-lg border border-border-subtle bg-surface text-muted-foreground">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-b border-border-subtle/50 py-3 text-[11px] text-foreground-secondary">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{c.bairro || 'Setor Central'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono justify-end">
                    <Layers className="w-3.5 h-3.5 text-[#52A3FF] shrink-0" />
                    <span>{c.totalLocacoes || 0} loc. | {c.totalPedidos || 0} ped.</span>
                  </div>
                </div>

                {/* Direct call or WhatsApp buttons with at least 44x44px target area */}
                <div className="flex gap-2.5" onClick={(e) => e.stopPropagation()}>
                  {c.telefone && (
                    <a 
                      href={`tel:${c.telefone.replace(/\D/g, '')}`}
                      className="flex-1 h-11 border border-border hover:bg-surface text-foreground-secondary text-xs rounded-xl flex items-center justify-center gap-2 font-semibold active:scale-95 transition-transform"
                    >
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Ligar
                    </a>
                  )}
                  {c.whatsapp && (
                    <a 
                      href={`https://wa.me/${c.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-11 border border-primary/20 hover:border-primary/40 bg-primary/5 text-primary text-xs rounded-xl flex items-center justify-center gap-2 font-bold active:scale-95 transition-transform"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))
          )}

          {!isLoading && filteredClientes.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[250px]">
              <Users className="h-6 w-6 text-muted-foreground mb-3" />
              <span className="text-xs font-semibold text-foreground">Nenhum cliente cadastrado</span>
              <span className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Não encontramos registros com este critério de busca.</span>
            </div>
          )}
        </div>

      </div>

      {/* Drawer: Novo / Editar Cliente */}
      <Drawer
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCliente(null);
        }}
        title={editingCliente ? "Editar Cadastro de Cliente" : "Cadastrar Novo Cliente"}
        footer={
          <>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsFormOpen(false);
                setEditingCliente(null);
              }}
              disabled={isActionLoading}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-surface"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit(onSubmit)}
              disabled={isActionLoading}
              className="bg-primary hover:bg-primary-strong text-black font-bold h-9 px-4 rounded-xl border border-primary/10 flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(0,201,125,0.15)] disabled:opacity-50"
            >
              {isActionLoading ? 'Salvando...' : editingCliente ? 'Salvar Alterações' : 'Criar Cadastro'}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nome Completo *</label>
            <Input 
              disabled={isActionLoading}
              placeholder="ex: Carlos Fernandes"
              className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
              {...register('nome')}
            />
            {errors.nome && <span className="text-[10px] text-danger font-semibold">{errors.nome.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Telefone (DDD + Nº) *</label>
              <Input 
                disabled={isActionLoading}
                placeholder="ex: 64992111234"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('telefone')}
              />
              {errors.telefone && <span className="text-[10px] text-danger font-semibold">{errors.telefone.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">WhatsApp (Opcional)</label>
              <Input 
                disabled={isActionLoading}
                placeholder="ex: 5564992111234"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('whatsapp')}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">E-mail (Opcional)</label>
            <Input 
              disabled={isActionLoading}
              placeholder="carlos@exemplo.com"
              type="email"
              className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
              {...register('email')}
            />
            {errors.email && <span className="text-[10px] text-danger font-semibold">{errors.email.message}</span>}
          </div>

          <div className="grid grid-cols-4 gap-3 animate-in fade-in-50">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Endereço Residencial *</label>
              <Input 
                disabled={isActionLoading}
                placeholder="Rua, Número..."
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('endereco')}
              />
              {errors.endereco && <span className="text-[10px] text-danger font-semibold">{errors.endereco.message}</span>}
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Bairro *</label>
              <Input 
                disabled={isActionLoading}
                placeholder="ex: Central"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('bairro')}
              />
              {errors.bairro && <span className="text-[10px] text-danger font-semibold">{errors.bairro.message}</span>}
            </div>

            <div className="col-span-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Cidade *</label>
              <Input 
                disabled={isActionLoading}
                placeholder="ex: Catalão"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('cidade')}
              />
              {errors.cidade && <span className="text-[10px] text-danger font-semibold">{errors.cidade.message}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Observações de Entrega</label>
            <textarea 
              disabled={isActionLoading}
              placeholder="Instruções para manuseio, facilidade de estacionamento..."
              rows={3}
              className="p-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
              {...register('observacoes')}
            />
          </div>
        </form>
      </Drawer>

      {/* Drawer: Detalhes do Cliente */}
      <Drawer
        isOpen={selectedCliente !== null}
        onClose={() => setSelectedCliente(null)}
        title="Histórico do Cliente"
      >
        {selectedCliente && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-sora font-extrabold text-base text-foreground leading-tight truncate">{selectedCliente.nome}</h4>
                  {selectedCliente.ativo === false && (
                    <span className="text-[8px] bg-neutral-800 text-neutral-400 border border-neutral-700 px-1.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
                      Inativo
                    </span>
                  )}
                </div>
                {selectedCliente.dataCadastro && (
                  <span className="text-[9px] text-muted-foreground font-mono mt-1 block">
                    Membro desde: {new Date(selectedCliente.dataCadastro).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4.5">
              {/* Contatos */}
              <div className="flex flex-col gap-2 bg-background-deep/40 border border-border-subtle p-3.5 rounded-xl">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Canais de Contato</span>
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                    <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono">{selectedCliente.telefone || 'Sem telefone'}</span>
                  </div>
                  {selectedCliente.email && (
                    <div className="flex items-center gap-2 text-xs text-foreground-secondary truncate">
                      <span className="text-[10px] text-muted-foreground w-12 shrink-0 font-mono font-bold">EMAIL:</span>
                      <span className="truncate">{selectedCliente.email}</span>
                    </div>
                  )}
                  {selectedCliente.whatsapp && (
                    <a 
                      href={`https://wa.me/${selectedCliente.whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1.5 mt-1 cursor-pointer w-fit"
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" /> Chamar no WhatsApp <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Endereço */}
              <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Endereço Cadastrado</span>
                  <span className="mt-1 block leading-relaxed">{selectedCliente.endereco}</span>
                  <span className="text-[10px] text-primary font-bold mt-0.5 block">{selectedCliente.bairro} - {selectedCliente.cidade || 'Catalão'}</span>
                </div>
              </div>

              {/* Métricas do cliente */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-border/40 py-4 my-1">
                <div className="flex flex-col items-center bg-background-deep/40 border border-border-subtle p-3 rounded-xl">
                  <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase tracking-wider">Total de Locações</span>
                  {clientMetrics.isLoading ? (
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mt-1" />
                  ) : (
                    <span className="font-sora font-extrabold text-xl text-[#9f52ff] mt-1">{clientMetrics.totalLocacoes}</span>
                  )}
                </div>
                <div className="flex flex-col items-center bg-background-deep/40 border border-border-subtle p-3 rounded-xl">
                  <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase tracking-wider">Total de Pedidos</span>
                  {clientMetrics.isLoading ? (
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mt-1" />
                  ) : (
                    <span className="font-sora font-extrabold text-xl text-success mt-1">{clientMetrics.totalPedidos}</span>
                  )}
                </div>
              </div>

              {selectedCliente.observacoes && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Notas de Entrega
                  </span>
                  <p className="text-xs text-foreground-secondary leading-relaxed mt-1 bg-background-deep/20 border border-border-subtle p-3.5 rounded-xl">{selectedCliente.observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-4 border-t border-border/40 pt-5 flex-wrap">
              {(userRole === 'administrador' || userRole === 'atendente') && (
                <Button 
                  onClick={() => {
                    handleEditClick(selectedCliente);
                    setSelectedCliente(null);
                  }}
                  className="flex-1 bg-primary hover:bg-primary-strong text-black font-bold h-9.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </Button>
              )}
              {userRole === 'administrador' && (
                <Button 
                  variant="outline"
                  onClick={() => handleToggleAtivo(selectedCliente)}
                  disabled={isActionLoading}
                  className={cn(
                    "flex-1 text-xs font-bold h-9.5 rounded-xl cursor-pointer border border-border hover:bg-surface flex items-center justify-center gap-1.5",
                    selectedCliente.ativo !== false ? "text-danger hover:bg-danger/5" : "text-success hover:bg-success/5"
                  )}
                >
                  {isActionLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : selectedCliente.ativo !== false ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Desativar
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Reativar
                    </>
                  )}
                </Button>
              )}
              <Button 
                onClick={() => setSelectedCliente(null)}
                variant="outline"
                className="flex-1 text-xs font-bold h-9.5 rounded-xl cursor-pointer border border-border hover:bg-surface"
              >
                Voltar à Lista
              </Button>
            </div>
          </div>
        )}
      </Drawer>

    </div>
    </>
  );
}
