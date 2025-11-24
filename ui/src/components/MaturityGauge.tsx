import { getLevelColor, getIndexConfig } from '../config/indexConfigs';

interface MaturityGaugeProps {
  value: number;
  indexType: string;  // NEW: Index type to determine config
  size?: number;
  label?: string;
  sublabel?: string;
  lang?: 'ar' | 'en';
}

const MaturityGauge = ({
  value,
  indexType,
  size = 200,
  label = '',
  sublabel = '',
  lang = 'ar'
}: MaturityGaugeProps) => {
  // Get config for this index type
  const config = getIndexConfig(indexType);
  const maxValue = config.maxLevel;

  const percentage = (value / maxValue) * 100;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Get color based on current level (rounded down)
  const currentLevelColor = getLevelColor(indexType, Math.floor(value));

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={currentLevelColor}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold" style={{ color: currentLevelColor }}>
            {value.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            {lang === 'ar' ? `من ${maxValue}` : `of ${maxValue}`}
          </div>
        </div>
      </div>
      {label && (
        <div className="mt-4 text-center">
          <div className="text-lg font-semibold text-gray-800">{label}</div>
          {sublabel && <div className="text-sm text-gray-500">{sublabel}</div>}
        </div>
      )}
    </div>
  );
};

export default MaturityGauge;
