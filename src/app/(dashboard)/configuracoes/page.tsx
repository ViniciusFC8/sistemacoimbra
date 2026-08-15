'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building, 

  Users, 
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppHeader } from '@/components/layout/AppHeader';
import { cn } from '@/lib/utils';
import { configuracoesService, DadosEmpresa, Profile } from '@/services/configuracoes.service';
import { createInternalUser, setInternalUserActive } from '@/app/actions/usuarios.actions';

interface AccordionSectionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ title, description, icon: Icon, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden inner-highlight transition-all">
      <button 
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left bg-sidebar/10 hover:bg-sidebar/20 transition-colors cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-3.5 min-w-0 mr-4">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2 rounded-xl shrink-0">
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-sora font-semibold text-sm text-foreground truncate">{title}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{description}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      
      {isOpen && (
        <div className="p-6 border-t border-border/60 bg-card flex flex-col gap-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [openSection, setOpenSection] = useState<string | null>('empresa');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa>({
    id: '',
    nome_juridico: '',
    nome_fantasia: '',
    whatsapp: '',
    endereco: '',
    cidade_estado: '',
    cep: ''
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  // New User Modal State
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{nome: string, email: string, password: string, papel: 'administrador' | 'atendente' | 'operacao'}>({
    nome: '', email: '', password: '', papel: 'atendente'
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState(false);

  // Toggle User State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userToToggle, setUserToToggle] = useState<{id: string, nome: string, ativo: boolean} | null>(null);
  const [isTogglingUser, setIsTogglingUser] = useState(false);
  const [toggleUserError, setToggleUserError] = useState<string | null>(null);
  const [toggleUserSuccess, setToggleUserSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const [dados, role, uid] = await Promise.all([
          configuracoesService.getDadosEmpresa(),
          configuracoesService.getCurrentUserRole(),
          configuracoesService.getCurrentUserId()
        ]);
        if (active) {
          if (dados) setDadosEmpresa(dados);
          setUserRole(role);
          setCurrentUserId(uid);
        }
      } catch (e) {
        console.error('Erro ao buscar dados:', e);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetch();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (userRole === 'administrador') {
      const fetchProfiles = async () => {
        setIsLoadingProfiles(true);
        setProfilesError(null);
        try {
          const data = await configuracoesService.getAllProfiles();
          if (active) setProfiles(data);
        } catch (e) {
          if (active) setProfilesError('Não foi possível carregar os usuários.');
        } finally {
          if (active) setIsLoadingProfiles(false);
        }
      };
      fetchProfiles();
    }
    return () => { active = false; };
  }, [userRole]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setCreateUserError(null);
    setIsCreatingUser(true);
    
    try {
      await createInternalUser(newUserForm);
      setCreateUserSuccess(true);
      setTimeout(() => setCreateUserSuccess(false), 3000);
      setIsNewUserModalOpen(false);
      setNewUserForm({ nome: '', email: '', password: '', papel: 'atendente' });
      
      // Refresh list
      const data = await configuracoesService.getAllProfiles();
      setProfiles(data);
    } catch (e: any) {
      setCreateUserError(e.message || 'Erro inesperado ao criar usuário.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleUser = async () => {
    if (!userToToggle) return;
    
    setToggleUserError(null);
    setIsTogglingUser(true);
    
    try {
      const novoStatus = !userToToggle.ativo;
      await setInternalUserActive({ userId: userToToggle.id, ativo: novoStatus });
      
      setToggleUserSuccess(novoStatus ? 'Usuário reativado com sucesso.' : 'Usuário desativado com sucesso.');
      setTimeout(() => setToggleUserSuccess(null), 3000);
      setUserToToggle(null);
      
      // Refresh list
      const data = await configuracoesService.getAllProfiles();
      setProfiles(data);
    } catch (e: any) {
      setToggleUserError(e.message || 'Erro inesperado ao alterar status do usuário.');
    } finally {
      setIsTogglingUser(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'administrador') return;
    
    try {
      await configuracoesService.updateDadosEmpresa(dadosEmpresa);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Erro ao salvar dados da empresa', e);
    }
  };

  const handleChange = (field: keyof DadosEmpresa, value: string) => {
    setDadosEmpresa(prev => ({ ...prev, [field]: value }));
  };

  const isAdmin = userRole === 'administrador';

  return (
    <>
      <AppHeader title="Configurações" />
      <div className="flex flex-col gap-6 p-6 max-md:p-4 min-h-[calc(100vh-3.5rem)] bg-background">
      {/* Top Banner Header */}
      <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-4 shrink-0 bg-card border border-border p-5 rounded-2xl inner-highlight tech-grid relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="bg-primary/10 text-primary border border-primary/20 p-2.5 rounded-xl">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-sora font-extrabold text-xl text-foreground tracking-tight">Configurações Gerais</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Customize os parâmetros da operação, empresa e níveis de aviso.</p>
          </div>
        </div>
        {saveSuccess && (
          <div className="bg-success/15 border border-success/15 text-success text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fade-in z-10">
            <CheckCircle className="w-4 h-4" /> Alterações salvas!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Dados da Empresa */}
        <AccordionSection
          title="Dados da Empresa"
          description="Informaçoes básicas de identidade e canais de contato corporativos."
          icon={Building}
          isOpen={openSection === 'empresa'}
          onToggle={() => toggleSection('empresa')}
        >
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nome Jurídico</label>
              <Input 
                value={dadosEmpresa.nome_juridico} 
                onChange={e => handleChange('nome_juridico', e.target.value)}
                disabled={!isAdmin || isLoading}
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nome de Exibição (Fantasia)</label>
              <Input 
                value={dadosEmpresa.nome_fantasia} 
                onChange={e => handleChange('nome_fantasia', e.target.value)}
                disabled={!isAdmin || isLoading}
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">CEP</label>
              <Input 
                value={dadosEmpresa.cep} 
                onChange={e => handleChange('cep', e.target.value)}
                disabled={!isAdmin || isLoading}
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">WhatsApp Operacional</label>
              <Input 
                value={dadosEmpresa.whatsapp} 
                onChange={e => handleChange('whatsapp', e.target.value)}
                disabled={!isAdmin || isLoading}
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Endereço da Sede</label>
              <Input 
                value={dadosEmpresa.endereco} 
                onChange={e => handleChange('endereco', e.target.value)}
                disabled={!isAdmin || isLoading}
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border" 
              />
            </div>
            <div className="col-span-1 flex flex-col gap-1 max-md:col-span-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Cidade / Estado</label>
              <Input 
                value={dadosEmpresa.cidade_estado} 
                onChange={e => handleChange('cidade_estado', e.target.value)}
                disabled={!isAdmin || isLoading}
                className="h-9.5 text-xs bg-background-deep rounded-xl border-border" 
              />
            </div>
          </div>
        </AccordionSection>


        {/* Usuários */}
        {isAdmin && (
          <AccordionSection
            title="Níveis de Acesso e Usuários"
            description="Controle e perfis dos operadores da plataforma."
            icon={Users}
            isOpen={openSection === 'usuarios'}
            onToggle={() => toggleSection('usuarios')}
          >
            <div className="flex flex-col gap-3">
              <div className="flex justify-end mb-2">
                <Button 
                  type="button" 
                  onClick={() => setIsNewUserModalOpen(true)}
                  className="bg-primary hover:bg-primary-strong text-black font-bold h-8 px-4 rounded-xl border border-primary/10 flex items-center gap-2 text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Novo usuário
                </Button>
              </div>
              
              {createUserSuccess && (
                <div className="bg-success/15 border border-success/15 text-success text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fade-in z-10 mb-2">
                  <CheckCircle className="w-4 h-4" /> Usuário criado com sucesso!
                </div>
              )}

              {toggleUserSuccess && (
                <div className="bg-success/15 border border-success/15 text-success text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fade-in z-10 mb-2">
                  <CheckCircle className="w-4 h-4" /> {toggleUserSuccess}
                </div>
              )}

              {isLoadingProfiles ? (
                <div className="text-xs text-muted-foreground p-3">Carregando usuários...</div>
              ) : profilesError ? (
                <div className="text-xs text-destructive p-3">{profilesError}</div>
              ) : profiles.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3">Nenhum usuário encontrado.</div>
              ) : (
                profiles.map((user) => (
                  <div key={user.id} className="flex justify-between items-center gap-4 p-3.5 bg-background-deep/30 border border-border-subtle rounded-xl text-xs max-md:flex-col max-md:items-start max-md:gap-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-muted text-primary border border-primary/10 h-9 w-9 rounded-full flex items-center justify-center font-sora font-extrabold text-sm uppercase shrink-0">
                        {user.nome ? user.nome.substring(0, 1) : '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sora font-bold text-foreground flex items-center gap-2">
                          {user.nome || 'Sem nome'}
                          {user.id === currentUserId && (
                            <span className="text-[10px] font-normal text-muted-foreground bg-muted border border-border px-1.5 rounded">(Você)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 max-md:w-full max-md:justify-between max-md:border-t max-md:border-border-subtle/55 max-md:pt-2.5">
                      <span className="text-[10px] font-semibold bg-surface border border-border px-2 py-0.5 rounded-lg text-foreground-secondary">
                        {user.papel === 'administrador' ? 'Administrador' : user.papel === 'atendente' ? 'Atendente' : 'Operação'}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold font-mono px-2 py-0.5 rounded border",
                        user.ativo ? 'bg-primary-muted border-primary/15 text-primary' : 'bg-muted border-border text-muted-foreground'
                      )}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      
                      {user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUserToToggle({ id: user.id, nome: user.nome, ativo: user.ativo })}
                          className={cn(
                            "h-7 px-3 text-[10px] font-bold rounded-lg border ml-2 transition-colors",
                            user.ativo 
                              ? "text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive" 
                              : "text-success border-success/20 hover:bg-success/10 hover:text-success"
                          )}
                        >
                          {user.ativo ? 'Desativar' : 'Reativar'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </AccordionSection>
        )}

        {/* Modal Novo Usuário */}
        {isNewUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
            <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-5 border-b border-border/60 shrink-0">
                <h3 className="font-sora font-bold text-foreground">Novo Usuário Interno</h3>
                <button type="button" onClick={() => setIsNewUserModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto">
                {createUserError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-xl mb-4">
                    {createUserError}
                  </div>
                )}
                
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Nome</label>
                    <Input 
                      value={newUserForm.nome}
                      onChange={e => setNewUserForm(p => ({ ...p, nome: e.target.value }))}
                      placeholder="Nome completo"
                      className="bg-background-deep border-border text-sm h-10 rounded-xl"
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">E-mail</label>
                    <Input 
                      type="email"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="usuario@comercialcoimbra.com.br"
                      className="bg-background-deep border-border text-sm h-10 rounded-xl"
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Senha</label>
                    <Input 
                      type="password"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className="bg-background-deep border-border text-sm h-10 rounded-xl"
                      disabled={isCreatingUser}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">Papel</label>
                    <select 
                      value={newUserForm.papel}
                      onChange={e => setNewUserForm(p => ({ ...p, papel: e.target.value as any }))}
                      className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background-deep px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isCreatingUser}
                    >
                      <option value="administrador">Administrador</option>
                      <option value="atendente">Atendente</option>
                      <option value="operacao">Operação</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-border/60 bg-sidebar/10 flex justify-end gap-3 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setIsNewUserModalOpen(false)} disabled={isCreatingUser} className="rounded-xl h-10 text-xs">
                  Cancelar
                </Button>
                <Button type="button" onClick={handleCreateUser} disabled={isCreatingUser} className="bg-primary hover:bg-primary-strong text-black font-bold rounded-xl h-10 px-5 text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,201,125,0.15)]">
                  {isCreatingUser ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                  ) : (
                    'Criar Usuário'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Toggle */}
        {userToToggle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
            <div className="bg-card border border-border w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-5 border-b border-border/60 shrink-0">
                <h3 className="font-sora font-bold text-foreground">
                  {userToToggle.ativo ? 'Desativar usuário?' : 'Reativar usuário?'}
                </h3>
                <button type="button" onClick={() => !isTogglingUser && setUserToToggle(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5">
                {toggleUserError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-xl mb-4">
                    {toggleUserError}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {userToToggle.ativo 
                    ? `O usuário ${userToToggle.nome} perderá o acesso ao Gestão Coimbra até ser reativado por um administrador.`
                    : `O usuário ${userToToggle.nome} poderá acessar o Gestão Coimbra novamente.`}
                </p>
              </div>
              
              <div className="p-5 border-t border-border/60 bg-sidebar/10 flex justify-end gap-3 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setUserToToggle(null)} disabled={isTogglingUser} className="rounded-xl h-10 text-xs">
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleToggleUser} 
                  disabled={isTogglingUser} 
                  className={cn(
                    "font-bold rounded-xl h-10 px-5 text-xs flex items-center gap-2",
                    userToToggle.ativo 
                      ? "bg-destructive hover:bg-destructive/90 text-white" 
                      : "bg-success hover:bg-success/90 text-white"
                  )}
                >
                  {isTogglingUser ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                  ) : userToToggle.ativo ? (
                    'Desativar usuário'
                  ) : (
                    'Reativar usuário'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button footer */}
        <div className="mt-4 flex justify-end gap-3 items-center">
          {!isAdmin && !isLoading && (
            <span className="text-[10px] font-semibold text-muted-foreground">Apenas administradores podem alterar configurações.</span>
          )}
          <Button 
            type="submit"
            disabled={!isAdmin || isLoading}
            className="bg-primary hover:bg-primary-strong text-black font-bold h-10 px-5 rounded-xl border border-primary/10 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(0,201,125,0.15)] max-md:w-full max-md:justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </Button>
        </div>
      </form>
    </div>
    </>
  );
}
