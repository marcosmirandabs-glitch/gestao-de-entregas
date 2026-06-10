import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Delivery, Supplier, Criticality, DeliveryStatus } from '@/types';
import { Plus, Edit2, Trash2, Search, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const Deliveries: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [filterStatus, setFilterStatus] = useState<DeliveryStatus | ''>('');
  const [filterCriticality, setFilterCriticality] = useState<Criticality | ''>('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Formulário
  const [formData, setFormData] = useState<Partial<Delivery>>({
    criticidade: 'normal',
    status: 'pending',
    predio: 'A',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deliveries, searchTerm, filterSupplierId, filterStatus, filterCriticality, filterDate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar fornecedores
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('fornecedores')
        .select('*');
      if (suppliersError) throw suppliersError;
      setSuppliers((suppliersData as Supplier[]) || []);

      // Carregar entregas
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('entregas')
        .select('*');
      if (deliveriesError) throw deliveriesError;
      setDeliveries((deliveriesData as Delivery[]) || []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deliveries];

    // Pesquisa por NF ou fornecedor
    if (searchTerm) {
      filtered = filtered.filter(d => {
        const supplier = suppliers.find(s => s.id === d.supplier_id);
        return (
          d.numero_nf.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier?.razao_social.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Filtro por fornecedor
    if (filterSupplierId) {
      filtered = filtered.filter(d => d.supplier_id === filterSupplierId);
    }

    // Filtro por status
    if (filterStatus) {
      filtered = filtered.filter(d => d.status === filterStatus);
    }

    // Filtro por criticidade
    if (filterCriticality) {
      filtered = filtered.filter(d => d.criticidade === filterCriticality);
    }

    // Filtro por data
    if (filterDate) {
      filtered = filtered.filter(d => d.data_entrega_desejada === filterDate);
    }

    setFilteredDeliveries(filtered);
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.razao_social || 'N/A';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id || !formData.numero_nf || !formData.peso_total || !formData.quantidade_volumes) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('entregas')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Entrega atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('entregas').insert([{
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        toast.success('Entrega cadastrada com sucesso!');
      }

      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar entrega');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      criticidade: 'normal',
      status: 'pending',
      predio: 'A',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (delivery: Delivery) => {
    setFormData(delivery);
    setEditingId(delivery.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta entrega?')) return;

    try {
      const { error } = await supabase.from('entregas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Entrega deletada com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao deletar entrega');
      console.error(error);
    }
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    const statusMap = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      in_load: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em Separação' },
      loaded: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Carregado' },
      in_transit: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Em Trânsito' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Entregue' },
      canceled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
    };
    const statusInfo = statusMap[status];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.bg} ${statusInfo.text}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getCriticalityBadge = (criticality: Criticality) => {
    return criticality === 'priority' ? (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">🔴 Prioridade</span>
    ) : (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Normal</span>
    );
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
          <h1 className="text-3xl font-bold text-gray-900">Entregas</h1>
          <p className="text-gray-600 mt-2">Gestão de notas fiscais e entregas</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          <span>Nova Entrega</span>
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Entrega' : 'Nova Entrega'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fornecedor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor *</label>
                <select
                  value={formData.supplier_id || ''}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.razao_social} ({s.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* Número NF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da NF *</label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={formData.numero_nf || ''}
                  onChange={(e) => setFormData({ ...formData, numero_nf: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Peso Total */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso Total (kg) *</label>
                <input
                  type="number"
                  placeholder="Ex: 500"
                  step="0.01"
                  value={formData.peso_total || ''}
                  onChange={(e) => setFormData({ ...formData, peso_total: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Quantidade de Volumes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Volumes *</label>
                <input
                  type="number"
                  placeholder="Ex: 10"
                  value={formData.quantidade_volumes || ''}
                  onChange={(e) => setFormData({ ...formData, quantidade_volumes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Data Entrega Desejada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Desejada de Entrega *</label>
                <input
                  type="date"
                  value={formData.data_entrega_desejada || ''}
                  onChange={(e) => setFormData({ ...formData, data_entrega_desejada: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              {/* Criticidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Criticidade</label>
                <select
                  value={formData.criticidade || 'normal'}
                  onChange={(e) => setFormData({ ...formData, criticidade: e.target.value as Criticality })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="priority">Prioridade</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as DeliveryStatus })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="pending">Pendente</option>
                  <option value="in_load">Em Separação</option>
                  <option value="loaded">Carregado</option>
                  <option value="in_transit">Em Trânsito</option>
                  <option value="delivered">Entregue</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>

              {/* Prédio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prédio</label>
                <select
                  value={formData.predio || 'A'}
                  onChange={(e) => setFormData({ ...formData, predio: e.target.value as 'A' | 'B' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="A">Prédio A</option>
                  <option value="B">Prédio B</option>
                </select>
              </div>

              {/* Box */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Box</label>
                <input
                  type="text"
                  placeholder="Ex: 01, 02, etc"
                  value={formData.box || ''}
                  onChange={(e) => setFormData({ ...formData, box: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                <input
                  type="text"
                  placeholder="Nome do responsável"
                  value={formData.responsavel || ''}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-4 pt-4">
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

      {/* Pesquisa e Filtros */}
      <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Pesquisar por NF ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Filter size={20} />
            <span>Filtros</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-200">
            <select
              value={filterSupplierId}
              onChange={(e) => setFilterSupplierId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os fornecedores</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.razao_social}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as DeliveryStatus | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="in_load">Em Separação</option>
              <option value="loaded">Carregado</option>
              <option value="in_transit">Em Trânsito</option>
              <option value="delivered">Entregue</option>
              <option value="canceled">Cancelado</option>
            </select>

            <select
              value={filterCriticality}
              onChange={(e) => setFilterCriticality(e.target.value as Criticality | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todas criticidades</option>
              <option value="normal">Normal</option>
              <option value="priority">Prioridade</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <button
              onClick={() => {
                setFilterSupplierId('');
                setFilterStatus('');
                setFilterCriticality('');
                setFilterDate('');
                setSearchTerm('');
              }}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Total de entregas:</strong> {filteredDeliveries.length} | 
          <strong className="ml-4">Pendentes:</strong> {filteredDeliveries.filter(d => d.status === 'pending').length} | 
          <strong className="ml-4">Prioritárias:</strong> {filteredDeliveries.filter(d => d.criticidade === 'priority').length}
        </p>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">NF</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fornecedor</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Peso (kg)</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Volumes</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Data Entrega</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criticidade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Prédio/Box</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((delivery) => (
              <tr key={delivery.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                <td className="px-6 py-3 text-sm font-semibold text-gray-900">{delivery.numero_nf}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{getSupplierName(delivery.supplier_id)}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{delivery.peso_total.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{delivery.quantidade_volumes}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {new Date(delivery.data_entrega_desejada).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-3 text-sm">{getCriticalityBadge(delivery.criticidade)}</td>
                <td className="px-6 py-3 text-sm">{getStatusBadge(delivery.status)}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {delivery.predio}/{delivery.box || '-'}
                </td>
                <td className="px-6 py-3 text-right text-sm">
                  <button
                    onClick={() => handleEdit(delivery)}
                    className="text-blue-600 hover:text-blue-800 mr-3 inline-flex items-center gap-1"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(delivery.id)}
                    className="text-red-600 hover:text-red-800 inline-flex items-center gap-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDeliveries.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhuma entrega encontrada
          </div>
        )}
      </div>
    </div>
  );
};
