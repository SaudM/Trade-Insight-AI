import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MaterialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Material Design 风格的按钮组件
 * 
 * 特性：
 * - 涟漪动画效果
 * - 多种变体样式（填充、轮廓、文本、色调、提升）
 * - 加载状态支持
 * - 符合 MD 规范的尺寸和间距
 * - 无障碍访问支持
 */
export const MaterialButton: React.FC<MaterialButtonProps> = ({
  variant = 'filled',
  size = 'medium',
  loading = false,
  className,
  children,
  onClick,
  disabled,
  ...props
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 处理涟漪动画
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const size = Math.max(rect.width, rect.height);

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    // 移除涟漪动画
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 700);

    onClick?.(event);
  };

  // 基础样式
  const baseStyles = cn(
    'relative overflow-hidden font-medium transition-all duration-300 ease-in-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60',
    'active:scale-[0.98]',
    'rounded-full' // 统一使用全圆角
  );

  // 变体样式
  const variantStyles = {
    filled: cn(
      'bg-primary text-on-primary shadow-sm hover:shadow-md',
      'focus-visible:ring-primary',
      'disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none'
    ),
    outlined: cn(
      'border border-outline text-primary bg-transparent hover:bg-primary/10',
      'focus-visible:ring-primary',
      'disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent'
    ),
    text: cn(
      'text-primary bg-transparent hover:bg-primary/10',
      'focus-visible:ring-primary',
      'disabled:text-gray-400 disabled:hover:bg-transparent'
    ),
    tonal: cn(
      'bg-secondary-container text-on-secondary-container shadow-sm hover:shadow-md',
      'focus-visible:ring-secondary-container',
      'disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none'
    ),
    elevated: cn(
      'bg-surface text-primary shadow-md hover:shadow-lg',
      'focus-visible:ring-primary',
      'disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none'
    ),
  };

  // 尺寸样式
  const sizeStyles = {
    small: 'px-4 py-1.5 text-sm min-h-[32px]',
    medium: 'px-6 py-2 text-base min-h-[40px]',
    large: 'px-8 py-3 text-lg min-h-[48px]',
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      onClick={handleClick}
      disabled={disabled || loading}
      {...props}
    >
      {/* 涟漪动画 */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute bg-current opacity-20 rounded-full"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              transform: 'translate(-50%, -50%) scale(0)',
              animation: 'ripple 700ms ease-out forwards',
            }}
          />
        ))}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 按钮内容 */}
      <span className={cn('relative z-10 flex items-center justify-center gap-2', loading && 'opacity-0')}>
        {children}
      </span>

      <style jsx>{`
        @keyframes ripple {
          from {
            transform: translate(-50%, -50%) scale(0);
            opacity: 0.4;
          }
          to {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
};