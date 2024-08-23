/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

export namespace KLF {
    export enum EnumType {
        /** Represents a bitflag array; Joining bitflags produce a new, valid enum */
        Bitflag = 1,

        /** Enumerated values have a number value that defaults to the order in which they were defined */
        Number = 2,

        /** Enumerated values are strings */
        String = 3
    }

    export type EnumValueKVP = { name: string, value: number | string };

    export type EnumParseResult = number | string | EnumValueKVP | undefined;

    export type GenericObject<T = any> = { [key: string]: T };

    export type GenericStringMap<TKey extends string, TVal> = {
        [key in TKey]: TVal;
    }

    export type EnumImplTable = GenericObject | GenericStringMap<string, string>;

    export type GenericNumberMap<TKey extends number, TVal> = {
        [key in TKey]: TVal;
    }

    export class EnumImpl<T> {
        constructor(typeName: string, values: GenericObject, enumType = EnumType.Number) {
            this.enumType = enumType;
            this.typeName = typeName;
            this.typeNamePrefix = typeName.toLowerCase() + '.';

            this.stringToValueLookup = {};
            this.valueToStringLookup = {};
            this.stringToStringLookup = {};

            let c: number = this.enumType === EnumType.Bitflag ? 1 : 0;

            for (const [key, val] of Object.entries(values)) {
                //  Did the type define specific, numeric values?
                if (this.enumType === EnumType.Number) {
                    let actualVal: number = typeof val === 'number' ? val : c++;

                    // Reverse lookup
                    this.valueToStringLookup[actualVal] = key;
                    // Forward lookups
                    this.stringToValueLookup[key] = actualVal;
                }
                else if (enumType === EnumType.Bitflag) {
                    if (typeof val !== 'number' || !val) {
                        if (c < 0) {
                            throw new Error(`Too many flags defined in type ${typeName} `);
                        }
                        // Reverse lookup
                        this.valueToStringLookup[c] = key;
                        // Forward lookups
                        this.stringToValueLookup[key] = c;
                        c <<= 1;
                    }
                    else {
                        this.stringToValueLookup[key] = val;
                        this.valueToStringLookup[c] = key;
                    }
                }
                else if (enumType === EnumType.String) {
                    this.stringToValueLookup[key] = val;
                    this.stringToStringLookup[val] = key;
                }
            }
        }

        readonly enumType: EnumType;

        getKeyNames(): string[] {
            return Object.keys(this.stringToValueLookup);
        }

        readonly typeName: string;

        readonly typeNamePrefix: string;

        readonly stringToValueLookup: GenericObject<number>;

        readonly stringToStringLookup: GenericObject<string>;

        readonly valueToStringLookup: GenericNumberMap<number, string>;

        isValidState(spec: string | number): boolean {
            switch (this.enumType) {
                case EnumType.Bitflag:
                case EnumType.Number:
                    const resultAsNumeric = (this.tryParse(spec, 0, true) as EnumValueKVP);
                    return resultAsNumeric?.value === spec;

                case EnumType.String:
                    const resultAsString = (this.tryParse(spec, '', true) as EnumValueKVP)
                    return resultAsString?.name === spec;

                default:
                    throw new Error(`${__filename}: '${this.enumType}' is not a valid enum type for ${this.typeName}`);
            }
        }

        parse(spec: string | number, getNVP = false): EnumParseResult {
            const result = this.tryParse(spec, undefined, getNVP);
            if (typeof result !== 'undefined')
                return result;
            throw new Error(`parse() failed to determine value for ${spec}`);
        }

        tryParse<T>(spec: string | number, defaultValue: T, getNVP = false, withTypeName = true): EnumParseResult | T {
            if (getNVP) {
                const name = this.tryParse(spec, defaultValue, false, withTypeName),
                    value = typeof name == 'string' && this.stringToValueLookup[name];

                if (typeof name !== 'undefined')
                    return <EnumValueKVP>{ name, value };
                else
                    return undefined;
            }
            else if (typeof spec === 'string') {
                const parts = spec.split('|').map(s => s.trim()).map(s => {
                    if (s.startsWith(this.typeNamePrefix))
                        s = s.slice(this.typeNamePrefix.length);
                    return this.stringToValueLookup[s.toLowerCase()];
                });

                if (parts.length === 0)
                    return defaultValue;
                else if (this.enumType === EnumType.Bitflag) {
                    var result = 0;
                    for (var val of parts) {
                        if (typeof val === 'number') {
                            result |= val;
                        }
                    }
                    return result;
                }
                else if (this.enumType === EnumType.Number) {
                    if (parts.length === 1)
                        return parts[0];
                    else
                        return parts.join(' | ');
                }
                else if (this.enumType === EnumType.String) {
                    if (parts.length === 1)
                        return parts[0];
                    else
                        return parts.join(' | ');
                }
            }
            else if (typeof spec === 'number') {
                if (this.enumType === EnumType.Bitflag) {
                    const result: string[] = [];
                    const values: GenericNumberMap<number, string> = {};

                    //  Iterate through the bitflags to find which are set
                    for (const [key, val] of Object.entries(this)) {
                        const numericKey = parseInt(val);

                        if (!isNaN(numericKey)) {
                            //  Do not display every possible name mapped
                            if (numericKey in values) continue;
                            if ((numericKey & spec) > 0) {
                                result.push(`${this.typeName}.${key}`);
                                values[numericKey] = val;
                            }
                        }
                    }
                    if (result.length === 0)
                        return defaultValue;
                    return result.join(' | ');
                }
                else if (this.enumType === EnumType.Number) {
                    const result = this.valueToStringLookup[spec];
                    if (typeof result === 'undefined')
                        return defaultValue;
                    return withTypeName ? `${this.typeName}.${result} ` : result;
                }
                else if (this.enumType === EnumType.String) {
                    const result = this.stringToStringLookup[spec];
                    if (typeof result === 'undefined')
                        return defaultValue;
                    return result;
                }
            }
            return undefined;
        }
    }

    export class EnumUtil {
        /**
         * Create a KLF-style enum
         * @template T
         * @param typeName The name of the enum type
         * @param values The initial names that define the enumeration 
         * @param enumType The type of enum defines how values are stored
         */
        static defineType<T>(typeName: string, values: GenericObject, enumType = EnumType.Number): EnumImpl<T> {
            return new EnumImpl(typeName, values, enumType);
        }
    }
}
