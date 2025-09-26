import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SymbolSearchInputProps {
  onSymbolSelect: (symbol: string) => void;
  placeholder?: string;
  className?: string;
}

const popularSymbols = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
  'SPY', 'QQQ', 'IWM', 'VTI', 'GLD', 'SLV', 'TLT', 'HYG'
];

export function SymbolSearchInput({ 
  onSymbolSelect, 
  placeholder = "Search symbols...",
  className = ""
}: SymbolSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSymbols = popularSymbols.filter(symbol =>
    symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (symbol: string) => {
    setValue(symbol);
    setOpen(false);
    onSymbolSelect(symbol);
    setSearchTerm("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const symbol = searchTerm.trim().toUpperCase();
      handleSelect(symbol);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            <Search className="w-4 h-4 mr-2" />
            {value || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Type symbol..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
              onKeyDown={handleKeyPress}
            />
            <CommandEmpty>
              {searchTerm && (
                <div className="p-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleSelect(searchTerm.toUpperCase())}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Search "{searchTerm.toUpperCase()}"
                  </Button>
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredSymbols.map((symbol) => (
                <CommandItem
                  key={symbol}
                  value={symbol}
                  onSelect={() => handleSelect(symbol)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {symbol}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}