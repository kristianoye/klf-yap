/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Defines a common interface for filesystem objects 
 */

import path from "path";
import { FSQObjectCallback } from "../util/FileUtil";
import { ErrorLike, IFileObject, IFileSystemQueryBigint, PathLike } from "./FileTypedefs";
import fs from 'fs';
import FileObject from "./FileObject";
import FileWorker from "./FileWorker";

export interface StatOptions extends fs.StatOptions {
    allowPlaceholders?: boolean;
    encoding?: BufferEncoding;
    followLinks?: boolean;
    recursive?: boolean;
    relativeTo?: string;
    throwErrors?: boolean;
    throwIfNoEntry?: boolean;
    wantChildren?: boolean;
}

export interface IFileSystem {
    createPlaceholder(fullPath: PathLike, error?: ErrorLike): IFileObject;
    createBigIntPlaceholder(fullPath: PathLike, error?: ErrorLike): IFileObject<bigint>;

    lstat(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true }, callback: FSQObjectCallback<bigint>): void;
    lstat(pathLike: PathLike, options: StatOptions): IFileObject;
    lstat(pathLike: PathLike, options: StatOptions & { bigint: true }): IFileObject<bigint>;
    lstat(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstat(pathLike: PathLike): IFileObject;

    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback<number>): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, options: StatOptions & { bigint: true }, callback: FSQObjectCallback<bigint>): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, optionsIn: unknown, callbackIn?: unknown): void;

    lstatSync(pathLike: PathLike): IFileObject;
    lstatSync(pathLike: PathLike, options: StatOptions): IFileObject;
    lstatSync(pathLike: PathLike, options: StatOptions & { bigint: true }): IFileObject<bigint>;
}

export interface IFileSystemSettings {
    bigint: boolean;
    readonly: boolean;
}

export abstract class FileSystem implements IFileSystemSettings, IFileSystem {
    constructor(settings: Partial<IFileSystemSettings> = {}) {
        this.bigint = settings.bigint === true;
        this.readonly = settings.readonly === true;
    }

    readonly bigint: boolean;

    readonly readonly: boolean;

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
        } as fs.StatsBase<number>, { error, fullPath, fileSystem: this })
    }

    createBigIntPlaceholder(fullPath: PathLike, error?: ErrorLike): IFileObject<bigint> {
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
        } as fs.StatsBase<bigint>, { error, fullPath, fileSystem: this });
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

        if (typeof realCallback === 'function')
            if (realOptions.bigint)
                return this.lstatCallback(pathLike, { ...realOptions, bigint: true }, realCallback as FSQObjectCallback<bigint>);
            else
                return this.lstatCallback(pathLike, realOptions, realCallback as FSQObjectCallback<number>);
        else if (typeof realOptions === 'object')
            return this.lstatSync(pathLike, realOptions);
        else
            return this.lstatSync(pathLike);
    }

    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback<number>): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, options: StatOptions & { bigint: true }, callback: FSQObjectCallback<bigint>): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, optionsIn: unknown, callbackIn?: unknown): void {
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

    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, options: StatOptions, callback: FSQObjectCallback<number>): void;
    lstatCallback<TNum extends number | bigint = bigint>(pathLike: PathLike, options: StatOptions & { bigint: true }, callback: FSQObjectCallback<bigint>): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, callback: FSQObjectCallback): void;
    lstatCallback<TNum extends number | bigint = number>(pathLike: PathLike, optionsIn: unknown, callbackIn?: unknown): void {
        const o: StatOptions = typeof optionsIn === 'object' && optionsIn as StatOptions || {} as StatOptions;
        const fullPath: PathLike = typeof pathLike === 'string'
            && path.isAbsolute(pathLike)
            && pathLike
            || typeof pathLike === 'string'
            && path.resolve(o.relativeTo || process.cwd(), pathLike)
            || pathLike;
        const callbackBigint: FSQObjectCallback<bigint> | undefined = typeof callbackIn === 'function' && o.bigint && callbackIn as FSQObjectCallback<bigint> || undefined;
        const callbackNumber: FSQObjectCallback<number> | undefined = typeof callbackIn === 'function' && !o.bigint && callbackIn as FSQObjectCallback<number> || undefined;
        const worker = FileWorker;
        const fileSystem = this;
        const justReturn = (resultObject: IFileObject<TNum> | undefined, error: ErrorLike = undefined) => {
            if (callbackBigint)
                return callbackBigint(error, resultObject as IFileObject<bigint>);
            else if (callbackNumber)
                return callbackNumber(error, resultObject as IFileObject<number>);
        };
        const populateAndReturn = (parent: IFileObject<TNum>, whenDone: (file: IFileObject<TNum>) => void) => {
            fs.readdir(parent.fullPath, (err, files) => {
                if (Array.isArray(files)) {
                    const childFiles = files.map(c => path.join(parent.fullPath, c));
                    const children: IFileObject<TNum>[] = [];
                    for (const childPath of childFiles) {
                        worker.enqueue(() => {
                            this.lstatCallback(childPath, o, (err, file) => {
                                if (file) children.push(file as IFileObject<TNum>);
                                else if (o.bigint)
                                    children.push(this.createBigIntPlaceholder(childPath, err) as IFileObject<TNum>);
                                else
                                    children.push(this.createPlaceholder(childPath, err) as IFileObject<TNum>);

                                if (children.length === files.length) {
                                    const parentWithChildren = new FileObject<TNum>(
                                        parent.getStats() as fs.StatsBase<TNum>,
                                        { ...parent, children });
                                    whenDone(parentWithChildren);
                                }
                            });
                        });
                    }
                    return;
                }
                else
                    return justReturn(undefined, err);
            });
        };

        if (typeof callbackBigint !== 'function' && typeof callbackNumber === 'undefined')
            throw new Error(`lstatCallback(${pathLike} requires a callback parameter)`)
        try {
            if (typeof fullPath === 'string')
                worker.enqueue(() => {
                    fs.lstat(fullPath, { bigint: o.bigint }, (err, stats) => {
                        if (err && o.throwErrors)
                            throw err;
                        else if (stats.isSymbolicLink()) {
                            worker.enqueue(() => {
                                fs.readlink(fullPath, { encoding: o.encoding || 'utf8' }, (err, linkTargetText: string) => {
                                    const linkTargetName = path.isAbsolute(linkTargetText) ? linkTargetText : path.resolve(fullPath, linkTargetText);
                                    this.lstat(linkTargetName, { ...o, wantChildren: o.followLinks === true }, (err, linkTarget) => {
                                        let linkResult: IFileObject<TNum> | undefined = undefined;

                                        if (linkTarget)
                                            linkResult = new FileObject(
                                                stats as fs.StatsBase<TNum>,
                                                {
                                                    fileSystem,
                                                    fullPath,
                                                    linkTargetName,
                                                    linkTarget: linkTarget as IFileObject<TNum>
                                                });
                                        else
                                            linkResult = new FileObject(
                                                stats as fs.StatsBase<TNum>,
                                                {
                                                    fileSystem,
                                                    fullPath,
                                                    linkTargetName,
                                                    linkTarget: this.createPlaceholder(linkTargetName, err) as IFileObject<TNum>
                                                });
                                        return justReturn(linkResult, err);
                                    })
                                });
                            });
                        }
                        else {
                            const resultObject = new FileObject<TNum>(
                                stats as fs.StatsBase<TNum>,
                                { fileSystem, fullPath });
                            if (stats.isDirectory() && (o.wantChildren || o.recursive))
                                return populateAndReturn(resultObject, result => justReturn(result));
                            else
                                return justReturn(resultObject);
                        }
                    });
                });
            else
                justReturn(undefined, new Error(`Invalid pathLike: ${pathLike}`));
        }
        catch (err) {
            justReturn(undefined, err);
        }
    }


    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike): IFileObject;
    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike, options: StatOptions): IFileObject;
    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike, options: StatOptions & { bigint: true; }): IFileObject<bigint>;
    lstatSync<TNum extends number | bigint = number>(fullPath: PathLike, options?: StatOptions): IFileObject<TNum> {
        const realOptions = typeof options === 'object'
            && options as StatOptions
            || { bigint: this.bigint } as StatOptions;
        const fileSystem = this;

        try {
            const populateAndReturn = (parent: IFileObject<TNum>): IFileObject<TNum> => {
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
                                    fileSystem,
                                    fullPath: fullPath,
                                    name,
                                    parent: parent as IFileObject<TNum>,
                                    linkTargetName,
                                    linkTarget
                                }));
                            }
                            else {
                                const linkTarget = this.lstatSync<TNum>(linkTargetName, { ...realOptions, recursive: false, wantChildren: false });

                                children.push(new FileObject<TNum>(stats as fs.StatsBase<TNum>, {
                                    fileSystem,
                                    fullPath: fullPath,
                                    name,
                                    parent: parent as IFileObject<TNum>,
                                    linkTargetName,
                                    linkTarget: linkTarget as IFileObject<TNum>
                                }));
                            }
                        }
                        else if (stats.isDirectory() && realOptions.recursive) {
                            const subdir = this.lstatSync<TNum>(fullPath, realOptions);
                            children.push(subdir);
                        }
                        else
                            children.push(new FileObject<TNum>(stats as fs.StatsBase<TNum>, { fileSystem, fullPath, name, parent: parent as IFileObject<TNum> }));
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
                const result = new FileObject<TNum>(stats as fs.StatsBase<TNum>, { fullPath, linkTargetName, fileSystem });

                if (result.isSymbolicLink() && linkTargetName) {
                    const linkTargetPath = path.isAbsolute(linkTargetName) ? linkTargetName : path.resolve(result.parentPath, linkTargetName);
                    const linkTarget = this.lstatSync(linkTargetPath, realOptions) as IFileObject<TNum>;

                    if (linkTarget.isDirectory()) {
                        if (realOptions.followLinks)
                            return new FileObject(stats, { fileSystem, fullPath, linkTargetName, linkTarget: populateAndReturn(linkTarget) });
                        else
                            return new FileObject(stats, { fileSystem, fullPath, linkTargetName, linkTarget });
                    }
                    else if (linkTarget.isSymbolicLink()) {
                        return new FileObject<TNum>(stats, { fileSystem, fullPath, linkTargetName, linkTarget });
                    }
                    else {
                        return new FileObject<TNum>(stats, { fileSystem, fullPath, linkTargetName, linkTarget });
                    }
                }
                else if (result.isDirectory())
                    return realOptions.wantChildren === false ? result : populateAndReturn(result);
                else
                    return new FileObject<TNum>(stats, { fileSystem, fullPath, linkTargetName });
            }
        }
        catch (err) {
            return realOptions.bigint
                ? this.createBigIntPlaceholder(fullPath, err) as IFileObject<TNum>
                : this.createPlaceholder(fullPath, err) as IFileObject<TNum>;
        }
        return realOptions.bigint
            ? this.createBigIntPlaceholder(fullPath, new Error(`Unknown Error in lstatSync(${fullPath}, ...)`)) as IFileObject<TNum>
            : this.createPlaceholder(fullPath, new Error(`Unknown Error in lstatSync(${fullPath}, ...)`)) as IFileObject<TNum>;
    }
}
