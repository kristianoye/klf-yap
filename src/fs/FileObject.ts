/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

import fs from 'fs';
import path from 'path';
import { FileObjectType, IFileSystemQuery, IFileObject, IReadFilesQuery, MatchCriteriaCallback, MatchSimpleCriteriaCallback } from './FileTypedefs';
import FileContentSearcher, { FileContentMatchCallback } from './FileContentSearcher';
import { mainModule } from 'process';

/**
 * Default implementation of the IFileObject interface
 */
export default class FileObject<TNumType extends number | bigint> implements IFileObject<TNumType> {
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
        this.linkTarget = details.linkTarget;
        this.linkTargetName = details.linkTargetName;
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
        this.depth = FileObject.getDepth(this.fullPath);
    }

    baseName: string = '';

    children: IFileObject<TNumType>[] = [];

    readonly depth: number = 0;

    extension: string = '';

    fullPath: string;

    linkTarget?: IFileObject<TNumType> = undefined;

    linkTargetName?: string = undefined;

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

    /** Get the depth of a path */
    static getDepth(pathLike: string): number {
        let d = 0;
        for (const c of pathLike) d += c === path.sep ? 1 : 0;
        return d;
    }

    isFile(): boolean {
        return this.stats.isFile();
    }

    isDirectory(): boolean {
        if (this.isSymbolicLink() && this.linkTarget) {
            if (this.linkTarget.isDirectory()) return true;
        }
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

    /**
     * Check to see if this file object matches the given criteria.
     * @param criteria The criteria used to evaluate this file object
     * @param callback THe callback that receives the result of the evaluation
     */
    matchCriteria(criteria: Partial<IFileSystemQuery<TNumType>>, callback: MatchCriteriaCallback<TNumType>): void {
        this.matchSimpleCriteria(criteria, (success: boolean, file) => {
            if (success) {
                if (criteria.maxAccessTime && this.atimeMs > criteria.maxAccessTime) return callback(false, this, `maxAccessTime: ${this.fullPath} atime ${this.atimeMs} > ${criteria.maxAccessTime}`);
                else if (criteria.minAccessTime && this.atimeMs < criteria.minAccessTime) return callback(false, this, `minAccessTime: ${this.fullPath} atime ${this.atimeMs} < ${criteria.minAccessTime}`);
                else if (criteria.maxChangeTime && this.ctimeMs > criteria.maxChangeTime) return callback(false, this, `maxChangeTime: ${this.fullPath} ctime ${this.ctimeMs} > ${criteria.maxChangeTime}`);
                else if (criteria.minChangeTime && this.ctimeMs < criteria.minChangeTime) return callback(false, this, `minChangeTime: ${this.fullPath} ctime ${this.ctimeMs} < ${criteria.minChangeTime}`);
                else if (criteria.maxCreateTime && this.birthtimeMs > criteria.maxCreateTime) return callback(false, this, `maxCreateTime: ${this.fullPath} atime ${this.birthtimeMs} > ${criteria.maxCreateTime}`);
                else if (criteria.minCreateTime && this.birthtimeMs < criteria.minCreateTime) return callback(false, this, `minCreateTime: ${this.fullPath} atime ${this.birthtimeMs} < ${criteria.minCreateTime}`);
                else if (Array.isArray(criteria.isType) && criteria.isType.indexOf(this.typeName) === -1) return callback(false, this, `isType: ${this.fullPath} type ${this.typeName} NOT IN ${criteria.isType.join(', ')}`);

                if (criteria.contains && criteria.contains instanceof RegExp) {
                    if (this.isFile()) {
                        let maxMatches = typeof criteria.maxMatches === 'number' && criteria.maxMatches > 0 && criteria.maxMatches || Number.MAX_SAFE_INTEGER;
                        let minMatches = typeof criteria.minMatches === 'number' && criteria.minMatches > 0 && criteria.minMatches || 1;
                        const searcher = new FileContentSearcher(this, criteria.contains, { ...criteria });
                        let result = searcher.next();
                        let matchCount = 0;

                        if (result.value === null)
                            return callback(false, this, `minMatches: ${this.fullPath} contains ZERO instances of ${criteria.contains}`);

                        while (!result.done) {
                            matchCount++;
                            if (result.value && typeof criteria.onContains === 'function') {
                                criteria.onContains(result.value);
                            }
                            result = searcher.next();
                        }
                        if (matchCount < minMatches) return callback(false, this, `minMatches: ${this.fullPath} contains ${criteria.contains}  (${matchCount} of ${minMatches})`);
                        else if (matchCount > maxMatches) return callback(false, this, `maxMatches: ${this.fullPath} contains ${criteria.contains}  (${matchCount} of ${maxMatches}`)
                    }
                }
                return callback(true, this);
            }
            return callback(false, this);
        });
    }

    /**
     * Check to see if this file object matches the given criteria.
     * @param criteria The criteria for our search
     * @param callback The callback to execute with the result
     * @returns Returns nothing
     */
    matchSimpleCriteria(criteria: Partial<IReadFilesQuery<TNumType>>, callback: MatchSimpleCriteriaCallback<TNumType>): void {
        if (this.isFile()) {
            const minSize = criteria.minSize as TNumType, maxSize = criteria.maxSize as TNumType;

            if (minSize && this.size < minSize) return callback(false, this, `minSize: ${this.fullPath} size ${this.size} < ${minSize}`);
            else if (maxSize && this.size > maxSize) return callback(false, this, `maxSize: ${this.fullPath} size ${this.size} > ${maxSize}`);
        }
        if (criteria.minDepth && this.depth < criteria.minDepth) return callback(false, this, `minDepth: ${this.fullPath} depth ${this.depth} < ${criteria.minDepth}`);
        else if (criteria.maxDepth && this.depth > criteria.maxDepth) return callback(false, this, `maxDepth: ${this.fullPath} depth ${this.depth} > ${criteria.maxDepth}`);
        else if (typeof criteria.endsWith === 'string' && !this.name.endsWith(criteria.endsWith)) return callback(false, this, `endsWith: ${this.fullPath} DOES NOT MATCH ${criteria.endsWith}`);
        else if (criteria.endsWith && criteria.endsWith instanceof RegExp && !criteria.endsWith.test(this.name)) return callback(false, this, `endsWith: ${this.fullPath} DOES NOT MATCH ${criteria.endsWith}`);
        else if (typeof criteria.startsWith === 'string' && !this.name.startsWith(criteria.startsWith)) return callback(false, this, `startsWith: ${this.fullPath} DOES NOT MATCH ${criteria.startsWith}`);
        else if (criteria.startsWith && criteria.startsWith instanceof RegExp && !criteria.startsWith.test(this.name)) return callback(false, this, `startsWith: ${this.fullPath} DOES NOT MATCH ${criteria.startsWith}`);
        else return callback(true, this);
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
            return `FileObject[${this.typeName}; ${this.name}; ${this.fullPath} => ${this.linkTargetName}]`;
        else if (this.isDirectory())
            if (this.isEmpty())
                return `FileObject[${this.typeName}; ${this.name}; ${this.fullPath}; empty]file(s)`;
            else
                return `FileObject[${this.typeName}; ${this.name}; ${this.fullPath}; ${this.children.length}]file(s)`;
        else
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
