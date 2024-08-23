/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Bin utility for removing files and directories
 */
'use strict';

import CommandBase, { ICommand, ICommandParams } from "../command/CommandBase";

const Authors = [
    'Kristian Oye <kristianoye@gmail.com'
];
const Version = "1.0.0";

export enum DeleteFlags {
    /** Do not prompt the user, just remove */
    Force = 1 << 0,

    /** Prompt the user for permission to remove each file */
    Interactive = 1 << 1,

    /** Recursively remove directories and files */
    Recursive = 1 << 2,

    /** Remove empty directories */
    RemoveEmpty = 1 << 3,

    /** Do not cross over into another physical filesystem */
    SingleFilesystem = 1 << 4,

    /** Prompt a few times to make sure the user is serious... ? */
    SmartPrompt = 1 << 5,

    /** Display information about what is going on */
    Verbose = 1 << 6
}

export interface IRemoveParams extends ICommandParams {
    /** The files to be removed */
    FILES: string[];

    /** Flags to dictate command behavior */
    flags: number;
}

export default class RemoveCommand extends CommandBase<IRemoveParams> {
    constructor() {
        super();
        this.defineUsage(parser => parser
            .setAuthor(...Authors)
            .setVersion(Version)
            .setVerb('klf-rm')
            .addAlias('rm', 'del', 'rmdir')
            .setDescription('Remove/unlink/delete FILE(s) from the filesystem')
            .addSwitch('-d, --dir', 'Remove empty directories', { name: 'removeEmpties', sets: DeleteFlags.RemoveEmpty })
            .addSwitch('-f, --force', 'Ignore nonexistent files and arguments, delete read-only files, never prompt', { name: 'force', sets: DeleteFlags.Force, clears: DeleteFlags.Interactive })
            .addSwitch('--interactive <interactive:always|always|never|once|smart>', 'Prompt according to WHEN: never, once (-I), or always (-i); without WHEN, prompt always', { name: 'interactive' })
            .addSwitch('--one-file-system', 'When removing a hierarchy recursively, skip any directory that is on a file system different from that of the corresponding command line argument', { name: 'sfs', sets: DeleteFlags.SingleFilesystem })
            .addSwitch('-i, --prompt, /p', 'Prompt before every removal', { name: 'prompt', sets: DeleteFlags.Interactive, clears: DeleteFlags.Force })
            .addSwitch('-I', 'Prompt once before removing more than three files, or when removing recursively; less intrusive than -i, while still giving protection against most mistakes', { name: 'smartPrompt', sets: DeleteFlags.SmartPrompt, clears: DeleteFlags.Force })
            .addSwitch('-r, --recursive', 'Remove directories and their contents recursively', { name: 'recursive', sets: DeleteFlags.Recursive })
            .addSwitch('-v, --verbose', 'Explain what is being done', { name: 'verbose', sets: DeleteFlags.Verbose })
            .addArgument('<FILE(S)...>'));
    }

    /**
     * Remove one or more files and/or directories
     * @param verb The verb invoked
     * @param params The remove request read from the command line
     * @returns Returns 0 on success
     */
    execute(verb: string, params: IRemoveParams): number {
        if (params.FILES.length === 0)
            return console.log(`${verb}: missing operand\nTry '${verb} --help' for more information.`), 1;
        return 0;
    }
}

