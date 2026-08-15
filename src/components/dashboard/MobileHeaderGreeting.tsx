'use client';

import React, { useEffect, useState } from 'react';

export function MobileHeaderGreeting() {
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [greeting, setGreeting] = useState('Bom dia, Coimbra');

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      
      const now = new Date();
      const weekdays = [
        'DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA',
        'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'
      ];
      const months = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
      ];

      try {
        const tzString = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
        const tzDate = new Date(tzString);
        
        const weekday = weekdays[tzDate.getDay()];
        const day = tzDate.getDate().toString().padStart(2, '0');
        const month = months[tzDate.getMonth()];
        setDateStr(`${weekday}, ${day} DE ${month}`);
        
        const hour = tzDate.getHours();
        if (hour >= 12 && hour < 18) {
          setGreeting('Boa tarde, Coimbra');
        } else if (hour >= 18 || hour < 6) {
          setGreeting('Boa noite, Coimbra');
        } else {
          setGreeting('Bom dia, Coimbra');
        }
      } catch {
        // Fallback sem fuso forçado, usando o horário local do cliente
        const fallbackDateStr = `${weekdays[now.getDay()]}, ${now.getDate()} DE ${months[now.getMonth()]}`;
        setDateStr(fallbackDateStr || 'BEM-VINDO');
        
        const hour = now.getHours();
        if (hour >= 12 && hour < 18) {
          setGreeting('Boa tarde, Coimbra');
        } else if (hour >= 18 || hour < 6) {
          setGreeting('Boa noite, Coimbra');
        } else {
          setGreeting('Bom dia, Coimbra');
        }
      }
    }, 0);
    
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    // Renderiza esqueleto para evitar CLS e erro de hidratação
    return (
      <div className="flex flex-col gap-1.5 animate-pulse">
        <div className="h-3.5 w-32 bg-border-subtle rounded-md" />
        <div className="h-7 w-48 bg-border-subtle rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-mono">
        {dateStr}
      </span>
      <h2 className="text-xl font-sora font-extrabold tracking-tight text-foreground">
        {greeting}
      </h2>
    </div>
  );
}
