'use client';

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, LogOut, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export function UserMenu() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ nome: string; papel: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('nome, papel')
            .eq('id', user.id)
            .single();
          if (data) {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Erro no logout:', err);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'administrador':
        return 'Administrador';
      case 'atendente':
        return 'Atendente';
      case 'operacao':
        return 'Operação';
      default:
        return 'Operador';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3 text-left transition-all duration-150 hover:bg-surface-hover hover:border-border-strong focus:outline-none focus:ring-2 focus:ring-primary/30">
          <div className="relative">
            <Avatar className="h-9.5 w-9.5 border border-border-strong">
              <AvatarFallback className="bg-background-deep text-primary font-sora font-bold text-xs">
                {profile ? getInitials(profile.nome) : 'US'}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-surface-elevated status-pulse" />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-sora font-semibold text-foreground">
              {profile ? profile.nome : 'Carregando...'}
            </span>
            <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {profile ? getRoleLabel(profile.papel) : 'Carregando...'}
            </span>
          </div>
          <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-surface-elevated text-foreground border-border rounded-xl shadow-2xl p-1.5">
        <DropdownMenuLabel className="font-sora font-semibold text-xs text-muted-foreground px-2.5 py-2">Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50 my-1" />
        <DropdownMenuItem className="focus:bg-surface-hover focus:text-foreground text-foreground-secondary text-xs rounded-lg px-2.5 py-2 cursor-pointer flex items-center transition-colors" onClick={() => router.push('/configuracoes')}>
          <Settings className="mr-2.5 h-4 w-4 text-muted-foreground" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="focus:bg-danger/10 focus:text-[#FF5B64] text-foreground-secondary text-xs rounded-lg px-2.5 py-2 cursor-pointer flex items-center transition-colors" onClick={handleLogout}>
          <LogOut className="mr-2.5 h-4 w-4 text-[#FF5B64]/80" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
