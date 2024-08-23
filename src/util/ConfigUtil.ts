/**
 * Provides some configuration utilities
 * @since 1.0.0
 */
'use strict';

import path from "path";
import { GenericObject } from "../BaseTypes";
import { stat } from "fs/promises";

export class ConfigUtil {
    /**
     * Get a value
     * @template T
     * @param configValue The value provided by the config
     * @param defaultValue The default value if the config is undefined or an invalid type
     */
    static get(configValue: any, defaultValue: any) {
        if (typeof configValue === 'undefined')
            return defaultValue;
        else if (Array.isArray(defaultValue) && !Array.isArray(configValue))
            return defaultValue;
        else if (typeof configValue !== typeof defaultValue)
            return defaultValue;
        else if (typeof configValue === 'string' && configValue.length === 0)
            return defaultValue;
        else if (Array.isArray(configValue) && configValue.length === 0)
            return defaultValue;
        else
            return configValue;
    }

    /**
     * Returns the root directory that contains this module
     */
    static async getModuleRoot(): Promise<string> {
        const parts = __dirname.split(path.sep).filter(p => p.length);
        while (parts.length > 0) {
            try {
                const packageConfig = path.resolve(parts.join(path.sep), 'package.json');
                const result = await stat(packageConfig);
                if (result.size > 0) return parts.join(path.sep);
            }
            catch (err: any) {
            }
            parts.pop();
        }
        return '';
    }

    /**
     *
     * @param source The starting point
     * @param updates Object(s) to merge into the original source
     * @since 1.0.0
     */
    static mergeConfigs(source: GenericObject, ...updates: GenericObject[]) {
        var isClass = (v: any) => { return typeof v === 'function' && v.toString().startsWith('class') };

        if (typeof source !== 'object')
            throw new Error(`Bad argument 1 to mergeObjects(); Expected object but got ${typeof source} `);
        var result = typeof source === 'object' && { ...source } || {};

        for (var update of updates) {
            if (typeof update === 'object') {
                for (var [key, val] of Object.entries(update)) {
                    if (Array.isArray(val)) {
                        result[key] = val.slice(0);
                    }
                    else if (typeof val === 'object') {
                        if (false === key in result)
                            result[key] = {};
                        else if (isClass(result[key])) {
                            if (typeof result[key].defaultConfig === 'object')
                                result[key].defaultConfig = ConfigUtil.mergeConfigs(result[key].defaultConfig, val);
                            continue;
                        }
                        result[key] = ConfigUtil.mergeConfigs(result[key] || {}, val);
                    }
                    else {
                        result[key] = val;
                    }
                }
            }
        }
        return result;
    }
}
