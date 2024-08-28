/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains common types 
 */
'use strict';

import fs from 'fs';
import { FileContentMatchCallback } from './FileContentSearcher';
import FileWorker, { FileWorkerImpl } from './FileWorker';

/** Only strings are supported ATM */
export type PathLike = string;

/** The possible types of object we can/should expect */
export type FileObjectType = 'file'
    | 'blockDevice'
    | 'characterDevice'
    | 'directory'
    | 'FIFO'
    | 'link'
    | 'socket'
    | 'unknown';

export type ErrorLike =
    | undefined
    | unknown
    | null
    | Error
    | string;

/** Callback for matchSimpleCriteria() */
export type MatchSimpleCriteriaCallback<TNumType extends number | bigint = number> = (success: boolean, file: IFileObject<TNumType>, reason?: string) => void;

/** Callback for matchCriteria() */
export type MatchCriteriaCallback<TNumType extends number | bigint = number> = (success: boolean, file: IFileObject<TNumType>, reason?: string) => void;



/** Wraps a NodeJS StatsBase with object goodness. */
export interface IFileObject<TNumType extends number | bigint = number> extends fs.StatsBase<TNumType> {
    /** Children of the object; Should be undefined or empty for non-directories */
    children?: IFileObject<TNumType>[];

    /** Indicates how deeply the object is nested within the filesystem */
    depth: number;

    /** If this is a dummy/placeholder object, then there might be an error as to why */
    error?: ErrorLike;

    /** The fully-qualified path to the file */
    fullPath: string;

    /** If the object is a link, then this is the object it links to */
    linkTarget?: IFileObject<TNumType>;

    /** If the object is a link, then this is the path it links to */
    linkTargetName?: string;

    /** The name of the object without its parent path */
    name: string;

    /** Its parent object */
    parent?: IFileObject<TNumType>;

    /** The prefix assigned when its read; This may be removed */
    prefix: string;

    /** Does the object actually exist? */
    doesExist(): boolean;

    /** Returns all children as a flat array */
    flatChildren(): IFileObject<TNumType>[];

    /** Get the stats used to create this object */
    getStats(): fs.StatsBase<TNumType>;

    /**
     * Returns true if:
     * (1) this is a directory and contains zero files,
     * (2) this is a file with a zero byte link
     */
    isEmpty(): boolean;

    /**
     * Test to see if the current object matches the criteria
     * @param criteria Criteria to use when evaluating this file object
     * @param callback The callback to execute when we know the result of our tests
     */
    matchCriteria(criteria: Partial<IFileSystemQuery<TNumType>>, callback: MatchSimpleCriteriaCallback<TNumType>): void;

    /**
     * Test to see if the current object matches the criteria
     * @param criteria Criteria to use when evaluating this file object
     * @param callback The callback to execute when we know the result of our tests
     */
    matchSimpleCriteria(criteria: Partial<IReadFilesQuery<TNumType>>, callback: MatchCriteriaCallback<TNumType>): void;

    /**
     * Read the contents of the file syncronously.
     * @param encoding The encoding to use when reading the file buffer
     */
    readFileSync(encoding: BufferEncoding): string;
}


/** Basic file search criteria */
export interface IReadFilesQuery<TNumType extends number | bigint = number> {
    /** Use bigint for our numeric types */
    bigint: boolean;

    /** Should we stream the results or buffer and return all at once?; Defaults to false */
    buffer: boolean;

    /** What encoding should we use for reads? */
    encoding?: BufferEncoding;

    /** Does the file end with the supplied pattern */
    endsWith?: string | RegExp;

    /** One or more pathlike expressions */
    expr: string[];

    /** Should we follow links? */
    followLinks: boolean;

    /** Maximum number of concurrent workers */
    maxConcurrency: number;

    /** How deep down the rabbit hole shall we go? */
    maxDepth: number;

    /** The maximum size of file we want to consider */
    maxSize?: TNumType | string;

    /** Minimum depth in the filesystem */
    minDepth: number;

    /** The minimum size of file we want to consider */
    minSize?: TNumType | string;

    /** Recursively search for matching files? */
    recursive: boolean;

    /** Do we want to contain the results to a single filesystem? Defaults to false */
    singleFS: boolean;

    /** Does the name start with the supplied pattern? */
    startsWith?: string | RegExp;

    /** Should we throw errors, like not found, etc? */
    throwErrors: boolean;

    /** For internal use */
    worker: FileWorkerImpl;
}

/** Advanced file search criteria */
export interface IFileSystemQuery<TNumType extends number | bigint = number> extends IReadFilesQuery<TNumType> {
    /** Matching files should contain text matching our expressions */
    contains?: string | RegExp;

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

    /** Minimum access time */
    minAccessTime?: TNumType;

    /** Minimum change time */
    minChangeTime?: TNumType;

    /** Minimum creation time to consider */
    minCreateTime?: TNumType;

    /** Minimum times a contains pattern must matchs */
    minMatches?: TNumType

    /** Callback that executes when the content is matched */
    onContains?: FileContentMatchCallback;
}

export interface IFileSystemQueryBigint extends IFileSystemQuery<bigint> { }

/**
 * Flesh out a File System Query (FSQ) criteria object
 * @param queryIn The seed of the query
 * @returns A complete query
 */
export const createCompleteFSQ = <TNumType extends number | bigint = number>(queryIn: Partial<IFileSystemQuery<TNumType>>): IFileSystemQuery<TNumType> => {
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

export const createCompleteRPL = <TNumType extends number | bigint = number>(queryIn: Partial<IReadFilesQuery<TNumType>>): IReadFilesQuery<TNumType> => {
    const expandSizeStrings = (spec: string | undefined | TNumType): undefined | TNumType => {
        if (typeof spec === 'string') {
            const m = /^(?<qty>[\d\._\,]+)(?<unit>[KMGTPEZY]*i?B)/i.exec(spec);
            if (m != null) {
                const { qty, unit } = m.groups as unknown as { qty: string, unit: string };
                const unitLookup: { [key: string]: number } = {
                    B: 1,
                    KB: 10 ** 3, KIB: 2 ** 10,
                    MB: 10 ** 6, MIB: 2 ** 20,
                    GB: 10 ** 9, GIB: 2 ** 30,
                    TB: 10 ** 12, TIB: 2 ** 40,
                    PB: 10 ** 15, PIB: 2 ** 50,
                    EB: 10 ** 18, EIB: 2 ** 60,
                    ZB: 10 ** 21, ZIB: 2 ** 70,
                    YB: 10 ** 24, YIB: 2 ** 80
                }
                let unitSize: TNumType = unit.toUpperCase() in unitLookup ? unitLookup[unit.toUpperCase()] as TNumType : 0 as TNumType;
                return (parseFloat(qty) * unitSize) as TNumType;
            }
            throw new Error(`Could not parse memory spec: ${spec}`);
        }
        return spec;
    }

    const result = {
        ...queryIn,
        bigint: queryIn.bigint === true,
        buffer: queryIn.buffer === true,
        encoding: queryIn.encoding ?? 'utf8',
        expr: Array.isArray(queryIn.expr) && queryIn.expr || [],
        followLinks: queryIn.followLinks === true,
        maxConcurrency: typeof queryIn.maxConcurrency === 'number' && queryIn.maxConcurrency > 0 && queryIn.maxConcurrency || Number.MAX_SAFE_INTEGER,
        maxDepth: typeof queryIn.maxDepth === 'number' && queryIn.maxDepth > 0 && queryIn.maxDepth || Number.MAX_SAFE_INTEGER,
        minDepth: typeof queryIn.minDepth === 'number' && queryIn.minDepth > 0 && queryIn.minDepth || 0,
        maxSize: expandSizeStrings(queryIn.maxSize),
        minSize: expandSizeStrings(queryIn.minSize),
        recursive: queryIn.recursive === true,
        singleFS: queryIn.singleFS === true,
        throwErrors: typeof queryIn.throwErrors === 'boolean' ? queryIn.throwErrors : true,
        worker: FileWorker.setMaxConcurrency(queryIn.maxConcurrency)
    }
    return result;
}
