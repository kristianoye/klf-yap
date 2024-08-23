/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

import CommandParser, { ICommandParser } from './CommandParser';

export interface ICommandArgument<TVal = any> {
    /**
     * Get the default value of the parameter
     */
    getDefaultValue(): TVal | undefined;

    /** Does thie argument have a default value? */
    hasDefaultValue(): boolean;
}

export type CommandArgumentType = 'string' | 'array' | 'number' | 'object';

export interface ICommandArgumentConfig<TVal = any, TEnum = any> {
    /** The name of the bit array output */
    bitsName?: string;

    /** If oneOf or manyOf are set then this is the list of valid options */
    choices?: string[];

    /** The bits to clear from bitsName */
    clears?: number;

    /** The default value if none is specified; Makes argument/switch optional */
    defaultValue?: TVal;

    /** A description of what this argument is for */
    description?: string;

    /** Alternate name to display in help text; Defaults to name' */
    displayName?: string;

    /** The user may select many of the specified enum type */
    manyOf?: TEnum;

    /** Max numeric value */
    max?: number;

    /** Max length for string types */
    maxLength?: number;

    /** The maximum number of values that may be specified */
    maxCount?: number;

    /** Min numeric value */
    min?: number;

    /** The minimum number of values that must be supplied */
    minCount?: number;

    /** Minimum length of any string value */
    minLength?: number;

    /** The key used when setting the output collection */
    name: string;

    /** User may pick one from the specified enum type */
    oneOf?: TEnum;

    /** Is this argument or switch required to be provided by the user? Defaults to false */
    required?: boolean;

    /** The bits to set in bitsName */
    sets?: number;

    /** The bits to toggle in bitsName */
    toggles?: number;

    /** What type of output variable is set */
    type: CommandArgumentType;

    usageText: string;
}

export default class CommandArgument<TVal = any, TEnum = any>
    implements ICommandArgument<TVal>, ICommandArgumentConfig<TVal, TEnum> {
    /**
     * Construct a new argument type
     * @param owner CommandParser that owns this object
     * @param config Configuration data that defines the behavior
     */
    constructor(owner: CommandParser, config: Partial<ICommandArgumentConfig> = {}) {
        this.parseUsageText(this.usageText = config.usageText || '');
        this.bitsName = config.bitsName;
        this.defaultValue = config.defaultValue;
        this.maxCount = config.maxCount;
        if (!(this.name = config.name || ''))
            throw new Error(`Argument requires 'output' parameter`);
        this.displayName = config?.displayName ?? this.name;
        this.owner = owner;
    }

    //#region Properties

    choices?: string[];

    displayName: string;

    /** The bits to set in bitsName */
    sets?: number;

    /** The bits to toggle in bitsName */
    toggles?: number;

    /** The name of the bit array output */
    bitsName?: string;

    /** The default value if none is specified; Makes argument/switch optional */
    defaultValue?: TVal;

    /** A description of what this argument is for */
    description?: string;

    manyOf?: TEnum;

    max?: number;

    /** The maximum number of values that may be specified */
    maxCount?: number;

    maxLength?: number;

    min?: number;

    /** The minimum number of values that must be supplied */
    minCount?: number;

    minLength?: number;

    name: string;

    oneOf?: TEnum;

    owner: ICommandParser | null;

    /** Is this argument or switch required to be provided by the user? Defaults to false */
    required?: boolean;

    type: CommandArgumentType = 'string';

    usageText: string;

    //#endregion

    //#region Properties

    getDefaultValue(): TVal | undefined {
        const defaultValue = this.defaultValue as TVal;
        if (defaultValue)
            return defaultValue;
        else
            return undefined;
    }

    hasDefaultValue(): boolean {
        return typeof this.getDefaultValue() !== 'undefined';
    }

    /**
     * Parses usage text and splits out the alternate forms and captures the output variable
     * @param usageText The usage text to parse
     */
    protected parseUsageText(usageText: string) {
        let s = usageText.indexOf('<'),
            preText = s > -1 ? usageText.slice(0, s) : usageText,
            allSwitches = preText.split(',').map(s => s.trim());

        while (s > -1) {
            let chunk = usageText.slice(s),
                e = chunk.search(/[^\\]\>/),
                blob = e > -1 ? chunk.slice(0, e) : '';

            if (blob) {

            }
            else
                throw new Error(`Invalid usageText: ${usageText}`);
        }
    }

    //#endregion
}
