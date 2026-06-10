import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { DashboardMetrics, Load, Delivery } from '@/types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Package, Truck, AlertCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Buscar entregas
      const { data: deliveries, error: delivError } = await supabase
        .from('entregas')
        .select('*');

      if (delivError) throw delivError;

      // Buscar cargas
      const { data: loads, error: loadsError } = await supabase
        .from('cargas')
        .select('*');

      if (loadsError) throw loadsError;

      const deliveriesTyped = (deliveries || []) as Delivery[];
      const loadsTyped = (loads || []) as Load[];

      // Calcular métricas
      const pending = deliveriesTyped.filter(d => d.status === 'pending').length;
      const inTransit = deliveriesTyped.filter(d => d.status === 'in_transit').length;
      const completed = deliveriesTyped.filter(d => d.status === 'delivered').length;
      const priority = deliveriesTyped.filter(d => d.criticidade === 'priority' && d.status === 'pending').length;

      const totalWeight = deliveriesTyped.reduce((sum, d) => sum + d.peso_total, 0);
      const totalVolumes = deliveriesTyped.reduce((sum, d) => sum + d.quantidade_volumes, 0);

      const plannedLoads = loadsTyped.filter(l => l.status === 'planning').length;
      const avgOccupancy = loadsTyped.length > 0
        ? loadsTyped.reduce((sum, l) => sum + l.percentual_ocupacao, 0) / loadsTyped.length
        : 0;
      const nextLoad = loadsTyped.sort((a, b) => new Date(a.data_programada).getTime() - new Date(b.data_programada).getTime())[0];

      setMetrics({
        total_entregas_pendentes: pending,
        total_cargas_programadas: plannedLoads,
        peso_total_programado: totalWeight,
        quantidade_volumes_programados: totalVolumes,
        entregas_prioritarias_pendentes: priority,
        entregas_em_transito: inTransit,
        entregas_concluidas: completed,
        ocupacao_media_caminhoes: Math.round(avgOccupancy),
        proxima_carga_programada: nextLoad,
      });

      // Preparar dados para gráficos
      setChartData([
        { name: 'Pendentes', value: pending },
        { name: 'Em Trânsito', value: inTransit },
        { name: 'Concluídas', value: completed },
      ]);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Nenhum dado disponível</div>
      </div>
    );
  }

  const cards: DashboardCard[] = [
    {
      title: 'Entregas Pendentes',
      value: metrics.total_entregas_pendentes,
      icon: <Package className="text-blue-600" size={24} />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Cargas Programadas',
      value: metrics.total_cargas_programadas,
      icon: <Truck className="text-green-600" size={24} />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Peso Total (kg)',
      value: metrics.peso_total_programado.toLocaleString('pt-BR'),
      icon: <TrendingUp className="text-orange-600" size={24} />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Entregas Prioritárias',
      value: metrics.entregas_prioritarias_pendentes,
      icon: <AlertCircle className="text-red-600" size={24} />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral das operações de entregas</p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, index) => (
          <div key={index} className={`${card.bgColor} rounded-lg p-6 shadow-sm hover:shadow-md transition`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                <p className={`${card.color} text-3xl font-bold mt-2`}>{card.value}</p>
              </div>
              <div className="p-3 bg-white rounded-lg">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gráfico de Pizza */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status das Entregas</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo Operacional */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Operacional</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-600">Em Trânsito:</span>
              <span className="font-semibold text-lg">{metrics.entregas_em_transito}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-600">Concluídas:</span>
              <span className="font-semibold text-lg text-green-600">{metrics.entregas_concluidas}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
              <span className="text-gray-600">Ocupação Média:</span>
              <span className="font-semibold text-lg">{metrics.ocupacao_media_caminhoes}%</span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-gray-600">Total de Volumes:</span>
              <span className="font-semibold text-lg">{metrics.quantidade_volumes_programados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Próxima Carga */}
      {metrics.proxima_carga_programada && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Próxima Carga Programada</h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 text-sm">Número da Carga</p>
                <p className="font-semibold text-lg">{metrics.proxima_carga_programada.numero_carga}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Rota</p>
                <p className="font-semibold text-lg capitalize">{metrics.proxima_carga_programada.rota === 'morning' ? 'Manhã' : 'Tarde'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Peso Total</p>
                <p className="font-semibold text-lg">{metrics.proxima_carga_programada.peso_total.toLocaleString('pt-BR')} kg</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Ocupação</p>
                <p className="font-semibold text-lg">{metrics.proxima_carga_programada.percentual_ocupacao}%</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
