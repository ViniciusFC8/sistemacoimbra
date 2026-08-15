'use client';

import React from 'react';
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
import { UserMenu } from './UserMenu';
import { BrandLogo } from '../shared/BrandLogo';

const groups = [
  {
    title: 'Operação',
    items: [
      { name: 'Visão geral', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Agenda', href: '/agenda', icon: CalendarDays },
      { name: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
      { name: 'Locações', href: '/locacoes', icon: Armchair },
    ]
  },
  {
    title: 'Cadastros',
    items: [
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Estoque', href: '/estoque', icon: Boxes },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Configurações', href: '/configuracoes', icon: Settings },
    ]
  }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-border/60 shadow-[4px_0_24px_rgba(0,0,0,0.3)] z-30">
      {/* Logo Area */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-border/40 mb-6 bg-background-deep/20">
        <BrandLogo variant="monogram" width={34} height={34} priority />
        <div className="flex flex-col">
          <span className="text-foreground font-sora font-semibold tracking-tight text-xs">Comercial Coimbra</span>
          <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Gestão operacional</span>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="flex flex-1 flex-col px-4 gap-6 overflow-y-auto pb-4">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-1">
              {group.title}
            </span>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-x-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 relative overflow-hidden',
                      isActive
                        ? 'bg-primary/5 text-primary border-l-2 border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
                        : 'text-foreground-secondary hover:bg-surface-elevated/40 hover:text-foreground border-l-2 border-transparent'
                    )}
                  >
                    {/* Subtle dot indicator sliding */}
                    {isActive && (
                      <span className="absolute right-3.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#00C97D]" />
                    )}
                    <item.icon
                      className={cn(
                        'h-4.5 w-4.5 shrink-0 transition-transform duration-200',
                        isActive 
                          ? 'text-primary' 
                          : 'text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Area */}
      <div className="mt-auto p-4 border-t border-border/40 bg-background-deep/10">
        <UserMenu />
      </div>
    </div>
  );
}
