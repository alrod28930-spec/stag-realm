import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { DividendCalculator } from '@/components/dividends/DividendCalculator';
import { Calculator } from 'lucide-react';

interface DividendButtonProps {
  symbol: string;
  shares?: number;
  currentPrice?: number;
}

export const DividendButton: React.FC<DividendButtonProps> = ({
  symbol,
  shares = 0,
  currentPrice = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calculator className="w-4 h-4" />
          Dividends
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader>
          <DrawerTitle>Dividend Calculator - {symbol}</DrawerTitle>
        </DrawerHeader>
        <div className="p-6 overflow-y-auto">
          <DividendCalculator
            symbol={symbol}
            shares={shares}
            currentPrice={currentPrice}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};