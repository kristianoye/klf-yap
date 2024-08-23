/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Bin utility for copying files
 */
'use strict';

import CommandBase, { ICommandParams } from "../command/CommandBase";

export enum CopyFlags {
    /** Use default behavior */
    None = 0,

    /** Back up any files that would otherwise be overwritten */
    Backup = 1,

    /** Do not prompt the user to overwrite, just do it; Also deletes read-only files */
    Force = 1 << 1,

    /** Prompt the user before clobbering files */
    Interactive = 1 << 2,

    /** Skip existing destination files */
    NonClobber = 1 << 3,

    /** Do not use any sort of inode-cloning magic */
    NoFileClone = 1 << 9,

    /** Target is a single file */
    NoTargetDir = 1 << 8,

    /** Recursively copy files to the destination */
    Recursive = 1 << 4,

    /** If the destination already exists, remove it first */
    RemoveDestination = 1 << 8,

    /** Remove the trailing slash from the source files before copying */
    RemoveSlash = 1 << 5,

    /** Do not cross over multiple filesystems when reading the source */
    SingleFilesystem = 1 << 6,

    /** Only copy files that are newer */
    Update = 1 << 7,

    /** Give the user detailed information about the copy operation */
    Verbose = 1 << 10
}

/** What type of backup control to use */
export enum BackupTypeEnum {
    None,
    Simple,
    Off = None,
    Numbered,
    T = Numbered,
    Existing,
    Nil = Existing,
    Date
}

export type BackupType = 'None'
    | 'Simple'
    | 'Off'
    | 'Numbered'
    | 'T'
    | 'Existing'
    | 'Nil'
    | 'Date';

/**
 * Information about a single copy operation
 */
export interface ICopyParams extends ICommandParams {
    backup: BackupType;

    /** The destination that will receive the copied files */
    DEST: string;

    /** Flags controlling the operation */
    flags: number;

    /** The files and directories being copied */
    SOURCE: string[];
}

/**
 * Implements POSIX cp-like functionality
 */
export default class CopyCommand extends CommandBase<ICopyParams> {
    constructor() {
        super();
        this.defineUsage(parser => parser
            .setAuthor('Kristian Oye <kristianoye@gmail.com')
            .setDescription('Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY')
            .setVerb('klf-cp')
            .addAlias('copy', 'cp')
            .setVersion('1.0')
            .setDescription('Copy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY')
            .addSwitch('-b', 'Like --backup but does not accept an argument', { sets: CopyFlags.Backup, defaultValue: BackupTypeEnum.Simple, name: 'CONTROL' })
            .addSwitch<typeof BackupTypeEnum>('--backup <CONTROL>', 'Make a backup of each existing destination file', { sets: CopyFlags.Backup, oneOf: BackupTypeEnum })
            .addSwitch('-f, --force', 'If  an existing destination file cannot be opened, remove it and try again (this option is ignored when the -n option is also used)',
                { name: 'force', sets: CopyFlags.Force, clears: CopyFlags.Interactive | CopyFlags.NonClobber })
            .addSwitch('-i, --interactive', 'Prompt before overwrite (overrides a previous -n option)',
                { name: 'interactive', sets: CopyFlags.Interactive, clears: CopyFlags.Force | CopyFlags.NonClobber })
            .addSwitch('--one-file-system, -x', 'Stay on this file system', { name: 'sfs', sets: CopyFlags.SingleFilesystem })
            .addSwitch('-r, --recursive', 'Copy directories recursively', { name: 'recursive', sets: CopyFlags.Recursive })
            .addSwitch('--remove-destination', 'Remove each existing destination file before attempting to open it (contrast with --force)', { name: 'removeDestination', sets: CopyFlags.RemoveDestination })
            .addSwitch('--strip-trailing-slashes', 'Remove any trailing slashes from each SOURCE argument', { name: 'stripSlashes', sets: CopyFlags.RemoveSlash })
            .addSwitch('-S, --suffix <backupSuffix>', 'Override the usual backup suffix')
            .addSwitch('-t, --target-directory <targetDirectory>', 'Copy all SOURCE arguments into DIRECTORY', { name: 'targetDirectory' })
            .addSwitch('-T, --no-target-directory', 'Copy all SOURCE arguments into DIRECTORY', { name: 'noTargetDirectory', sets: CopyFlags.NoTargetDir })
            .addSwitch('-u, --update', 'Copy only when the SOURCE file is newer than the destination file or when the destination file is missing', { name: 'update', sets: CopyFlags.Update })
            .addSwitch('-v, --verbose', 'Explain what is being done', { name: 'verbose ', sets: CopyFlags.Verbose })
            .addSwitch('--no-clone', 'Do not use the OS FIClone option even if available', { name: 'noclone', sets: CopyFlags.NoFileClone })
            .addArgument('<SOURCE...> <DEST>'));
    }

    execute(verb: string, params: ICopyParams): number {
        if (params.SOURCE.length === 0)
            return console.log(`${verb}: Missing file operand SOURCE\nTry '${verb} --help for more information'`), 1;
        else if (!params.DEST)
            return console.log(`${verb}: Missing file operand DEST/destination\nTry '${verb} --help for more information'`), 1;
        return 0;
    }
}
