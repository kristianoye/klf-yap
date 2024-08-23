/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

import CommandBase from '../command/CommandBase';
import { ConstructorType, GenericObject } from '../BaseTypes';

export interface ICommandUtility {
    /**
     * Defines a command that is defined in the specified module
     * @param verb The verb to invoke the command
     * @param definedIn The module the command logic is in
     */
    defineCommand(verb: string, definedIn: string): this;

    /**
     * Defines a command that is defined in the specified module
     * @param verbs The verbs to associate with the command
     * @param definedIn The module the command logic is defined in
     */
    defineCommand(verbs: string[], definedIn: string): this;

    /**
     * Associate a single verb with a command type
     * @param verbs Verbs to associate with the command
     * @param definedIn A reference to the class that implements the command logic
     */
    defineCommand(verb: string, definedIn: ConstructorType<CommandBase>): this;

    /**
     * Associate some verbs with a command type
     * @param verbs Verbs to associate with the command
     * @param definedIn A reference to the class that implements the command logic
     */
    defineCommand(verbs: string[], definedIn: ConstructorType<CommandBase>): this;

    /**
     * Add a command instance to the collection of available commands
     * @param command The command that is being defined
     */
    defineCommand(command: CommandBase): this;

    /**
     * Execute a command
     * @param verb The verb being executed
     * @param args The arguments to pass to the command
     * @param exitWhenComplete Should NodeJS exit when the command completes?
     */
    tryRunCommand(verb: string, args: string[], exitWhenComplete: boolean): never | number;

    /**
     * Execute a command and exit NodeJS
     * @param verb The verb being executed
     * @param args The arguments to pass to the command
     */
    tryRunCommand(verb: string, args: string[]): never | number;
}

/**
 * A container type that holds all of the configured commands
 */
class CommandUtilType implements ICommandUtility {
    constructor() {
    }

    /** Contains a mapping of 'verb name' => 'defining module' */
    private verbToModule: GenericObject<string> = {};

    /** Contains a mapping of 'verb name' => 'command instance' */
    private commandInstances: GenericObject<CommandBase> = {};

    /** Contains a mapping of 'verb name' => 'command type' */
    private commandTypes: GenericObject<ConstructorType<CommandBase>> = {};

    defineCommand(verb: string | string[] | CommandBase, definedIn?: string | ConstructorType<CommandBase> | undefined): this {
        if (typeof verb === 'string') {
            if (definedIn) {
                if (typeof definedIn === 'string')
                    this.verbToModule[verb] = definedIn;
                else
                    this.commandTypes[verb] = definedIn;
            }
            else
                throw new Error(`The definedIn parameter is required when specifying verb as a string`);
        }
        else if (Array.isArray(verb)) {
            if (definedIn) {
                for (const v of verb) {
                    if (typeof definedIn === 'string')
                        this.verbToModule[v] = definedIn;
                    else
                        this.commandTypes[v] = definedIn;
                }
            }
            else
                throw new Error(`The definedIn parameter is required when specifying verb as a string[]`);
        }
        else if (verb instanceof CommandBase) {
            for (const v of verb.getVerbs()) {
                this.commandInstances[v] = verb;
            }
        }
        return this;
    }

    /**
     * Try and execute a command
     * @param verb The verb to execute
     * @param args The cmdline args to pass to the command
     * @param exitWhenComplete NodeJS will exit the current process if this is true
     * @returns Returns the exit code from the command if exitWhenComplete is false
     */
    tryRunCommand(verb: string, args: string[], exitWhenComplete: boolean = true): never | number {
        if (verb in this.commandInstances)
            return this.commandInstances[verb].executeCmd(verb, args, exitWhenComplete)
        else if (verb in this.commandTypes) {
            const typeDef = this.commandTypes[verb];
            if (typeDef !== CommandBase) {
                const instance: CommandBase = new typeDef();
                return instance.executeCmd(verb, args, exitWhenComplete);
            }
        }
        if (verb in this.verbToModule) {
            const modulePath = this.verbToModule[verb];
            const exports: ConstructorType<CommandBase> | GenericObject<ConstructorType<CommandBase>> = require(modulePath);
            const typeDef = exports as ConstructorType<CommandBase>;

            if (typeDef) {
                const instance = new typeDef();
                return instance.executeCmd(verb, args, exitWhenComplete);
            }
            else if (typeof exports === 'object') {
                //  Module exported an object, lets look for command implementations
                const commandTypes: Array<ConstructorType<CommandBase>> = Object.values(exports).filter(e => e as ConstructorType<CommandBase>);
                if (commandTypes.length > 0) {
                    const instance: CommandBase | undefined = commandTypes.length === 1 ? new commandTypes[0]() :
                        commandTypes.map(cmdType => new cmdType()).find(cmd => cmd.hasVerb(verb));

                    if (instance)
                        return instance.executeCmd(verb, args, exitWhenComplete);
                    else {
                        const typeNames = commandTypes.map(t => t.name);
                        const typeNameList = typeNames.slice(0, -1).join(', ') + ' and ' + typeNames!.pop();
                        throw new Error(`Could not find command that supports verb '${verb}'; Tried ${typeNameList}`);
                    }
                }
                throw new Error(`Module ${modulePath} did not export any usable commands`);
            }
        }
        throw new Error(`Module does not provide '${verb}' command`);
    }
}

const CommandUtilInstance: CommandUtilType = new CommandUtilType();
const CommandUtil: ICommandUtility = CommandUtilInstance as ICommandUtility;

export default CommandUtil;


