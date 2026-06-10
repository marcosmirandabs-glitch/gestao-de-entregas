// Tipos de usuários e permissões
export type UserRole = 'admin_master' | 'admin' | 'operator' | 'consultant';
export type UserStatus = 'active' | 'blocked' | 'inactive';

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  cargo: string;
  setor: string;
  telefone: string;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

// Fornecedores
export type ReceivingPeriod = 'morning' | 'afternoon' | 'full';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Supplier {
  id: string;
  codigo: string;
  razao_social: string;
  cidade: string;
  estado: string;
  endereco: string;
  cep: string;
  contato_principal: string;
  telefone: string;
  email: string;
  dias_permitidos: DayOfWeek[];
  periodo_recebimento: ReceivingPeriod;
  horario_inicial: string;
  horario_final: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

// Entregas (Notas Fiscais)
export type Criticality = 'normal' | 'priority';
export type DeliveryStatus = 'pending' | 'in_load' | 'loaded' | 'in_transit' | 'delivered' | 'canceled';

export interface Delivery {
  id: string;
  supplier_id: string;
  numero_nf: string;
  peso_total: number;
  quantidade_volumes: number;
  data_entrega_desejada: string;
  criticidade: Criticality;
  status: DeliveryStatus;
  observacoes: string;
  responsavel: string;
  predio: 'A' | 'B';
  box: string;
  created_at: string;
  updated_at: string;
}

// Cargas
export type LoadStatus = 'planning' | 'in_separation' | 'loaded' | 'sent' | 'delivered' | 'canceled';
export type Route = 'morning' | 'afternoon';

export interface Load {
  id: string;
  numero_carga: string;
  rota: Route;
  data_programada: string;
  peso_total: number;
  quantidade_volumes: number;
  percentual_ocupacao: number;
  status: LoadStatus;
  data_envio?: string;
  hora_envio?: string;
  usuario_envio?: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

export interface LoadItem {
  id: string;
  carga_id: string;
  entrega_id: string;
  sequencia: number;
  created_at: string;
}

// Histórico de Acessos
export interface AccessLog {
  id: string;
  usuario_id: string;
  data_acesso: string;
  hora_acesso: string;
  endereco_ip: string;
  ultimo_acesso?: string;
  ultima_atividade?: string;
  created_at: string;
}

// Auditoria
export type AuditAction = 'create' | 'update' | 'delete' | 'change_password' | 'change_permission' | 'block' | 'unblock';

export interface AuditLog {
  id: string;
  usuario_id: string;
  acao: AuditAction;
  tabela: string;
  registro_id: string;
  dados_anteriores?: Record<string, any>;
  dados_novos?: Record<string, any>;
  data: string;
  hora: string;
  created_at: string;
}

// Dashboard
export interface DashboardMetrics {
  total_entregas_pendentes: number;
  total_cargas_programadas: number;
  peso_total_programado: number;
  quantidade_volumes_programados: number;
  entregas_prioritarias_pendentes: number;
  entregas_em_transito: number;
  entregas_concluidas: number;
  ocupacao_media_caminhoes: number;
  proxima_carga_programada?: Load;
}
