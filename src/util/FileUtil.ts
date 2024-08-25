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
import RegExUtil from "./RegExUtil";

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

export type FileObjectType = 'file' | 'directory' | 'socket' | 'FIFO' | 'link' | 'blockDevice' | 'characterDevice' | 'unknown';

const packageRoot: string = getProjectRoot();

export class FileObjectContentMatch {

}

export interface IReadFilesQuery<TNumType extends number | bigint> {
    /** Use bigint for our numeric types */
    bigint: boolean;

    /** Should we stream the results or buffer and return all at once?; Defaults to false */
    buffer: boolean;

    /** One or more pathlike expressions */
    expr: string[];

    /** Recursively search for matching files? */
    recursive: boolean;

    /** Do we want to contain the results to a single filesystem? Defaults to false */
    singleFS: boolean;

    /** Should we throw errors, like not found, etc? */
    throwErrors: boolean;
}

export interface IFileSystemQuery<TNumType extends number | bigint> extends IReadFilesQuery<TNumType> {
    /** Matching files should contain text matching our expressions */
    contains?: string | string[] | RegExp;

    /** What encoding should we use for reads? */
    encoding?: BufferEncoding;

    /** Does the file end with the supplied pattern */
    endsWith?: string | RegExp;

    /** Matching object must be of type */
    isType?: FileObjectType | FileObjectType[];

    /** Max acccess time to consider */
    maxAccessTime?: TNumType;

    /** Max creation time to consider */
    maxCreateTime?: TNumType;

    /** Max change time to consider */
    maxChangeTime?: TNumType;

    /** How many times should we keep looking for the same pattern in a single file? */
    maxMatches?: TNumType;

    /** The maximum size of file we want to consider */
    maxSize?: TNumType;

    /** Minimum access time */
    minAccessTime?: TNumType;

    /** Minimum change time */
    minChangeTime?: TNumType;

    /** Minimum creation time to consider */
    minCreateTime?: TNumType;

    /** The minimum size of file we want to consider */
    minSize?: TNumType;

    /**
     * Callback that executes when the content is matched
     */
    onContains?: (match: FileObjectContentMatch) => boolean;

    /** Does the name start with the supplied pattern? */
    startsWith?: string | RegExp;
}

/**
 * Wraps a NodeJS StatBase with object goodness.
 */
export interface IFileObject<TNumType extends number | bigint> extends fs.StatsBase<TNumType> {
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

    /**
     * Test to see if the current object matches the criteria
     * @param criteria Criteria to check this file against
     * @param callback The callback to execute when we know the result of our tests
     */
    matchCriteria(criteria: IFileSystemQuery<TNumType>, callback: (result: boolean, file: IFileObject<TNumType>) => void): void;
}

export class FileObject<TNumType extends number | bigint> implements IFileObject<TNumType> {
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

    matchCriteria(criteria: IFileSystemQuery<TNumType>, callback: (result: boolean, file: IFileObject<TNumType>) => void) {
        if (criteria.maxAccessTime && this.atimeMs > criteria.maxAccessTime) return callback(false, this);
        else if (criteria.minAccessTime && this.atimeMs < criteria.minAccessTime) return callback(false, this);
        else if (criteria.maxChangeTime && this.ctimeMs > criteria.maxChangeTime) return callback(false, this);
        else if (criteria.minChangeTime && this.ctimeMs < criteria.minChangeTime) return callback(false, this);
        else if (criteria.maxCreateTime && this.birthtimeMs > criteria.maxCreateTime) return callback(false, this);
        else if (criteria.minCreateTime && this.birthtimeMs < criteria.minCreateTime) return callback(false, this);
        else if (Array.isArray(criteria.isType) && criteria.isType.indexOf(this.typeName) === -1) return callback(false, this);
        else if (typeof criteria.endsWith === 'string' && !this.name.endsWith(criteria.endsWith)) return callback(false, this);
        else if (criteria.endsWith && criteria.endsWith instanceof RegExp && !criteria.endsWith.test(this.name)) return callback(false, this);
        else if (typeof criteria.startsWith === 'string' && !this.name.startsWith(criteria.startsWith)) return callback(false, this);
        else if (criteria.startsWith && criteria.startsWith instanceof RegExp && !criteria.startsWith.test(this.name)) return callback(false, this);

        //  TODO: Content scanning, etc
        if (criteria.contains) {
            if (this.isFile()) {
                const encoding: BufferEncoding = criteria.encoding || 'utf8';
                fs.readFile(this.fullPath, { encoding }, (err, buffer) => {
                    if (typeof buffer !== 'string') {

                    }
                    callback(false, this);
                });
            }
        }
        else
            callback(true, this);
    }

    toString(): string {
        return `FileObject[${this.typeName}; ${this.name}; ${this.fullPath}]`;
    }

    get typeName(): FileObjectType {
        if (this.isDirectory())
            return 'directory';
        else if (this.isFile())
            return 'file';
        else if (this.isBlockDevice())
            return 'blockDevice';
        else if (this.isCharacterDevice())
            return 'characterDevice';
        else if (this.isSymbolicLink())
            return 'link';
        else if (this.isFIFO())
            return 'FIFO';
        else if (this.isSocket())
            return 'socket';
        else
            return 'unknown';
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

export class FileObjectCollection<TNumType extends number | bigint> extends Array<IFileObject<TNumType>> {
    constructor(files: IFileObject<TNumType>[] = []) {
        super(...files);
    }

    copyAll(dest: string): this {
        return this;
    }

    unlinkAll(): this {
        return this;
    }
}

/**
 * When KLF is performing a streaming read, this will fire once for every file matching our criteria
 */
export type FileObjectCallback<TNumType extends number | bigint> = (error: Error | undefined, file: IFileObject<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type FileObjectCollectionCallback<TNumType extends number | bigint> = (error: Error | undefined, files: FileObjectCollection<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;


interface IFileUtil {
    fsq<TNumType extends number | bigint>(pathLike: string, query: IReadFilesQuery<TNumType>, callback: FileObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string, query: IReadFilesQuery<TNumType> & { buffer: true }, callback: FileObjectCollectionCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string[], query: IReadFilesQuery<TNumType>, callback: FileObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string[], query: IReadFilesQuery<TNumType> & { buffer: true }, callback: FileObjectCollectionCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string, callback: FileObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string[], callback: FileObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(query: IReadFilesQuery<TNumType>, callback: FileObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(query: IReadFilesQuery<TNumType> & { buffer: true }, callback: FileObjectCollectionCallback<TNumType>): this;

    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: FileObjectCollectionCallback<TNumType>, query: Partial<IFileSystemQuery<TNumType>> & { buffered: true }): this;
    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: FileObjectCallback<TNumType>, query: Partial<IFileSystemQuery<TNumType>>): this;
    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: FileObjectCallback<TNumType>): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: FileObjectCollectionCallback<TNumType>, query: Partial<IFileSystemQuery<TNumType>> & { buffered: true }): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: FileObjectCallback<TNumType>, query: Partial<IFileSystemQuery<TNumType>>): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: FileObjectCallback<TNumType>): this;
}

class FileUtilImpl implements IFileUtil {
    protected createQuery<TNumType extends number | bigint>(queryIn: Partial<IFileSystemQuery<TNumType>>): IFileSystemQuery<TNumType> {
        const result: IFileSystemQuery<TNumType> = {
            bigint: queryIn.bigint === true,
            buffer: queryIn.buffer === true,
            contains: queryIn.contains,
            expr: queryIn.expr?.slice(0) || [],
            recursive: queryIn.recursive === true,
            singleFS: queryIn.singleFS === true,
            throwErrors: queryIn.throwErrors === true,
            ...queryIn
        };
        return result;
    }

    expandTemplateFile(templateFile: string, templateVariables: GenericObject = {}, filenameVariables: GenericObject = {}) {
        if (!path.isAbsolute(templateFile)) {
            var filesToTry = [

            ];
        }
    }

    /**
     * 
     * @param pathLikeOrFileObject 
     * @param callbackIn 
     * @param queryIn 
     * @returns 
     */
    readPathlike<TNumType extends number | bigint>(
        pathLikeOrFileObject: string | FileObject<TNumType>,
        callbackIn: FileObjectCallback<TNumType> | FileObjectCollectionCallback<TNumType>,
        queryIn: Partial<IFileSystemQuery<TNumType>> = { expr: [], buffer: false }): this {

        const query = this.createQuery(queryIn);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof callbackIn === 'function' && callbackIn as FileObjectCallback<TNumType> || undefined;
        const callbackBuffered = isBuffering && typeof callbackIn === 'function' && callbackIn as FileObjectCollectionCallback<TNumType> || undefined;
        const sendSingleResult = (message: string | Error | undefined | null, returnValue: FileObject<TNumType> | undefined = undefined) => {
            const error = typeof message === 'string' && new Error(message) || typeof message === 'object' && message instanceof Error && message || undefined;
            if (query.throwErrors === true && error) throw error;

            if (callbackStreamed)
                callbackStreamed(error, returnValue, query);
            else if (callbackBuffered && returnValue)
                callbackBuffered(error, new FileObjectCollection<TNumType>([returnValue]), query);
            else if (callbackBuffered)
                callbackBuffered(error, new FileObjectCollection<TNumType>(), query);
            return this;
        };
        const results: FileObjectCollection<TNumType> = new FileObjectCollection<TNumType>();
        const fileObject: FileObject<TNumType> | undefined = typeof pathLikeOrFileObject === 'object' && pathLikeOrFileObject as FileObject<TNumType> || undefined;
        const bigint = query.bigint === true;
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
                            const leftExpr = parts.slice(0, index).join(path.sep),
                                rightExpr = parts.slice(index + 1).join(path.sep),
                                rightPattern = RegExUtil.createFileRegex(rightExpr, { endsWith: true });
                            prefix = parts.slice(0, index).join(path.sep);

                            //  Special case for globstar
                            if (part.indexOf('**') > -1) {
                                if (part === '**') {
                                    if (rightExpr.indexOf('**') > -1)
                                        return sendSingleResult(`Expression ${pathLike} cannot contain more than one globstar`);

                                    this.readPathlike(leftExpr, (err: Error | undefined, file: IFileObject<TNumType> | undefined, criteria: IFileSystemQuery<TNumType> | undefined) => {
                                        file?.matchCriteria(criteria!, (isMatch, file) => {
                                            if (isMatch && file) sendSingleResult(err, file as FileObject<TNumType>);
                                        });
                                    }, { ...query, buffer: false, recursive: true, endsWith: rightPattern });
                                }
                                else
                                    return sendSingleResult(`Expression ${pathLike} is invalid; Globstar must appear by itself, not ${part}`);
                            }
                            else {
                                ;

                            }
                        }
                    }
                }
            }
            else {
                const fullPath = fileObject ? fileObject.fullPath : pathLike;
                fs.stat(fullPath, { bigint }, (err, stats) => {
                    if (err && query.throwErrors) throw err;
                    else if (stats.isDirectory()) {
                        const dir = fileObject ?? new FileObject<TNumType>(stats as fs.StatsBase<TNumType>, { fullPath });
                        results.push(dir);

                        fs.readdir(pathLike, { encoding: 'utf8' }, (err, stats) => {
                            for (const name of stats) {
                                const fullPath = path.join(pathLike, name);

                                fs.stat(fullPath, { bigint }, (err, childStats) => {
                                    if (err && query.throwErrors) throw err;
                                    else if (childStats) {
                                        const newChild = new FileObject<TNumType>(childStats as fs.StatsBase<TNumType>, { parent: dir, name, fullPath });

                                        if (query.recursive === true && newChild.isDirectory()) {
                                            this.readPathlike(newChild, callbackIn, query);
                                        }
                                        else
                                            sendSingleResult(err || undefined, newChild);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        const newChild = new FileObject<TNumType>(stats as fs.StatsBase<TNumType>, { fullPath });
                        sendSingleResult(err, newChild);
                    }
                });
            }

        }
        catch (err) {
            const error: Error = err instanceof Error ? err : (typeof err == 'string' ? new Error(err) : new Error());
            console.log(`FileUtil.readExpr() ERROR ${(error?.stack || error)}`);
            if (query.throwErrors) throw error;
            sendSingleResult(error, undefined);
        }
        return this;
    }

    /**
     * Query the filesystem, callback style
     * @param pathLikeOrQuery One or more path expressions to query OR a query object
     * @param queryOrCallback A query or a callback
     * @param callbackIn A callback
     * @returns 
     */
    fsq<TNumType extends number | bigint>(
        pathLikeOrQuery: string | string[] | IFileSystemQuery<TNumType>,
        queryOrCallback: FileObjectCallback<TNumType> | FileObjectCollectionCallback<TNumType> | Partial<IFileSystemQuery<TNumType>> = { expr: [] },
        callbackIn?: FileObjectCallback<TNumType> | FileObjectCollectionCallback<TNumType>): this {

        const pathLikes: string[] = Array.isArray(pathLikeOrQuery) && pathLikeOrQuery as string[]
            || typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery]
            || !Array.isArray(pathLikeOrQuery) && typeof pathLikeOrQuery === 'object' && pathLikeOrQuery.expr
            || [] as string[];
        const query: IFileSystemQuery<TNumType> = this.createQuery(typeof pathLikeOrQuery === 'object' && pathLikeOrQuery as IFileSystemQuery<TNumType>
            || typeof queryOrCallback === 'object' && queryOrCallback as IFileSystemQuery<TNumType>
            || { expr: '' } as unknown as IFileSystemQuery<TNumType>);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof queryOrCallback === 'function' && queryOrCallback as FileObjectCallback<TNumType>
            || !isBuffering && typeof callbackIn === 'function' && callbackIn as FileObjectCallback<TNumType> || undefined;
        const callbackBuffered = isBuffering && typeof queryOrCallback === 'function' && queryOrCallback as FileObjectCollectionCallback<TNumType> || undefined
            || isBuffering && typeof callbackIn === 'function' && callbackIn as FileObjectCollectionCallback<TNumType> || undefined;
        const results: FileObjectCollection<TNumType> = new FileObjectCollection<TNumType>();

        if (pathLikes) {
            query.expr = Array.isArray(query.expr) ? [...query.expr, ...pathLikes] : query.expr = pathLikes;
        }
        if (query.expr.length === 0) {
            throw new Error('FileUtil.fsq(): No path expressions were provided, nothing to do');
        }
        const receiveCallbackResults = (i: number, expr: string, file: IFileObject<TNumType> | undefined): void => {

        }
        //  TODO: Optimize by looking for overlaps in our path expressions to avoid duplicate work
        for (const [i, expr] of query.expr.entries()) {
            if (isBuffering) {
                this.readPathlike<TNumType>(expr, (err: Error | undefined, file: IFileObject<TNumType> | undefined) => {
                    file?.matchCriteria(query, (didMatchCriteria, file) => {
                        if (didMatchCriteria) results.push(file);
                    });
                }, { ...query, buffer: true });
            }
            else {
                this.readPathlike<TNumType>(expr, (err: Error | undefined, file: IFileObject<TNumType> | undefined) => {
                    file?.matchCriteria(query, (didMatchCriteria, file) => {
                        if (didMatchCriteria && callbackStreamed) callbackStreamed(err, file);
                    });
                }, { ...query, buffer: false });
            }
        }
        return this;
    }

    async fsqAsync<TNumType extends number | bigint>(pathLikeOrQuery: string | string[] | IFileSystemQuery<TNumType>, queryIn: Partial<IFileSystemQuery<TNumType>> = { expr: [] }): Promise<FileObjectCollection<TNumType>> {
        const pathLikes: string[] = Array.isArray(pathLikeOrQuery) && pathLikeOrQuery as string[]
            || typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery]
            || !Array.isArray(pathLikeOrQuery) && typeof pathLikeOrQuery === 'object' && pathLikeOrQuery.expr
            || [] as string[];

        const query: IFileSystemQuery<TNumType> = this.createQuery(typeof pathLikeOrQuery === 'object' && pathLikeOrQuery as IFileSystemQuery<TNumType>
            || typeof queryIn === 'object' && queryIn as IFileSystemQuery<TNumType>
            || { expr: '' } as unknown as IFileSystemQuery<TNumType>);

        return new Promise((resolve, reject) => {
            this.fsq<TNumType>(pathLikes, { ...query, buffer: true }, () => { });
        });
    }

    fsqSync(): void {

    }
}

const FileUtil: IFileUtil = new FileUtilImpl;

export default FileUtil;
