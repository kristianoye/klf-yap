/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

export default class StackUtil {
    /**
     * 
     * @returns The current callstack
     */
    static getStack(): NodeJS.CallSite[] {
        const originalPrepper = Error.prepareStackTrace;
        try {
            Error.prepareStackTrace = (err, stackTraces) => { return stackTraces; };
            const unusedError = new Error('Nothing to see here');
            Error.captureStackTrace(unusedError);

            const result = unusedError.stack as unknown as NodeJS.CallSite[] ?? [];

            //  Remove this callsite from the stack
            result.shift();

            return result;
        }
        finally {
            //  Always restore the original
            Error.prepareStackTrace = originalPrepper;
        }
        return [];
    }
}