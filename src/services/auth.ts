import { supabase, handleSupabaseError } from './supabase';
import { User, LoginCredentials } from '@/types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    try {
      // Buscar usuário
      const { data: user, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', credentials.username)
        .single();

      if (userError || !user) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar status
      if (user.status === 'inactive') {
        throw new Error('Usuário inativo');
      }

      if (user.status === 'blocked') {
        throw new Error('Usuário bloqueado');
      }

      // Verificar senha (simplificado para demo)
      // Em produção, usar bcrypt ou argon2
      if (credentials.password !== 'admin123' && user.username === 'MMIRANDA') {
        // Incrementar tentativas de login inválido
        const attempts = (user.login_attempts || 0) + 1;
        await supabase
          .from('usuarios')
          .update({ login_attempts: attempts })
          .eq('id', user.id);

        // Bloquear após 5 tentativas
        if (attempts >= 5) {
          await supabase
            .from('usuarios')
            .update({ status: 'blocked' })
            .eq('id', user.id);
          throw new Error('Usuário bloqueado por múltiplas tentativas de login inválido');
        }

        throw new Error('Senha incorreta');
      }

      // Registrar acesso
      const clientIP = await getClientIP();
      await supabase.from('historico_acessos').insert({
        usuario_id: user.id,
        data_acesso: new Date().toISOString().split('T')[0],
        hora_acesso: new Date().toTimeString().split(' ')[0],
        endereco_ip: clientIP,
        ultimo_acesso: new Date().toISOString(),
      });

      // Resetar tentativas de login
      await supabase
        .from('usuarios')
        .update({ login_attempts: 0, ultimo_acesso: new Date().toISOString() })
        .eq('id', user.id);

      // Gerar token
      const token = `${user.id}:${Date.now()}`;

      return {
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          cargo: user.cargo,
          setor: user.setor,
          telefone: user.telefone,
          role: user.role,
          status: user.status,
          must_change_password: user.must_change_password,
          last_login: user.ultimo_acesso,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        token,
      };
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Registrar na auditoria
      await supabase.from('auditoria').insert({
        usuario_id: userId,
        acao: 'change_password',
        tabela: 'usuarios',
        registro_id: userId,
        data: new Date().toISOString().split('T')[0],
        hora: new Date().toTimeString().split(' ')[0],
      });
    } catch (error) {
      throw new Error(handleSupabaseError(error));
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  },
};

async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}
