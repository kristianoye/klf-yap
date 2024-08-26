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

export type FileContentMatchPosition = {
    /** The column where the match stated */
    col: number;

    filename: string;

    /** The character offset relative to the beginning of file where the match started */
    index: number;

    /** The line where the match started */
    line: number;
}

export interface FileContentMatch<TNumType extends number | bigint> {
    /** Where did the match occur? */
    position: FileContentMatchPosition;

    /** Any match groups from a regex */
    groups: RegExpMatchArray | null;

    /** The filename that the match was in */
    file: IFileObject<TNumType>
}

/**
 * Called whenever a content search finds a match.  If the callback returns
 * true, then the search will continue and try and find another match.
 */
export type FileContentMatchCallback<TNumType extends number | bigint> = (match: FileContentMatch<TNumType>) => boolean;

/**
 * Basic file search criteria
 */
export interface IReadFilesQuery {
    /** Use bigint for our numeric types */
    bigint: boolean;

    /** Should we stream the results or buffer and return all at once?; Defaults to false */
    buffer: boolean;

    /** Does the file end with the supplied pattern */
    endsWith?: string | RegExp;

    /** One or more pathlike expressions */
    expr: string[];

    /** Recursively search for matching files? */
    recursive: boolean;

    /** Do we want to contain the results to a single filesystem? Defaults to false */
    singleFS: boolean;

    /** Does the name start with the supplied pattern? */
    startsWith?: string | RegExp;

    /** Should we throw errors, like not found, etc? */
    throwErrors: boolean;
}

/**
 * Advanced file search criteria
 */
export interface IFileSystemQuery<TNumType extends number | bigint> extends IReadFilesQuery {
    /** Matching files should contain text matching our expressions */
    contains?: string | RegExp;

    /** What encoding should we use for reads? */
    encoding?: BufferEncoding;

    ignoreCase?: boolean;

    /** Ignore whitespace when searching contents */
    ignoreWhitespace?: boolean;

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

    /** Callback that executes when the content is matched */
    onContains?: FileContentMatchCallback<TNumType>;
}

interface IFileSystemQueryInternal<TNumType extends number | bigint> extends IFileSystemQuery<TNumType> {
    deviceId: number;
}

/**
 * Flesh out a File System Query (FSQ) criteria object
 * @param queryIn The seed of the query
 * @returns A complete query
 */
const createCompleteFSQ = <TNumType extends number | bigint>(queryIn: Partial<IFileSystemQuery<TNumType>>): IFileSystemQuery<TNumType> => {
    const result: IFileSystemQuery<TNumType> = {
        ...createCompleteRPL(queryIn),
        contains: queryIn.contains,
        ignoreCase: queryIn.ignoreCase === true,
        ignoreWhitespace: queryIn.ignoreWhitespace === true
    };
    if (typeof result.contains === 'string') {
        if (result.ignoreWhitespace) {
            result.contains = new RegExp(result.contains.split(/\s+/).join('\\s+'), result.ignoreCase ? 'i' : undefined);
        }
    }
    return result;
}

const createCompleteRPL = (queryIn: Partial<IReadFilesQuery>): IReadFilesQuery => {
    return {
        ...queryIn,
        bigint: queryIn.bigint === true,
        buffer: queryIn.buffer === true,
        expr: Array.isArray(queryIn.expr) && queryIn.expr || [],
        recursive: queryIn.recursive === true,
        singleFS: queryIn.singleFS === true,
        throwErrors: typeof queryIn.throwErrors === 'boolean' ? queryIn.throwErrors : true,
    }
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
     * Returns true if:
     * (1) this is a directory and contains zero files,
     * (2) this is a file with a zero byte link
     */
    isEmpty(): boolean;

    /**
     * Test to see if the current object matches the criteria
     * @param criteria Criteria to check this file against
     * @param callback The callback to execute when we know the result of our tests
     */
    matchCriteria(criteria: IFileSystemQuery<TNumType>, callback: (result: boolean, file: IFileObject<TNumType>) => void): void;

    /**
     * Read the contents of the file syncronously.
     * @param encoding The encoding to use when reading the file buffer
     */
    readFileSync(encoding: BufferEncoding): string;
}

export type FileContentSearcherResult<TNumType extends number | bigint> = {
    done: boolean;
    value: FileContentMatch<TNumType> | null
}

export class FileContentSearcher<TNumType extends number | bigint> {
    constructor(file: IFileObject<TNumType>, criteria: string | RegExp, encoding: BufferEncoding = 'utf8') {
        const flags = ['g'];
        if (typeof criteria === 'string')
            this.criteria = new RegExp(criteria, 'g');
        else
            this.criteria = new RegExp(criteria, 'g');
        this.encoding = encoding;
        this.file = file;
    }

    private encoding: BufferEncoding = 'utf8';

    private content: string = '';

    readonly criteria: RegExp;

    private file: IFileObject<TNumType>;

    private lastMatch: RegExpMatchArray | null = null;

    private position: FileContentMatchPosition = { line: 0, col: 0, index: 0, filename: '' };

    next(): Readonly<FileContentSearcherResult<TNumType>> | false {
        if (!this.content) {
            this.content = this.file.readFileSync(this.encoding);
            this.position = { line: 1, col: 0, index: 0, filename: this.file.fullPath };
            this.criteria.lastIndex = -1;
            this.lastMatch = this.criteria.exec(this.content);

            if (this.lastMatch == null) {
                return false
            }
        }

        const lastMatch = this.lastMatch;
        if (lastMatch != null && typeof lastMatch !== 'undefined' && typeof lastMatch.index === 'number') {
            const newPos = { ...this.position };
            for (let i = this.position.index, max = lastMatch.index + 1; i < max; i++) {
                if (this.content.charAt(i) === '\n') {
                    newPos.line++;
                    newPos.col = 0;
                }
                else
                    newPos.col++;
            }
            this.position = newPos;
        }
        this.lastMatch = this.criteria.exec(this.content);
        const result: FileContentSearcherResult<TNumType> = {
            value: {
                file: this.file,
                groups: lastMatch,
                position: this.position
            },
            done: this.lastMatch === null
        }

        return Object.freeze(result);
    }

    reset() {
        this.content = '';
        this.criteria.lastIndex = -1;
        this.position = { col: 0, line: 0, index: 0, filename: this.file.fullPath };
    }
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

    contains(expr: string | RegExp, onMatch: FileContentMatchCallback<TNumType>): void {
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

    isEmpty(): boolean {
        if (this.isDirectory())
            return this.children.length === 0;
        else if (this.isFile())
            return this.size === 0;
        else
            return false;
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
        if (criteria.contains && criteria.contains instanceof RegExp) {
            if (this.isFile()) {
                const searcher = new FileContentSearcher(this, criteria.contains, criteria.encoding);
                const result = searcher.next();

                if (!result)
                    return callback(false, this);
                if (typeof criteria.onContains === 'function') {
                    let maxMatches = typeof criteria.maxMatches === 'number' && criteria.maxMatches > 0 && criteria.maxMatches || Number.MAX_SAFE_INTEGER;

                    while (result.done === false) {
                        if (result.value) criteria.onContains(result.value);
                        if (--maxMatches < 0) break;
                    }
                }
            }
        }
        callback(true, this);
    }

    readFile(callback: (error: Error | string | undefined | null, content: string) => void, encoding: BufferEncoding = 'utf8'): void {
        fs.readFile(this.fullPath, { encoding }, (err, data) => callback(err, data));
    }

    readFileSync(encoding: BufferEncoding = 'utf8'): string {
        return fs.readFileSync(this.fullPath, { encoding });
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

/**
 * Represents a collection of files 
 */
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

    where(queryIn: Partial<IFileSystemQuery<TNumType>>, callback: (files: FileObjectCollection<TNumType>) => void): this {
        const query = createCompleteFSQ(queryIn),
            result = new FileObjectCollection<TNumType>();
        let totalChecks = this.length;

        for (const file of this) {
            file.matchCriteria(query, (isMatch, file) => {
                if (isMatch) result.push(file);
                if (--totalChecks === 0)
                    callback(result);
            });
        }
        return this;
    }

    whereAsync(queryIn: Partial<IFileSystemQuery<TNumType>>): Promise<FileObjectCollection<TNumType>> {
        return new Promise((resolve, reject) => {
            try {
                this.where(queryIn, files => resolve(files));
            }
            catch (err) {
                reject(err);
            }
        });
    }
}

/**
 * When KLF is performing a streaming read, this will fire once for every file matching our criteria
 */
export type FSQObjectCallback<TNumType extends number | bigint> = (error: Error | undefined, file: IFileObject<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type FSQCollectionCallback<TNumType extends number | bigint> = (error: Error | undefined, files: FileObjectCollection<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;

/**
 * When KLF is performing a streaming read, this will fire once for every file matching our criteria
 */
export type RPLObjectCallback<TNumType extends number | bigint> = (error: Error | undefined, file: IFileObject<TNumType> | undefined, criteria?: IReadFilesQuery) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type RPLCollectionCallback<TNumType extends number | bigint> = (error: Error | undefined, files: FileObjectCollection<TNumType> | undefined, criteria?: IReadFilesQuery) => void;


interface IFileUtil {
    /**
     * Flush out a full FSQ using the provided parameters
     * @param queryIn The provided parameters
     */
    createQuery<TNumType extends number | bigint>(queryIn: Partial<IFileSystemQuery<TNumType>>): IFileSystemQuery<TNumType>;

    fsq<TNumType extends number | bigint>(pathLike: string, query: Partial<IFileSystemQuery<TNumType>>, callback: FSQObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string, query: Partial<IFileSystemQuery<TNumType>> & { buffer: true }, callback: FSQCollectionCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string[], query: Partial<IFileSystemQuery<TNumType>>, callback: FSQObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string[], query: Partial<IFileSystemQuery<TNumType>> & { buffer: true }, callback: FSQCollectionCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(pathLike: string, callback: Partial<IFileSystemQuery<TNumType>>): this;
    fsq<TNumType extends number | bigint>(pathLike: string[], callback: Partial<IFileSystemQuery<TNumType>>): this;
    fsq<TNumType extends number | bigint>(query: IFileSystemQuery<TNumType>, callback: FSQObjectCallback<TNumType>): this;
    fsq<TNumType extends number | bigint>(query: IFileSystemQuery<TNumType> & { buffer: true }, callback: FSQCollectionCallback<TNumType>): this;

    fsqAsync<TNumType extends number | bigint>(pathLike: string, query: Partial<IFileSystemQuery<TNumType>>): Promise<FileObjectCollection<TNumType>>;
    fsqAsync<TNumType extends number | bigint>(pathLikes: string[], query: Partial<IFileSystemQuery<TNumType>>): Promise<FileObjectCollection<TNumType>>;
    fsqAsync<TNumType extends number | bigint>(pathLike: string): Promise<FileObjectCollection<TNumType>>;
    fsqAsync<TNumType extends number | bigint>(pathLikes: string[]): Promise<FileObjectCollection<TNumType>>;
    fsqAsync<TNumType extends number | bigint>(query: Partial<IFileSystemQuery<TNumType>>): Promise<FileObjectCollection<TNumType>>;

    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: RPLCollectionCallback<TNumType>, query: Partial<IReadFilesQuery> & { buffered: true }): this;
    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: RPLObjectCallback<TNumType>, query: Partial<IReadFilesQuery>): this;
    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: RPLObjectCallback<TNumType>): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: RPLCollectionCallback<TNumType>, query: Partial<IReadFilesQuery> & { buffered: true }): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: RPLObjectCallback<TNumType>, query: Partial<IReadFilesQuery>): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: RPLObjectCallback<TNumType>): this;
}

class FileUtilImpl implements IFileUtil {
    createQuery<TNumType extends number | bigint>(queryIn: Partial<IFileSystemQuery<TNumType>>): IFileSystemQuery<TNumType> {
        return createCompleteFSQ(queryIn);
    }

    expandTemplateFile(templateFile: string, templateVariables: GenericObject = {}, filenameVariables: GenericObject = {}) {
        if (!path.isAbsolute(templateFile)) {
            var filesToTry = [

            ];
        }
    }

    /**
     * Read a pathlike expression from disk
     * @param pathLikeOrFileObject 
     * @param callbackIn 
     * @param queryIn 
     * @returns 
     */
    readPathlike<TNumType extends number | bigint>(
        pathLikeOrFileObject: string | FileObject<TNumType>,
        callbackIn: FSQObjectCallback<TNumType> | FSQCollectionCallback<TNumType>,
        queryIn: Partial<IReadFilesQuery> = { expr: [], buffer: false }): this {

        const query = createCompleteRPL(queryIn);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof callbackIn === 'function' && callbackIn as FSQObjectCallback<TNumType> || undefined;
        const callbackBuffered = isBuffering && typeof callbackIn === 'function' && callbackIn as FSQCollectionCallback<TNumType> || undefined;
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
        queryOrCallback: FSQObjectCallback<TNumType> | FSQCollectionCallback<TNumType> | Partial<IFileSystemQuery<TNumType>> = { expr: [] },
        callbackIn?: FSQObjectCallback<TNumType> | FSQCollectionCallback<TNumType>): this {

        const pathLikes: string[] = Array.isArray(pathLikeOrQuery) && pathLikeOrQuery as string[]
            || typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery]
            || !Array.isArray(pathLikeOrQuery) && typeof pathLikeOrQuery === 'object' && pathLikeOrQuery.expr
            || [] as string[];
        const query: IFileSystemQuery<TNumType> = createCompleteFSQ(typeof pathLikeOrQuery === 'object' && pathLikeOrQuery as IFileSystemQuery<TNumType>
            || typeof queryOrCallback === 'object' && queryOrCallback as IFileSystemQuery<TNumType>
            || { expr: '' } as unknown as IFileSystemQuery<TNumType>);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof queryOrCallback === 'function' && queryOrCallback as FSQObjectCallback<TNumType>
            || !isBuffering && typeof callbackIn === 'function' && callbackIn as FSQObjectCallback<TNumType> || undefined;
        const callbackBuffered = isBuffering && typeof queryOrCallback === 'function' && queryOrCallback as FSQCollectionCallback<TNumType> || undefined
            || isBuffering && typeof callbackIn === 'function' && callbackIn as FSQCollectionCallback<TNumType> || undefined;
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

    /**
     * 
     * @param pathLikeOrQuery One or more path expressions to query OR a query object
     * @param queryIn A query
     * @returns 
     */
    async fsqAsync<TNumType extends number | bigint>(pathLikeOrQuery: string | string[] | Partial<IFileSystemQuery<TNumType>>, queryIn?: Partial<IFileSystemQuery<TNumType>>): Promise<FileObjectCollection<TNumType>> {
        const query = typeof pathLikeOrQuery === 'object' && !Array.isArray(pathLikeOrQuery) && createCompleteFSQ(pathLikeOrQuery)
            || typeof queryIn === 'object' && createCompleteFSQ(queryIn) || createCompleteFSQ({ expr: [] });
        const pathLikes = typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery] || Array.isArray(pathLikeOrQuery) && pathLikeOrQuery || query.expr || [];

        query.buffer = true;

        return new Promise((resolve: (result: FileObjectCollection<TNumType>) => void, reject: (reason: any) => void) => {
            try {
                this.fsq<TNumType>(pathLikes, query as IFileSystemQuery<TNumType>, (error: Error | undefined, files: FileObjectCollection<TNumType> | undefined) => {
                    if (error && query.throwErrors === true) reject(error);
                    else if (files) resolve(files);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }

    fsqSync(): void {

    }
}

const FileUtil: IFileUtil = new FileUtilImpl;

export default FileUtil;
