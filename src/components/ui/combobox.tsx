
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
  placeholder = "Select an option",
  emptyText = "No options found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [options, setOptions] = React.useState<Stock[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStocks() {
      try {
        setIsLoading(true);
        const stockList = await listStocks();
        setOptions(stockList);
      } catch (error) {
        console.error("Failed to fetch stocks:", error);
        // Optionally, set an error state and display a message
      } finally {
        setIsLoading(false);
      }
    }
    fetchStocks();
  }, []);

  React.useEffect(() => {
    const selectedOption = options.find(option => option.value.toLowerCase() === value?.toLowerCase());
    setInputValue(selectedOption ? selectedOption.label : value || "");
  }, [value, options]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // When popover closes, if the input value doesn't correspond to an existing option value,
      // treat it as a custom entry.
      const match = options.find(option => option.label.toLowerCase() === inputValue.toLowerCase());
      if (!match && inputValue) {
         const valueMatch = options.find(option => option.value.toLowerCase() === value?.toLowerCase());
         if (!valueMatch || valueMatch.label !== inputValue) {
            onChange(inputValue);
         }
      }
    }
  };

  const selectedOptionDisplay = React.useMemo(() => {
    if (isLoading) return "加载股票数据...";
    const selected = options.find((option) => option.value.toLowerCase() === value?.toLowerCase());
    return selected ? selected.label : value || placeholder;
  }, [options, value, isLoading, placeholder]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={isLoading}
          className={cn("w-full justify-between", !value && !isLoading && "text-muted-foreground", className)}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
          <span className="truncate">{selectedOptionDisplay}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={placeholder}
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "加载中..." : (
                <CommandItem
                  onSelect={() => {
                    if (inputValue) {
                      onChange(inputValue);
                      setOpen(false);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {`创建 "${inputValue}"`}
                </CommandItem>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options
                .filter(option => option.label.toLowerCase().includes(inputValue.toLowerCase()) || option.value.toLowerCase().includes(inputValue.toLowerCase()))
                .map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === option.value.toLowerCase() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
