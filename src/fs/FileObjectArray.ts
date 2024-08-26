import { createCompleteFSQ, IFileObject, IFileSystemQuery } from "./FileTypedefs";

/**
 * Represents a collection of files 
 */
export default class FileObjectCollection<TNumType extends number | bigint> extends Array<IFileObject<TNumType>> {
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
