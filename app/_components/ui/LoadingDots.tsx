const LoadingDots = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <div className="size-4 bg-mute rounded-full animate-bounce [animation-delay:-0.32s]"></div>
      <div className="size-4 bg-mute rounded-full animate-bounce [animation-delay:-0.16s]"></div>
      <div className="size-4 bg-mute rounded-full animate-bounce"></div>
    </div>
  );
};

export default LoadingDots;
