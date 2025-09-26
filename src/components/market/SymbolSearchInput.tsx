import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, Building2, Coins } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { symbolSearchService, StockSymbol } from '@/services/symbolSearch';
import { cn } from '@/lib/utils';

interface SymbolSearchInputProps {
  onSymbolSelect: (symbol: string, symbolInfo?: StockSymbol) => void;
  placeholder?: string;
  className?: string;
  showPrices?: boolean;
  selectedSymbol?: string;
}

export function SymbolSearchInput({ 
  onSymbolSelect, 
  placeholder = "Search any stock, ETF, or crypto...",
  className = "",
  showPrices = true,
  selectedSymbol
}: SymbolSearchInputProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<StockSymbol[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    const searchSymbols = async () => {
      setIsLoading(true);
      try {
        const results = await symbolSearchService.searchSymbols(searchTerm, 15);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchSymbols, 200);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSelect = (symbol: string, symbolInfo?: StockSymbol) => {
    setOpen(false);
    onSymbolSelect(symbol, symbolInfo);
    setSearchTerm("");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'etf':
        return <Building2 className="w-3 h-3" />;
      case 'crypto':
        return <Coins className="w-3 h-3" />;
      default:
        return <TrendingUp className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'etf':
        return 'text-blue-500';
      case 'crypto':
        return 'text-orange-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between min-w-[250px] text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <span className="truncate">
                {selectedSymbol || placeholder}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search stocks, ETFs, crypto..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : searchTerm ? (
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
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Type to search symbols
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {searchResults.map((stock) => (
                  <CommandItem
                    key={stock.symbol}
                    value={stock.symbol}
                    onSelect={() => handleSelect(stock.symbol, stock)}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("flex items-center", getTypeColor(stock.type))}>
                        {getTypeIcon(stock.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stock.symbol}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {stock.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {stock.name}
                        </p>
                      </div>
                    </div>
                    {showPrices && stock.price && (
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          ${stock.price.toFixed(2)}
                        </div>
                        {stock.change !== undefined && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs",
                            stock.change >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {stock.change >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>
                              {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)}
                              {stock.change_percent && ` (${stock.change_percent.toFixed(1)}%)`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}