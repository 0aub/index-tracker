import { useUIStore } from '../stores/uiStore';

export const WaveAnimation = () => {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Logo in Center - Behind animation */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <img
          src="/logo.png"
          alt="Raqib Logo"
          style={{
            width: '400px',
            height: '400px',
            maxWidth: 'none',
            opacity: 0.15
          }}
        />
      </div>

      {/* Floating Gradient Orbs - Middle layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        <div className={`absolute top-1/4 left-1/4 w-64 h-64 ${isDark ? 'bg-green-400/5' : 'bg-green-500/10'} rounded-full blur-3xl animate-float`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${isDark ? 'bg-green-500/5' : 'bg-green-600/10'} rounded-full blur-3xl animate-float`} style={{ animationDelay: '1.5s' }} />
        <div className={`absolute top-1/2 right-1/3 w-72 h-72 ${isDark ? 'bg-green-300/5' : 'bg-green-400/10'} rounded-full blur-3xl animate-float`} style={{ animationDelay: '3s' }} />
      </div>

      {/* Animated Wave Squares - On top of logo */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="relative">
          {[...Array(5)].map((_, i) => {
            const size = 100 + i * 80;
            return (
              <div
                key={i}
                className={`absolute border-2 ${isDark ? 'border-green-400/20' : 'border-green-600/20'} animate-wave-rotate`}
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${8 + i * 2}s`,
                  left: '50%',
                  top: '50%',
                  marginLeft: `${-size / 2}px`,
                  marginTop: `${-size / 2}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none z-5"
        style={{
          backgroundImage: `
            linear-gradient(${isDark ? 'rgba(74, 222, 128, 0.3)' : 'rgba(34, 197, 94, 0.3)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? 'rgba(74, 222, 128, 0.3)' : 'rgba(34, 197, 94, 0.3)'} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
};
