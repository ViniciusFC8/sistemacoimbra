'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertCircle, 
  Sliders,
  Wrench,
  Edit
} from 'lucide-react';
import { estoqueService } from '@/services/estoque.service';
import { ItemEstoque, StatusEstoque } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer } from '@/components/shared/Drawer';
import { cn } from '@/lib/utils';

const itemSchema = z.object({
  nome: z.string().min(3, 'Nome do item deve ter no mínimo 3 caracteres'),
  quantidade: z.number().min(0, 'Quantidade inválida'),
  categoria: z.enum(['Mesas', 'Cadeiras', 'Freezers'], { errorMap: () => ({ message: 'Categoria é obrigatória' }) })
});

type ItemFormValues = z.infer<typeof itemSchema>;

// Form validation schema for quick stock adjust
const adjustSchema = z.object({
  quantidade: z.number().min(0, 'Quantidade deve ser maior ou igual a zero'),
  motivo: z.string().min(4, 'Insira um motivo de no mínimo 4 caracteres')
});

type AdjustFormValues = z.infer<typeof adjustSchema>;

export default function EstoquePage() {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Focused exclusively on rental fleet ('locacao')
  const [activeTab] = useState<'locacao' | 'venda'>('locacao');

  // Modais/Drawers state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemEstoque | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<ItemEstoque | null>(null);

  const { register: registerItem, handleSubmit: handleSubmitItem, reset: resetItem, formState: { errors: itemErrors } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      quantidade: 0
    }
  });

  const { register: registerAdjust, handleSubmit: handleSubmitAdjust, reset: resetAdjust, setValue: setAdjustValue, formState: { errors: adjustErrors } } = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema)
  });

  const loadData = async () => {
    try {
      setErrorMessage(null);
      setIsLoading(true);
      const data = await estoqueService.getEstoque();
      setEstoque(data);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao carregar itens do estoque.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('papel')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.papel);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar perfil do usuário:', err);
    }
  };

  useEffect(() => {
    loadData();
    fetchUserRole();
  }, []);

  // Filtered list based on search and active tab
  const filteredEstoque = estoque.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.categoria && item.categoria.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = item.tipo === activeTab;
    return matchesSearch && matchesTab;
  });

  // Create or Update item submit handler
  const onSubmitItem = async (data: ItemFormValues) => {
    try {
      setErrorMessage(null);
      if (editingItem) {
        await estoqueService.updateItem(editingItem.id!, {
          nome: data.nome,
          categoria: data.categoria
        });
      } else {
        await estoqueService.createItem({
          nome: data.nome,
          tipo: 'locacao',
          categoria: data.categoria,
          unidade: 'Unidade',
          quantidade: data.quantidade
        });
      }
      await loadData();
      setIsNewModalOpen(false);
      setEditingItem(null);
      resetItem({ quantidade: 0, nome: '', categoria: '' as any });
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao salvar item');
    }
  };

  const handleOpenEdit = (item: ItemEstoque) => {
    setEditingItem(item);
    resetItem({
      nome: item.nome,
      categoria: (item.categoria as any) || ('' as any),
      quantidade: item.quantidade // Kept to satisfy form validation, but input will be disabled
    });
    setIsNewModalOpen(true);
  };

  // Adjust stock quantity submit handler
  const onSubmitAdjust = async (data: AdjustFormValues) => {
    if (!adjustingItem) return;
    try {
      setErrorMessage(null);
      await estoqueService.adjustStock({
        itemId: adjustingItem.id!,
        quantidadeAnterior: adjustingItem.quantidade,
        quantidadeNova: data.quantidade,
        motivo: data.motivo
      });
      await loadData();
      setAdjustingItem(null);
      resetAdjust();
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao ajustar estoque');
      setAdjustingItem(null);
    }
  };

  const handleOpenAdjust = (item: ItemEstoque) => {
    setAdjustingItem(item);
    setAdjustValue('quantidade', item.quantidade);
  };

  // Count alerts and total fleet
  const totalFleetItems = estoque.filter(i => i.tipo === 'locacao').reduce((sum, item) => sum + item.quantidade, 0);
  const maintenanceAlerts = estoque.filter(i => i.tipo === 'locacao' && i.manutencao && i.manutencao > 0).length;

  return (
    <>
      <AppHeader title="Estoque" />
      <div className="flex flex-col gap-6 p-6 max-md:p-4 min-h-[calc(100vh-3.5rem)] bg-background animate-fade-in">
      
      {errorMessage && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4 shrink-0 bg-card border border-border p-5 rounded-2xl inner-highlight tech-grid relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sora font-extrabold text-xl text-foreground tracking-tight">Frota de Locação</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Gestão de frotas de equipamentos para locação (mesas, cadeiras e freezers).</p>
          </div>
        </div>
        {userRole && userRole !== 'atendente' && (
          <Button 
            onClick={() => {
              setEditingItem(null);
              resetItem({ quantidade: 0, nome: '', categoria: '' as any });
              setIsNewModalOpen(true);
            }}
            className="bg-primary hover:bg-primary-strong text-black font-bold h-10 px-4 rounded-xl border border-primary/10 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,201,125,0.15)] max-md:w-full max-md:justify-center z-10"
          >
            <Plus className="w-4 h-4" /> Novo Item
          </Button>
        )}
      </div>

      {/* Grid de Alertas de Disponibilidade */}
      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1">
        <div className="bg-card border border-border p-5 rounded-2xl inner-highlight flex items-center gap-4 transition-colors">
          <div className="p-3 rounded-xl border bg-primary-muted text-primary border-primary/10">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Total de Equipamentos na Frota</span>
            <span className="font-sora font-extrabold text-2xl text-foreground mt-1">
              {totalFleetItems} unidades
            </span>
          </div>
        </div>

        <div className={cn(
          "bg-card border p-5 rounded-2xl inner-highlight flex items-center gap-4 transition-colors",
          maintenanceAlerts > 0 ? "border-warning/20 bg-warning/5" : "border-border"
        )}>
          <div className={cn(
            "p-3 rounded-xl border",
            maintenanceAlerts > 0 ? "bg-warning/10 text-warning border-warning/15" : "bg-primary-muted text-primary border-primary/10"
          )}>
            <Wrench className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Locação em Manutenção</span>
            <span className="font-sora font-extrabold text-2xl text-foreground mt-1">
              {maintenanceAlerts} {maintenanceAlerts === 1 ? 'item retido' : 'itens retidos'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-card border border-border rounded-2xl inner-highlight p-5 flex flex-col gap-5">
        {/* Search */}
        <div className="flex justify-between items-center gap-4 max-md:flex-col max-md:items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={`Buscar por nome ou categoria em ${activeTab === 'locacao' ? 'locação' : 'vendas'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs bg-background-deep border-border/80 focus:border-primary/40 focus:ring-0 rounded-xl"
            />
          </div>
          <span className="text-[10px] font-mono font-bold bg-background-deep border border-border-subtle text-muted-foreground px-3 py-1.5 rounded-xl text-center">
            {filteredEstoque.length} {filteredEstoque.length === 1 ? 'item listado' : 'itens listados'}
          </span>
        </div>

        {/* Desktop Tabela */}
        <div className="overflow-x-auto max-md:hidden border border-border-subtle rounded-xl bg-background-deep/15">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-sidebar/25 text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                <th className="p-4 pl-5">Item</th>
                <th className="p-4">Categoria</th>
                {activeTab === 'venda' ? (
                  <>
                    <th className="p-4 text-center">Unidade</th>
                    <th className="p-4 text-center">Estoque Mínimo</th>
                    <th className="p-4 text-center">Quantidade Atual</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 text-center">Total</th>
                    <th className="p-4 text-center text-primary">Disponível</th>
                    <th className="p-4 text-center text-success">Alugado</th>
                    <th className="p-4 text-center text-[#52A3FF]">Reservado</th>
                    <th className="p-4 text-center text-danger">Manutenção</th>
                  </>
                )}
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstoque.map((i) => {
                const perc = i.quantidade > 0 ? Math.round(((i.alugado || 0) / i.quantidade) * 100) : 0;
                return (
                  <tr 
                    key={i.id}
                    className="border-b border-border-subtle/50 last:border-0 hover:bg-surface-elevated/15 transition-colors text-xs"
                  >
                    <td className="p-4 pl-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-sora font-bold text-sm text-foreground truncate max-w-[250px]">{i.nome}</span>
                        {activeTab === 'locacao' && (
                          <div className="mt-2 w-full max-w-[200px] flex flex-col gap-1.5">
                            <div className="w-full h-1.5 bg-background-deep border border-border-subtle/50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-success transition-all duration-1000 ease-out"
                                style={{ width: `${perc}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-mono font-bold text-muted-foreground">{perc}% alugado</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-border bg-surface text-muted-foreground">
                        {i.categoria || 'Geral'}
                      </span>
                    </td>
                    {activeTab === 'venda' ? (
                      <>
                        <td className="p-4 text-center text-foreground-secondary">{i.unidade}</td>
                        <td className="p-4 text-center font-mono font-semibold text-muted-foreground">{i.estoqueMinimo || 10}</td>
                        <td className="p-4 text-center font-mono font-bold text-foreground">{i.quantidade}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-center">
                          <span className="font-sora text-base font-bold text-foreground">{i.quantidade}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-sora text-base font-bold text-primary">{i.disponivel || 0}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-sora text-base font-bold text-success">{i.alugado || 0}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-sora text-base font-bold text-[#52A3FF]">{i.reservado || 0}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-sora text-base font-bold text-danger">{i.manutencao || 0}</span>
                        </td>
                      </>
                    )}
                    <td className="p-4 text-center">
                      <span className={cn(
                        "text-[9px] font-bold font-mono px-2 py-0.5 rounded border block w-fit mx-auto",
                        i.status === 'Disponível' && 'bg-primary-muted border-primary/10 text-primary',
                        i.status === 'Estoque baixo' && 'bg-warning/10 border-warning/10 text-warning',
                        i.status === 'Indisponível' && 'bg-danger/10 border-danger/10 text-[#FF5B64]'
                      )}>
                        {i.status}
                      </span>
                    </td>
                    <td className="p-4 pr-5 text-right">
                      {userRole && userRole !== 'atendente' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenEdit(i)}
                            className="p-1 rounded-lg border border-border-subtle hover:border-primary/30 bg-surface text-muted-foreground hover:text-primary transition-all duration-150 active:scale-90 cursor-pointer"
                            title="Editar Item"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleOpenAdjust(i)}
                            className="p-1 rounded-lg border border-border-subtle hover:border-primary/30 bg-surface text-muted-foreground hover:text-primary transition-all duration-150 active:scale-90 cursor-pointer"
                            title="Ajustar Quantidade"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-xs font-mono">
              Carregando itens...
            </div>
          ) : filteredEstoque.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-xs leading-relaxed">
              Nenhum item em estoque correspondente.
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="hidden max-md:flex flex-col gap-4">
          {filteredEstoque.map((i) => {
            const perc = i.quantidade > 0 ? Math.round(((i.alugado || 0) / i.quantidade) * 100) : 0;
            return (
              <div 
                key={i.id}
                className="bg-surface-elevated/15 border border-border-subtle p-5 rounded-2xl flex flex-col gap-4 relative shadow-sm"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col min-w-0">
                    <span className="font-sora font-bold text-base text-foreground truncate">{i.nome}</span>
                    <span className="text-[11px] text-muted-foreground font-mono mt-1 px-2 py-0.5 rounded border border-border-subtle bg-background w-fit">
                      {i.categoria || 'Geral'}
                    </span>
                  </div>
                  {userRole && userRole !== 'atendente' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenEdit(i)}
                        className="p-2 rounded-xl border border-border-subtle hover:border-primary/30 bg-surface text-muted-foreground hover:text-primary transition-all duration-150 cursor-pointer"
                        title="Editar Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenAdjust(i)}
                        className="p-2 rounded-xl border border-border-subtle hover:border-primary/30 bg-surface text-muted-foreground hover:text-primary transition-all duration-150 cursor-pointer"
                        title="Ajustar Quantidade"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {activeTab === 'venda' ? (
                  <div className="flex items-center justify-between border-t border-border-subtle/50 pt-3 text-sm">
                    <span className="text-muted-foreground font-mono text-xs">QTD: <span className="font-bold text-foreground text-sm">{i.quantidade}</span> {i.unidade}</span>
                    <span className={cn(
                      "text-[10px] font-bold font-mono px-2 py-1 rounded border",
                      i.status === 'Disponível' && 'bg-primary-muted border-primary/10 text-primary',
                      i.status === 'Estoque baixo' && 'bg-warning/10 border-warning/10 text-warning',
                      i.status === 'Indisponível' && 'bg-danger/10 border-danger/10 text-[#FF5B64]'
                    )}>
                      {i.status}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 border-t border-border-subtle/50 pt-4">
                    <div className="flex justify-between items-center bg-background/50 p-2.5 rounded-xl border border-border-subtle">
                      <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">Total Frota</span>
                      <span className="font-sora text-base font-bold text-foreground">{i.quantidade} un</span>
                    </div>
                    {/* Availability breakdown 2x2 */}
                    <div className="grid grid-cols-2 gap-3 text-center font-mono">
                      <div className="flex flex-col justify-center bg-background-deep/50 p-3 rounded-xl border border-border-subtle shadow-sm">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Disponível</span>
                        <span className="text-primary font-sora font-extrabold text-xl">{i.disponivel || 0}</span>
                      </div>
                      <div className="flex flex-col justify-center bg-background-deep/50 p-3 rounded-xl border border-border-subtle shadow-sm">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Reservado</span>
                        <span className="text-[#52A3FF] font-sora font-extrabold text-xl">{i.reservado || 0}</span>
                      </div>
                      <div className="flex flex-col justify-center bg-background-deep/50 p-3 rounded-xl border border-border-subtle shadow-sm">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Alugado</span>
                        <span className="text-success font-sora font-extrabold text-xl">{i.alugado || 0}</span>
                      </div>
                      <div className="flex flex-col justify-center bg-background-deep/50 p-3 rounded-xl border border-border-subtle shadow-sm">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-1">Manutenção</span>
                        <span className="text-danger font-sora font-extrabold text-xl">{i.manutencao || 0}</span>
                      </div>
                    </div>
                    
                    {/* Animated Progress Bar */}
                    <div className="mt-1 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Ocupação</span>
                        <span className="text-[11px] font-mono font-bold text-success">{perc}% alugado</span>
                      </div>
                      <div className="w-full h-2.5 bg-background-deep border border-border-subtle/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all duration-1000 ease-out"
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[250px]">
              <span className="text-xs font-semibold text-foreground">Carregando itens...</span>
            </div>
          ) : filteredEstoque.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-background-deep/30 rounded-xl border border-border-subtle min-h-[250px]">
              <Boxes className="h-6 w-6 text-muted-foreground mb-3" />
              <span className="text-xs font-semibold text-foreground">Nenhum item listado</span>
              <span className="text-[10px] text-muted-foreground mt-1">Sem itens sob esta categoria no momento.</span>
            </div>
          )}
        </div>

      </div>

      {/* Drawer: Novo/Editar Item */}
      <Drawer
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title={editingItem ? 'Editar Item de Locação' : 'Cadastrar Item de Locação'}
        footer={
          <>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsNewModalOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-surface"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmitItem(onSubmitItem)}
              className="bg-primary hover:bg-primary-strong text-black font-bold h-9 px-4 rounded-xl border border-primary/10 flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(0,201,125,0.15)]"
            >
              {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
            </Button>
          </>
        }
      >
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nome do Item *</label>
            <Input 
              placeholder="ex: Mesa plástica, Cadeira, Freezer horizontal"
              className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
              {...registerItem('nome')}
            />
            {itemErrors.nome && <span className="text-[10px] text-danger font-semibold">{itemErrors.nome.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Quantidade Inicial *</label>
              <Input 
                type="number"
                placeholder="ex: 150"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border disabled:opacity-50"
                disabled={!!editingItem}
                {...registerItem('quantidade', { valueAsNumber: true })}
              />
              {itemErrors.quantidade && <span className="text-[10px] text-danger font-semibold">{itemErrors.quantidade.message}</span>}
              {editingItem && <span className="text-[9px] text-muted-foreground">Utilize o botão de ajuste para alterar a quantidade.</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Categoria *</label>
              <select 
                className="h-9.5 px-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
                {...registerItem('categoria')}
              >
                <option value="" disabled>Selecione...</option>
                <option value="Mesas">Mesas</option>
                <option value="Cadeiras">Cadeiras</option>
                <option value="Freezers">Freezers</option>
              </select>
              {itemErrors.categoria && <span className="text-[10px] text-danger font-semibold">{itemErrors.categoria.message}</span>}
            </div>
          </div>
        </form>
      </Drawer>

      {/* Drawer: Ajustar quantidade rápida */}
      <Drawer
        isOpen={adjustingItem !== null}
        onClose={() => setAdjustingItem(null)}
        title={adjustingItem ? `Ajustar estoque: ${adjustingItem.nome}` : ''}
        footer={
          <>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setAdjustingItem(null)}
              className="h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-surface"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmitAdjust(onSubmitAdjust)}
              className="bg-primary hover:bg-primary-strong text-black font-bold h-9 px-4 rounded-xl border border-primary/10 flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(0,201,125,0.15)]"
            >
              Confirmar Ajuste
            </Button>
          </>
        }
      >
        {adjustingItem && (
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 bg-background-deep/40 border border-border-subtle p-3.5 rounded-xl">
              <span className="text-[9px] text-muted-foreground font-mono font-bold uppercase tracking-wider">Unidade Cadastrada</span>
              <span className="text-xs text-foreground mt-1 font-semibold">{adjustingItem.unidade}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nova Quantidade Total *</label>
              <Input 
                type="number"
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border"
                {...registerAdjust('quantidade', { valueAsNumber: true })}
              />
              {adjustErrors.quantidade && <span className="text-[10px] text-danger font-semibold">{adjustErrors.quantidade.message}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Motivo da Alteração *</label>
              <textarea 
                placeholder="ex: Contagem física do estoque, reposição de perdas, quebra de móveis, etc."
                rows={3}
                className="p-3 text-xs bg-background-deep text-foreground border border-border rounded-xl focus:outline-none focus:border-primary/45"
                {...registerAdjust('motivo')}
              />
              {adjustErrors.motivo && <span className="text-[10px] text-danger font-semibold">{adjustErrors.motivo.message}</span>}
            </div>
          </form>
        )}
      </Drawer>

    </div>
    </>
  );
}
