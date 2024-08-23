/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */

export type ConstructorType<T> = new (...args: any[]) => T;

export type GenericObject<T = any> = {
    [key: string]: T;
};

export interface IClassInstance {
    constructor: Function;
}

export type Nullable<T extends IClassInstance> = T | null;
