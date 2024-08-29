/*
 * KLF FSQ
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains disk implementation of IFileObject
 */
'use strict';

import fs, { StatsBase } from 'fs';
import path from 'path';
import { FileObjectType, IFileSystemQuery, IFileObject, IReadFilesQuery, MatchCriteriaCallback, MatchSimpleCriteriaCallback, ErrorLike } from './FileTypedefs';
import FileContentSearcher, { FileContentMatch, FileContentMatchCallback } from './FileContentSearcher';
import { IFileSystem } from './FileSystem';

/**
 * Default implementation of the IFileObject interface
 */
export default class FileObject<TNumType extends number | bigint = number> implements IFileObject<TNumType> {
    constructor(stats: fs.StatsBase<TNumType>, details: Partial<FileObject<TNumType>> = {}) {
        this._children = stats.isDirectory() && Array.isArray(details.children) && details.children || undefined;
        this.error = details.error;

        if (!details.fileSystem)
            throw new Error(`Invalid IFileObject did not provide a filesystem reference`);
        this.fileSystem = details.fileSystem;
        this.fullPath = details.fullPath!;
        if (this.fullPath.endsWith(path.sep)) {
            this.fullPath = this.fullPath.slice(0, -path.sep.length);
        }
        if (details.name) {
            this.name = this.baseName = details.name!;
        }
        else {
            let n = this.fullPath.lastIndexOf(path.sep);
            this.name = this.baseName = this.fullPath.slice(n + 1);
        }
        this.linkTarget = details.linkTarget;
        this.linkTargetName = details.linkTargetName;
        this.parent = details.parent;
        this.parentPath = path.resolve(this.fullPath, '..');
        this.prefix = details.prefix ?? '';
        this._stats = stats;

        if (this.linkTarget && typeof this.linkTargetName === 'string' && this.linkTarget.isDirectory()) {
            const children = this.linkTarget.children;
            if (Array.isArray(children)) {
                const newChildren: IFileObject<TNumType>[] = [];
                const ltnl: number = this.linkTargetName.length;
                const makeChildLink = (child: IFileObject<TNumType>, parent: IFileObject<TNumType>): IFileObject<TNumType> => {
                    const linkFullPath = path.join(parent.fullPath, child.fullPath.slice(ltnl));
                    const children = Array.isArray(child.children) && child.children.map(c => makeChildLink(c, child)) || undefined;
                    const linkChild = new FileObject(child.getStats(), {
                        children,
                        linkTarget: child,
                        linkTargetName: child.fullPath,
                        fileSystem: this.fileSystem,
                        fullPath: linkFullPath,
                        parent
                    });
                    return linkChild;
                }

                for (const child of children) {
                    newChildren.push(makeChildLink(child, this));
                }
                this._children = newChildren;
            }
        }

        if (!this.isDirectory()) {
            const parts = this.name.split('.').filter(s => s.length);
            if (parts.length > 1) {
                this.extension = '.' + parts.slice(1).join('.');
                this.baseName = parts[0];
            }
        }
        this.depth = FileObject.getDepth(this.fullPath);
    }

    baseName: string = '';

    get children() {
        if (Array.isArray(this._children))
            return this._children.slice(0);
    }

    readonly _children?: IFileObject<TNumType>[] = undefined;

    readonly depth: number = 0;

    error?: ErrorLike;

    readonly extension: string = '';

    readonly fileSystem: IFileSystem;

    readonly fullPath: string;

    readonly linkTarget?: IFileObject<TNumType> = undefined;

    readonly linkTargetName?: string = undefined;

    readonly name: string;

    readonly parent: IFileObject<TNumType> | undefined = undefined;

    readonly parentPath: string = '';

    prefix: string;

    private _stats: fs.StatsBase<TNumType>;

    contains(expr: string | RegExp, onMatch: FileContentMatchCallback): void {
    }

    doesExist() {
        return this.isFile()
            || this.isDirectory()
            || this.isSymbolicLink()
            || this.isSocket()
            || this.isFIFO()
            || this.isBlockDevice()
            || this.isCharacterDevice()
    }

    flatChildren(): IFileObject<TNumType>[] {
        const result: IFileObject<TNumType>[] = [];
        if (Array.isArray(this._children)) {
            for (const child of this._children) {
                result.push(child);
                if (child.isDirectory())
                    result.push(...child.flatChildren());
            }
        }
        return result;
    }

    /** Get the depth of a path */
    static getDepth(pathLike: string): number {
        let d = 0;
        for (const c of pathLike) d += c === path.sep ? 1 : 0;
        return d;
    }

    getStats(): StatsBase<TNumType> {
        return this._stats;
    }

    isFile(): boolean {
        return this._stats.isFile();
    }

    isDirectory(): boolean {
        if (this.isSymbolicLink() && this.linkTarget) {
            if (this.linkTarget.isDirectory()) return true;
        }
        return this._stats.isDirectory();
    }

    isBlockDevice(): boolean {
        return this._stats.isBlockDevice();
    }

    isCharacterDevice(): boolean {
        return this._stats.isCharacterDevice();
    }

    isEmpty(): boolean | undefined {
        if (this.isDirectory())
            return Array.isArray(this.children) ? this.children.length === 0 : undefined;
        else if (this.isFile())
            return this.size === 0;
        else
            return false;
    }

    isSymbolicLink(): boolean {
        if (typeof this.linkTargetName === 'string' && this.linkTargetName.length > 0)
            return true;
        return this._stats.isSymbolicLink();
    }

    isFIFO(): boolean {
        return this._stats.isFIFO();
    }

    isSocket(): boolean {
        return this._stats.isSocket();
    }

    /**
     * Check to see if this file object matches the given criteria.
     * @param criteria The criteria used to evaluate this file object
     * @param callback THe callback that receives the result of the evaluation
     */
    matchCriteria(criteria: Partial<IFileSystemQuery<TNumType>>, callback: MatchCriteriaCallback<TNumType>): void {
        this.matchSimpleCriteria(criteria, (success: boolean, file: IFileObject<TNumType>) => {
            if (success) {
                if (criteria.maxAccessTime && this.atimeMs > criteria.maxAccessTime) return callback(false, file, `maxAccessTime: ${this.fullPath} atime ${this.atimeMs} > ${criteria.maxAccessTime}`);
                else if (criteria.minAccessTime && this.atimeMs < criteria.minAccessTime) return callback(false, file, `minAccessTime: ${this.fullPath} atime ${this.atimeMs} < ${criteria.minAccessTime}`);
                else if (criteria.maxChangeTime && this.ctimeMs > criteria.maxChangeTime) return callback(false, file, `maxChangeTime: ${this.fullPath} ctime ${this.ctimeMs} > ${criteria.maxChangeTime}`);
                else if (criteria.minChangeTime && this.ctimeMs < criteria.minChangeTime) return callback(false, file, `minChangeTime: ${this.fullPath} ctime ${this.ctimeMs} < ${criteria.minChangeTime}`);
                else if (criteria.maxCreateTime && this.birthtimeMs > criteria.maxCreateTime) return callback(false, file, `maxCreateTime: ${this.fullPath} atime ${this.birthtimeMs} > ${criteria.maxCreateTime}`);
                else if (criteria.minCreateTime && this.birthtimeMs < criteria.minCreateTime) return callback(false, file, `minCreateTime: ${this.fullPath} atime ${this.birthtimeMs} < ${criteria.minCreateTime}`);
                else if (Array.isArray(criteria.isType) && criteria.isType.indexOf(this.typeName) === -1) return callback(false, file, `isType: ${this.fullPath} type ${this.typeName} NOT IN ${criteria.isType.join(', ')}`);

                if (criteria.contains && criteria.contains instanceof RegExp) {
                    if (this.isFile()) {
                        let maxMatches = typeof criteria.maxMatches === 'number' && criteria.maxMatches > 0 && criteria.maxMatches || Number.MAX_SAFE_INTEGER;
                        let minMatches = typeof criteria.minMatches === 'number' && criteria.minMatches > 0 && criteria.minMatches || 1;
                        const searcher = new FileContentSearcher<TNumType>(file, criteria.contains, { ...criteria });
                        let result = searcher.next();
                        let matchCount = 0;

                        if (result.value === null)
                            return callback(false, file, `minMatches: ${this.fullPath} contains ZERO instances of ${criteria.contains}`);

                        while (!result.done) {
                            matchCount++;
                            if (typeof result.value !== null && typeof criteria.onContains === 'function') {
                                const matchDataBigint = criteria.bigint && result.value !== null && result.value as FileContentMatch<bigint> || undefined;
                                const matchData = matchDataBigint || criteria.bigint === false && result.value !== null && result.value as FileContentMatch<number> || undefined;
                                if (matchData) criteria.onContains(matchData);

                            }
                            result = searcher.next();
                        }
                        if (matchCount < minMatches) return callback(false, file, `minMatches: ${this.fullPath} contains ${criteria.contains}  (${matchCount} of ${minMatches})`);
                        else if (matchCount > maxMatches) return callback(false, file, `maxMatches: ${this.fullPath} contains ${criteria.contains}  (${matchCount} of ${maxMatches}`)
                    }
                }
                return callback(true, file);
            }
            return callback(false, file);
        });
    }

    /**
     * Check to see if this file object matches the given criteria.
     * @param criteria The criteria for our search
     * @param callback The callback to execute with the result
     * @returns Returns nothing
     */
    matchSimpleCriteria(criteria: Partial<IReadFilesQuery<TNumType>>, callback: MatchSimpleCriteriaCallback<TNumType>): void {
        const file = this as unknown as IFileObject<TNumType>;
        if (this.isFile()) {
            const minSize = criteria.minSize as TNumType, maxSize = criteria.maxSize as TNumType;

            if (minSize && this.size < minSize) return callback(false, file, `minSize: ${this.fullPath} size ${this.size} < ${minSize}`);
            else if (maxSize && this.size > maxSize) return callback(false, file, `maxSize: ${this.fullPath} size ${this.size} > ${maxSize}`);
        }
        if (criteria.minDepth && this.depth < criteria.minDepth) return callback(false, file, `minDepth: ${this.fullPath} depth ${this.depth} < ${criteria.minDepth}`);
        else if (criteria.maxDepth && this.depth > criteria.maxDepth) return callback(false, file, `maxDepth: ${this.fullPath} depth ${this.depth} > ${criteria.maxDepth}`);
        else if (typeof criteria.endsWith === 'string' && !this.name.endsWith(criteria.endsWith)) return callback(false, file, `endsWith: ${this.fullPath} DOES NOT MATCH ${criteria.endsWith}`);
        else if (criteria.endsWith && criteria.endsWith instanceof RegExp && !criteria.endsWith.test(this.name)) return callback(false, file, `endsWith: ${this.fullPath} DOES NOT MATCH ${criteria.endsWith}`);
        else if (typeof criteria.startsWith === 'string' && !this.name.startsWith(criteria.startsWith)) return callback(false, file, `startsWith: ${this.fullPath} DOES NOT MATCH ${criteria.startsWith}`);
        else if (criteria.startsWith && criteria.startsWith instanceof RegExp && !criteria.startsWith.test(this.name)) return callback(false, file, `startsWith: ${this.fullPath} DOES NOT MATCH ${criteria.startsWith}`);
        else return callback(true, file);
    }

    //#region readFile() methods 

    readFile(callback: (error: Error | string | undefined | null, content: string) => void, encoding: BufferEncoding = 'utf8'): void {
        fs.readFile(this.fullPath, { encoding }, (err, data) => callback(err, data));
    }

    /**
     * Read a file asyncronously
     * @returns Returns a promise to return the contents of the file
     */
    readFileAsync(encoding: BufferEncoding = 'utf8'): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                this.readFile((err, content) => {
                    if (err) reject(err);
                    else if (content) resolve(content);
                    else reject('No content');
                }, encoding);
            }
            catch (err) {
                reject(err);
            }
        })
    }

    /**
     * Read the contents of the file syncronously.
     * @param encoding The encoding used when reading the contents of the file
     * @returns The contents of the file
     */
    readFileSync(encoding: BufferEncoding = 'utf8'): string {
        return fs.readFileSync(this.fullPath, { encoding });
    }

    //#endregion

    /**
     * Generate a string representation of this object and its state
     * @returns A string representation of this object
     */
    toString(): string {
        if (this.isSymbolicLink())
            return `FileObject[link to ${this.typeName}; ${this.name}; ${this.fullPath} => ${this.linkTargetName}]`;
        else if (this.isDirectory())
            if (this.isEmpty())
                return `FileObject[${this.typeName}; ${this.name}; ${this.fullPath}; empty]file(s)`;
            else if (Array.isArray(this.children))
                return `FileObject[${this.typeName}; ${this.name}; ${this.fullPath}; ${this.children.length}]file(s)`;
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

    get dev() { return this._stats.dev }
    get ino() { return this._stats.ino }
    get mode() { return this._stats.mode }
    get nlink() { return this._stats.nlink }
    get uid() { return this._stats.uid }
    get gid() { return this._stats.gid }
    get rdev() { return this._stats.rdev }
    get size() { return this._stats.size }
    get blksize() { return this._stats.blksize }
    get blocks() { return this._stats.blocks }
    get atimeMs() { return this._stats.atimeMs }
    get mtimeMs() { return this._stats.mtimeMs }
    get ctimeMs() { return this._stats.ctimeMs }
    get birthtimeMs() { return this._stats.birthtimeMs }
    get atime() { return this._stats.atime }
    get mtime() { return this._stats.mtime }
    get ctime() { return this._stats.ctime }
    get birthtime() { return this._stats.birthtime }
}
