interface SkeletonLoaderProps {
  type?: 'card' | 'table' | 'text' | 'circle';
  count?: number;
}

const SkeletonLoader = ({ type = 'card', count = 1 }: SkeletonLoaderProps) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 rounded w-4/6"></div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 border-t border-gray-200 flex items-center px-6 space-x-4">
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        );

      case 'circle':
        return <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>;

      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

export default SkeletonLoader;
