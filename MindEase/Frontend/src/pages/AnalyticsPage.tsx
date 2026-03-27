import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { sampleMoodData } from '../data/moodData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export function AnalyticsPage() {
  const data = {
    labels: sampleMoodData.labels,
    datasets: [
      {
        label: 'Mood Score (1-10)',
        data: sampleMoodData.moodScores,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
    },
    scales: {
      y: {
        min: 1,
        max: 10,
      },
    },
  };

  return (
    <div className="space-y-4 page-fade">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Simple Mood Analytics</h2>
        <p className="text-sm text-slate-500">Sample weekly trend for your upcoming real mood data integration.</p>
      </div>

      <div className="soft-card p-4">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
