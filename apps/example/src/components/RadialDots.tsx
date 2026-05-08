type RadialDotsProps = {
  className?: string;
};

export function RadialDots({ className = "" }: RadialDotsProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--color-zinc-300)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] ${className}`}
    />
  );
}
