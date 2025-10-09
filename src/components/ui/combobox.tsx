
"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type ComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  suggestions?: { value: string; label: string }[];
};

export function Combobox({
  value,
  onChange,
  placeholder = "搜索或输入股票...",
  emptyText = "未找到历史记录。",
  className,
  suggestions = [],
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabel = React.useMemo(() => {
    if (!value) return placeholder;
    const selectedOption = suggestions.find(option => option.value.toLowerCase() === value.toLowerCase())
    return selectedOption?.label || value
  }, [value, suggestions, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          filter={(itemValue, search) => {
            if (itemValue.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
          <CommandInput
            placeholder={placeholder}
            onBlur={(e) => {
                const inputValue = e.target.value;
                onChange(inputValue.toUpperCase());
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-sm text-center">
                没有找到历史记录。
                <br />
                输入新标的后按回车或失焦即可添加。
              </div>
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue.toUpperCase() === value ? "" : currentValue.toUpperCase())
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
