/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

import { createCompleteFSQ, createCompleteRPL, ErrorType, IFileObject, IFileSystemQuery, IReadFilesQuery } from '../fs/FileTypedefs';
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
export type FSQObjectCallback<TNumType extends number | bigint> = (error: ErrorType, file: IFileObject<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type FSQCollectionCallback<TNumType extends number | bigint> = (error: ErrorType, files: FileObjectCollection<TNumType> | undefined, criteria?: IFileSystemQuery<TNumType>) => void;

/**
 * When KLF is performing a streaming read, this will fire once for every file matching our criteria
 */
export type RPLObjectCallback<TNumType extends number | bigint> = (error: ErrorType, file: IFileObject<TNumType> | undefined, criteria?: IReadFilesQuery<TNumType>) => void;

/**
 * When KLF is performing a buffered read, this will fire once for every batch of matching files
 */
export type RPLCollectionCallback<TNumType extends number | bigint> = (error: ErrorType, files: FileObjectCollection<TNumType> | undefined, criteria?: IReadFilesQuery<TNumType>) => void;


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

    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: RPLCollectionCallback<TNumType>, query: Partial<IReadFilesQuery<TNumType>> & { buffered: true }): this;
    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: RPLObjectCallback<TNumType>, query: Partial<IReadFilesQuery<TNumType>>): this;
    readPathlike<TNumType extends number | bigint>(pathLike: string, callback: RPLObjectCallback<TNumType>): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: RPLCollectionCallback<TNumType>, query: Partial<IReadFilesQuery<TNumType>> & { buffered: true }): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: RPLObjectCallback<TNumType>, query: Partial<IReadFilesQuery<TNumType>>): this;
    readPathlike<TNumType extends number | bigint>(fileObject: FileObject<TNumType>, callback: RPLObjectCallback<TNumType>): this;

    statPathlike<TNumType extends number | bigint>(pathLike: string, callback: FSQObjectCallback<TNumType>, queryIn: Partial<IReadFilesQuery<TNumType>>): void;
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
        queryIn: Partial<IReadFilesQuery<TNumType>> = { expr: [], buffer: false }): this {

        const query = createCompleteRPL(queryIn);
        const isBuffering = query.buffer === true;
        const callbackStreamed = !isBuffering && typeof callbackIn === 'function' && callbackIn as FSQObjectCallback<TNumType> || undefined;
        const callbackBuffered = isBuffering && typeof callbackIn === 'function' && callbackIn as FSQCollectionCallback<TNumType> || undefined;
        const sendSingleResult = (message: ErrorType, returnValue: FileObject<TNumType> | undefined = undefined) => {
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

                                this.readPathlike(leftExpr, (err: ErrorType, file: IFileObject<TNumType> | undefined, criteria: IReadFilesQuery<TNumType> | undefined) => {
                                    file?.matchSimpleCriteria(criteria!, (isMatch, file) => {
                                        if (isMatch && file) sendSingleResult(err, file as FileObject<TNumType>);
                                    });
                                }, { ...query, buffer: false, recursive: true, endsWith: rightPattern });
                            }
                            else
                                return sendSingleResult(`Expression ${pathLike} is invalid; Globstar must appear by itself, not ${part}`);
                        }
                        else {
                            const rightExpr = parts.slice(index).join(path.sep);
                            const rightPattern = RegExUtil.createFileRegex(rightExpr, { endsWith: true });

                            this.readPathlike(leftExpr, (err: ErrorType, file: IFileObject<TNumType> | undefined, criteria: IReadFilesQuery<TNumType> | undefined) => {
                                file?.matchSimpleCriteria(criteria!, (isMatch, file) => {
                                    if (file) {
                                        if (isMatch) sendSingleResult(err, file as FileObject<TNumType>);
                                        if (file.isDirectory()) {
                                            for (const child of file.children!) {
                                                child?.matchSimpleCriteria(criteria!, (isChildMatch, childFile, reason) => {
                                                    if (isChildMatch && childFile)
                                                        sendSingleResult(undefined, childFile as FileObject<TNumType>);
                                                    else if (reason)
                                                        console.log(reason);
                                                });
                                            }
                                        }
                                    }
                                });
                            }, { ...query, buffer: false, endsWith: rightPattern });
                        }
                    }
                }
            }
            else if (isBuffering && callbackBuffered) {
                const fullPath = fileObject ? fileObject.fullPath : pathLike;
                const collection = new FileObjectCollection<TNumType>();

                if (fullPath)
                    this.statPathlike<TNumType>(fullPath, (err: ErrorType, file: IFileObject<TNumType> | undefined) => {
                        if (file) collection.push(file);
                    }, query);
                callbackBuffered(`Could not determine path`, collection, query);
            }
            else if (!isBuffering && callbackStreamed) {
                const fullPath = fileObject ? fileObject.fullPath : pathLike;
                if (fullPath)
                    this.statPathlike<TNumType>(fullPath, (err: ErrorType, file: IFileObject<TNumType> | undefined) => {
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

    statPathlike<TNumType extends number | bigint>(pathLike: string, callback: FSQObjectCallback<TNumType>, queryIn: Partial<IReadFilesQuery<TNumType>> = {}): void {
        try {
            const fullPath = pathLike;
            const query = createCompleteRPL(queryIn);

            if (typeof fullPath === 'string')
                fs.lstat(fullPath, { bigint: query.bigint }, (err, stats) => {
                    if (err && query.throwErrors)
                        throw err;
                    else if (stats.isSymbolicLink()) {
                        fs.readlink(fullPath, { encoding: query.encoding || 'utf8' }, (err, linkTargetName) => {
                            const linkObj = new FileObject<TNumType>(stats as fs.StatsBase<TNumType>, { fullPath, linkTargetName });
                            const linkTargetResolved = path.resolve(linkObj.parentPath, linkTargetName);

                            if (query.followLinks) {
                                this.statPathlike<TNumType>(linkTargetResolved, (err, linkTarget) => {
                                    linkObj.linkTarget = linkTarget;
                                    callback(err, linkObj);
                                }, query);
                            }
                            else
                                return callback(err, linkObj);
                        });
                    }
                    else if (stats.isDirectory()) {
                        const dir = new FileObject<TNumType>(stats as fs.StatsBase<TNumType>, { fullPath });

                        fs.readdir(fullPath, { encoding: 'utf8' }, (err, stats) => {
                            let untilComplete = stats.length;

                            const addChild = (child: IFileObject<TNumType> | undefined): IFileObject<TNumType> | undefined => {
                                if (child) {
                                    child.parent = dir;
                                    dir.addChild(child);
                                }
                                if (--untilComplete === 0) callback(undefined, dir);
                                return child;
                            };
                            for (const name of stats) {
                                const childFullPath = path.join(fullPath, name);

                                this.statPathlike<TNumType>(childFullPath, (err, childStats) => {
                                    if (err && query.throwErrors)
                                        throw err;
                                    else if (childStats) {
                                        const newChild = new FileObject<TNumType>(childStats, { parent: dir, name, fullPath: childFullPath });

                                        if (query.recursive === true && newChild.isDirectory()) {
                                            this.statPathlike<TNumType>(childFullPath, (err, newChildDirectory) => {
                                                if (newChildDirectory) addChild(newChildDirectory);
                                                else addChild(undefined);
                                            }, query);
                                        }
                                        else
                                            return addChild(newChild);
                                    }
                                    else return addChild(undefined);
                                }, query);
                            }
                        });
                    }
                    else {
                        const newChild = new FileObject<TNumType>(stats as fs.StatsBase<TNumType>, { fullPath });
                        if (err)
                            callback(err, newChild);
                        else
                            callback(undefined, newChild);
                    }
                });
            else return callback(new Error(`Invalid pathLike: ${pathLike}`), undefined);
        }
        catch (err) {
            callback(err, undefined);
        }
    }

    /**
     * Buffered File System Query (FSQ) implementation
     * @param query The criteria for matching files
     * @param callback The callback is executed when the entire collection is complete
     */
    private fsqBuffered<TNumType extends number | bigint>(query: IFileSystemQuery<TNumType>, callback: FSQCollectionCallback<TNumType>) {
        const result: FileObjectCollection<TNumType> = new FileObjectCollection<TNumType>();

        for (const [i, expr] of query.expr.entries()) {
            this.readPathlike<TNumType>(expr, (err: ErrorType, file: IFileObject<TNumType> | undefined) => {
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
    private fsqStreamed<TNumType extends number | bigint>(query: IFileSystemQuery<TNumType>, callback: FSQObjectCallback<TNumType>) {
        for (const [i, expr] of query.expr.entries()) {
            this.readPathlike<TNumType>(expr, (err: ErrorType, file: IFileObject<TNumType> | undefined) => {
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
    async fsqAsync<TNumType extends number | bigint>(pathLikeOrQuery: string | string[] | Partial<IFileSystemQuery<TNumType>>, queryIn?: Partial<IFileSystemQuery<TNumType>>): Promise<FileObjectCollection<TNumType>> {
        const query = typeof pathLikeOrQuery === 'object' && !Array.isArray(pathLikeOrQuery) && createCompleteFSQ(pathLikeOrQuery)
            || typeof queryIn === 'object' && createCompleteFSQ(queryIn) || createCompleteFSQ({ expr: [] });
        const pathLikes = typeof pathLikeOrQuery === 'string' && [pathLikeOrQuery] || Array.isArray(pathLikeOrQuery) && pathLikeOrQuery || query.expr || [];

        query.buffer = true;

        return new Promise((resolve: (result: FileObjectCollection<TNumType>) => void, reject: (reason: any) => void) => {
            try {
                this.fsq<TNumType>(pathLikes, query as IFileSystemQuery<TNumType>, (error: ErrorType, files: FileObjectCollection<TNumType> | undefined) => {
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
