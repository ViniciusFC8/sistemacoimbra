'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Trash2, 
  User, 
  CreditCard,
  ChevronRight,
  Package,
  PackageX,
  Truck
} from 'lucide-react';
import { clienteService } from '@/services/cliente.service';
import { pedidoService } from '@/services/pedido.service';
import { estoqueService } from '@/services/estoque.service';
import { createClient } from '@/utils/supabase/client';
import { Pedido, Cliente, ItemEstoque, StatusPedido } from '@/types';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer } from '@/components/shared/Drawer';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

const toLocalDateStr = (d: Date | string) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Form validation schema
const pedidoSchema = z.object({
  clienteId: z.string().min(1, 'Selecione um cliente'),
  novoClienteNome: z.string().optional(),
  novoClienteTelefone: z.string().optional(),
  tipoEntrega: z.enum(['entrega', 'retirada']),
  dataCriacaoStr: z.string().min(10, 'Data do pedido obrigatória'),
  dataEntregaStr: z.string().min(10, 'Data de entrega obrigatória'),
  dataFimLocacaoStr: z.string().optional(),
  horarioEntrega: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido (ex: 14:00)'),
  formaPagamento: z.enum(['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Faturamento 30 dias']),
  responsavel: z.string().min(3, 'Responsável inválido'),
  observacoes: z.string().optional(),
  bebidasPorEscrito: z.string().optional(),
  itens: z.array(z.object({
    itemId: z.string(),
    quantidade: z.number().min(1, 'Mínimo 1 unidade')
  })).optional(),
  valorTotal: z.number({ invalid_type_error: 'Digite o valor total' }).min(0, 'O valor mínimo é R$ 0,00'),
  enderecoEntrega: z.string().optional(),
  bairroEntrega: z.string().optional(),
  cidadeEntrega: z.string().optional()
});

type PedidoFormValues = z.infer<typeof pedidoSchema>;

function PedidosContent() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const newParam = searchParams.get('new');
  
  // List loading/error state
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  
  // Modais/Drawers state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  
  // Profile & Permissions
  const [userProfile, setUserProfile] = useState<{ id: string; papel: string } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInsufficientStockModalOpen, setIsInsufficientStockModalOpen] = useState(false);

  // Delete states
  const [pedidoToDelete, setPedidoToDelete] = useState<Pedido | null>(null);
  const [isDeletingPedido, setIsDeletingPedido] = useState(false);

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<PedidoFormValues>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      tipoEntrega: 'entrega',
      horarioEntrega: '09:00',
      formaPagamento: 'Pix',
      responsavel: 'Carlos Lima',
      dataCriacaoStr: toLocalDateStr(new Date()),
      dataEntregaStr: toLocalDateStr(new Date()),
      dataFimLocacaoStr: '',
      bebidasPorEscrito: '',
      itens: [{ itemId: '', quantidade: 1 }],
      valorTotal: 0,
      enderecoEntrega: '',
      bairroEntrega: '',
      cidadeEntrega: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'itens'
  });

  // Watch fields for summary calculations and conditional fields
  const watchedItens = watch('itens');
  const watchedClienteId = watch('clienteId');
  const watchedTipoEntrega = watch('tipoEntrega');
  const watchedValorTotal = watch('valorTotal');

  const hasRentalItems = watchedItens?.some(i => {
    const item = estoque.find(e => e.id === i.itemId);
    return item && item.tipo === 'locacao';
  });

  // Auto open edit/new drawer if query params are present
  useEffect(() => {
    if (newParam === 'true') {
      setEditingPedido(null);
      setIsNewModalOpen(true);
    } else if (editId && pedidos.length > 0) {
      const found = pedidos.find(p => p.id === editId);
      if (found) {
        setEditingPedido(found);
        setIsNewModalOpen(true);
      }
    }
  }, [editId, newParam, pedidos]);

  // Sync client address automatically
  useEffect(() => {
    if (watchedClienteId && watchedClienteId !== 'anonymous' && watchedClienteId !== 'new_client') {
      const clientObj = clientes.find(c => c.id === watchedClienteId);
      if (clientObj) {
        setValue('enderecoEntrega', clientObj.endereco || '');
        setValue('bairroEntrega', clientObj.bairro || '');
        setValue('cidadeEntrega', clientObj.cidade || '');
      }
    }
  }, [watchedClienteId, clientes, setValue]);

  // Sync edit mode fields
  useEffect(() => {
    if (editingPedido) {
      reset({
        clienteId: editingPedido.cliente.id,
        novoClienteNome: '',
        novoClienteTelefone: '',
        tipoEntrega: editingPedido.tipoEntrega || 'entrega',
        dataCriacaoStr: toLocalDateStr(editingPedido.dataCriacao),
        dataEntregaStr: editingPedido.dataEntrega ? toLocalDateStr(editingPedido.dataEntrega) : toLocalDateStr(new Date()),
        dataFimLocacaoStr: editingPedido.dataFimLocacao ? toLocalDateStr(editingPedido.dataFimLocacao) : '',
        horarioEntrega: editingPedido.horarioEntrega || '09:00',
        formaPagamento: (editingPedido.formaPagamento || 'Pix') as any,
        responsavel: editingPedido.responsavel || 'Carlos Lima',
        observacoes: editingPedido.observacoes || '',
        bebidasPorEscrito: editingPedido.bebidasPorEscrito || '',
        itens: editingPedido.itens.length > 0 
          ? editingPedido.itens.map(i => ({ itemId: i.item.id, quantidade: i.quantidade }))
          : [{ itemId: '', quantidade: 1 }],
        valorTotal: editingPedido.valorTotal || 0,
        enderecoEntrega: editingPedido.enderecoEntrega || '',
        bairroEntrega: editingPedido.bairroEntrega || '',
        cidadeEntrega: editingPedido.cidadeEntrega || ''
      });
    } else {
      reset({
        clienteId: '',
        novoClienteNome: '',
        novoClienteTelefone: '',
        tipoEntrega: 'entrega',
        dataCriacaoStr: toLocalDateStr(new Date()),
        dataEntregaStr: toLocalDateStr(new Date()),
        dataFimLocacaoStr: '',
        horarioEntrega: '09:00',
        formaPagamento: 'Pix',
        responsavel: 'Carlos Lima',
        observacoes: '',
        bebidasPorEscrito: '',
        itens: [{ itemId: '', quantidade: 1 }],
        valorTotal: 0,
        enderecoEntrega: '',
        bairroEntrega: '',
        cidadeEntrega: ''
      });
    }
  }, [editingPedido, reset]);

  const loadData = async () => {
    try {
      setIsLoadingList(true);
      setListError('');
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !userProfile) {
        const { data: profile } = await supabase.from('profiles').select('id, papel').eq('id', user.id).single();
        if (profile) setUserProfile(profile);
      }

      const [pData, cData, eData] = await Promise.all([
        pedidoService.getPedidos(),
        clienteService.getClientes().then(c => c.filter(x => x.ativo !== false)),
        estoqueService.getEstoque()
      ]);
      setPedidos(pData);
      setClientes(cData);
      setEstoque(eData);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setListError(error.message || 'Erro ao carregar dados');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        setIsLoadingList(true);
        setListError('');

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && active) {
          const { data: profile } = await supabase.from('profiles').select('id, papel').eq('id', user.id).single();
          if (profile) setUserProfile(profile);
        }

        const [pData, cData, eData] = await Promise.all([
          pedidoService.getPedidos(),
          clienteService.getClientes().then(c => c.filter(x => x.ativo !== false)),
          estoqueService.getEstoque()
        ]);
        if (active) {
          setPedidos(pData);
          setClientes(cData);
          setEstoque(eData);
        }
      } catch (error: any) {
        if (active) {
          setListError(error.message || 'Erro ao carregar pedidos');
        }
      } finally {
        if (active) setIsLoadingList(false);
      }
    };
    fetch();
    return () => {
      active = false;
    };
  }, []);

  // Filtered list
  const filteredPedidos = pedidos.filter(p => {
    const matchesSearch = p.cliente.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'todos' || p.status === selectedStatus;
    
    let matchesDate = true;
    if (selectedDateFilter) {
      const orderDateStr = new Date(p.dataCriacao).toISOString().split('T')[0];
      matchesDate = orderDateStr === selectedDateFilter;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate order total inside the form dynamically
  const calculateFormTotal = (itensToCalc = watchedItens) => {
    if (!itensToCalc) return 0;
    return itensToCalc.reduce((acc, current) => {
      const product = estoque.find(p => p.id === current.itemId);
      if (!product) return acc;
      const priceMap: Record<string, number> = {
        'l1': 10.00,  // Mesa
        'l2': 2.50,   // Cadeira
        'l3': 100.00, // Freezer
        'v1': 45.00,  // Coca-Cola Fardo
        'v2': 55.00,  // Skol Fardo
        'v3': 20.00,  // Água Fardo
        'v4': 110.00, // Heineken Caixa
        'v5': 15.00   // Gelo
      };
      const price = priceMap[product.id] || 30.00;
      return acc + (price * (current.quantidade || 0));
    }, 0);
  };

  // Submit new order handler
  const onSubmit = async (data: PedidoFormValues) => {
    let client: Cliente | undefined;

    if (data.clienteId === 'anonymous') {
      client = {
        id: 'anonymous',
        nome: 'Venda Balcão / Consumidor',
        telefone: '-',
        email: '-',
        endereco: 'Venda Balcão',
        bairro: 'Centro'
      };
    } else if (data.clienteId === 'new_client') {
      if (!data.novoClienteNome || data.novoClienteNome.trim().length < 3) {
        alert('Digite o nome do novo cliente (mínimo 3 caracteres)');
        return;
      }
      client = await clienteService.createCliente({
        nome: data.novoClienteNome,
        telefone: data.novoClienteTelefone || '',
        whatsapp: data.novoClienteTelefone ? '55' + data.novoClienteTelefone.replace(/\D/g, '') : '',
        email: '',
        endereco: '',
        bairro: '',
        cidade: 'Catalão',
        observacoes: 'Cadastrado rapidamente pela gaveta de Pedidos.',
        ativo: true
      });
      // Atualiza o form para refletir o ID do novo cliente (caso o modal não fechasse, isso manteria a seleção)
      setValue('clienteId', client.id);
    } else {
      client = clientes.find(c => c.id === data.clienteId);
    }

    if (!client) {
      alert('Selecione um cliente válido');
      return;
    }

    const validItens = (data.itens || []).filter(i => i.itemId !== '');

    if (validItens.length === 0 && !data.bebidasPorEscrito) {
      alert('Adicione pelo menos um produto ou escreva as bebidas no campo de texto.');
      return;
    }

    if (data.tipoEntrega === 'entrega' && (!data.enderecoEntrega || data.enderecoEntrega.trim().length < 5)) {
      alert('Digite o endereço de entrega completo (mínimo 5 caracteres)');
      return;
    }

    const mappedItens = validItens.map(item => {
      const stockItem = estoque.find(e => e.id === item.itemId)!;
      return { item: stockItem, quantidade: item.quantidade };
    });

    const valorTotal = data.valorTotal;

    const statusFinal = editingPedido ? editingPedido.status : ('Confirmado' as StatusPedido);
    const dataEntregaFinal = data.dataEntregaStr;
    const dataFimLocacaoFinal = data.dataFimLocacaoStr || undefined;
    const enderecoEntregaFinal = data.tipoEntrega === 'entrega' ? data.enderecoEntrega : undefined;
    const bairroEntregaFinal = data.tipoEntrega === 'entrega' ? data.bairroEntrega : undefined;
    const cidadeEntregaFinal = data.tipoEntrega === 'entrega' ? data.cidadeEntrega : undefined;

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (editingPedido) {
        await pedidoService.updatePedido(editingPedido.id, {
          cliente_id: client.id === 'anonymous' ? null : client.id,
          tipo_entrega: data.tipoEntrega,
          data_entrega: dataEntregaFinal,
          data_fim_locacao: dataFimLocacaoFinal || null,
          horario_entrega: data.horarioEntrega || null,
          forma_pagamento: data.formaPagamento || null,
          responsavel: data.responsavel || null,
          observacoes: data.observacoes || null,
          bebidas_por_escrito: data.bebidasPorEscrito || null,
          valor_total: valorTotal,
          endereco_entrega: enderecoEntregaFinal || null,
          bairro_entrega: bairroEntregaFinal || null,
          cidade_entrega: cidadeEntregaFinal || null,
          itens: validItens.map(i => ({
            item_estoque_id: i.itemId,
            quantidade: i.quantidade
          }))
        });
      } else {
        // Novo cadastro vai para Supabase RPC
        await pedidoService.createPedido({
          cliente_id: client.id === 'anonymous' ? null : client.id,
          status: statusFinal,
          tipo_entrega: data.tipoEntrega,
          data_entrega: dataEntregaFinal,
          data_fim_locacao: dataFimLocacaoFinal || null,
          horario_entrega: data.horarioEntrega || null,
          forma_pagamento: data.formaPagamento || null,
          responsavel: data.responsavel || null,
          observacoes: data.observacoes || null,
          bebidas_por_escrito: data.bebidasPorEscrito || null,
          valor_total: valorTotal,
          endereco_entrega: enderecoEntregaFinal || null,
          bairro_entrega: bairroEntregaFinal || null,
          cidade_entrega: cidadeEntregaFinal || null,
          itens: validItens.map(i => ({
            item_estoque_id: i.itemId,
            quantidade: i.quantidade
          }))
        });

        // Sincronizar o endereço_entrega com o cadastro do novo cliente rápido
        if (data.clienteId === 'new_client' && data.tipoEntrega === 'entrega' && (enderecoEntregaFinal || bairroEntregaFinal || cidadeEntregaFinal)) {
          try {
            await clienteService.updateCliente(client.id, {
              endereco: enderecoEntregaFinal || '',
              bairro: bairroEntregaFinal || '',
              cidade: cidadeEntregaFinal || 'Catalão'
            });
          } catch (updateErr) {
            console.error('Erro ao salvar endereço no novo cliente:', updateErr);
          }
        }
      }

      await loadData();
      setIsNewModalOpen(false);
      setEditingPedido(null);
      reset();
    } catch (error: any) {
      console.error('Erro ao salvar pedido:', error);
      const errMsg = error.message || '';
      const isStockError = errMsg.includes('chk_qtd_disponivel') || 
                           errMsg.toLowerCase().includes('quantidade indisponível') || 
                           errMsg.toLowerCase().includes('estoque insuficiente') ||
                           errMsg.includes('violates check constraint');
      
      if (isStockError) {
        setIsInsufficientStockModalOpen(true);
      } else {
        setErrorMessage(errMsg || 'Erro ao salvar pedido');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!pedidoToDelete) return;
    try {
      setIsDeletingPedido(true);
      setStatusError('');
      await pedidoService.deletePedido(pedidoToDelete.id);
      await loadData();
      setPedidoToDelete(null);
      setSelectedPedido(null);
      // Aqui idealmente seria um toast de sucesso: "Pedido excluído com sucesso."
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      setStatusError(error.message || 'Erro ao excluir pedido.');
    } finally {
      setIsDeletingPedido(false);
    }
  };

  // Status steps mapping for visual progress bar
  const getStatusProgress = (status: StatusPedido) => {
    if (status === 'Confirmado') return 0;
    if (status === 'Entregue') return 50;
    if (status === 'Finalizado') return 100;
    return 0;
  };

  return (
    <>
      <AppHeader title="Pedidos" />
      <div className="flex flex-col gap-6 p-6 max-md:p-4 min-h-[calc(100vh-3.5rem)] bg-background animate-fade-in">
      {/* Top Banner Header */}
      <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4 shrink-0 bg-card border border-border p-5 rounded-2xl inner-highlight tech-grid relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sora font-extrabold text-xl text-foreground tracking-tight">Pedidos de Venda e Locação</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Central operacional para gestão de vendas de bebidas, gelos e locação de equipamentos.</p>
          </div>
        </div>
        {userProfile && userProfile.papel !== 'operacao' && (
          <Button 
            onClick={() => {
              setEditingPedido(null);
              setIsNewModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-strong text-black font-bold h-10 px-4 rounded-xl border border-primary/10 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,201,125,0.15)] max-md:w-full max-md:justify-center z-10"
          >
            <Plus className="w-4 h-4" /> Novo Pedido
          </Button>
        )}
      </div>

      {/* Estatísticas e Status Indicators */}
      <div className="flex gap-4 overflow-x-auto pb-1 max-md:-mx-4 max-md:px-4">
        {[
          { label: 'Todos', value: 'todos', count: pedidos.length },
          { label: 'Pedido confirmado', value: 'Confirmado', count: pedidos.filter(p => p.status === 'Confirmado').length },
          { label: 'Entregue', value: 'Entregue', count: pedidos.filter(p => p.status === 'Entregue').length },
          { label: 'Finalizado', value: 'Finalizado', count: pedidos.filter(p => p.status === 'Finalizado').length }
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

      {/* Main Container */}
      <div className="bg-card border border-border rounded-2xl inner-highlight p-5 flex flex-col gap-5">
        {/* Search */}
        <div className="flex justify-between items-center gap-4 max-md:flex-col max-md:items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por cliente ou nº do pedido..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 max-md:w-full">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono shrink-0">Filtrar Data:</span>
            <Input 
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="h-9.5 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl w-36 max-md:flex-1"
            />
            {selectedDateFilter && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedDateFilter('')}
                className="text-xs text-muted-foreground hover:text-foreground px-2 h-9.5"
              >
                Limpar
              </Button>
            )}
          </div>

          <span className="text-[10px] font-mono font-bold bg-background-deep border border-border-subtle text-muted-foreground px-3 py-1.5 rounded-xl text-center shrink-0">
            {filteredPedidos.length} {filteredPedidos.length === 1 ? 'pedido listado' : 'pedidos listados'}
          </span>
        </div>

        {listError && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold flex items-center gap-2">
            Ocorreu um erro ao carregar os pedidos: {listError}
          </div>
        )}

        {/* Desktop Tabela */}
        <div className="overflow-x-auto max-md:hidden border border-border-subtle rounded-xl bg-background-deep/15">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-sidebar/25 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                <th className="p-4 pl-5">Pedido</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Itens Pedidos</th>
                <th className="p-4">Logística</th>
                <th className="p-4">Forma Pag.</th>
                <th className="p-4 text-right">Valor Total</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((p) => (
                <tr 
                  key={p.id}
                  onClick={() => setSelectedPedido(p)}
                  className="border-b border-border-subtle/50 last:border-0 hover:bg-surface-elevated/15 transition-colors cursor-pointer text-xs group"
                >
                  <td className="p-4 pl-5 font-mono font-bold text-primary">{p.id}</td>
                  <td className="p-4 font-sora font-bold text-foreground truncate max-w-[150px]">{p.cliente.nome}</td>
                  <td className="p-4">
                    <span className="truncate max-w-[200px] block text-foreground-secondary">
                      {p.itens.map(i => `${i.quantidade}x ${i.item?.nome}`).join(', ')}
                    </span>
                  </td>
                  <td className="p-4 text-foreground-secondary">
                    <span className="capitalize block font-semibold">{p.tipoEntrega}</span>
                    <span className="text-[9px] text-muted-foreground font-mono">{p.horarioEntrega || '09:00'}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{p.formaPagamento || 'Pix'}</td>
                  <td className="p-4 text-right font-mono font-bold text-foreground">
                    R$ {(p.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <StatusBadge status={p.status} />
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

          {isLoadingList && (
            <div className="p-8 text-center text-muted-foreground text-xs font-semibold leading-relaxed animate-pulse">
              Carregando pedidos...
            </div>
          )}

          {!isLoadingList && filteredPedidos.length === 0 && !listError && (
            <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
              Nenhum pedido correspondente encontrado.
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="hidden max-md:flex flex-col gap-3">
          {filteredPedidos.map((p) => (
            <div 
              key={p.id}
              onClick={() => setSelectedPedido(p)}
              className="bg-surface-elevated/15 border border-border-subtle hover:border-border/80 p-4 rounded-xl transition-all duration-150 flex flex-col gap-3.5 cursor-pointer relative"
            >
              <div className="flex justify-end items-center">
                {/* ID ocultado no mobile para deixar o card mais limpo */}
                <span className="hidden">{p.id}</span>
                <StatusBadge status={p.status} />
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-sora font-bold text-sm text-foreground truncate">{p.cliente.nome}</span>
                <span className="text-xs text-foreground-secondary line-clamp-1 mt-1">
                  {p.itens.map(i => `${i.quantidade}x ${i.item?.nome}`).join(', ')}
                </span>
              </div>

              {/* Status bar representation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono font-bold uppercase">
                  <span>Progresso do Pedido</span>
                  <span>{getStatusProgress(p.status)}%</span>
                </div>
                <div className="w-full h-1 bg-border-strong rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${getStatusProgress(p.status)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border-subtle/50 pt-3 text-[11px] text-foreground-secondary">
                <div className="flex items-center gap-1.5 min-w-0 capitalize">
                  {p.tipoEntrega === 'entrega' ? <Truck className="w-3.5 h-3.5 text-primary" /> : <Package className="w-3.5 h-3.5 text-warning" />}
                  <span>{p.tipoEntrega} ({p.horarioEntrega || '09:00'})</span>
                </div>
                <div className="flex items-center gap-1 justify-end font-mono font-extrabold text-foreground">
                  R$ {(p.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}

          {isLoadingList && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[150px] animate-pulse">
              <span className="text-xs font-semibold text-muted-foreground">Carregando pedidos...</span>
            </div>
          )}

          {!isLoadingList && filteredPedidos.length === 0 && !listError && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[250px]">
              <ShoppingCart className="h-6 w-6 text-muted-foreground mb-3" />
              <span className="text-xs font-semibold text-foreground">Nenhum pedido encontrado</span>
              <span className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">Nenhum pedido atende a esta seleção.</span>
            </div>
          )}
        </div>

      </div>

      {/* Drawer: Novo/Editar Pedido */}
      <Drawer
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingPedido(null);
        }}
        title={editingPedido ? `Editar Pedido ${editingPedido.id}` : "Novo Pedido de Venda / Locação"}
        footer={
          <>
            <div className="mr-auto flex flex-col">
              <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase tracking-wider">Total do pedido</span>
              <span className="font-sora font-extrabold text-lg text-primary">R$ {(watchedValorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsNewModalOpen(false);
                setEditingPedido(null);
                setErrorMessage('');
              }}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-surface"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary-strong text-black font-bold h-9 px-4 rounded-xl border border-primary/10 flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(0,201,125,0.15)] disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : (editingPedido ? "Salvar Alterações" : "Confirmar Pedido")}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs font-semibold">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Selecionar Cliente *</label>
            <select 
              className="h-9.5 px-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
              {...register('clienteId')}
            >
              <option value="">Selecione...</option>
              <option value="anonymous">Venda sem Identificação / Anônimo</option>
              <option value="new_client">+ Cadastrar Novo Cliente Rápido...</option>
              {clientes.filter(c => c.id !== 'anonymous').map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            {errors.clienteId && <span className="text-[10px] text-danger font-semibold">{errors.clienteId.message}</span>}
          </div>

          {/* Quick client registration fields */}
          {watchedClienteId === 'new_client' && (
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface/50 border border-border rounded-xl">
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nome do Novo Cliente *</label>
                <Input 
                  placeholder="ex: João da Silva" 
                  className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                  {...register('novoClienteNome')}
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Telefone / WhatsApp</label>
                <Input 
                  placeholder="ex: (64) 99999-9999" 
                  className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                  {...register('novoClienteTelefone')}
                />
              </div>
            </div>
          )}

          {/* Calendars for order dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Data do Pedido *</label>
              <Input 
                type="date"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('dataCriacaoStr')}
              />
              {errors.dataCriacaoStr && <span className="text-[10px] text-danger font-semibold">{errors.dataCriacaoStr.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Data de Entrega / Retirada *</label>
              <Input 
                type="date"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('dataEntregaStr')}
              />
              {errors.dataEntregaStr && <span className="text-[10px] text-danger font-semibold">{errors.dataEntregaStr.message}</span>}
            </div>
          </div>

          {/* Return date calendar if order contains rental assets */}
          {hasRentalItems && (
            <div className="flex flex-col gap-1 p-3 bg-primary/5 border border-primary/10 rounded-xl">
              <label className="text-[10px] font-bold text-primary uppercase tracking-wider font-mono">Data Prevista de Retirada/Devolução (Locação) *</label>
              <Input 
                type="date"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border focus-visible:ring-primary"
                {...register('dataFimLocacaoStr')}
              />
              <span className="text-[9px] text-muted-foreground mt-1">Este campo é obrigatório para locação de mesas, cadeiras ou freezers.</span>
              {errors.dataFimLocacaoStr && <span className="text-[10px] text-danger font-semibold">{errors.dataFimLocacaoStr.message}</span>}
            </div>
          )}

          {/* Unstructured beverage input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Bebidas e Suprimentos por escrito (Anotação Rápida)</label>
            <textarea 
              placeholder="ex: 3 fardos de Coca-cola 2L, 5 sacos de gelo 10kg, 1 engradado de Heineken..."
              rows={2}
              className="p-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
              {...register('bebidasPorEscrito')}
            />
            <span className="text-[9px] text-muted-foreground">Registre bebidas livremente sem necessidade de controle de estoque.</span>
          </div>

          {/* Structured products list */}
          <div className="border border-border/80 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-primary" /> Carrinho de Equipamentos / Bebidas
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => append({ itemId: '', quantidade: 1 })}
                className="text-[10px] h-7 px-2 border border-border rounded-lg text-primary hover:text-primary-strong font-bold"
              >
                + Adicionar Item
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex gap-2.5 items-center">
                  <select 
                    className="flex-1 h-9.5 px-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
                    {...register(`itens.${idx}.itemId` as const)}
                  >
                    <option value="">Escolha o item...</option>
                    {estoque.filter(item => item.tipo === 'locacao').map(item => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>

                  <Input 
                    type="number" 
                    placeholder="Qtd" 
                    className="w-16 h-9.5 text-xs text-center bg-background-deep rounded-xl border-border"
                    {...register(`itens.${idx}.quantidade` as const, { valueAsNumber: true })}
                  />

                  {fields.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => remove(idx)}
                      className="p-2 rounded-lg border border-border hover:border-danger bg-surface hover:bg-danger/5 text-muted-foreground hover:text-danger active:scale-95 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.itens && <span className="text-[10px] text-danger font-semibold">{errors.itens.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Tipo de Logística</label>
              <select 
                className="h-9.5 px-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
                {...register('tipoEntrega')}
              >
                <option value="entrega">Entrega no Local</option>
                <option value="retirada">Retirada na Loja</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Horário Agendado (HH:MM)</label>
              <Input 
                placeholder="ex: 10:00"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('horarioEntrega')}
              />
              {errors.horarioEntrega && <span className="text-[10px] text-danger font-semibold">{errors.horarioEntrega.message}</span>}
            </div>
          </div>

          {watchedTipoEntrega === 'entrega' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="flex flex-col gap-1 md:col-span-6">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Endereço *</label>
                <Input 
                  placeholder="ex: Av. Dr. Lamartine, 1204"
                  className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                  {...register('enderecoEntrega')}
                />
                {errors.enderecoEntrega && <span className="text-[10px] text-danger font-semibold">{errors.enderecoEntrega.message}</span>}
              </div>
              <div className="flex flex-col gap-1 md:col-span-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Bairro *</label>
                <Input 
                  placeholder="ex: Setor Central"
                  className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                  {...register('bairroEntrega')}
                />
                {errors.bairroEntrega && <span className="text-[10px] text-danger font-semibold">{errors.bairroEntrega.message}</span>}
              </div>
              <div className="flex flex-col gap-1 md:col-span-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Cidade *</label>
                <Input 
                  placeholder="ex: Catalão"
                  className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                  {...register('cidadeEntrega')}
                />
                {errors.cidadeEntrega && <span className="text-[10px] text-danger font-semibold">{errors.cidadeEntrega.message}</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Valor Total (R$) *</label>
              <Input 
                type="number" 
                step="0.01"
                placeholder="ex: 150.00"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('valorTotal', { valueAsNumber: true })}
              />
              {errors.valorTotal && <span className="text-[10px] text-danger font-semibold">{errors.valorTotal.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Forma de Pagamento</label>
              <select 
                className="h-9.5 px-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
                {...register('formaPagamento')}
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="Faturamento 30 dias">Faturamento 30 dias</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Responsável</label>
              <Input 
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...register('responsavel')}
              />
              {errors.responsavel && <span className="text-[10px] text-danger font-semibold">{errors.responsavel.message}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Instruções ou Observações</label>
            <textarea 
              placeholder="ex: Entregar junto com a locação das mesas..."
              rows={2}
              className="p-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
              {...register('observacoes')}
            />
          </div>
        </form>
      </Drawer>

      {/* Drawer: Detalhes do Pedido */}
      <Drawer
        isOpen={selectedPedido !== null}
        onClose={() => {
          setSelectedPedido(null);
          setStatusError('');
        }}
        title={`Pedido ${selectedPedido?.id || ''}`}
      >
        {selectedPedido && (
          <div className="flex flex-col gap-6">
            {statusError && (
              <div className="p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl text-xs font-semibold">
                {statusError}
              </div>
            )}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-sora font-extrabold text-sm text-foreground">{selectedPedido.cliente.nome}</h4>
                  <span className="text-[9px] text-muted-foreground font-mono mt-0.5 block">
                    Data: {new Date(selectedPedido.dataCriacao).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
              <StatusBadge status={selectedPedido.status} />
            </div>

            {/* Carrinho List */}
            <div className="flex flex-col gap-2 bg-background-deep/40 border border-border-subtle p-4 rounded-xl">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Produtos Adquiridos</span>
              <div className="flex flex-col gap-3 mt-2">
                {selectedPedido.itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/15 text-primary border border-primary/15 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {item.quantidade} un.
                      </span>
                      <span className="font-semibold text-foreground-secondary">{item.item?.nome}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">({item.item?.unidade})</span>
                  </div>
                ))}
                {selectedPedido.bebidasPorEscrito && (
                  <div className="text-xs border-t border-border-subtle/50 pt-2 mt-1">
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase mb-1">Anotações de Bebidas (Sem Estoque)</span>
                    <p className="text-foreground-secondary italic leading-relaxed">{selectedPedido.bebidasPorEscrito}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resumo da Logística */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                <Truck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Logística e Despacho</span>
                  <span className="mt-1 block leading-relaxed capitalize font-bold">{selectedPedido.tipoEntrega} ({selectedPedido.horarioEntrega || '09:00'})</span>
                  {selectedPedido.tipoEntrega === 'entrega' && (
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">{selectedPedido.cliente.endereco}, {selectedPedido.cliente.bairro}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                  <CreditCard className="w-4 h-4 text-[#52A3FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Forma Pagamento</span>
                    <span className="mt-1 block leading-relaxed font-semibold">{selectedPedido.formaPagamento || 'Pix'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-foreground-secondary">
                  <User className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[9px] block text-muted-foreground font-mono font-bold uppercase tracking-wider">Responsável Equipe</span>
                    <span className="mt-1 block leading-relaxed font-semibold">{selectedPedido.responsavel || 'Carlos Lima'}</span>
                  </div>
                </div>
              </div>

              {selectedPedido.observacoes && (
                <div className="flex flex-col gap-1 border-t border-border/40 pt-4 mt-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Observações Internas</span>
                  <p className="text-xs text-foreground-secondary leading-relaxed mt-1 bg-background-deep/20 border border-border-subtle p-3 rounded-lg">{selectedPedido.observacoes}</p>
                </div>
              )}

              {/* Total final */}
              <div className="mt-2 border-t border-border/40 pt-4 flex justify-between items-center bg-background-deep/25 p-3 rounded-xl border border-border-subtle">
                <span className="font-sora font-semibold text-xs text-foreground">Valor Pago / Total</span>
                <span className="font-sora font-extrabold text-base text-primary">R$ {(selectedPedido.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-4 pt-4 border-t border-border/40">
              {selectedPedido.status === 'Confirmado' && userProfile && (userProfile.papel === 'administrador' || userProfile.papel === 'atendente') && (
                <Button 
                  disabled={isUpdatingStatus}
                  onClick={async () => {
                    try {
                      setIsUpdatingStatus(true);
                      setStatusError('');
                      await pedidoService.updatePedidoStatus(selectedPedido.id, 'Entregue');
                      await loadData();
                      setSelectedPedido(null);
                    } catch (error: any) {
                      setStatusError(error.message || 'Erro ao marcar como entregue');
                    } finally {
                      setIsUpdatingStatus(false);
                    }
                  }}
                  className="flex-1 bg-success hover:bg-success-strong text-black text-xs font-bold h-9.5 rounded-xl cursor-pointer"
                >
                  {isUpdatingStatus ? 'Atualizando...' : 'Marcar Entregue'}
                </Button>
              )}

              {selectedPedido.status === 'Entregue' && userProfile && (userProfile.papel === 'administrador' || userProfile.papel === 'atendente') && selectedPedido.itens.some(i => i.item?.tipo === 'locacao') && (
                <Button 
                  disabled={isUpdatingStatus}
                  onClick={async () => {
                    try {
                      setIsUpdatingStatus(true);
                      setStatusError('');
                      await pedidoService.updatePedidoStatus(selectedPedido.id, 'Finalizado');
                      await loadData();
                      setSelectedPedido(null);
                    } catch (error: any) {
                      setStatusError(error.message || 'Erro ao finalizar pedido');
                    } finally {
                      setIsUpdatingStatus(false);
                    }
                  }}
                  className="flex-1 bg-[#52A3FF] hover:bg-[#3d8be0] text-white text-xs font-bold h-9.5 rounded-xl cursor-pointer"
                >
                  {isUpdatingStatus ? 'Atualizando...' : 'Finalizar Pedido'}
                </Button>
              )}
              
              {selectedPedido.status === 'Confirmado' && userProfile && userProfile.papel !== 'operacao' && (
                <Button 
                  onClick={() => {
                    setEditingPedido(selectedPedido);
                    setSelectedPedido(null);
                    setIsNewModalOpen(true);
                  }}
                  className="flex-1 bg-primary hover:bg-primary-strong text-black text-xs font-bold h-9.5 rounded-xl cursor-pointer"
                >
                  Editar Pedido
                </Button>
              )}
              {userProfile && userProfile.papel === 'administrador' && (
                <Button 
                  onClick={() => setPedidoToDelete(selectedPedido)}
                  variant="outline"
                  className="flex-1 border-danger text-danger hover:bg-danger/10 text-xs font-bold h-9.5 rounded-xl cursor-pointer"
                >
                  Excluir pedido
                </Button>
              )}
              <Button 
                onClick={() => {
                  setSelectedPedido(null);
                  setStatusError('');
                }}
                variant="outline"
                className="text-xs font-semibold h-9.5 px-4 rounded-xl cursor-pointer"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal de Confirmação de Exclusão */}
      <Drawer 
        isOpen={pedidoToDelete !== null} 
        onClose={() => {
          if (!isDeletingPedido) setPedidoToDelete(null);
        }}
        title="Excluir este pedido?"
      >
        <div className="flex flex-col gap-6 p-6 h-full justify-between">
          <div className="flex flex-col items-center text-center gap-4 mt-6">
            <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center text-danger">
              <Trash2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Esta ação removerá o pedido e desfará seus efeitos operacionais no estoque e na agenda. Essa ação não poderá ser desfeita.
            </p>
            {statusError && (
              <div className="p-3 mt-4 w-full bg-danger/10 text-danger border border-danger/20 rounded-xl text-xs font-semibold text-left">
                {statusError}
              </div>
            )}
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={() => {
                setPedidoToDelete(null);
                setStatusError('');
              }}
              variant="outline"
              disabled={isDeletingPedido}
              className="flex-1 h-11 rounded-xl cursor-pointer font-semibold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={isDeletingPedido}
              className="flex-1 bg-danger hover:bg-danger/80 text-white font-bold h-11 rounded-xl cursor-pointer shadow-[0_0_15px_rgba(255,0,0,0.15)]"
            >
              {isDeletingPedido ? 'Excluindo...' : 'Excluir pedido'}
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Modal de Estoque Insuficiente */}
      <Drawer 
        isOpen={isInsufficientStockModalOpen} 
        onClose={() => setIsInsufficientStockModalOpen(false)}
        title="Estoque insuficiente"
      >
        <div className="flex flex-col gap-6 p-6 h-full justify-between items-center text-center">
          <div className="flex flex-col items-center gap-4 mt-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <PackageX className="w-8 h-8" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Não há quantidade disponível suficiente deste item para concluir o pedido. Verifique a quantidade solicitada e tente novamente.
            </p>
          </div>
          <Button 
            onClick={() => setIsInsufficientStockModalOpen(false)}
            className="w-full bg-primary hover:bg-primary-strong text-black font-bold h-11 rounded-xl cursor-pointer"
          >
            Entendi
          </Button>
        </div>
      </Drawer>

    </div>
    </>
  );
}

export default function PedidosPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-background text-xs text-muted-foreground font-mono">
        Carregando Central de Pedidos...
      </div>
    }>
      <PedidosContent />
    </Suspense>
  );
}
