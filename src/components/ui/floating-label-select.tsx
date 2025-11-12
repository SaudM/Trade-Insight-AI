"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FloatingLabelSelectProps {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

/**
 * Material Design风格的浮动标签选择器组件
 * 
 * 特性：
 * - 浮动标签动画效果
 * - 聚焦状态的视觉反馈
 * - 错误状态显示
 * - 符合MD设计规范的样式
 */
const FloatingLabelSelect = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  FloatingLabelSelectProps
>(({ label, error, helperText, required, placeholder, value, onValueChange, children, disabled, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const hasValue = !!value
  const isLabelFloating = isOpen || hasValue
  const hasError = !!error
  
  return (
    <div className="relative">
      <SelectPrimitive.Root 
        value={value} 
        onValueChange={onValueChange}
        onOpenChange={setIsOpen}
        disabled={disabled}
      >
        <div className="relative">
          <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
              // 基础样式
              "flex w-full h-14 items-center justify-between px-4 pt-6 pb-2 text-base bg-transparent border-b border-t-0 border-l-0 border-r-0 transition-all duration-200 ease-out",
              // 边框样式
              "border-gray-300 hover:border-gray-400",
              // 聚焦状态
              "focus:outline-none focus:border-transparent focus:ring-0 data-[state=open]:border-transparent",
              // 错误状态
              hasError && "border-red-500",
              // 禁用状态
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 disabled:cursor-not-allowed",
              // 文本样式
              !hasValue && "text-gray-500"
            )}
            {...props}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
                <ChevronDown className="h-5 w-5 text-gray-600 transition-transform duration-200 data-[state=open]:rotate-180" />
              </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            
            {/* MD 标准聚焦指示线 */}
            <div className={cn(
              'absolute bottom-0 left-0 h-0.5 w-full transform scale-x-0 transition-transform duration-200 ease-out',
              'peer-focus:scale-x-100 peer-data-[state=open]:scale-x-100',
              error ? 'bg-red-500' : 'bg-blue-600'
            )} />
          
          {/* 浮动标签 */}
          <label
            className={cn(
              // 基础样式
              "absolute left-4 text-gray-500 pointer-events-none transition-all duration-200 ease-out",
              // 默认位置（未聚焦且无值）
              !isLabelFloating && "top-1/2 -translate-y-1/2 text-base",
              // 浮动位置（聚焦或有值）
              isLabelFloating && "top-2 text-xs font-medium",
              // 聚焦状态颜色
              isOpen && !hasError && "text-blue-500",
              // 错误状态颜色
              hasError && "text-red-500"
            )}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {/* 底部边框动画 */}
          <div
            className={cn(
              "absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-200 ease-out",
              isOpen && !hasError ? "w-full" : "w-0",
              hasError && "bg-red-500"
            )}
          />
        </div>
        
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-lg",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      
      {/* 辅助文本或错误消息 */}
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
})

FloatingLabelSelect.displayName = "FloatingLabelSelect"

// 选择项组件
const FloatingLabelSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      // 右侧勾选图标采用绝对定位，为避免与文本重叠，这里增加右内边距
      "relative flex w-full cursor-default select-none items-center rounded-lg py-3 pl-3 pr-10 text-sm outline-none",
      "focus:bg-blue-50 focus:text-blue-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "hover:bg-gray-50 transition-colors duration-150",
      className
    )}
    {...props}
  >
    <span className="absolute right-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-blue-600" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))

FloatingLabelSelectItem.displayName = "FloatingLabelSelectItem"

export { FloatingLabelSelect, FloatingLabelSelectItem }