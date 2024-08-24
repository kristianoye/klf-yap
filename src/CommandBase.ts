/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Bin utility for copying files
 */
'use strict';

import CommandParser, { ICommandParser, ICommandParams } from './command/CommandParser';

export { CommandParser, ICommandParams, ICommandParser };

export interface ICommandConfig {
    /** One or more verbs that may be used to invoke the command logic */
    verbs: string[];
}

export interface ICommand<TParams extends ICommandParams = ICommandParams> {
    /** Completes the command usage definition and auto-generates help docs, etc */
    complete(): this;

    /**
     * Configure the usage for this command
     * @param setter A callback that receives the command line parser to configure
     */
    defineUsage(setter: (parser: ICommandParser) => void): this;

    execute(verb: string, args: TParams): number;

    /** Returns the verbs used to invoke this command */
    getVerbs(): string[];

    /** Does the command respond to the supplied verb? */
    hasVerb(verb: string): boolean;
}

/**
 * Base type for CLI commands
 */
export default abstract class CommandBase<TParams extends ICommandParams = ICommandParams> implements ICommand, ICommandConfig {
    constructor(config: Partial<ICommandConfig> = {}) {
        this.parser = new CommandParser<TParams>();
    }

    //#region Properties

    private parser: CommandParser<TParams>;

    verbs: string[] = [];

    //#endregion

    protected buildHelp() {
        return this;
    }

    complete(): this {
        this.buildHelp();
        return this;
    }

    /**
     * Configure the usage for this command
     * @param setter A callback that receives the command line parser to configure
     */
    defineUsage(setter: (parser: ICommandParser) => void): this {
        setter(this.parser);
        this.parser.complete();
        return this;
    }

    /**
     * The actual implementation for executing the command.
     */
    abstract execute(verb: string, args: TParams): number;

    /**
     * Parse incoming arguments into our defined arguments structure.
     * @param {string} verb The verb supplied by the user.
     * @param {string | string[]} args The arguments supplied by the user.
     */
    executeCmd(verb: string, args: string[] | string, exitWhenComplete: boolean = true): never | number {
        if (!this.parser)
            throw new Error(`Command ${this.constructor.name} did not define any commandline options`);
        else {
            try {
                if (typeof args === 'undefined') {
                    args = process.argv;
                }
                else if (typeof args === 'string') {
                    /** @todo Modify this to preserve whitespace in strings, treat quoted values as single values, etc */
                    args = args.split(/\s+/);
                }
                const options = this.parser.parse(verb, args);
                const returnCode = this.execute(verb, options);
                if (process && exitWhenComplete)
                    process.exit(returnCode);
                else
                    return returnCode;
            }
            catch (err: any) {
                console.log(`${this.constructor.name}: Error: ${(err.stack | err)}`);
                if (exitWhenComplete) process.abort();
            }
            return -1;
        }
    }

    generateWrapper() {

    }

    getVerbs(): string[] {
        return this.verbs;
    }

    hasVerb(verb: string): boolean {
        return this.verbs.indexOf(verb) > -1;
    }
}
