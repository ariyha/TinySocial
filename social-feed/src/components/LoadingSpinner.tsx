import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-emerald-400 rounded-full animate-spin" style={{ animationDelay: '0.15s', animationDuration: '1s' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
