/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used throughout this library.
 * 
 * @version 1.0.0
 */
'use strict';

import { ConfigUtil } from './util/ConfigUtil';
import CommandBase from './CommandBase';
import CommandUtil from './util/CommandUtil';
import { ConstructorType, GenericObject } from './BaseTypes';
import path from 'path';
import StackUtil from './util/StackUtil';

const Module = require('module');
const Version = '1.0.0';

export enum PackageInstallFlags {
    /** Do not install anything */
    None = 0,

    /** Install bin commands */
    Commands = 1 << 0,

    /** Install typings */
    Typings = 1 << 1,

    /** Install all export types */
    All = Commands | Typings,

    /** Show what would be done during the install */
    ShowOnly = 1 << 2
}

export interface PackageInstallParams {
    /**
     * Commands to export in the format of a dictionary where:
     * key - The verb of the command as it is defined in the module
     * value - The name of the command script exported
     */
    commandList: GenericObject<string>;
}

export class PackageInstallCommand extends CommandBase<PackageInstallParams> {
    constructor() {
        super();
        this.defineUsage(parser => parser
            .setVerb('install')
            .setAuthor('Kristian Oye <kristianoye@gmail.com>')
            .setDescription('Installs package-related commands and typings')
            .setVersion(Version)
            .addSwitch('cmds, bin, -c --commands <commandList...>', 'Install the specified commands as stand-alone executables; Defaults to all', { sets: PackageInstallFlags.Commands })
            .addSwitch('xc, -xc, --export-command <command> as <alias>', 'Override the default command name')
            .addSwitch('typings, -t, --typings <typingList...>', 'Install the specified typings in node_modules; Defaults to all', { sets: PackageInstallFlags.Typings }))
    }

    execute(verb: string, params: Partial<PackageInstallParams>): number {
        return 0;
    }
}

export class PackageUninstallCommand extends CommandBase {
    constructor() {
        super();
        this.defineUsage(parser => parser
            .setVerb('uninstall')
            .setAuthor('Kristian Oye <kristianoye@gmail.com>')
            .setDescription('Uninstalls package-related commands and typings')
            .addSwitch('cmds, bin, -c, --commands <commandList...>', 'Uninstall the specified commands as stand-alone executables; Defaults to all', { sets: PackageInstallFlags.Commands })
            .addSwitch('typings, -t, --typings <typingList...>', 'Uninstall the specified typings in node_modules; Defaults to all', { sets: PackageInstallFlags.Typings })
            .setVersion(Version)
            .complete())
    }

    execute(): number {
        return 0;
    }
}

export interface IPackageConfig {
    /** The people who collaborated on implementing this package */
    authors: string[];

    /** Copyright information, if any */
    copyright: string;

    /** The (long) package description */
    description: string;

    /** Commands defined and exported by this package */
    exportedCommands: GenericObject<string | ConstructorType<CommandBase>>;

    /** Typing files that can be exported to typings directory */
    exportedTypings: string[];

    /** All data to be exported to the outside world */
    exports: GenericObject;

    /** Are all commands implicitly exported? */
    implicitlyExportCommands: boolean;

    /** Are all typings implicitly exported? */
    implicitlyExportTypings: boolean;

    /** License information */
    license: string;

    /** The name of the package */
    name: string;
}

export interface IPackage {
    //#region Command Setup Methods

    /**
     * Associates verbs with the module defining the underlying command logic
     * @param verb The verb used to invoke the command
     * @param binModule The module where the command implementation is defined
     * @param canExport Can this command be exported to the host environment?
     */
    addCommand(verb: string, binModule: string, canExport?: boolean): this;

    /**
     * Associates verbs with the module defining the underlying command logic
     * @param verb A list of possible verbs used to invoke this command
     * @param binModule The module where the command implementation is defined
     * @param canExport Can this command be exported to the host environment?
     */
    addCommand(verb: string, binModule: ConstructorType<CommandBase>, canExport?: boolean): this;

    /**
     * Associates verbs with the module defining the underlying command logic
     * @param verbs A list of possible verbs used to invoke this command
     * @param binModule The module where the command implementation is defined
     * @param canExport Can this command be exported to the host environment?
     */
    addCommand(verbs: string[], binModule: ConstructorType<CommandBase>, canExport?: boolean): this;

    /**
     * Associates verbs with the module defining the underlying command logic
     * @param verbs A list of possible verbs used to invoke this command
     * @param binModule The module where the command implementation is defined
     * @param canExport Can this command be exported to the host environment?
     */
    addCommand(verbs: string[], binModule: string, canExport?: boolean): this;

    /**
     * Associates verbs with the module defining the underlying command logic
     * @param command The command instance 
     * @param canExport Can this command be exported to the host environment?
     */
    addCommand(command: CommandBase, canExport?: boolean): this;

    //#endregion

    //#region Export-Related Methods

    /**
     * Add one or more modules to our export manifest
     * @param files Modules to export to the outside world
     */
    addExports(...files: string[]): this;

    /**
     * Typing definitions that this module exports
     * @param files Typing files to export
     */
    addTypings(...files: string[]): this;

    /**
     * Shortcut for defining multiple commands
     * @param commands A mapping of verb to defining module
     * @param canExport Can these commands be exported?
     */
    defineCommands(commands: GenericObject<string | ConstructorType<CommandBase>>, canExport?: boolean): this;

    //#endregion
}

export default class Package implements IPackageConfig, IPackage {
    /**
     * Construct a new package
     * @param filename The module the package definition resides in
     * @param config Details about this package
     */
    constructor(filename: string, config: Partial<IPackageConfig> = {}) {
        this.authors = config.authors ? config.authors : [];
        this.copyright = config?.copyright ?? '(None specified)';
        this.description = ConfigUtil.get(config.description, '(No description)');
        this.exportedTypings = config.exportedTypings || [];
        this.exports = {};
        this.filename = filename;
        this.implicitlyExportCommands = ConfigUtil.get(config.implicitlyExportCommands, true);
        this.implicitlyExportTypings = ConfigUtil.get(config.implicitlyExportTypings, true);
        this.name = ConfigUtil.get(config.name, '(No name)');
        this.defineCommands({
            install: PackageInstallCommand,
            uninstall: PackageUninstallCommand
        });
    }

    //#region Properties

    authors: string[] = [];
    copyright: string = '';
    description: string = "(No description)";
    exportedCommands: GenericObject<string | ConstructorType<CommandBase>> = {};
    exportedTypings: string[];
    exports: GenericObject = {};
    filename: string = '';
    implicitlyExportCommands: boolean = true;
    implicitlyExportTypings: boolean = true;
    license: string = '(Not specified)';
    name: string = '(Not specified)';

    //#endregion

    addCommand(verb: string | string[] | CommandBase, binModule?: string | boolean | ConstructorType<CommandBase>, canExport?: boolean): this {
        const typeDef: ConstructorType<CommandBase> = binModule as ConstructorType<CommandBase>;

        if (typeof verb === 'string') {
            if (binModule && typeof binModule === 'string') {
                const modulePath = path.resolve(__dirname, binModule);
                CommandUtil.defineCommand(verb, modulePath);
                if (canExport === true)
                    this.exportedCommands[verb] = modulePath;
            }
            else if (typeDef) {
                CommandUtil.defineCommand(verb, typeDef);
                if (canExport === true)
                    this.exportedCommands[verb] = typeDef;
            }
            else
                throw new Error(`Verb '${verb}' must be associated with a loadable module`);
        }
        else if (Array.isArray(verb)) {
            for (const v of verb) {
                this.addCommand(v, binModule, canExport);
            }
        }
        else {
            CommandUtil.defineCommand(verb);
        }
        return this;
    }

    addExports(...exports: string[]) {
        for (const exp of exports) {
        }
        return this;
    }

    addTypes(...specs: string[]) {
        return this;
    }

    addTypings(...files: string[]) {
        if (this.implicitlyExportTypings) {
            this.exportedTypings = [];
            this.implicitlyExportTypings = false;
        }
        return this;
    }

    /**
     * Define the package
     * @param filename The name of the file the package definition is in
     * @param setter Callback that receives the package to configure
     */
    static define(setter: (newPackage: IPackage) => void): typeof Package | number {
        const stack = StackUtil.getStack();
        const filename = stack[1].getFileName()!;
        const newPackage = new Package(filename);
        const packageModule = typeof Module._cache === 'object' && Module._cache[filename];
        const cmdline = this.getCmdlineParameters(filename);

        setter(newPackage);

        if (Array.isArray(cmdline)) {
            const delimiter = cmdline.findIndex(p => p === '--'),
                localOptions = delimiter > -1 ? cmdline.slice(0, delimiter) : cmdline,
                commandOptions = delimiter > -1 ? cmdline.slice(delimiter + 1) : false;

            if (Array.isArray(commandOptions)) {
                //  Package is invoking an internal command
                const [verb, ...args] = commandOptions;

                return CommandUtil.tryRunCommand(verb, args, true);
            }
        }
        return Package;
    }

    defineCommands(commands: GenericObject<string | ConstructorType<CommandBase>>, canExport: boolean = false): this {
        for (const [verb, modulePath] of Object.entries(commands)) {
            this.addCommand(verb, modulePath, canExport);
        }
        return this;
    }

    execute(): number {
        return 0;
    }

    static getCmdlineParameters(filename: string): string[] {
        const args: string[] = ConfigUtil.get(process && process.argv, []),
            n = args.indexOf(filename);
        if (n > -1)
            return args.slice(n + 1);
        return [];
    }
}
