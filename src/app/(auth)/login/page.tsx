'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Truck, Package, Calendar, RefreshCw, Wine, Armchair, Snowflake } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BrandLogo } from '@/components/shared/BrandLogo';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';

const loginSchema = z.object({
  email: z.string().email({ message: 'Digite um e-mail válido' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres' }),
  remember: z.boolean().default(false).optional(),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const [isManual, setIsManual] = useState(false);
  const [temp, setTemp] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (isManual) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      setActiveService((prev) => (prev + 1) % 4);
    }, 4500);

    return () => clearInterval(interval);
  }, [isManual]);

  React.useEffect(() => {
    if (activeService !== 2) return;
    setTemp(20);
    const interval = setInterval(() => {
      setTemp((prev) => {
        if (prev <= -2) {
          clearInterval(interval);
          return -2;
        }
        return prev - 2;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [activeService]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });

      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials' 
            ? 'Credenciais de login inválidas' 
            : error.message
        );
        return;
      }

      // Check profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('ativo')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setErrorMessage('Perfil não encontrado no sistema.');
        return;
      }

      if (!profile.ativo) {
        await supabase.auth.signOut();
        setErrorMessage('Sua conta está desativada. Entre em contato com o administrador.');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (e) {
      setErrorMessage('Erro de conexão com o servidor.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[55%_45%] bg-background-deep text-foreground relative overflow-hidden">
      {/* Decorative Atmosphere spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-[#00C97D] rounded-full blur-[140px] opacity-[0.07] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-[#00C97D] rounded-full blur-[140px] opacity-[0.03] pointer-events-none" />

      {/* Lado Esquerdo - Painel Visual Operacional (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-sidebar border-r border-border/60 relative overflow-hidden tech-grid">
        {/* Subtle overlay radial gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background-deep pointer-events-none" />
        
        {/* Top Branding Header */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo variant="monogram" width={40} height={40} priority />
          <div className="flex flex-col">
            <span className="font-sora font-semibold text-sm tracking-tight text-foreground">Gestão Coimbra</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Painel Operacional</span>
          </div>
        </div>

        {/* Central Visualization Section */}
        <div className="relative z-10 max-w-lg my-auto flex flex-col gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 text-primary text-[10px] font-semibold uppercase tracking-wider mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-primary status-pulse" />
              Comercial Coimbra — Desde 1987
            </div>
            
            <h2 className="text-4xl font-sora font-extrabold tracking-tight text-foreground leading-[1.15] mb-4 animate-fade-in">
              Tradição que acompanha os melhores momentos de Catalão.
            </h2>
          </div>

          {/* Dynamic Services Slideshow */}
          <div className="relative rounded-2xl border border-border bg-background-elevated/70 p-6 shadow-2xl backdrop-blur-md overflow-hidden inner-highlight min-h-[260px] flex flex-col justify-between">
            {/* Technical background grids */}
            <div className="absolute top-0 right-0 w-24 h-24 border-r border-t border-dashed border-primary/10 rounded-tr-xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-2 border-b border-border/40 pb-3">
              <span className="text-xs font-sora font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                NOSSOS SERVIÇOS
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">CATALÃO • GO</span>
            </div>

            {/* Active Service Showcase Area */}
            <div className="flex-1 flex flex-col justify-center my-4">
              {/* Animation Box */}
              {activeService === 0 && (
                <div className="h-32 relative animate-fade-in flex items-center justify-center">
                  <svg viewBox="0 0 200 120" className="w-full h-32 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Perspective event floor grid */}
                    <g className="opacity-15">
                      <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="20" y1="80" x2="180" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                      <line x1="40" y1="60" x2="160" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
                      <line x1="10" y1="100" x2="40" y2="60" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="100" y1="100" x2="100" y2="60" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="190" y1="100" x2="160" y2="60" stroke="currentColor" strokeWidth="0.5" />
                    </g>
                    
                    {/* Table element with bounce-in-down animation */}
                    <g className="animate-table-drop" style={{ transformOrigin: '100px 72px' }}>
                      {/* Table Shadow */}
                      <ellipse cx="100" cy="85" rx="32" ry="7" fill="rgba(0,0,0,0.3)" />
                      {/* Table legs */}
                      <line x1="85" y1="75" x2="80" y2="85" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
                      <line x1="115" y1="75" x2="120" y2="85" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" />
                      {/* Table Top */}
                      <ellipse cx="100" cy="72" rx="35" ry="10" fill="#1F2937" stroke="currentColor" strokeWidth="1.5" />
                      
                      {/* Centerpiece vase (scales up) */}
                      <g className="animate-vase-pop" style={{ transformOrigin: '100px 64px' }}>
                        <rect x="98" y="58" width="4" height="8" rx="0.5" fill="currentColor" />
                        <circle cx="100" cy="54" r="2.5" fill="#10B981" />
                      </g>
                    </g>

                    {/* Chair Left */}
                    <g className="animate-chair-left" style={{ transformOrigin: '55px 72px' }}>
                      {/* Chair Shadow */}
                      <ellipse cx="55" cy="82" rx="8" ry="2.5" fill="rgba(0,0,0,0.25)" />
                      {/* Chair Legs */}
                      <line x1="51" y1="74" x2="49" y2="82" stroke="#4B5563" strokeWidth="1.2" />
                      <line x1="59" y1="74" x2="61" y2="82" stroke="#4B5563" strokeWidth="1.2" />
                      {/* Chair Seat */}
                      <path d="M49 71C49 69.8 51 68.5 55 68.5C59 68.5 61 69.8 61 71L59 74.5H51L49 71Z" fill="#374151" stroke="currentColor" strokeWidth="1" />
                      {/* Chair Backrest */}
                      <path d="M50 68.5L51 60C51 58.8 52.5 58.2 55 58.2C57.5 58.2 59 58.8 59 60L60 68.5" stroke="currentColor" strokeWidth="1" fill="#1F2937" />
                    </g>

                    {/* Chair Right */}
                    <g className="animate-chair-right" style={{ transformOrigin: '145px 72px' }}>
                      {/* Chair Shadow */}
                      <ellipse cx="145" cy="82" rx="8" ry="2.5" fill="rgba(0,0,0,0.25)" />
                      {/* Chair Legs */}
                      <line x1="141" y1="74" x2="139" y2="82" stroke="#4B5563" strokeWidth="1.2" />
                      <line x1="149" y1="74" x2="151" y2="82" stroke="#4B5563" strokeWidth="1.2" />
                      {/* Chair Seat */}
                      <path d="M139 71C139 69.8 141 68.5 145 68.5C149 68.5 151 69.8 151 71L149 74.5H141L139 71Z" fill="#374151" stroke="currentColor" strokeWidth="1" />
                      {/* Chair Backrest */}
                      <path d="M140 68.5L141 60C141 58.8 142.5 58.2 145 58.2C147.5 58.2 149 58.8 149 60L150 68.5" stroke="currentColor" strokeWidth="1" fill="#1F2937" />
                    </g>
                  </svg>
                </div>
              )}

              {activeService === 1 && (
                <div className="h-32 relative animate-fade-in flex items-center justify-center">
                  <svg viewBox="0 0 200 120" className="w-full h-32 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Map road grid */}
                    <g className="opacity-10" stroke="currentColor" strokeWidth="0.8">
                      <path d="M10 20 H190 M10 60 H190 M10 100 H190" />
                      <path d="M30 10 V110 M100 10 V110 M170 10 V110" />
                      <path d="M10 10 L60 60 L10 110" />
                    </g>

                    {/* Pin A (Start) */}
                    <g className="animate-pin-drop" style={{ transformOrigin: '30px 60px' }}>
                      <circle cx="30" cy="60" r="8" fill="rgba(16,185,129,0.15)" stroke="currentColor" strokeWidth="1" />
                      <circle cx="30" cy="60" r="2.5" fill="currentColor" />
                      <text x="30" y="52" fill="currentColor" fontSize="7" fontWeight="bold" textAnchor="middle">A</text>
                    </g>

                    {/* Map route line path */}
                    <path
                      id="delivery-path"
                      d="M 30 60 C 65 25, 135 95, 170 60"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="200"
                      strokeDashoffset="200"
                      className="animate-draw-route"
                    />

                    {/* Pin B (Destination) */}
                    <g className="animate-pin-destination" style={{ transformOrigin: '170px 60px' }}>
                      <path d="M170 47 C166 47, 163 51, 170 60 C177 51, 174 47, 170 47 Z" fill="#10B981" />
                      <circle cx="170" cy="51" r="1.8" fill="#1F2937" />
                      <circle cx="170" cy="60" r="5" fill="rgba(16,185,129,0.2)" className="animate-ping" />
                    </g>

                    {/* Moving Truck along path using SVG native animateMotion */}
                    <g>
                      <g className="animate-truck-group">
                        <g transform="translate(0, -5)">
                          {/* Cabin */}
                          <path d="M 3 -3 L 7 -1 L 7 4 L 3 4 Z" fill="#E5E7EB" />
                          {/* Box Cargo */}
                          <rect x="-8" y="-4" width="11" height="8" rx="0.5" fill="#10B981" />
                          {/* Wheels */}
                          <circle cx="-5" cy="5.5" r="2" fill="#111827" />
                          <circle cx="4" cy="5.5" r="2" fill="#111827" />
                        </g>
                        <animateMotion
                          dur="3s"
                          repeatCount="indefinite"
                          path="M 30 60 C 65 25, 135 95, 170 60"
                          rotate="auto"
                        />
                      </g>
                    </g>
                  </svg>
                </div>
              )}

              {activeService === 2 && (
                <div className="h-32 relative animate-fade-in flex items-center justify-center">
                  <svg viewBox="0 0 200 120" className="w-full h-32 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Glow behind freezer */}
                    <circle cx="100" cy="60" r="25" fill="rgba(16,185,129,0.06)" className="animate-pulse-glow" />

                    {/* Freezer cabinet with 3D feel */}
                    <g className="animate-freezer-appear" style={{ transformOrigin: '100px 60px' }}>
                      {/* Shadow */}
                      <rect x="78" y="94" width="44" height="6" rx="3" fill="rgba(0,0,0,0.3)" />

                      {/* Main Body */}
                      <rect x="78" y="28" width="44" height="64" rx="3" fill="#1F2937" stroke="currentColor" strokeWidth="1.5" />
                      {/* Inner glass door line */}
                      <rect x="82" y="33" width="36" height="44" rx="1.5" fill="#111827" stroke="currentColor" strokeWidth="0.8" />
                      
                      {/* Handle */}
                      <line x1="80" y1="46" x2="80" y2="64" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      
                      {/* Metal Grille bottom */}
                      <line x1="84" y1="82" x2="116" y2="82" stroke="#374151" strokeWidth="1.5" />
                      <line x1="84" y1="86" x2="116" y2="86" stroke="#374151" strokeWidth="1.5" />

                      {/* Digital Temp Display */}
                      <rect x="92" y="16" width="16" height="8" rx="1.5" fill="#0B0F19" stroke="currentColor" strokeWidth="0.5" />
                      <text x="100" y="22" fill="#10B981" fontSize="5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        {temp}°C
                      </text>
                    </g>

                    {/* Rising frost vapor */}
                    <g className="opacity-50">
                      <path className="animate-frost-1" d="M 85 85 Q 81 72, 84 58" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2 2" />
                      <path className="animate-frost-2" d="M 115 85 Q 119 72, 116 58" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2 2" />
                      <path className="animate-frost-3" d="M 100 75 Q 96 62, 102 48" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2 2" />
                    </g>
                  </svg>
                </div>
              )}

              {activeService === 3 && (
                <div className="h-32 relative animate-fade-in flex items-center justify-center">
                  <svg viewBox="0 0 200 120" className="w-full h-32 text-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Shelf line */}
                    <line x1="30" y1="95" x2="170" y2="95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Wooden crate box (fades in) */}
                    <g className="animate-crate-fade opacity-30">
                      <rect x="55" y="58" width="90" height="35" rx="1.5" fill="#1F2937" stroke="currentColor" strokeWidth="0.8" />
                      <line x1="55" y1="70" x2="145" y2="70" stroke="currentColor" strokeWidth="0.8" />
                      <line x1="55" y1="81" x2="145" y2="81" stroke="currentColor" strokeWidth="0.8" />
                    </g>

                    {/* Beer Bottle */}
                    <g className="animate-bottle-slide" style={{ transformOrigin: '85px 95px' }}>
                      {/* Shadow */}
                      <ellipse cx="85" cy="94" rx="9" ry="3" fill="rgba(0,0,0,0.3)" />
                      
                      {/* Glass Bottle Body */}
                      <path d="M 81 94 L 81 65 Q 81 50, 83.5 42 L 83.5 25 L 86.5 25 L 86.5 42 Q 89 50, 89 65 L 89 94 Z" fill="#047857" stroke="currentColor" strokeWidth="0.8" />
                      
                      {/* Cap */}
                      <rect x="83" y="21" width="4" height="4" rx="0.5" fill="#FBBF24" />

                      {/* Liquid inside (with wave motion) */}
                      <path className="animate-liquid-wave" d="M 82 93 L 82 66 Q 85 64.5, 88 66 L 88 93 Z" fill="#F59E0B" opacity="0.8" />

                      {/* Label */}
                      <rect x="82" y="68" width="6" height="13" fill="#E5E7EB" rx="0.5" />
                      <circle cx="85" cy="74" r="2" fill="#10B981" />

                      {/* Condensation drop sliding down */}
                      <circle cx="83.5" cy="54" r="0.8" fill="#FFF" opacity="0.7" className="animate-drop-slide" />
                      <circle cx="86.5" cy="65" r="0.6" fill="#FFF" opacity="0.7" className="animate-drop-slide [animation-delay:1.1s]" />
                    </g>

                    {/* Soda Can */}
                    <g className="animate-can-slide" style={{ transformOrigin: '115px 95px' }}>
                      {/* Shadow */}
                      <ellipse cx="115" cy="94" rx="11" ry="3" fill="rgba(0,0,0,0.3)" />

                      {/* Can Body */}
                      <rect x="106" y="47" width="18" height="46" rx="1.5" fill="#374151" stroke="currentColor" strokeWidth="0.8" />
                      <rect x="106" y="45" width="18" height="2" fill="#9CA3AF" />
                      <rect x="106" y="92" width="18" height="1.5" fill="#9CA3AF" />

                      {/* Stylized Logo strip */}
                      <path d="M 106.5 61 L 123.5 74 L 123.5 80 L 106.5 67 Z" fill="#EF4444" />
                      <path d="M 106.5 57 L 123.5 70 M 106.5 71 L 123.5 84" stroke="#FFF" strokeWidth="0.8" />

                      {/* Condensation drop sliding down */}
                      <circle cx="110" cy="52" r="0.6" fill="#FFF" opacity="0.6" className="animate-drop-slide-can" />
                      <circle cx="118" cy="68" r="0.9" fill="#FFF" opacity="0.6" className="animate-drop-slide-can [animation-delay:0.7s]" />
                    </g>
                  </svg>
                </div>
              )}

              {/* Service Title */}
              <div className="text-center mt-4">
                <span className="text-sm font-sora font-extrabold text-foreground tracking-wide uppercase transition-all duration-300">
                  {activeService === 0 && 'Mesas e Cadeiras'}
                  {activeService === 1 && 'Entrega e Retirada'}
                  {activeService === 2 && 'Gelos e Freezers'}
                  {activeService === 3 && 'Bebidas'}
                </span>
              </div>
            </div>

            {/* Slide Navigation Tabs */}
            <div className="grid grid-cols-4 gap-2 border-t border-border/40 pt-4 mt-2">
              {[
                { title: 'Mesas', icon: Armchair },
                { title: 'Entrega', icon: Truck },
                { title: 'Freezers', icon: Snowflake },
                { title: 'Bebidas', icon: Wine }
              ].map((service, index) => {
                const isActive = activeService === index;
                return (
                  <button
                    key={service.title}
                    type="button"
                    onClick={() => {
                      setActiveService(index);
                      setIsManual(true);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-1.5 rounded-lg border transition-all duration-300 cursor-pointer focus:outline-none",
                      isActive
                        ? "text-primary bg-primary/5 border-primary/15"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-surface/30"
                    )}
                  >
                    <service.icon className="h-4 w-4" />
                    <span className="text-[9px] font-sora font-semibold tracking-wider uppercase">{service.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 flex justify-between items-center text-xs text-muted-foreground">
          <span>Comercial Coimbra Ltda.</span>
          <span>© 1987 - {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Lado Direito - Formulário de Login */}
      <div className="flex flex-col justify-center items-center px-6 py-12 lg:p-16 relative z-10">
        {/* Mobile Header Branding (Visible only on mobile/tablet) */}
        <div className="lg:hidden flex flex-col items-center mb-4 text-center">
          <BrandLogo variant="monogram" width={56} height={56} className="mb-2" priority />
          <h1 className="text-2xl font-sora font-bold text-foreground">Gestão Coimbra</h1>
        </div>

        {/* Card do Formulário */}
        <div className="w-full max-w-md relative">
          {/* Mobile Neon Border (Only on Mobile) */}
          <div className="absolute inset-0 mobile-neon-border pointer-events-none rounded-2xl z-0 lg:hidden" />
          
          {/* Card Body */}
          <div className="w-full bg-surface border border-border/80 p-8 rounded-2xl shadow-2xl relative overflow-hidden inner-highlight z-10 lg:z-auto max-lg:border-none">
            {/* subtle decoration inside the card */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            
            <div className="mb-6">
              <h2 className="text-xl font-sora font-bold text-foreground">Acesse sua conta</h2>
              <p className="text-xs text-muted-foreground mt-1">Insira suas credenciais operacionais para continuar</p>
            </div>
            
            {errorMessage && (
              <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-xs font-semibold leading-relaxed animate-in fade-in slide-in-from-top-1 duration-150">
                {errorMessage}
              </div>
            )}



          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground-secondary">E-mail</FormLabel>
                    <FormControl>
                      <Input disabled={isLoading} placeholder="seu@email.com.br" type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground-secondary">Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          disabled={isLoading}
                          placeholder="••••••••" 
                          type={showPassword ? 'text' : 'password'} 
                          autoComplete="current-password"
                          {...field} 
                          className="pr-10"
                        />
                        <button
                          disabled={isLoading}
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-danger" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between pt-1">
                <FormField
                  control={form.control}
                  name="remember"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <input
                          disabled={isLoading}
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-border bg-background-deep text-primary focus:ring-primary/30 cursor-pointer"
                        />
                      </FormControl>
                      <FormLabel className="text-xs text-muted-foreground font-normal cursor-pointer select-none">
                        Lembrar acesso neste dispositivo
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full h-11 text-sm font-bold mt-4 relative overflow-hidden group">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                  {!isLoading && <RefreshCw className="h-4 w-4 animate-spin-slow group-hover:rotate-180 transition-transform duration-500 hidden group-hover:block" />}
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-primary-strong to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 pt-4 border-t border-border-subtle w-full text-center">
            <p className="text-[10px] text-muted-foreground leading-normal">
              Acesso restrito a colaboradores autorizados.<br />
              <span className="text-primary/70">Autenticação demonstrativa ativa.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
