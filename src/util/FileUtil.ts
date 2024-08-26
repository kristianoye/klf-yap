/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

import { createCompleteFSQ, createCompleteRPL, IFileObject, IFileSystemQuery, IReadFilesQuery } from '../fs/FileTypedefs';
import { GenericObject } from "../BaseTypes";
import FileObjectCollection from "../fs/FileObjectArray";
import FileObject from "../fs/FileObject";
import RegExUtil from "./RegExUtil";
import path from 'path';
import fs from 'fs';

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

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLike The path to query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq<TNumType extends number | bigint>(pathLike: string, query: Partial<IFileSystemQuery<TNumType>>, callback: FSQObjectCallback<TNumType>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Buffered Version)
     * @param pathLike The path to query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq<TNumType extends number | bigint>(pathLike: string, query: Partial<IFileSystemQuery<TNumType>> & { buffer: true }, callback: FSQCollectionCallback<TNumType>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLikes One or more paths in which to conduct our query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq<TNumType extends number | bigint>(pathLikes: string[], query: Partial<IFileSystemQuery<TNumType>>, callback: FSQObjectCallback<TNumType>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Buffered Version)
     * @param pathLikes One or more paths in which to conduct our query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq<TNumType extends number | bigint>(pathLikes: string[], query: Partial<IFileSystemQuery<TNumType>> & { buffer: true }, callback: FSQCollectionCallback<TNumType>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLike The path in which to conduct our query
     * @param callback A callback to receive the results
     */
    fsq<TNumType extends number | bigint>(pathLike: string, callback: Partial<IFileSystemQuery<TNumType>>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLikes One or more paths in which to conduct our query
     * @param callback A callback to receive the results
     */
    fsq<TNumType extends number | bigint>(pathLikes: string[], callback: Partial<IFileSystemQuery<TNumType>>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param query The conditions of our query
     * @param callback A callback to receive the results, one file at a time
     */
    fsq<TNumType extends number | bigint>(query: IFileSystemQuery<TNumType>, callback: FSQObjectCallback<TNumType>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Buffered Version)
     * @param query The conditions of our query
     * @param callback A callback to receive the resulting file collection
     */
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
