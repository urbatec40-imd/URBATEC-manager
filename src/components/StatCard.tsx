import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  color?: 'blue' | 'amber' | 'green' | 'red' | 'orange' | 'slate' | 'purple';
}

export function StatCard({
  label,
  value,
  icon,
  color = 'slate',
}: StatCardProps) {
  const colors = {
    blue: 'border-l-blue-500 bg-blue-50',
    amber: 'border-l-amber-500 bg-amber-50',
    green: 'border-l-green-500 bg-green-50',
    red: 'border-l-red-500 bg-red-50',
    orange: 'border-l-orange-500 bg-orange-50',
    slate: 'border-l-slate-500 bg-slate-50',
    purple: 'border-l-purple-500 bg-purple-50',
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${colors[color]} p-4 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
        </div>
        {icon && (
          <div className="text-gray-400 opacity-60">{icon}</div>
        )}
      </div>
    </div>
  );
}
