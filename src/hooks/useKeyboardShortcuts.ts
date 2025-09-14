import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  target?: EventTarget | null;
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) => {
  const { enabled = true, target = null } = options;

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const activeElement = document.activeElement as HTMLElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       activeElement.isContentEditable)
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = Boolean(shortcut.ctrl) === event.ctrlKey;
      const metaMatches = Boolean(shortcut.meta) === event.metaKey;
      const shiftMatches = Boolean(shortcut.shift) === event.shiftKey;
      const altMatches = Boolean(shortcut.alt) === event.altKey;

      return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.callback();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    const targetElement = target || window;
    
    if (enabled) {
      targetElement.addEventListener('keydown', handleKeyPress as EventListener);
    }

    return () => {
      targetElement.removeEventListener('keydown', handleKeyPress as EventListener);
    };
  }, [handleKeyPress, enabled, target]);

  return { shortcuts };
};

// Pre-defined shortcut configurations for common use cases
export const createChartShortcuts = (actions: {
  onSearch: () => void;
  onToggleTrade: () => void;
  onLayout1: () => void;
  onLayout2: () => void;
  onLayout4: () => void;
  onNextTimeframe: () => void;
  onPrevTimeframe: () => void;
}): KeyboardShortcut[] => [
  {
    key: 's',
    callback: actions.onSearch,
    description: 'Search symbols'
  },
  {
    key: 't',
    callback: actions.onToggleTrade,
    description: 'Toggle trade panel'
  },
  {
    key: '1',
    meta: true,
    callback: actions.onLayout1,
    description: 'Switch to 1-pane layout'
  },
  {
    key: '2',
    meta: true,
    callback: actions.onLayout2,
    description: 'Switch to 2-pane layout'
  },
  {
    key: '4',
    meta: true,
    callback: actions.onLayout4,
    description: 'Switch to 4-pane layout'
  },
  {
    key: 'ArrowRight',
    callback: actions.onNextTimeframe,
    description: 'Next timeframe'
  },
  {
    key: 'ArrowLeft', 
    callback: actions.onPrevTimeframe,
    description: 'Previous timeframe'
  }
];