import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import { api } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

interface AnalyticsData {
  moodTrend: { date: string; score: number }[];
  tagDistribution: { name: string; value: number }[];
  totalEntries: number;
  averageMood: number;
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const result = await api.fetchAnalytics();
        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!data || data.totalEntries === 0) {
    return (
      <div className="space-y-4 page-fade">
        <h2 className="text-2xl font-bold text-slate-800">Your Insights</h2>
        <div className="soft-card p-8 text-center text-slate-500">
          <p>No enough data to generate analytics yet.</p>
          <p className="text-sm">Start chatting with MindEase to see your mood trends here!</p>
        </div>
      </div>
    );
  }

  const lineData = {
    labels: data.moodTrend.map((t) => t.date),
    datasets: [
      {
        label: 'Mood Score',
        data: data.moodTrend.map((t) => t.score),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#4f46e5',
      },
    ],
  };

  const doughnutData = {
    labels: data.tagDistribution.map((t) => t.name),
    datasets: [
      {
        data: data.tagDistribution.map((t) => t.value),
        backgroundColor: [
          '#6366f1', // Indigo
          '#10b981', // Emerald
          '#f59e0b', // Amber
          '#3b82f6', // Blue
          '#8b5cf6', // Violet
          '#ec4899', // Pink
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        min: 1,
        max: 10,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="space-y-6 page-fade pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Your Emotional Landscape</h2>
        <p className="text-sm text-slate-500">Reflecting on your journey and identifying patterns.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entries</p>
          <p className="mt-1 text-3xl font-black text-indigo-600">{data.totalEntries}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Mood</p>
          <p className="mt-1 text-3xl font-black text-emerald-600">{data.averageMood}</p>
        </div>
        <div className="soft-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Focus</p>
          <p className="mt-1 text-xl font-bold text-slate-700">
            {data.tagDistribution.length > 0 ? data.tagDistribution.sort((a, b) => b.value - a.value)[0].name : 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="soft-card p-6">
          <h3 className="mb-4 text-sm font-bold text-slate-600">Mood Over Time</h3>
          <div className="h-64">
            <Line data={lineData} options={options} />
          </div>
        </div>

        <div className="soft-card p-6">
          <h3 className="mb-4 text-sm font-bold text-slate-600">Tag Distribution</h3>
          <div className="flex h-64 flex-col items-center justify-center">
            <div className="h-48 w-48">
              <Doughnut data={doughnutData} options={{ plugins: { legend: { display: true, position: 'bottom' } } }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
