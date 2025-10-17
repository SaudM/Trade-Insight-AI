"use client"

import * as React from "react"
import { FloatingLabelInput } from "./floating-label-input"
import { Lock, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
}

/**
 * Material Design风格的密码输入组件
 * 
 * 特性：
 * - 密码可见性切换
 * - 浮动标签动画效果
 * - 聚焦状态的视觉反馈
 * - 错误状态显示
 * - 完全透明背景，遵循MD默认风格
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, helperText, required, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    const EyeIcon = showPassword ? EyeOff : Eye

    return (
      <FloatingLabelInput
        ref={ref}
        type={showPassword ? "text" : "password"}
        label={label}
        error={error}
        helperText={helperText}
        required={required}
        startIcon={<Lock className="h-5 w-5" />}
        endIcon={
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className={cn(
              "p-1 rounded-full hover:bg-gray-100 transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            )}
            tabIndex={-1}
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        }
        className={className}
        {...props}
      />
    )
  }
)

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }