export {};

// 1. Import for user-scoped extensions
import '../../../../public/global';
// 2. Import for server-scoped extensions
import '../../../../global';

// Define additional types if needed...
declare global {
    // Add global type declarations here
    interface InfoAuditSettings {
        enabled: boolean;
        showTokens: boolean;
        collapseByDefault: boolean;
    }
}
