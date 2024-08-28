import { createCompleteFSQ, IFileObject, IFileSystemQuery } from "./FileTypedefs";

/**
 * Represents a collection of files 
 */
export default class FileObjectCollection extends Array<IFileObject> {
    constructor(files: IFileObject[] = []) {
        super(...files);
    }

    copyAll(dest: string): this {
        return this;
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
