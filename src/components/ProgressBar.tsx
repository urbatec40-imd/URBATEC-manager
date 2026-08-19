import { couleurAvancement } from '@/utils/helpers';

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  height?: string;
}

export function ProgressBar({
  value,
  showLabel = true,
  height = 'h-2',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 ${height} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${couleurAvancement(pct)} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-gray-600 min-w-[2.5rem] text-right">
          {pct}%
        </span>
      )}
    </div>
  );
}
