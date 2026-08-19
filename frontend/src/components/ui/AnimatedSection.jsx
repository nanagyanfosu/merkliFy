import { useInView } from "../../hooks/useIntersectionObserver";

export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  slideDistance = 24,
}) {
  const [ref, isVisible] = useInView();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    isVisible ? 1 : 0,
        transform:  isVisible
          ? "translateY(0)"
          : `translateY(${slideDistance}px)`,
        transition: `opacity 0.5s ease ${delay}ms,
                     transform 0.5s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}