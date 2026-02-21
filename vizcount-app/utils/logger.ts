/**
 * Explicit Logging Utility
 * Ensures all logs are categorized for easy debugging per Golden Rules.
 */
export const Logger = {
    info: (context: string, message: string, data?: any) => {
        console.log(`[INFO][${context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    warn: (context: string, message: string, data?: any) => {
        console.warn(`[WARN][${context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (context: string, message: string, error?: any) => {
        console.error(`[ERROR][${context}] ${message}`, error);
    },
    debug: (context: string, message: string, data?: any) => {
        if (__DEV__) {
            console.log(`[DEBUG][${context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
        }
    },
};
