/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

import fs from 'fs';
import { FileContentMatchCallback } from './FileContentSearcher';

/** The possible types of object we can/should expect */
export type FileObjectType = 'file' | 'directory' | 'socket' | 'FIFO' | 'link' | 'blockDevice' | 'characterDevice' | 'unknown';
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
 * Flesh out a File System Query (FSQ) criteria object
 * @param queryIn The seed of the query
 * @returns A complete query
 */
export const createCompleteFSQ = <TNumType extends number | bigint>(queryIn: Partial<IFileSystemQuery<TNumType>>): IFileSystemQuery<TNumType> => {
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

export const createCompleteRPL = (queryIn: Partial<IReadFilesQuery>): IReadFilesQuery => {
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
