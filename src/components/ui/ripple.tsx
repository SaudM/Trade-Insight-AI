"use client";
import React, { useState, useLayoutEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

interface RippleProps {
  duration?: number;
  color?: string;
}

export interface RippleRef {
  addRipple: (event: React.MouseEvent) => void;
}

interface RippleItem {
  x: number;
  y: number;
  size: number;
  id: number;
}

/**
 * 优化的水波纹清理逻辑Hook
 * 减少清理延迟时间，提高响应速度
 */
const useDebouncedRippleCleanUp = (rippleCount: number, duration: number, cleanUpFunction: () => void) => {
  useLayoutEffect(() => {
    let bounce: NodeJS.Timeout | undefined;
    if (rippleCount > 0) {
      clearTimeout(bounce);
      // 减少清理延迟时间从 duration * 4 到 duration * 1.2
      bounce = setTimeout(() => {
        cleanUpFunction();
        clearTimeout(bounce);
      }, duration * 1.2);
    }
    return () => clearTimeout(bounce);
  }, [rippleCount, duration, cleanUpFunction]);
};

/**
 * 水波纹组件
 * 优化了动画时间和清理逻辑，减少点击反馈延迟
 */
const Ripple = forwardRef<RippleRef, RippleProps>(({ duration = 400, color = '#ffffff' }, ref) => {
  const [rippleArray, setRippleArray] = useState<Array<RippleItem>>([]);
  const [rippleId, setRippleId] = useState(0);

  // 优化清理函数，限制最大水波纹数量
  const cleanUpFunction = useCallback(() => {
    setRippleArray([]);
  }, []);

  useDebouncedRippleCleanUp(rippleArray.length, duration, cleanUpFunction);

  const addRipple = useCallback((event: React.MouseEvent) => {
    const target = event.currentTarget as HTMLElement;
    const rippleContainer = target.getBoundingClientRect();
    const size = rippleContainer.width > rippleContainer.height ? rippleContainer.width : rippleContainer.height;
    const x = event.pageX - rippleContainer.x - size / 2;
    const y = event.pageY - rippleContainer.y - size / 2;
    
    const newRipple: RippleItem = { x, y, size, id: rippleId };
    
    // 限制最大水波纹数量，避免过多叠加
    setRippleArray(prev => {
      const newArray = [...prev, newRipple];
      // 最多保留3个水波纹，移除最旧的
      return newArray.length > 3 ? newArray.slice(-3) : newArray;
    });
    
    setRippleId(prev => prev + 1);
    
    // 为每个水波纹设置独立的清理定时器
    setTimeout(() => {
      setRippleArray(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  }, [duration, rippleId]);

  useImperativeHandle(ref, () => ({
    addRipple
  }));

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden pointer-events-none">
      {rippleArray.length > 0 &&
        rippleArray.map((ripple) => {
          return (
            <span
              key={`ripple_${ripple.id}`}
              className="absolute rounded-full bg-current opacity-25 animate-ripple"
              style={{
                top: ripple.y,
                left: ripple.x,
                width: ripple.size,
                height: ripple.size,
                animationDuration: `${duration}ms`,
              }}
            />
          );
        })}
    </div>
  );
});

Ripple.displayName = "Ripple";

export default Ripple;