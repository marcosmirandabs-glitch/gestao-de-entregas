import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { User, UserRole, UserStatus } from '@/types';
import { Plus, Edit2, Trash2, Lock, Unlock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { canManageUsers } from '@/utils/permissions';

export const Users: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    status: 'active',
    role: 'operator',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // Verificar permissão
  if (!currentUser || !canManageUsers(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 text-lg">Acesso negado. Apenas administradores podem gerenciar usuários.</div>
      </div>
    );
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.from('usuarios').select('*');
      if (error) throw error;
      setUsers((data as User[]) || []);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.full_name || !formData.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('usuarios')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            cargo: formData.cargo,
            setor: formData.setor,
            telefone: formData.telefone,
            role: formData.role,
            status: formData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Usuário atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('usuarios').insert([{
          ...formData,
          login_attempts: 0,
          must_change_password: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          senha_hash: 'temp',
          salt: 'temp',
        }]);
        if (error) throw error;
        toast.success('Usuário cadastrado com sucesso!');
      }
      setFormData({ status: 'active', role: 'operator' });
      setEditingId(null);
      setShowForm(false);
      loadUsers();
    } catch (error) {
      toast.error('Erro ao salvar usuário');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
      toast.success('Usuário deletado com sucesso!');
      loadUsers();
    } catch (error) {
      toast.error('Erro ao deletar usuário');
      console.error(error);
    }
  };

  const handleToggleBlock = async (id: string, currentStatus: UserStatus) => {
    try {
      const newStatus: UserStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
      const { error } = await supabase
        .from('usuarios')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(`Usuário ${newStatus === 'blocked' ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
      loadUsers();
    } catch (error) {
      toast.error('Erro ao atualizar status do usuário');
      console.error(error);
    }
  };

  const handleEdit = (user: User) => {
    setFormData(user);
    setEditingId(user.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-2">Gerenciar usuários do sistema e suas permissões</p>
        </div>
        <button
          onClick={() => {
            setFormData({ status: 'active', role: 'operator' });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nome Completo *"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Usuário (login) *"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="email"
                placeholder="E-mail *"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Cargo"
                value={formData.cargo || ''}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Setor"
                value={formData.setor || ''}
                onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="tel"
                placeholder="Telefone"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <select
                value={formData.role || 'operator'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="admin_master">Administrador Master</option>
                <option value="admin">Administrador</option>
                <option value="operator">Operador</option>
                <option value="consultant">Consulta</option>
              </select>
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="blocked">Bloqueado</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                {editingId ? 'Atualizar' : 'Cadastrar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Pesquisar por nome ou usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Usuário</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Perfil</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm text-gray-900">{user.full_name}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{user.username}</td>
                <td className="px-6 py-3 text-sm text-gray-600 capitalize">{user.role.replace('_', ' ')}</td>
                <td className="px-6 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' :
                    user.status === 'blocked' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status === 'active' ? 'Ativo' : user.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800 mr-3 inline-flex items-center gap-1"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleBlock(user.id, user.status)}
                    className={`mr-3 inline-flex items-center gap-1 ${
                      user.status === 'blocked' ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'
                    }`}
                  >
                    {user.status === 'blocked' ? <Unlock size={16} /> : <Lock size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
