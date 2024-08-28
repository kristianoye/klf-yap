/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Defines a common interface for filesystem objects 
 */

import path from "path";
import { FSQObjectCallback } from "../util/FileUtil";
import { ErrorLike, IFileObject, PathLike } from "./FileTypedefs";
import fs from 'fs';
import FileObject from "./FileObject";

export interface StatOptions extends fs.StatOptions {
    allowPlaceholders?: boolean;
    encoding?: BufferEncoding;
    followLinks?: boolean;
    recursive?: boolean;
    relativeTo?: string;
    throwIfNoEntry?: boolean;
}

export interface IFileSystem {
    createPlaceholder(pathLike: PathLike): IFileObject;
    createBigIntPlaceholder(pathLike: PathLike): IFileObject<bigint>;

    lstat(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true }, callback: FSQObjectCallback<bigint>): void;
    lstat(pathLike: PathLike, options: StatOptions): IFileObject;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true }): IFileObject<bigint>;
    lstat(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike): IFileObject;

    lstatSync(pathLike: PathLike): IFileObject;
    lstatSync(pathLike: PathLike, options: StatOptions): IFileObject;
    lstatSync(pathLike: PathLike, options: StatOptions & { bigint: true }): IFileObject<bigint>;
}

export interface IFileSystemSettings {
    bigint: boolean;
}

export abstract class FileSystem implements IFileSystemSettings, IFileSystem {
    constructor(settings: Partial<IFileSystemSettings> = {}) {
        this.bigint = settings.bigint === true;
    }

    readonly bigint: boolean;

    createPlaceholder(fullPath: PathLike, error?: ErrorLike): IFileObject {
        return new FileObject({
            isBlockDevice: () => { return false },
            isCharacterDevice: () => { return false },
            isDirectory: () => { return false },
            isFIFO: () => { return false },
            isFile: () => { return false },
            isSocket: () => { return false },
            isSymbolicLink: () => { return false },
            atime: new Date(0),
            atimeMs: 0,
            birthtime: new Date(0),
            birthtimeMs: 0,
            blocks: 0,
            blksize: 0,
            ctime: new Date(0),
            ctimeMs: 0,
            dev: 0,
            gid: 0,
            ino: 0,
            mode: 0,
            nlink: 0,
            rdev: 0,
            size: 0,
            uid: 0
        } as fs.StatsBase<number>, { error, fullPath })
    }

    createBigIntPlaceholder(pathLike: PathLike): IFileObject<bigint> {
        return new FileObject<bigint>({
            isBlockDevice: () => { return false },
            isCharacterDevice: () => { return false },
            isDirectory: () => { return false },
            isFIFO: () => { return false },
            isFile: () => { return false },
            isSocket: () => { return false },
            isSymbolicLink: () => { return false },
            atime: new Date(0),
            atimeMs: 0n,
            birthtime: new Date(0),
            birthtimeMs: 0n,
            blocks: 0n,
            blksize: 0n,
            ctime: new Date(0),
            ctimeMs: 0n,
            dev: 0n,
            gid: 0n,
            ino: 0n,
            mode: 0n,
            nlink: 0n,
            rdev: 0n,
            size: 0n,
            uid: 0n
        } as fs.StatsBase<bigint>);
    }


    lstat(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true; }, callback: FSQObjectCallback<bigint>): void;
    lstat(pathLike: PathLike, options: StatOptions): IFileObject;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true; }): IFileObject<bigint>;
    lstat(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike): IFileObject;
    lstat(pathLike: unknown, options?: unknown, callback?: unknown): void | IFileObject<number> | IFileObject<bigint> {
        throw new Error(`Method stat not implemented by ${this.constructor.name}.`);
    }

    lstatSync(pathLike: PathLike): IFileObject;
    lstatSync(pathLike: PathLike, options: StatOptions): IFileObject;
    lstatSync(pathLike: PathLike, options: StatOptions & { bigint: true; }): IFileObject<bigint>;
    lstatSync(pathLike: unknown, options?: unknown): IFileObject<number> | IFileObject<bigint> {
        throw new Error(`Method stat not implemented by ${this.constructor.name}.`);
    }
}

export class DiskFileSystem extends FileSystem {
    constructor(settings: Partial<IFileSystemSettings> = {}) {
        super(settings);
    }

    lstat(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true; }, callback: FSQObjectCallback<bigint>): void;
    lstat(pathLike: PathLike, options: StatOptions): IFileObject;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true; }): IFileObject<bigint>;
    lstat(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike): IFileObject;
    lstat(pathLike: PathLike, options?: unknown, callback?: unknown): void | IFileObject<number> | IFileObject<bigint> {
        const realOptions = typeof options === 'object'
            && options as StatOptions
            || { bigint: this.bigint } as StatOptions;
        const realCallback = typeof callback === 'function'
            && (realOptions.bigint || this.bigint ? callback as FSQObjectCallback<bigint> : callback as FSQObjectCallback)
            || undefined;

        if (typeof realCallback === 'function') {

        }
        else if (typeof realOptions === 'object')
            return this.lstatSync(pathLike, realOptions);
        else
            return this.lstatSync(pathLike);
    }

    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike): IFileObject;
    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike, options: StatOptions): IFileObject;
    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike, options: StatOptions & { bigint: true; }): IFileObject<bigint>;
    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike, options?: StatOptions): IFileObject<TNum> {
        const realOptions = typeof options === 'object'
            && options as StatOptions
            || { bigint: this.bigint } as StatOptions;

        try {
            const populateAndReturnDirectory = (parent: IFileObject<TNum>): IFileObject<TNum> => {
                const files = fs.readdirSync(parent.fullPath, { encoding: realOptions.encoding || 'utf8' });
                const children: (IFileObject<number> | IFileObject<bigint> | IFileObject<TNum>)[] = [];

                for (const name of files) {
                    const fullPath = path.resolve(parent.fullPath, name);
                    const stats = fs.lstatSync(fullPath, realOptions) as fs.StatsBase<TNum>;

                    if (stats) {
                        if (stats.isSymbolicLink()) {
                            const linkTargetName = fs.readlinkSync(fullPath);
                            if (realOptions.followLinks) {
                                const linkTarget = this.lstatSync(linkTargetName, realOptions) as IFileObject<TNum>;
                                children.push(new FileObject<TNum>(stats as fs.StatsBase<TNum>, {
                                    fullPath: fullPath,
                                    name,
                                    parent: parent as IFileObject<TNum>,
                                    linkTargetName,
                                    linkTarget
                                }));
                            }
                            else
                                children.push(new FileObject<TNum>(stats as fs.StatsBase<TNum>, { fullPath: fullPath, name, parent: parent as IFileObject<TNum>, linkTargetName }));
                        }
                        else if (stats.isDirectory() && realOptions.recursive) {
                            const subdir = this.lstatSync<TNum>(fullPath, realOptions);
                            children.push(subdir);
                        }
                        else
                            children.push(new FileObject<TNum>(stats as fs.StatsBase<TNum>, { fullPath: fullPath, name, parent: parent as IFileObject<TNum> }));
                    }
                }
                return new FileObject(parent.getStats(), { ...parent, children: children as IFileObject<TNum>[] });
            };
            if (!path.isAbsolute(fullPath)) {
                fullPath = path.resolve(realOptions.relativeTo || process.cwd(), fullPath);
            }

            const stats = fs.lstatSync(fullPath, realOptions) as fs.StatsBase<TNum>;

            if (typeof stats === 'object') {
                const linkTargetName = stats.isSymbolicLink() ? fs.readlinkSync(fullPath, { encoding: realOptions.encoding || 'utf8' }) : undefined;
                const result = new FileObject<TNum>(stats as fs.StatsBase<TNum>, { fullPath, linkTargetName });

                if (result.isSymbolicLink() && options?.followLinks && linkTargetName) {
                    const linkTargetPath = path.isAbsolute(linkTargetName) ? linkTargetName : path.resolve(result.parentPath, linkTargetName);
                    const linkTarget = this.lstatSync(linkTargetPath, realOptions) as IFileObject<TNum>;

                    if (linkTarget.isDirectory()) {
                        return new FileObject(stats, { fullPath, linkTargetName, linkTarget: populateAndReturnDirectory(linkTarget) });
                    }
                    else if (linkTarget.isSymbolicLink()) {
                        return new FileObject<TNum>(stats, { fullPath, linkTargetName });
                    }
                }
                else if (result.isDirectory()) {
                    return populateAndReturnDirectory(result);
                }
                else {
                    return new FileObject<TNum>(stats, { fullPath, linkTargetName });
                }
            }
        }
        catch (err) {
            return this.createPlaceholder(fullPath, err) as IFileObject<TNum>;
        }
        return this.createPlaceholder(fullPath, new Error('Unknown Error in lstatSync()')) as IFileObject<TNum>;
    }
}
