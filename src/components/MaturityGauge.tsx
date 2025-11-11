interface MaturityGaugeProps {
  value: number;
  maxValue?: number;
  size?: number;
  label?: string;
  sublabel?: string;
}

const MaturityGauge = ({
  value,
  maxValue = 5,
  size = 200,
  label = '',
  sublabel = ''
}: MaturityGaugeProps) => {
  const percentage = (value / maxValue) * 100;
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (val: number) => {
    if (val < 1) return '#E74C3C';
    if (val < 2) return '#F39C12';
    if (val < 3) return '#F1C40F';
    if (val < 4) return '#52BE80';
    if (val < 5) return '#3498DB';
    return '#9B59B6';
  };

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
            stroke={getColor(value)}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-bold" style={{ color: getColor(value) }}>
            {value.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">من {maxValue}</div>
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
