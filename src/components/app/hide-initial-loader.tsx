'use client';
import { useEffect } from 'react';

/**
 * 在 React 首次 hydrate 后隐藏服务端注入的纯 CSS 初始加载器（#__il）。
 * 通过在 <html> 上添加 CSS 类来隐藏，而非直接删除 DOM 节点，
 * 避免绕过 React 管理树导致的 insertBefore 错误。
 */
export function HideInitialLoader() {
  useEffect(() => {
    document.documentElement.classList.add('__app-ready');
  }, []);
  return null;
}
