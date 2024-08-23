/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

import CommandArgument, { ICommandArgumentConfig } from './CommandArgument';
import CommandSwitch, { ICommandSwitch, ICommandSwitchConfig } from './CommandSwitch';
import { GenericObject } from '../BaseTypes';

export { CommandSwitch, ICommandSwitchConfig, ICommandArgumentConfig };

export interface ICommandParserConfig {
    /** Aliases are verbs that can also invoke the command */
    aliases: string[];

    /** Arguments invoked without a switch; Position-based */
    arguments: CommandArgument[];

    /** A list of authors who have contributed to writing this command */
    authors: string[];

    /** Copyright, if any */
    copyright: string;

    defaultValues: GenericObject;

    /** A description of what the command does */
    description: string;

    /** License, if any */
    license: string;

    /** Arguments invoked with a preceeding switch */
    switches: CommandSwitch[];

    /** One or more verbs used to invoke the command */
    verbs: string[];

    /** The current version of the module */
    version: string;
}

export type SwitchUsageTextType = string
    | Partial<ICommandSwitchConfig>
    | ICommandSwitch
    | ((getter: ICommandSwitch) => void);

export interface ICommandParser {
    /**
     * Aliases are verbs that can also invoke the command
     * @param alias A list of verb aliases; Aliases are not exportable
     */
    addAlias(...alias: string[]): this;

    /**
     * Add a position-based argument to the command
     * @param usageText The usage text of the argument
     */
    addArgument(usageText: string): this;

    /**
     * Add a name-based argument to the command
     * @param usageText The usage text of the argument
     * @param description Helpful description to display in the help file
     * @param config Additional settings
     */
    addSwitch<TValType = any, TEnumType = any>(usageText: string, description: string, config: Partial<ICommandSwitchConfig<TValType, TEnumType>>): this;

    /**
     * Add a name-based argument to the command
     * @param usageText The usage text of the argument
     * @param description Helpful description to display in the help file
     */
    addSwitch(usageText: string, description: string): this;

    /**
     * Add a name-based argument to the command
     * @param usageText The usage text of the argument
     * @param config Additional settings
     */
    addSwitch<TValType = any, TEnumType = any>(usageText: string, config: Partial<ICommandSwitchConfig<TValType, TEnumType>>): this;

    /**
     * Add a name-based argument to the command
     * @param config The settings required to initialize the switch
     */
    addSwitch<TValType = any, TEnumType = any>(config: Partial<ICommandSwitchConfig<TValType, TEnumType>>): this;

    /**
     * Add a name-based argument to the command
     * @param definer A callback that receives a new command switch to configure
     */
    addSwitch(definer: (newSwitch: ICommandSwitch) => void): this;

    /**
     * Add a name-based argument to the command
     * @param newSwitch A fully-configured switch object
     */
    addSwitch(newSwitch: ICommandSwitch): this;

    /** Signals the end of the usage definition */
    complete(): this;

    /**
     * Parse a command line into usable data
     * @param verb The verb used to invoke the command
     * @param args The arguments supplied by the user
     */
    parse(verb: string, args: string[]): GenericObject;

    /**
     * Define the list of people who contributed to this module.
     * @param author A list of people who contributed to writing the command
     */
    setAuthor(...author: string[]): this;

    /**
     * Describe the contents of the package
     * @param desc The description of the package
     */
    setDescription(desc: string): this;

    /**
     * Associate one or more verbs with a command
     * @param verb The verbs to associate with this command
     */
    setVerb(...verb: string[]): this;

    /**
     * Set the version of the command
     * @param version The current version of the command
     */
    setVersion(version: string): this;
}

export interface ICommandParams extends GenericObject<any> { }

export default class CommandParser<TParams extends ICommandParams = ICommandParams>
    implements ICommandParserConfig, ICommandParser {

    //#region Constructor

    /**
     * Construct a command line parser for one or more verbs
     * @param {Partial<ICommandParserConfig>} config The configuration for this command
     */
    constructor(config: Partial<ICommandParserConfig> = {}) {
        this.arguments = [];
        this.authors = [];
        this.copyright = typeof config.copyright === 'string' && config.copyright || '';
        this.description = config?.description ?? '(No description)';
        this.license = typeof config.license === 'string' && config.license || '';
        this.switches = Array.isArray(config.switches) && config.switches.filter(s => s instanceof CommandSwitch) || [];
        this.verbs = Array.isArray(config.verbs) && config.verbs.filter(v => v.trim().length) || [];
    }

    //#endregion

    //#region Properties

    aliases: string[] = [];

    arguments: CommandArgument[];

    authors: string[];

    copyright: string;

    defaultValues: GenericObject = {};

    description: string;

    license: string;

    switches: CommandSwitch[];

    verbs: string[];

    version: string = "1.0";

    //#endregion

    //#region Configuration Methods

    addAlias(...alias: string[]): this {
        this.aliases.push(...alias.filter(s => CommandParser.validVerb(s)));
        return this;
    }

    addArgument(usageText: string): this {
        return this;
    }

    /**
     * Add a commandline switch to the command usage
     */
    addSwitch(usageText: SwitchUsageTextType, descOrConfig?: string | Partial<ICommandSwitchConfig>, config?: Partial<ICommandSwitchConfig>): this {
        const switchConfig = usageText as Partial<ICommandSwitchConfig> ?? descOrConfig as Partial<ICommandSwitchConfig> ?? config;
        const asSwitch = usageText as ICommandSwitch;
        const description = descOrConfig as string;
        let newSwitch: ICommandSwitch | null = null;

        if (typeof usageText === 'string') {
            if (description) {
                if (switchConfig) // Signature 1: All 3 parameters were supplied
                    newSwitch = new CommandSwitch(this, { usageText, description, ...switchConfig });
                else // Signature 2: Switch text and description were supplied
                    newSwitch = new CommandSwitch(this, { usageText, description });
            }
            else if (switchConfig) // Signature 3: Switch text and config were supplied
                newSwitch = new CommandSwitch(this, { usageText, ...switchConfig });
        }
        else if (typeof usageText === 'function') {
            //  Signature 5: Only definer function was specified
            newSwitch = new CommandSwitch(this);
            usageText(newSwitch);
        }
        else if (switchConfig) {
            //  Signature 4: Only config was specified
            newSwitch = new CommandSwitch(this, switchConfig);
        }
        else if (asSwitch) {
            //  Signature 6: Only a switch was specified
            newSwitch = asSwitch;
        }
        else
            throw new Error(`Invalid call to addSwitch()`);

        if (false === newSwitch instanceof CommandSwitch) {
            const parameterList = Array.prototype.slice.apply(arguments).map((a: any) => JSON.stringify(a)).join(', ');
            throw new Error(`CmdlineParser.addSwitch() could not construct usable switch from parameters: ${parameterList}`);
        }
        else if (!this.validSwitch(newSwitch)) {
            this.switches.push(newSwitch);
        }
        return this;
    }

    complete(): this {
        this.buildHelp();
        return this;
    }

    /**
     * Check to see if a new switch may be safely added to the parser.
     * @param instance A switch object being added to this parser
     * @returns Returns true if an existing switch already defines the same usage text
     */
    hasConflictingSwitch(instance: CommandSwitch) {
        for (const existing of this.switches) {

        }
        return false;
    }

    /**
     * Check to see if a new switch is valid
     * @param {CommandSwitch} instance The instance to inspect
     * @param {{ errorCount: number, errors: string[], valid: boolean }} result Container for error information
     * @returns {boolean} True if the switch is valid for use
     */
    validSwitch(instance: any) {
        let result = <{ errorCount: number, errors: string[], valid: boolean }>{};

        result.errorCount = 0;
        result.errors = [];
        result.valid = false;

        if (typeof instance !== 'object')
            return result.errorCount++, result.errors.push(`Instance is not an object [got type ${typeof instance}]`);
        else if (instance instanceof CommandSwitch) {
            if (this.hasConflictingSwitch(instance))
                result.errors.push(`Switch attempts to redefine existing usage`);
        }
        else
            result.errors.push(`Type ${instance.constructor.name} does not inherit CmdlineSwitch`);

        result.errorCount = result.errors.length;
        result.valid = result.errorCount === 0;
        return result.valid;
    }

    /**
     * Test a value for suitability as a command verb
     * @param verb A value being considered
     * @returns True if the value is an acceptable verb name
     */
    static validVerb(verb: any) {
        if (typeof verb !== 'string') return false;
        else if (verb.length === 0) return false;
        else if (/\s+/.test(verb)) return false;
        else return /^[a-zA-Z_]+/.test(verb);
    }

    //#endregion

    //#region Help Generator Methods

    buildHelp() {
        // var helpText = '', argText = '';

        // for (var arg of this.arguments) {
        //     argText += ' ' + arg.displayName;
        // }

        // for (var verb of this.verbs) {
        //     helpText += `Usage: ${verb}`;
        //     if (this.switches.length > 0)
        //         helpText += ' [options]...';
        //     if (argText.length > 0)
        //         helpText += argText;
        //     helpText += '\n';
        // }


        // helpText += '\n\n';

        // if (this.setDescription)
        //     helpText += this.setDescription + '\n\n';

        // if (this.switches.length > 0) {
        //     var longest = 0;

        //     helpText += 'Options:' + '\n\n';

        //     for (var arg of this.switches) {
        //         longest = Math.max(longest, arg.getSwitchString().length);
        //     }
        //     longest += 2;
        //     for (var arg of this.switches) {
        //         helpText += arg.getHelpString(longest) + '\n';
        //     }
        // }
        // return helpText;
    }

    //#endregion

    //#region Setter Methods

    /**
     * Set the author(s)
     * @param {...string} authors The author(s)
     * @returns
     */
    setAuthor(...authors: string[]) {
        if (Array.isArray(authors))
            this.authors = authors.filter(s => typeof s === 'string' && s.length > 0)
        return this;
    }

    setCopyright(text: string) {
        if (typeof text === 'string')
            this.copyright = text;
        return this;
    }

    setDefaults(values: GenericObject) {
        if (typeof values === 'object')
            this.defaultValues = values;
        return this;
    }

    /**
     * Set the command description
     * @param {string} description
     * @returns
     */
    setDescription(description: string) {
        this.description = description || '(No description)';
        return this;
    }

    setVerb(...name: string[]) {
        if (Array.isArray(name))
            this.verbs = name.filter(s => typeof s === 'string' && s.length > 0)
        return this;
    }

    setVersion(version: string) {
        if (version.length)
            this.version = version;
        return this;
    }

    showVersion(verb: string) {
        var text = `\n${verb} ${this.setVersion}\n`;
        if (this.setCopyright) {
            text += '\n' + this.setCopyright;
        }
        if (this.authors.length > 0) {
            text += '\n\n' + `Written by ${this.authors.join(', ')}`;
        }
        return console.log(text);
    }

    //#endregion

    //#region Execution Methods

    private getDefaultResult(): TParams {
        var result = {} as TParams;

        for (const arg of this.arguments) {
            const name = arg.name;

            if (arg.hasDefaultValue()) {
                const defaultValue = arg.getDefaultValue();

                result = { ...result, name, defaultValue };
            }
            else if (false === name in result)
                result = { ...result, name, defaultValue: undefined };
        }
        return result;
    }

    parse(verb: string, args: string | string[]): TParams {
        const result = this.getDefaultResult();

        return result;
    }

    //#endregion
}
