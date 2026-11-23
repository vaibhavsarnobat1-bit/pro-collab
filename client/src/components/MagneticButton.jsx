import React, { useRef, useState } from 'react';

/* Tailwind tree-shakes @layer components rules whose class name never appears
   as a literal string, so `mbtn-${variant}` would compile to nothing. */
const VARIANT_CLASS = {
  primary: 'mbtn-primary',
  ghost: 'mbtn-ghost',
  ink: 'mbtn-ink'
};

/** Cursor-attracted button — pairs with the tilt/spotlight motion language. */
const MagneticButton = ({
  children,
  className = '',
  strength = 0.25,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  style = {},
  as: Tag = 'button',
  ...props
}) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    if (!ref.current || disabled) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: (e.clientX - r.left - r.width / 2) * strength,
      y: (e.clientY - r.top - r.height / 2) * strength
    });
  };

  const reset = () => setPos({ x: 0, y: 0 });

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onClick}
      type={Tag === 'button' ? type : undefined}
      disabled={Tag === 'button' ? disabled : undefined}
      className={`mbtn ${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${className}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, ...style }}
      {...props}
    >
      {children}
    </Tag>
  );
};

export default MagneticButton;
