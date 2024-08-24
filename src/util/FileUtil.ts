/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

import { GenericObject } from "../BaseTypes";
import path from 'path';
import fs, { StatsBase } from 'fs';

/** Used to split pathlike expressions */
const rePathSplitter: RegExp = path.sep === path.posix.sep ? /\// : new RegExp(`[\\${path.sep}|${path.posix.sep}]`);
const reHasWildcards: RegExp = /[\*\?\[\]]/;

/** Get the root directory of package */
const getProjectRoot = () => {
    const ourPath = __dirname.split(rePathSplitter);
    while (ourPath.length > 0) {
        try {
            const packageJson = path.resolve(ourPath.join(path.sep), 'package.json');
            const stats = fs.statSync(packageJson);
            if (stats.isFile())
                return ourPath.join(path.sep);

        }
        catch (err) { }
        finally {
            ourPath.pop();
        }
    }
    console.log(`${__filename} unable to determine package root`);
    return '';
}

const packageRoot: string = getProjectRoot();

export class FileObjectContentMatch {

}

export interface IFileSystemQuery {
    /** Matching files should contain text matching our expressions */
    contains?: string | string[] | RegExp;

    /** One or more pathlike expressions */
    expr: string[];

    /** Max acccess time to consider */
    maxAccessTime?: number;

    /** Max creation time to consider */
    maxCreateTime?: number;

    /** Max change time to consider */
    maxChangeTime?: number;

    /** How many times should we keep looking for the same pattern in a single file? */
    maxMatches?: number;

    /** The maximum size of file we want to consider */
    maxSize?: number;

    /** Minimum access time */
    minAccessTime?: number;

    /** Minimum change time */
    minChangeTime?: number;

    /** Minimum creation time to consider */
    minCreateTime?: number;

    /** The minimum size of file we want to consider */
    minSize?: number;

    /**
     * Callback that executes when the content is matched
     */
    onContains?: (match: FileObjectContentMatch) => boolean;

    recursive?: boolean;

    /** Do we want to contain the results to a single filesystem? Defaults to false */
    singleFS?: boolean;

    /** Should we throw errors, like not found, etc? */
    throwErrors?: boolean;
}

export interface IFileObject<TNumType = number> extends fs.StatsBase<TNumType> {
    children?: IFileObject<TNumType>[],
    fullPath: string;
    name: string;
    parent?: IFileObject<TNumType>,
    prefix: string;

    /**
     * Add a child to a directory
     * @param child A child file or directory
     */
    addChild(child: IFileObject<TNumType>): this;
}

export class FileObject<TNumType = number> implements IFileObject<TNumType> {
    constructor(stats: fs.StatsBase<TNumType>, details: Partial<FileObject<TNumType>> = {}) {
        this.children = stats.isDirectory() && Array.isArray(details.children) && details.children || [];
        this.fullPath = details.fullPath!;
        if (details.name) {
            this.name = this.baseName = details.name!;
        }
        else {
            let n = this.fullPath.lastIndexOf(path.sep);
            this.name = this.baseName = this.fullPath.slice(n + 1);
        }
        this.parent = details.parent;
        this.parentPath = path.resolve(this.fullPath, '..');
        this.prefix = details.prefix ?? '';
        this.stats = stats;

        if (!this.isDirectory()) {
            const parts = this.name.split('.').filter(s => s.length);
            if (parts.length > 1) {
                this.extension = '.' + parts.slice(1).join('.');
                this.baseName = parts[0];
            }
        }
    }

    baseName: string = '';

    children: IFileObject<TNumType>[] = [];

    extension: string = '';

    fullPath: string;

    name: string;

    parent: IFileObject<TNumType> | undefined = undefined;

    parentPath: string = '';

    prefix: string;

    private stats: fs.StatsBase<TNumType>;

    addChild(child: IFileObject<TNumType>): this {
        if (this.isDirectory()) {
            if (this.children.indexOf(child))
                this.children.push(child);
        }
        return this;
    }

    isFile(): boolean {
        return this.stats.isFile();
    }

    isDirectory(): boolean {
        return this.stats.isDirectory();
    }

    isBlockDevice(): boolean {
        return this.stats.isBlockDevice();
    }

    isCharacterDevice(): boolean {
        return this.stats.isCharacterDevice();
    }

    isSymbolicLink(): boolean {
        return this.stats.isSymbolicLink();
    }

    isFIFO(): boolean {
        return this.stats.isFIFO();
    }

    isSocket(): boolean {
        return this.stats.isSocket();
    }
    get dev() { return this.stats.dev }
    get ino() { return this.stats.ino }
    get mode() { return this.stats.mode }
    get nlink() { return this.stats.nlink }
    get uid() { return this.stats.uid }
    get gid() { return this.stats.gid }
    get rdev() { return this.stats.rdev }
    get size() { return this.stats.size }
    get blksize() { return this.stats.blksize }
    get blocks() { return this.stats.blocks }
    get atimeMs() { return this.stats.atimeMs }
    get mtimeMs() { return this.stats.mtimeMs }
    get ctimeMs() { return this.stats.ctimeMs }
    get birthtimeMs() { return this.stats.birthtimeMs }
    get atime() { return this.stats.atime }
    get mtime() { return this.stats.mtime }
    get ctime() { return this.stats.ctime }
    get birthtime() { return this.stats.birthtime }
}

export type FileObjectResultCallback<TNumType = number> = (results: FileObject<TNumType>[]) => void;

export class FileObjectCollection<TNumType = number> extends Array<IFileObject<TNumType>> {
    constructor(...files: IFileObject<TNumType>[]) {
        super(...files);
    }

    copyAll(dest: string): this {
        return this;
    }

    unlinkAll(): this {
        return this;
    }
}

interface IFileUtil {
    fsqCallback(pathLike: string, query: IFileSystemQuery, callback: FileObjectResultCallback): this;
    fsqCallback(pathLike: string[], query: IFileSystemQuery, callback: FileObjectResultCallback): this;
    fsqCallback(pathLike: string, callback: FileObjectResultCallback): this;
    fsqCallback(pathLike: string[], callback: FileObjectResultCallback): this;
    fsqCallback(query: IFileSystemQuery, callback: FileObjectResultCallback): this;
}

class FileUtilImpl implements IFileUtil {
    expandTemplateFile(templateFile: string, templateVariables: GenericObject = {}, filenameVariables: GenericObject = {}) {
        if (!path.isAbsolute(templateFile)) {
            var filesToTry = [

            ];
        }
    }

    readExprCallback<TNumType = number>(pathLikeOrFileObject: string | FileObject<TNumType>, callback: FileObjectResultCallback<TNumType>, query: IFileSystemQuery = { expr: [], throwErrors: true }): this {
        const warnOrThrow = (message: string, returnValue: FileObject<TNumType>[] = []) => {
            if (query.throwErrors === true) {
                throw new Error(message);
            }
            else {
                console.log(message);
                callback(returnValue);
            }
            return this;
        };
        const results: FileObject<TNumType>[] = [];
        const fileObject: FileObject<TNumType> | undefined = typeof pathLikeOrFileObject === 'object' && pathLikeOrFileObject as FileObject<TNumType> || undefined;
        let pathLike: string = typeof pathLikeOrFileObject === 'string' ? pathLikeOrFileObject : fileObject?.fullPath!;

        if (!path.isAbsolute(pathLike)) {
            pathLike = path.resolve(packageRoot, pathLike);
        }

        try {
            //  Does the expression contain wildcards?
            if (reHasWildcards.test(pathLike)) {
                const parts = pathLike.split(rePathSplitter).filter(p => p.length);
                let prefix: string | undefined = undefined;

                //  Keep going until we hit our first globular expression
                for (const [index, part] of parts.entries()) {
                    if (!prefix) {
                        if (reHasWildcards.test(part)) {
                            prefix = parts.slice(0, index).join(path.sep);

                            if (part.indexOf('**') > -1) {
                                if (part === '**') {
                                    const leftExpr = parts.slice(0, index).join(path.sep),
                                        rightExpr = parts.slice(index + 1).join(path.sep);

                                    if (rightExpr.indexOf('**') > -1)
                                        return warnOrThrow(`Expression ${pathLike} cannot contain more than one globstar`);

                                    this.readExprCallback(leftExpr, (files => {
                                        console.log('files', files);
                                    }), { ...query, recursive: true });
                                }
                                else
                                    return warnOrThrow(`Expression ${pathLike} is invalid; Globstar must appear by itself, not ${part}`);
                            }
                        }
                    }
                }
            }
            else {
                fs.stat(fileObject ? fileObject.fullPath : pathLike, (err, stats) => {
                    if (err) {
                        if (query.throwErrors) throw err;
                    }
                    else if (stats.isDirectory()) {
                        const dir = fileObject ?? new FileObject<TNumType>(stats as fs.StatsBase<TNumType>, { fullPath: pathLike });
                        results.push(dir);

                        fs.readdir(pathLike, (err, stats) => {
                            const max = stats && stats.length || 0;
                            const addChild = (newChild: FileObject<TNumType>) => {
                                dir.addChild(newChild);
                                if (dir.children.length === max)
                                    callback(results);
                            };
                            for (const name of stats) {
                                const fullPath = path.join(pathLike, name);

                                fs.stat(fullPath, (err, childStats) => {
                                    if (err && query.throwErrors) throw err;
                                    else if (childStats) {
                                        const newChild = new FileObject<TNumType>(childStats as fs.StatsBase<TNumType>, { parent: dir, name, fullPath });

                                        if (query.recursive === true && newChild.isDirectory())
                                            this.readExprCallback(newChild, () => addChild(newChild), query);
                                        else
                                            addChild(newChild);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        results.push(new FileObject<TNumType>(stats as fs.StatsBase<TNumType>));
                        callback(results);
                    }
                });
            }

        }
        catch (err) {
            const error: Error = err as Error;
            console.log(`FileUtil.readExpr() ERROR ${(error?.stack || error)}`);
        }
        return this;
    }

    fsqCallback(pathLikeOrQuery: string | string[] | IFileSystemQuery, queryOrCallback: FileObjectResultCallback | IFileSystemQuery = { expr: [] }, callbackIn?: FileObjectResultCallback): this {
        const pathLikes: string[] = pathLikeOrQuery as string[];
        const query: IFileSystemQuery = pathLikeOrQuery as IFileSystemQuery ?? queryOrCallback;
        const callback: FileObjectResultCallback = queryOrCallback as FileObjectResultCallback ?? callbackIn;
        const results: FileObject[] = [];
        let resultCount: number = 0;

        if (typeof pathLikeOrQuery === 'string')
            return this.fsqCallback([pathLikeOrQuery], queryOrCallback, callbackIn);
        else if (pathLikes) {
            query.expr = Array.isArray(query.expr) ? [...query.expr, ...pathLikes] : query.expr = pathLikes;
        }
        if (query.expr.length === 0) {
            throw new Error('FileUtil.fsq(): No path expressions were provided, nothing to do');
        }
        const receiveCallbackResults = (i: number, expr: string, files: FileObject[]): void => {
            results.push(...files);
            if (++resultCount === pathLikes.length)
                callback(results);

        }
        for (const [i, expr] of query.expr.entries()) {
            this.readExprCallback(expr, files => receiveCallbackResults(i, expr, files), query);
        }
        return this;
    }

    async fsqAsync(): Promise<void> {

    }

    fsqSync(): void {

    }
}

const FileUtil: IFileUtil = new FileUtilImpl;

export default FileUtil;
