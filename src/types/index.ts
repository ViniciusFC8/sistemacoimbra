export type StatusPedido = 
  | 'Confirmado'
  | 'Entregue'
  | 'Finalizado';

export type StatusLocacao =
  | 'Orçamento'
  | 'Reservada'
  | 'Confirmada'
  | 'Aguardando entrega'
  | 'Em andamento'
  | 'Aguardando retirada'
  | 'Devolvida'
  | 'Atrasada'
  | 'Cancelada';

export type StatusEstoque =
  | 'Disponível'
  | 'Estoque baixo'
  | 'Indisponível'
  | 'Reservado'
  | 'Alugado'
  | 'Em manutenção';

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  dataCadastro?: Date;
  ultimaOperacao?: string;
  totalPedidos?: number;
  totalLocacoes?: number;
  observacoes?: string;
  ativo?: boolean;
  created_by?: string;
}

export interface ItemEstoque {
  id: string;
  nome: string;
  quantidade: number;
  status: StatusEstoque;
  tipo: 'venda' | 'locacao';
  categoria?: string;
  unidade?: string;
  estoqueMinimo?: number;
  ultimaAtualizacao?: Date;
  disponivel?: number;
  reservado?: number;
  alugado?: number;
  manutencao?: number;
  proximaDisponibilidade?: string;
}

export interface Pedido {
  id: string;
  cliente: Cliente;
  itens: { item: ItemEstoque; quantidade: number }[];
  status: StatusPedido;
  dataCriacao: Date;
  dataEntrega?: Date;
  dataFimLocacao?: Date;
  valorTotal?: number;
  tipoEntrega?: 'entrega' | 'retirada';
  horarioEntrega?: string;
  responsavel?: string;
  formaPagamento?: string;
  observacoes?: string;
  bebidasPorEscrito?: string;
  enderecoEntrega?: string;
  bairroEntrega?: string;
  cidadeEntrega?: string;
}

export interface Locacao {
  id: string;
  pedidoId?: string;
  cliente: Cliente;
  itens: { item: ItemEstoque; quantidade: number }[];
  status: StatusLocacao;
  dataInicio: Date;
  dataFim: Date;
  enderecoEntrega?: string;
  bairroEntrega?: string;
  cidadeEntrega?: string;
  valorTotal?: number;
  observacoes?: string;
}

export interface CompromissoAgenda {
  id: string;
  pedidoId?: string;
  tipoCompromisso?: 'entrega' | 'devolucao';
  horario: Date;
  cliente: string;
  operacao: 'Entrega' | 'Retirada' | 'Devolução' | 'Pedido' | 'Locação' | 'Manutenção' | 'Compromisso';
  resumoItens: string;
  status: 'Confirmada' | 'Pendente' | 'Em separação' | 'Agendada' | 'Atrasada' | 'Cancelada' | 'Concluído' | 'Realizado';
  endereco?: string;
  responsavel?: string;
  observacoes?: string;
  pedidoStatus?: string;
}

export interface AlertaOperacional {
  id: string;
  tipo: 'critico' | 'atencao' | 'info';
  titulo: string;
  descricao: string;
  tempoInfo?: string;
  acaoTexto?: string;
  acaoUrl?: string;
}

export interface AtividadeRecente {
  id: string;
  tipo: 'pedido' | 'cliente' | 'locacao' | 'entrega' | 'estoque';
  descricao: string;
  responsavel?: string;
  horario: Date;
}

export interface IndicadorDashboard {
  titulo: string;
  valor: number;
  informacaoComplementar: string;
  icone: string; // nome do ícone do lucide
  estado?: 'positivo' | 'neutro' | 'atencao';
}

export interface GlobalSearchClienteResult {
  id: string;
  nome: string;
  telefone?: string;
}

export interface GlobalSearchPedidoResult {
  id: string;
  clienteNome: string;
  valorTotal?: number;
  status: string;
  possuiLocacao: boolean;
}

