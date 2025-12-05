import { colors } from '../../utils/darkMode';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

const LoadingSpinner = ({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Logo with spin animation */}
      <div className="relative">
        <img
          src="/logo.png"
          alt="Loading..."
          className={`${sizeClasses[size]} animate-pulse`}
        />
        {/* Rotating ring around the logo */}
        <div className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-[rgb(var(--color-primary))] rounded-full animate-spin`} />
      </div>
      {text && <p className={`text-sm ${colors.textSecondary}`}>{text}</p>}
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
