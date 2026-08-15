'use client';

import React, { useState } from 'react';
import { Menu, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ShoppingCart,
  Armchair,
  Boxes,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserMenu } from './UserMenu';
import { BrandLogo } from '../shared/BrandLogo';
import { dashboardService } from '@/services/dashboard.service';
import { clienteService } from '@/services/cliente.service';
import { pedidoService } from '@/services/pedido.service';
import { GlobalSearchClienteResult, GlobalSearchPedidoResult } from '@/types';

const navigation = [
  { name: 'Visão geral', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Clientes', href: '/clientes', icon: Users },
  { name: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { name: 'Locações', href: '/locacoes', icon: Armchair },
  { name: 'Estoque', href: '/estoque', icon: Boxes },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [clientesResult, setClientesResult] = useState<GlobalSearchClienteResult[]>([]);
  const [pedidosResult, setPedidosResult] = useState<GlobalSearchPedidoResult[]>([]);
  const [locacoesResult, setLocacoesResult] = useState<GlobalSearchPedidoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  const notificationsContainerRef = React.useRef<HTMLDivElement>(null);

  // Load notifications from dashboardService
  React.useEffect(() => {
    const loadNotifications = async () => {
      try {
        const alerts = await dashboardService.getAlertasOperacionais();
        setNotifications(alerts);
      } catch (e) {
        console.error(e);
      }
    };
    loadNotifications();
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsContainerRef.current && !notificationsContainerRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      const timeoutId = setTimeout(() => {
        setClientesResult([]);
        setPedidosResult([]);
        setLocacoesResult([]);
        setSearchError('');
        setIsSearching(false);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    let isActive = true;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const [cData, pData] = await Promise.all([
          clienteService.searchClientes(q),
          pedidoService.searchPedidos(q)
        ]);

        if (isActive) {
          setClientesResult(cData);
          setPedidosResult(pData.filter(p => !p.possuiLocacao));
          setLocacoesResult(pData.filter(p => p.possuiLocacao));
        }
      } catch (err: any) {
        if (isActive) {
          console.error('Erro na busca global:', err);
          setSearchError('Ocorreu um erro na busca.');
        }
      } finally {
        if (isActive) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      
      // Focus the sidebar container when it opens
      setTimeout(() => {
        sidebarRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
          return;
        }

        if (e.key === 'Tab' && sidebarRef.current) {
          const focusableElements = sidebarRef.current.querySelectorAll(
            'a, button, [tabindex="0"]'
          );
          if (focusableElements.length === 0) return;
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore focus to the trigger button when it closes
      triggerRef.current?.focus();
    }
  }, [mobileMenuOpen]);

  const dataAtual = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const dataFormatada = dataAtual.charAt(0).toUpperCase() + dataAtual.slice(1);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b border-border bg-sidebar/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 inner-highlight">
        {/* Mobile menu trigger */}
        <Button
          ref={triggerRef}
          variant="ghost"
          className="h-11 w-11 -ml-2 text-muted-foreground lg:hidden flex items-center justify-center rounded-lg"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="flex flex-1 items-center justify-between gap-x-4 lg:gap-x-6">
          {/* Title */}
          <div className="flex flex-col">
            <h1 className="text-base font-sora font-bold text-foreground leading-none">{title}</h1>
          </div>

          {/* Global Search (Visual Search) */}
          <div ref={searchContainerRef} className="hidden md:flex items-center flex-1 max-w-xs xl:max-w-md relative mx-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="Buscar cliente, pedido ou locação..."
              className="w-full h-8 pl-9 pr-4 rounded-lg border border-border/80 bg-background-deep text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-150"
            />
            
            {isFocused && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                {searchQuery.trim().length < 2 ? (
                  <div className="p-4 text-muted-foreground text-center">Digite pelo menos 2 caracteres...</div>
                ) : isSearching ? (
                  <div className="p-4 text-muted-foreground text-center flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                    Buscando...
                  </div>
                ) : searchError ? (
                  <div className="p-4 text-danger text-center">{searchError}</div>
                ) : clientesResult.length === 0 && pedidosResult.length === 0 && locacoesResult.length === 0 ? (
                  <div className="p-4 text-muted-foreground text-center">Nenhum resultado encontrado.</div>
                ) : (
                  <div className="flex flex-col p-2 gap-2">
                    {/* Clientes */}
                    {clientesResult.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono border-b border-border/40">
                          Clientes
                        </div>
                        {clientesResult.map(c => (
                          <Link 
                            key={c.id} 
                            href={`/clientes?search=${encodeURIComponent(c.nome)}`}
                            onClick={() => {
                              setSearchQuery('');
                              setIsFocused(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover/60 transition-colors text-foreground decoration-transparent hover:text-primary"
                          >
                            <span className="font-bold truncate">{c.nome}</span>
                            <span className="text-[10px] text-muted-foreground">{c.telefone || ''}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Pedidos */}
                    {pedidosResult.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono border-b border-border/40">
                          Pedidos
                        </div>
                        {pedidosResult.map(p => (
                          <Link 
                            key={p.id} 
                            href={`/pedidos?edit=${p.id}`}
                            onClick={() => {
                              setSearchQuery('');
                              setIsFocused(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover/60 transition-colors text-foreground decoration-transparent hover:text-primary"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold truncate">{p.clienteNome}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              {p.valorTotal !== undefined && p.valorTotal !== null && (
                                <span className="font-mono font-bold text-primary text-[10px]">R$ {p.valorTotal.toFixed(2)}</span>
                              )}
                              <span className="text-[8px] px-1 rounded bg-surface/80 border border-border-subtle text-foreground scale-90 origin-right">{p.status}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Locações */}
                    {locacoesResult.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-wider font-mono border-b border-border/40">
                          Locações
                        </div>
                        {locacoesResult.map(l => (
                          <Link 
                            key={l.id} 
                            href={`/locacoes?pedido=${l.id}`}
                            onClick={() => {
                              setSearchQuery('');
                              setIsFocused(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover/60 transition-colors text-foreground decoration-transparent hover:text-primary"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold truncate">{l.clienteNome}</span>
                            </div>
                            <span className="text-[8px] px-1 rounded bg-surface/80 border border-border-subtle text-foreground">{l.status}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right Header items */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <span className="text-xs text-muted-foreground font-medium hidden xl:inline-block">{dataFormatada}</span>
            
            <div ref={notificationsContainerRef} className="relative">
              <Button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-8 w-8 text-foreground-secondary hover:bg-surface-hover hover:text-foreground rounded-lg relative border border-transparent hover:border-border transition-all",
                  isNotificationsOpen && "bg-surface-hover border-border text-foreground"
                )}
              >
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-danger status-pulse"></span>
                )}
                <Bell className="h-4.5 w-4.5" aria-hidden="true" />
                <span className="sr-only">Ver notificações</span>
              </Button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between p-4 border-b border-border/40 bg-surface/30">
                    <h4 className="font-sora font-bold text-sm text-foreground">Notificações</h4>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-[10px] font-bold text-primary hover:text-primary-strong transition-colors cursor-pointer"
                      >
                        Limpar tudo
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                        <Bell className="h-8 w-8 text-muted-foreground/30 stroke-[1.5]" />
                        <span className="font-medium text-xs">Nenhuma notificação no momento</span>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((n) => (
                          <div 
                            key={n.id} 
                            className="p-4 border-b border-border/40 hover:bg-surface-hover/30 transition-colors flex gap-3 group relative"
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              n.tipo === 'critico' ? 'bg-danger' : n.tipo === 'atencao' ? 'bg-warning' : 'bg-primary'
                            )} />
                            <div className="flex flex-col gap-1 pr-4 min-w-0">
                              <span className="font-bold text-foreground truncate">{n.titulo}</span>
                              <span className="text-[10px] text-muted-foreground leading-relaxed">{n.descricao}</span>
                              {n.tempoInfo && (
                                <span className="text-[9px] text-muted-foreground/60 font-mono mt-1">{n.tempoInfo}</span>
                              )}
                            </div>
                            
                            <button 
                              onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer p-0.5"
                            >
                              <span className="text-xs font-bold font-sans">×</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="hidden lg:block lg:h-5 lg:w-px lg:bg-border" aria-hidden="true" />
            
            <div className="flex items-center gap-x-4 lg:hidden">
              <BrandLogo variant="monogram" width={32} height={32} priority />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Navigation Sidebar */}
      <div 
        ref={sidebarRef}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-border p-5 transition-transform duration-300 ease-in-out lg:hidden flex flex-col focus:outline-none shadow-2xl",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BrandLogo variant="monogram" width={34} height={34} priority />
            <span className="text-foreground font-sora font-semibold text-xs">Gestão Coimbra</span>
          </div>
          
          <Button
            variant="ghost"
            className="h-10 w-10 text-muted-foreground flex items-center justify-center rounded-lg hover:bg-surface-hover hover:text-foreground cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <span className="text-sm">✕</span>
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'group flex items-center gap-x-4 rounded-lg px-4 py-3.5 text-sm font-semibold tracking-wide transition-all duration-150',
                  isActive
                    ? 'bg-primary/5 text-primary border-l-2 border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                    : 'text-foreground-secondary hover:bg-surface-hover/40 hover:text-foreground border-l-2 border-transparent'
                )}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-auto pt-4 border-t border-border">
          <UserMenu />
        </div>
      </div>
    </>
  );
}
