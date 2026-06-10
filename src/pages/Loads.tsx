import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Load, Delivery, Supplier } from '@/types';
import { Plus, Edit2, Trash2, Search, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

const MAX_WEIGHT = 7800; // kg

export const Loads: React.FC = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [filteredLoads, setFilteredLoads] = useState<Load[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadItems, setLoadItems] = useState<Map<string, Delivery[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<Load>>({
    rota: 'morning',
    status: 'planning',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = loads.filter(load =>
      load.numero_carga.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLoads(filtered);
  }, [searchTerm, loads]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar cargas
      const { data: loadsData, error: loadsError } = await supabase
        .from('cargas')
        .select('*');
      if (loadsError) throw loadsError;
      setLoads((loadsData as Load[]) || []);

      // Carregar entregas
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('entregas')
        .select('*');
      if (deliveriesError) throw deliveriesError;
      setDeliveries((deliveriesData as Delivery[]) || []);

      // Carregar fornecedores
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('fornecedores')
        .select('*');
      if (suppliersError) throw suppliersError;
      setSuppliers((suppliersData as Supplier[]) || []);

      // Carregar itens das cargas
      const { data: itemsData, error: itemsError } = await supabase
        .from('itens_carga')
        .select('*');
      if (itemsError) throw itemsError;

      const itemsMap = new Map<string, Delivery[]>();
      if (itemsData) {
        for (const item of itemsData) {
          const delivery = (deliveriesData as Delivery[])?.find(d => d.id === item.entrega_id);
          if (delivery) {
            if (!itemsMap.has(item.carga_id)) {
              itemsMap.set(item.carga_id, []);
            }
            itemsMap.get(item.carga_id)!.push(delivery);
          }
        }
      }
      setLoadItems(itemsMap);
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.razao_social || 'N/A';
  };

  const calculateOccupancy = (loadId: string): number => {
    const items = loadItems.get(loadId) || [];
    const totalWeight = items.reduce((sum, d) => sum + d.peso_total, 0);
    return Math.round((totalWeight / MAX_WEIGHT) * 100);
  };

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy <= 85) return 'bg-green-500';
    if (occupancy <= 95) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleAddDeliveriesToLoad = async (loadId: string) => {
    if (selectedDeliveries.length === 0) {
      toast.error('Selecione pelo menos uma entrega');
      return;
    }

    try {
      const items = selectedDeliveries.map((deliveryId, index) => ({
        carga_id: loadId,
        entrega_id: deliveryId,
        sequencia: (loadItems.get(loadId)?.length || 0) + index + 1,
      }));

      const { error } = await supabase.from('itens_carga').insert(items);
      if (error) throw error;

      // Atualizar peso e volumes da carga
      const addedDeliveries = deliveries.filter(d => selectedDeliveries.includes(d.id));
      const totalWeight = addedDeliveries.reduce((sum, d) => sum + d.peso_total, 0);
      const totalVolumes = addedDeliveries.reduce((sum, d) => sum + d.quantidade_volumes, 0);

      const currentItems = loadItems.get(loadId) || [];
      const currentWeight = currentItems.reduce((sum, d) => sum + d.peso_total, 0);
      const currentVolumes = currentItems.reduce((sum, d) => sum + d.quantidade_volumes, 0);

      const occupancy = Math.round(((currentWeight + totalWeight) / MAX_WEIGHT) * 100);

      const { error: updateError } = await supabase
        .from('cargas')
        .update({
          peso_total: currentWeight + totalWeight,
          quantidade_volumes: currentVolumes + totalVolumes,
          percentual_ocupacao: occupancy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loadId);
      if (updateError) throw updateError;

      toast.success('Entregas adicionadas à carga!');
      setSelectedDeliveries([]);
      loadData();
    } catch (error) {
      toast.error('Erro ao adicionar entregas');
      console.error(error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numero_carga || !formData.data_programada) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('cargas')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Carga atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('cargas').insert([{
          ...formData,
          peso_total: 0,
          quantidade_volumes: 0,
          percentual_ocupacao: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
        if (error) throw error;
        toast.success('Carga criada com sucesso!');
      }

      setFormData({ rota: 'morning', status: 'planning' });
      setEditingId(null);
      setShowForm(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar carga');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta carga?')) return;

    try {
      const { error: itemsError } = await supabase
        .from('itens_carga')
        .delete()
        .eq('carga_id', id);
      if (itemsError) throw itemsError;

      const { error } = await supabase.from('cargas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Carga deletada com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao deletar carga');
      console.error(error);
    }
  };

  const handleEdit = (load: Load) => {
    setFormData(load);
    setEditingId(load.id);
    setShowForm(true);
  };

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');

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
          <h1 className="text-3xl font-bold text-gray-900">Cargas</h1>
          <p className="text-gray-600 mt-2">Montagem e gerenciamento de cargas (Limite: {MAX_WEIGHT.toLocaleString('pt-BR')} kg)</p>
        </div>
        <button
          onClick={() => {
            setFormData({ rota: 'morning', status: 'planning' });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          <span>Nova Carga</span>
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{editingId ? 'Editar Carga' : 'Nova Carga'}</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da Carga *</label>
                <input
                  type="text"
                  placeholder="Ex: CRG-001"
                  value={formData.numero_carga || ''}
                  onChange={(e) => setFormData({ ...formData, numero_carga: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rota</label>
                <select
                  value={formData.rota || 'morning'}
                  onChange={(e) => setFormData({ ...formData, rota: e.target.value as 'morning' | 'afternoon' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="morning">Manhã</option>
                  <option value="afternoon">Tarde</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Programada *</label>
                <input
                  type="date"
                  value={formData.data_programada || ''}
                  onChange={(e) => setFormData({ ...formData, data_programada: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status || 'planning'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="planning">Planejamento</option>
                  <option value="in_separation">Em Separação</option>
                  <option value="loaded">Carregado</option>
                  <option value="sent">Enviado</option>
                  <option value="delivered">Entregue</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea
                value={formData.observacoes || ''}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais"
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                {editingId ? 'Atualizar' : 'Criar'}
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
            placeholder="Pesquisar por número da carga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Grid de Cargas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLoads.map((load) => {
          const occupancy = calculateOccupancy(load.id);
          const items = loadItems.get(load.id) || [];
          const totalWeight = items.reduce((sum, d) => sum + d.peso_total, 0);
          const totalVolumes = items.reduce((sum, d) => sum + d.quantidade_volumes, 0);
          const isExceeded = occupancy > 100;

          return (
            <div key={load.id} className={`rounded-lg shadow-sm overflow-hidden ${
              isExceeded ? 'border-2 border-red-500' : 'border border-gray-200'
            } bg-white`}>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold">{load.numero_carga}</h3>
                    <p className="text-blue-100">Rota: {load.rota === 'morning' ? '🌅 Manhã' : '🌙 Tarde'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-100">Data: {new Date(load.data_programada).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-blue-100">Status: {load.status}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Occupancy Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">Ocupação</span>
                    <span className={`text-sm font-bold ${isExceeded ? 'text-red-600' : 'text-gray-900'}`}>
                      {occupancy}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${getOccupancyColor(occupancy)}`}
                      style={{ width: `${Math.min(occupancy, 100)}%` }}
                    />
                  </div>
                  {isExceeded && (
                    <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ EXCEDE LIMITE DE PESO</p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600">Peso</p>
                    <p className="text-lg font-bold text-gray-900">{totalWeight.toLocaleString('pt-BR')}</p>
                    <p className="text-xs text-gray-600">kg</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600">Volumes</p>
                    <p className="text-lg font-bold text-gray-900">{totalVolumes}</p>
                    <p className="text-xs text-gray-600">un</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-600">Entregas</p>
                    <p className="text-lg font-bold text-gray-900">{items.length}</p>
                    <p className="text-xs text-gray-600">nf</p>
                  </div>
                </div>

                {/* Items */}
                {items.length > 0 ? (
                  <div className="mb-4 bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Entregas</p>
                    <div className="space-y-1">
                      {items.map((item, idx) => (
                        <div key={item.id} className="text-xs text-gray-600 flex justify-between">
                          <span>{idx + 1}. {getSupplierName(item.supplier_id)}</span>
                          <span>{item.peso_total}kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 bg-yellow-50 rounded p-3 border border-yellow-200">
                    <p className="text-xs text-yellow-800">Nenhuma entrega adicionada</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(load)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition text-sm"
                  >
                    <Edit2 size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(load.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded transition text-sm"
                  >
                    <Trash2 size={16} />
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Entregas Disponíveis */}
      {pendingDeliveries.length > 0 && (
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Entregas Disponíveis ({pendingDeliveries.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {pendingDeliveries.map((delivery) => (
              <label key={delivery.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDeliveries.includes(delivery.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDeliveries([...selectedDeliveries, delivery.id]);
                    } else {
                      setSelectedDeliveries(selectedDeliveries.filter(id => id !== delivery.id));
                    }
                  }}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{delivery.numero_nf}</p>
                  <p className="text-sm text-gray-600">{getSupplierName(delivery.supplier_id)}</p>
                  <p className="text-xs text-gray-500">{delivery.peso_total}kg | {delivery.quantidade_volumes} volumes</p>
                </div>
              </label>
            ))}
          </div>
          {filteredLoads.length > 0 && (
            <div className="flex gap-4">
              <select
                id="loadSelect"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Selecione uma carga</option>
                {filteredLoads.map(load => (
                  <option key={load.id} value={load.id}>
                    {load.numero_carga}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const loadId = (document.getElementById('loadSelect') as HTMLSelectElement).value;
                  if (loadId) {
                    handleAddDeliveriesToLoad(loadId);
                  } else {
                    toast.error('Selecione uma carga');
                  }
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <TrendingUp size={20} />
                Adicionar à Carga
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
