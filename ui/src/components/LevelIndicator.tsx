import { LEVEL_COLORS } from '../utils/calculations';

interface LevelIndicatorProps {
  currentLevel: number;
  maxLevel?: number;
  size?: 'sm' | 'md' | 'lg';
}

const LevelIndicator = ({ currentLevel, maxLevel = 5, size = 'md' }: LevelIndicatorProps) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5'
  };

  return (
    <div className={`flex items-center ${gapClasses[size]}`}>
      {Array.from({ length: maxLevel + 1 }, (_, i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} rounded-full transition-all`}
          style={{
            backgroundColor: i <= currentLevel ? LEVEL_COLORS[i] : '#E5E7EB'
          }}
          title={`المستوى ${i}`}
        />
      ))}
    </div>
  );
};

export default LevelIndicator;
