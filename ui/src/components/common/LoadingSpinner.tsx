import { colors } from '../../utils/darkMode';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner = ({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) => {
  const sizeConfig = {
    sm: { container: 64, logo: 24, dot: 6, radius: 26 },
    md: { container: 88, logo: 36, dot: 8, radius: 36 },
    lg: { container: 120, logo: 48, dot: 10, radius: 48 }
  };

  const config = sizeConfig[size];

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        style={{
          position: 'relative',
          width: config.container,
          height: config.container,
        }}
      >
        {/* Orbiting dots */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            animation: 'spin 1.8s linear infinite',
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: config.dot,
                height: config.dot,
                borderRadius: '50%',
                background: `rgb(var(--color-primary))`,
                opacity: 1 - (i * 0.12),
                left: '50%',
                top: '50%',
                marginLeft: -config.dot / 2,
                marginTop: -config.dot / 2,
                transform: `rotate(${i * 45}deg) translateY(-${config.radius}px)`,
              }}
            />
          ))}
        </div>

        {/* Center logo */}
        <img
          src="/logo.png"
          alt="Loading..."
          style={{
            position: 'absolute',
            width: config.logo,
            height: config.logo,
            left: '50%',
            top: '50%',
            marginLeft: -config.logo / 2,
            marginTop: -config.logo / 2,
            animation: 'gentlePulse 1.5s ease-in-out infinite',
          }}
        />
      </div>
      {text && <p className={`text-sm ${colors.textSecondary} animate-pulse`}>{text}</p>}

      {/* Inline keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 ${colors.bgPrimary} bg-opacity-95 flex items-center justify-center z-50`}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
