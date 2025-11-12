export {};

import '../../../../public/global';
import '../../../../global';

declare global {
  interface InfoAuditSettings {
    enabled: boolean;
    showTokens: boolean;
    collapseByDefault: boolean;
  }

  interface SillyTavernContext {
    loadWorldInfo: () => Promise<any> | any;
    saveWorldInfo: (data: any) => void;
    reloadEditor: () => void;
    eventSource: {
      on: (event: string, callback: (...args: any[]) => void) => void;
      off?: (event: string, callback: (...args: any[]) => void) => void;
    };
    event_types: Record<string, string>;
    chat?: any[];
    chat_metadata?: Record<string, any>;
  }

  interface SillyTavern {
    getContext: () => SillyTavernContext;
  }
}

// Declare the global variable outside
declare const SillyTavern: SillyTavern;
