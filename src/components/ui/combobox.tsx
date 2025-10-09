
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

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
import type { Stock } from "@/lib/types"
import { listStocks } from "@/ai/flows/list-stocks-flow"

type ComboboxProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
};

export function Combobox({
  value,
  onChange,
  placeholder = "搜索股票...",
  emptyText = "未找到股票。",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<Stock[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchStocks() {
      try {
        setIsLoading(true)
        const stockList = await listStocks()
        // Deduplicate the list based on the 'value' property to avoid key errors
        const uniqueStocks = Array.from(new Map(stockList.map(item => [item.value.toLowerCase(), item])).values());
        setOptions(uniqueStocks);
      } catch (error) {
        console.error("Failed to fetch stocks:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStocks()
  }, [])

  const selectedLabel = React.useMemo(() => {
    if (!value) return placeholder
    const selectedOption = options.find(option => option.value.toLowerCase() === value.toLowerCase())
    return selectedOption?.label || value
  }, [value, options, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isLoading}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">{isLoading ? "加载中..." : selectedLabel}</span>
          {isLoading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          filter={(value, search) => {
            const stock = options.find(o => o.value === value)
            if (stock) {
              // Search by value (e.g. AAPL) or label (e.g. Apple)
              if (stock.value.toLowerCase().includes(search.toLowerCase())) return 1
              if (stock.label.toLowerCase().includes(search.toLowerCase())) return 1
            }
            return 0
          }}
        >
          <CommandInput
            placeholder={placeholder}
            onBlur={(e) => {
                const inputValue = e.target.value;
                const existingOption = options.find(
                    (option) =>
                        option.label.toLowerCase() === inputValue.toLowerCase() ||
                        option.value.toLowerCase() === inputValue.toLowerCase()
                );
                if (!existingOption && inputValue) {
                    onChange(inputValue.toUpperCase());
                }
            }}
          />
          <CommandList>
            <CommandEmpty>
                {isLoading ? "加载中..." : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
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
