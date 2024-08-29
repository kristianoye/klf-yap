/*
 * KLF FSQ
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains implementation of IFileObjectCollection
 */
'use strict';

import { createCompleteFSQ, IFileObject, IFileSystemQuery } from "./FileTypedefs";

export interface IFileObjectCollection {
    /** Returns the number of bytes contained within the collection */
    readonly size: number;
}

/**
 * Represents a collection of files;  A collection is independent of filesystem type or stat type.
 */
export default class FileObjectCollection extends Array<IFileObject> implements IFileObjectCollection {
    constructor(files: IFileObject[] = []) {
        super(...files);
    }

    private _size: number = -1;

    copyAll(dest: string): this {
        return this;
    }

    get size(): number {
        if (this._size === -1) {
            let result = 0;
            this.forEach(f => result += f.size);
            return (this._size = result);
        }
        return this._size;
    }

    unlinkAll(): this {
        return this;
    }

    where(queryIn: Partial<IFileSystemQuery>, callback: (files: FileObjectCollection) => void): this {
        const query = createCompleteFSQ(queryIn),
            result = new FileObjectCollection();
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

    whereAsync(queryIn: Partial<IFileSystemQuery>): Promise<FileObjectCollection> {
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
