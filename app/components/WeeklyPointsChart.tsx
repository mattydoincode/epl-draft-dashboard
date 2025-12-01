'use client';

import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';

interface WeeklyData {
  week: number;
  [key: string]: number;
}

interface TeamSummary {
  entryId: number;
  teamName: string;
  shortName: string;
}

interface WeeklyPointsChartProps {
  weeklyData: WeeklyData[];
  teamSummaries: TeamSummary[];
  getTeamColorClasses: (entryId: number, index: number) => string;
}

const colorMap: { [key: string]: string } = {
  'bg-blue-100': '#3B82F6',
  'bg-purple-100': '#A855F7',
  'bg-green-100': '#22C55E',
  'bg-yellow-100': '#EAB308',
  'bg-red-100': '#EF4444',
  'bg-indigo-100': '#6366F1',
  'bg-pink-100': '#EC4899',
  'bg-orange-100': '#F97316',
  'bg-teal-100': '#14B8A6',
  'bg-cyan-100': '#06B6D4',
  'bg-lime-100': '#84CC16',
  'bg-emerald-100': '#10B981',
  'bg-rose-100': '#F43F5E',
  'bg-fuchsia-100': '#D946EF',
  'bg-violet-100': '#8B5CF6',
  'bg-amber-100': '#F59E0B',
};

export default function WeeklyPointsChart({ weeklyData, teamSummaries, getTeamColorClasses }: WeeklyPointsChartProps) {
  const chartData = {
    labels: weeklyData.map(d => `GW ${d.week}`),
    datasets: teamSummaries.map((team, index) => {
      const colorClasses = getTeamColorClasses(team.entryId, index);
      const bgClass = colorClasses.split(' ')[0];
      const color = colorMap[bgClass] || '#3B82F6';

      return {
        label: team.teamName,
        data: weeklyData.map(d => d[`team_${team.entryId}`] || null),
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHitRadius: 10,
      };
    }),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'point' as const,
      intersect: true,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#111827',
        bodyColor: '#111827',
        borderColor: '#D1D5DB',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (context) => {
            return context[0].label || '';
          },
          label: (context) => {
            const teamName = context.dataset.label || 'Unknown';
            const points = context.parsed.y;
            return `${teamName}: ${points} points`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: '#F3F4F6',
        },
        title: {
          display: true,
          text: 'Gameweek',
          color: '#6B7280',
        },
      },
      y: {
        grid: {
          display: true,
          color: '#F3F4F6',
        },
        title: {
          display: true,
          text: 'Points',
          color: '#6B7280',
        },
        beginAtZero: true,
      },
    },
  };

  if (!weeklyData || weeklyData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Weekly Points by Team
      </h3>
      <div style={{ height: '400px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

