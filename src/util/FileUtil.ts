/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

import { createCompleteFSQ, createCompleteRPL, ErrorLike, IFileObject, IFileSystemQuery, IReadFilesQuery } from '../fs/FileTypedefs';
import { GenericObject } from "../BaseTypes";
import FileObjectCollection from "../fs/FileObjectCollection";
import FileObject from "../fs/FileObject";
import RegExUtil from "./RegExUtil";
import path from 'path';
import fs from 'fs';
import FileWorker from '../fs/FileWorker';

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

export type FileObjectType =
    | 'file'
    | 'directory'
    | 'socket'
    | 'FIFO'
    | 'link'
    | 'blockDevice'
    | 'characterDevice'
    | 'unknown';

const packageRoot: string = getProjectRoot();

/**
 * When KLF is performing a streaming read, this will fire once for every file matching our criteria
 */
export type FSQObjectCallback<TNumType extends number | bigint = number> = (error: ErrorLike, file: IFileObject<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type FSQCollectionCallback = (error: ErrorLike, files: FileObjectCollection | undefined, criteria?: IFileSystemQuery) => void;

/**
 * When KLF is performing a streaming read, this will fire once for every file matching our criteria
 */
export type RPLObjectCallback = (error: ErrorLike, file: IFileObject | undefined, criteria?: IReadFilesQuery) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type RPLCollectionCallback = (error: ErrorLike, files: FileObjectCollection | undefined, criteria?: IReadFilesQuery) => void;


interface IFileUtil {
    /**
     * Flush out a full FSQ using the provided parameters
     * @param queryIn The provided parameters
     */
    createQuery(queryIn: Partial<IFileSystemQuery>): IFileSystemQuery;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLike The path to query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq(pathLike: string, query: Partial<IFileSystemQuery>, callback: FSQObjectCallback): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Buffered Version)
     * @param pathLike The path to query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq(pathLike: string, query: Partial<IFileSystemQuery> & { buffer: true }, callback: FSQCollectionCallback): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLikes One or more paths in which to conduct our query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq(pathLikes: string[], query: Partial<IFileSystemQuery>, callback: FSQObjectCallback): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Buffered Version)
     * @param pathLikes One or more paths in which to conduct our query
     * @param query The criteria for our search
     * @param callback A callback to receive the results
     */
    fsq(pathLikes: string[], query: Partial<IFileSystemQuery> & { buffer: true }, callback: FSQCollectionCallback): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLike The path in which to conduct our query
     * @param callback A callback to receive the results
     */
    fsq(pathLike: string, callback: Partial<IFileSystemQuery>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param pathLikes One or more paths in which to conduct our query
     * @param callback A callback to receive the results
     */
    fsq(pathLikes: string[], callback: Partial<IFileSystemQuery>): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Streaming Version)
     * @param query The conditions of our query
     * @param callback A callback to receive the results, one file at a time
     */
    fsq(query: IFileSystemQuery, callback: FSQObjectCallback): this;

    /**
     * Execute a File System Query (FSQ) and receive the results in the supplied callback (Buffered Version)
     * @param query The conditions of our query
     * @param callback A callback to receive the resulting file collection
     */
    fsq(query: IFileSystemQuery & { buffer: true }, callback: FSQCollectionCallback): this;

    fsqAsync(pathLike: string, query: Partial<IFileSystemQuery>): Promise<FileObjectCollection>;
    fsqAsync(pathLikes: string[], query: Partial<IFileSystemQuery>): Promise<FileObjectCollection>;
    fsqAsync(pathLike: string): Promise<FileObjectCollection>;
    fsqAsync(pathLikes: string[]): Promise<FileObjectCollection>;
    fsqAsync(query: Partial<IFileSystemQuery>): Promise<FileObjectCollection>;

    readPathlike(pathLike: string, callback: RPLCollectionCallback, query: Partial<IReadFilesQuery> & { buffered: true }): this;
    readPathlike(pathLike: string, callback: RPLObjectCallback, query: Partial<IReadFilesQuery>): this;
    readPathlike(pathLike: string, callback: RPLObjectCallback): this;
    readPathlike(fileObject: FileObject, callback: RPLCollectionCallback, query: Partial<IReadFilesQuery> & { buffered: true }): this;
    readPathlike(fileObject: FileObject, callback: RPLObjectCallback, query: Partial<IReadFilesQuery>): this;
    readPathlike(fileObject: FileObject, callback: RPLObjectCallback): this;

    statPathlike(pathLike: string, callback: FSQObjectCallback, queryIn: Partial<IReadFilesQuery>): void;
}

class FileUtilImpl implements IFileUtil {
    createQuery(queryIn: Partial<IFileSystemQuery>): IFileSystemQuery {
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
    readPathlike(
        pathLikeOrFileObject: string | FileObject,
        callbackIn: FSQObjectCallback | FSQCollectionCallback,
        queryIn: Partial<IReadFilesQuery> = { expr: [], buffer: false }): this {

        const query = createCompleteRPL(queryIn);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof callbackIn === 'function' && callbackIn as FSQObjectCallback || undefined;
        const callbackBuffered = isBuffering && typeof callbackIn === 'function' && callbackIn as FSQCollectionCallback || undefined;
        const sendSingleResult = (message: ErrorLike, returnValue: FileObject | undefined = undefined) => {
            const error = typeof message === 'string' && new Error(message) || typeof message === 'object' && message instanceof Error && message || undefined;
            if (query.throwErrors === true && error) throw error;

            if (callbackStreamed)
                callbackStreamed(error, returnValue, query);
            else if (callbackBuffered && returnValue)
                callbackBuffered(error, new FileObjectCollection([returnValue]), query);
            else if (callbackBuffered)
                callbackBuffered(error, new FileObjectCollection(), query);
            return this;
        };
        const fileObject: FileObject | undefined = typeof pathLikeOrFileObject === 'object' && pathLikeOrFileObject as FileObject || undefined;
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
                    if (reHasWildcards.test(part)) {
                        const leftExpr = parts.slice(0, index).join(path.sep);

                        prefix = parts.slice(0, index).join(path.sep);

                        //  Special case for globstar
                        if (part.indexOf('**') > -1) {
                            const rightExpr = parts.slice(index + 1).join(path.sep);
                            const rightPattern = RegExUtil.createFileRegex(rightExpr, { endsWith: true });

                            if (part === '**') {
                                if (rightExpr.indexOf('**') > -1)
                                    return sendSingleResult(`Expression ${pathLike} cannot contain more than one globstar`);

                                query.worker.enqueue(() => {
                                    this.readPathlike(leftExpr, (err: ErrorLike, file: IFileObject | undefined, criteria: IReadFilesQuery | undefined) => {
                                        query.worker.enqueue(() => {
                                            file?.matchSimpleCriteria(criteria!, (isMatch, file) => {
                                                if (isMatch && file) sendSingleResult(err, file as FileObject);
                                            });
                                        });
                                    }, { ...query, buffer: false, recursive: true, endsWith: rightPattern });
                                });
                            }
                            else
                                return sendSingleResult(`Expression ${pathLike} is invalid; Globstar must appear by itself, not ${part}`);
                        }
                        else {
                            const rightExpr = parts.slice(index).join(path.sep);
                            const rightPattern = RegExUtil.createFileRegex(rightExpr, { endsWith: true });

                            query.worker.enqueue(() => {
                                this.readPathlike(leftExpr, (err: ErrorLike, file: IFileObject | undefined, criteria: IReadFilesQuery | undefined) => {
                                    query.worker.enqueue(() => {
                                        file?.matchSimpleCriteria(criteria!, (isMatch, file) => {
                                            if (file) {
                                                if (isMatch)
                                                    sendSingleResult(err, file as FileObject);
                                                if (file.isDirectory()) {
                                                    for (const child of file.children!) {
                                                        query.worker.enqueue(() => {
                                                            child?.matchSimpleCriteria(criteria!, (isChildMatch, childFile, reason) => {
                                                                if (isChildMatch && childFile)
                                                                    sendSingleResult(undefined, childFile as FileObject);
                                                                else if (reason)
                                                                    console.log(reason);
                                                            });
                                                        });
                                                    }
                                                }
                                            }
                                        });
                                    });
                                }, { ...query, buffer: false, endsWith: rightPattern });
                            });
                        }
                    }
                }
            }
            else if (isBuffering && callbackBuffered) {
                const fullPath = fileObject ? fileObject.fullPath : pathLike;
                const collection = new FileObjectCollection();

                if (fullPath)
                    this.statPathlike(fullPath, (err: ErrorLike, file: IFileObject | undefined) => {
                        if (file) collection.push(file);
                    }, query);
                callbackBuffered(`Could not determine path`, collection, query);
            }
            else if (!isBuffering && callbackStreamed) {
                const fullPath = fileObject ? fileObject.fullPath : pathLike;
                if (fullPath)
                    this.statPathlike(fullPath, (err: ErrorLike, file: IFileObject | undefined) => {
                        callbackStreamed(err, file, query);
                    }, query);
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
     * Search the path for files matching our criteria
     * @param pathLike The path to stat
     * @param callback The callback to execute when the stat process is complete
     * @param queryIn The criteria we are tring to match
     * @returns 
     */
    statPathlike(pathLike: string, callback: FSQObjectCallback, queryIn: Partial<IReadFilesQuery> = {}): void {
        const query = createCompleteRPL(queryIn);

        try {
            const fullPath = pathLike;

            if (typeof fullPath === 'string')
                query.worker.enqueue(() => {
                    fs.lstat(fullPath, { bigint: query.bigint }, (err, stats) => {
                        if (err && query.throwErrors)
                            throw err;
                        else if (stats.isSymbolicLink()) {
                            query.worker.enqueue(() => {
                                fs.readlink(fullPath, { encoding: query.encoding || 'utf8' }, (err, linkTargetName) => {
                                    const linkObj = new FileObject(stats as fs.Stats, { fullPath, linkTargetName });
                                    const linkTargetResolved = path.resolve(linkObj.parentPath, linkTargetName);

                                    if (query.followLinks) {
                                        query.worker.enqueue(() => {
                                            this.statPathlike(linkTargetResolved, (err, linkTarget) => {
                                                callback(err, new FileObject(stats as fs.Stats, { fullPath, linkTargetName, linkTarget }))
                                            }, query);
                                        })
                                    }
                                    else
                                        return query.worker.enqueue(() => callback(err, linkObj));
                                });
                            });
                        }
                        else if (stats.isDirectory()) {
                            const dir = new FileObject(stats as fs.StatsBase<number>, { fullPath });

                            fs.readdir(fullPath, { encoding: 'utf8' }, (err, stats) => {
                                const children: IFileObject[] = [];
                                let untilComplete = stats.length;

                                const addChild = (child: IFileObject | undefined): void => {
                                    if (child) {
                                        children.push(child);
                                    }
                                    if (--untilComplete === 0) {
                                        const finalDir = new FileObject(dir.getStats(), { ...dir, children });
                                        callback(err, finalDir);
                                    }
                                };
                                for (const name of stats) {
                                    query.worker.enqueue(() => {
                                        const childFullPath = path.join(fullPath, name);

                                        this.statPathlike(childFullPath, (err, childStats) => {
                                            if (err && query.throwErrors)
                                                throw err;
                                            else if (childStats) {
                                                const newChild = new FileObject(childStats, { parent: dir, name, fullPath: childFullPath });

                                                if (query.recursive === true && newChild.isDirectory()) {
                                                    query.worker.enqueue(() => {
                                                        this.statPathlike(childFullPath, (err, newChildDirectory) => {
                                                            if (newChildDirectory) addChild(newChildDirectory);
                                                            else addChild(undefined);
                                                        }, query);
                                                    });
                                                }
                                                else
                                                    return addChild(newChild);
                                            }
                                            else return addChild(undefined);
                                        }, query);
                                    });
                                }
                            });
                        }
                        else {
                            query.worker.enqueue(() => {
                                const newChild = new FileObject(stats as fs.Stats, { fullPath });
                                if (err)
                                    callback(err, newChild);
                                else
                                    callback(undefined, newChild);
                            });
                        }
                    });
                });
            else
                query.worker.enqueue(() => callback(new Error(`Invalid pathLike: ${pathLike}`), undefined));
        }
        catch (err) {
            query.worker.enqueue(() => callback(err, undefined));
        }
    }

    /**
     * Buffered File System Query (FSQ) implementation
     * @param query The criteria for matching files
     * @param callback The callback is executed when the entire collection is complete
     */
    private fsqBuffered(query: IFileSystemQuery, callback: FSQCollectionCallback) {
        const result: FileObjectCollection = new FileObjectCollection();

        for (const [i, expr] of query.expr.entries()) {
            this.readPathlike(expr, (err: ErrorLike, file: IFileObject | undefined) => {
                file?.matchCriteria(query, (didMatchCriteria, file) => {
                    if (didMatchCriteria) result.push(file);
                });
            }, { ...query, buffer: true });
        }
    }

    /**
     * Streaming File System Query (FSQ) implementation
     * @param query The criteria for matching files
     * @param callback The callback is executed for every matching file
     */
    private fsqStreamed(query: IFileSystemQuery, callback: FSQObjectCallback) {
        for (const [i, expr] of query.expr.entries()) {
            this.readPathlike(expr, (err: ErrorLike, file: IFileObject | undefined) => {
                file?.matchCriteria(query, (didMatchCriteria, file) => {
                    if (didMatchCriteria) callback(err, file);
                });
            }, { ...query, buffer: false });
        }
    }

    /**
     * Query the filesystem, callback style
     * @param pathLikeOrQuery One or more path expressions to query OR a query object
     * @param queryOrCallback A query or a callback
     * @param callbackIn A callback
     * @returns 
     */
    fsq(
        pathLikeOrQuery: string | string[] | IFileSystemQuery,
        queryOrCallback: FSQObjectCallback | FSQCollectionCallback | Partial<IFileSystemQuery> = { expr: [] },
        callbackIn?: FSQObjectCallback | FSQCollectionCallback): this {

        const pathLikes: string[] = Array.isArray(pathLikeOrQuery) && pathLikeOrQuery as string[]
            || typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery]
            || !Array.isArray(pathLikeOrQuery) && typeof pathLikeOrQuery === 'object' && pathLikeOrQuery.expr
            || [] as string[];
        const query: IFileSystemQuery = createCompleteFSQ(typeof pathLikeOrQuery === 'object' && pathLikeOrQuery as IFileSystemQuery
            || typeof queryOrCallback === 'object' && queryOrCallback as IFileSystemQuery
            || { expr: '' } as unknown as IFileSystemQuery);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof queryOrCallback === 'function' && queryOrCallback as FSQObjectCallback
            || !isBuffering && typeof callbackIn === 'function' && callbackIn as FSQObjectCallback || undefined;
        const callbackBuffered = isBuffering && typeof queryOrCallback === 'function' && queryOrCallback as FSQCollectionCallback || undefined
            || isBuffering && typeof callbackIn === 'function' && callbackIn as FSQCollectionCallback || undefined;

        if (pathLikes) {
            query.expr = Array.isArray(query.expr) ? [...query.expr, ...pathLikes] : query.expr = pathLikes;
        }
        if (query.expr.length === 0) {
            throw new Error('FileUtil.fsq(): No path expressions were provided, nothing to do');
        }

        if (isBuffering && callbackBuffered) {
            this.fsqBuffered(query, callbackBuffered);
        }
        else if (!isBuffering && callbackStreamed) {
            this.fsqStreamed(query, callbackStreamed);
        }
        return this;
    }

    /**
     * 
     * @param pathLikeOrQuery One or more path expressions to query OR a query object
     * @param queryIn A query
     * @returns 
     */
    async fsqAsync(pathLikeOrQuery: string | string[] | Partial<IFileSystemQuery>, queryIn?: Partial<IFileSystemQuery>): Promise<FileObjectCollection> {
        const query = typeof pathLikeOrQuery === 'object' && !Array.isArray(pathLikeOrQuery) && createCompleteFSQ(pathLikeOrQuery)
            || typeof queryIn === 'object' && createCompleteFSQ(queryIn) || createCompleteFSQ({ expr: [] });
        const pathLikes = typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery] || Array.isArray(pathLikeOrQuery) && pathLikeOrQuery || query.expr || [];

        query.buffer = true;

        return new Promise((resolve: (result: FileObjectCollection) => void, reject: (reason: any) => void) => {
            try {
                this.fsq(pathLikes, query as IFileSystemQuery, (error: ErrorLike, files: FileObjectCollection | undefined) => {
                    if (error && query.throwErrors === true) reject(error);
                    else if (files) resolve(files);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    }
}

const FileUtil: IFileUtil = new FileUtilImpl;

export default FileUtil;
