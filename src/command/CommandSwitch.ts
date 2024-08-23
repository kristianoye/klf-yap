/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */

import { ICommandArgumentConfig, ICommandArgument, default as CommandArgument } from './CommandArgument';
import CommandParser, { ICommandParser } from './CommandParser';

export interface ICommandSwitchConfig<TValType = any, TEnumType = any> extends ICommandArgumentConfig<TValType, TEnumType> {
    /** The unparsed usage text for this switch */
    readonly usageText: string;
}

export interface ICommandSwitch extends ICommandArgument {
    /**
     * Add a new usage switch to the command
     * @param switchText The new switch to add
     */
    addSwitch(switchText: string): this;
}

export default class CommandSwitch<TEnumType = any> extends CommandArgument implements ICommandSwitchConfig<TEnumType>, ICommandSwitch {
    constructor(owner: CommandParser, config: Partial<ICommandSwitchConfig> = {}) {
        super(owner, config);

        this.owner = owner;
    }

    //#region Properties

    name: string = '';
    owner: ICommandParser | null = null;

    //#endregion

    //#region Methods

    addSwitch(switchText: string): this {
        return this;
    }

    //#endregion
}
