"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FloatingLabelInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

/**
 * Material Design风格的浮动标签输入组件
 * 
 * 特性：
 * - 浮动标签动画效果
 * - 聚焦状态的视觉反馈
 * - 错误状态显示
 * - 符合MD设计规范的样式
 */
const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ className, label, error, helperText, required, type, startIcon, endIcon, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      setHasValue(e.target.value !== '')
      props.onBlur?.(e)
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value !== '')
      props.onChange?.(e)
    }
    
    React.useEffect(() => {
      if (props.value !== undefined) {
        setHasValue(String(props.value) !== '')
      }
    }, [props.value])
    
    const isLabelFloating = isFocused || hasValue || type === 'date'
    const hasError = !!error
    
    return (
      <div className="relative">
        <div className="relative">
          {/* 开始图标 */}
          {startIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 z-10">
              {startIcon}
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              // 基础样式 - 完全透明背景，遵循MD默认风格
              "peer w-full h-14 pt-6 pb-2 text-base bg-transparent border-b border-t-0 border-l-0 border-r-0 transition-all duration-200 ease-out",
              // 动态左右内边距
              startIcon ? "pl-12 pr-4" : "px-4",
              endIcon && !startIcon && "pr-12",
              endIcon && startIcon && "pr-12",
              // 边框样式
              "border-gray-300 hover:border-gray-400",
              // 聚焦状态
              "focus:outline-none focus:border-transparent focus:ring-0",
              // 错误状态
              hasError && "border-red-500",
              // 禁用状态 - 移除背景色
              "disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed",
              className
            )}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            placeholder={(isFocused && isLabelFloating) ? (props.placeholder || "") : " "}
            {...props}
          />
          
          {/* MD 标准聚焦指示线 */}
          <div className={cn(
            "absolute bottom-0 left-0 h-0.5 w-full transform scale-x-0 transition-transform duration-200 ease-out",
            "peer-focus:scale-x-100",
            hasError ? "bg-red-500" : "bg-blue-600"
          )} />
          
          {/* 结束图标 */}
          {endIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 z-10">
              {endIcon}
            </div>
          )}
          
          {/* 浮动标签 */}
          <label
            className={cn(
              // 基础样式
              "absolute text-gray-500 pointer-events-none transition-all duration-200 ease-out",
              // 动态左边距
              startIcon ? "left-12" : "left-4",
              // 默认位置（未聚焦且无值）
              !isLabelFloating && "top-1/2 -translate-y-1/2 text-base",
              // 浮动位置（聚焦或有值）
              isLabelFloating && "top-2 text-xs font-medium",
              // 聚焦状态颜色
              isFocused && !hasError && "text-blue-500",
              // 错误状态颜色
              hasError && "text-red-500"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          

        </div>
        
        {/* 错误消息 */}
        {(error || helperText) && (
          <p className={cn(
            "mt-2 text-xs flex items-center gap-1",
            error ? "text-red-600" : "text-gray-600"
          )}>
            {error && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }