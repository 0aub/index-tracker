import { getLevelColor, getLevelName, getIndexConfig } from '../config/indexConfigs';

interface LevelIndicatorProps {
  currentLevel: number;
  indexType: string;  // NEW: Index type to determine config
  size?: 'sm' | 'md' | 'lg';
  lang?: 'ar' | 'en';
}

const LevelIndicator = ({ currentLevel, indexType, size = 'md', lang = 'ar' }: LevelIndicatorProps) => {
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

  // Get config to determine number of levels
  const config = getIndexConfig(indexType);
  const levels = Array.from({ length: config.numLevels }, (_, i) => i);

  return (
    <div className={`flex items-center ${gapClasses[size]}`}>
      {levels.map((level) => {
        const isActive = level <= currentLevel;
        const color = getLevelColor(indexType, level);
        const levelName = getLevelName(indexType, level, lang);

        return (
          <div
            key={level}
            className={`${sizeClasses[size]} rounded-full transition-all`}
            style={{
              backgroundColor: isActive ? color : '#E5E7EB'
            }}
            title={levelName || `${lang === 'ar' ? 'المستوى' : 'Level'} ${level}`}
          />
        );
      })}
    </div>
  );
};

export default LevelIndicator;
