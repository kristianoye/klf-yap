/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

export default class ObjectUtil {
    /**
     * Determine if the value is a class reference
     * @param type A value to inspect
     * @returns 
     */
    static isClass(type: any): boolean {
        return typeof type === 'function' && type.toString().startsWith('class ');
    }

    /**
     * Get a parent class name
     * @param {object} type The object instance or class to get parent name of
     * @returns 
     */
    static parentClassName(type: any) {
        if (typeof type === 'object') {
            return type.constructor.name;
        }
        else if (ObjectUtil.isClass(type))
            return Object.getPrototypeOf(type).name || 'Object';
    }
}
