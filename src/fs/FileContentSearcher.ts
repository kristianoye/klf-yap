/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';

import { IFileObject } from "./FileTypedefs";

/**
 * Information about a file content searchresult
 */
export interface FileContentMatch<TNumType extends number | bigint> {
    /** Where did the match occur? */
    position: FileContentMatchPosition;

    /** Any match groups from a regex */
    groups: RegExpMatchArray | null;

    /** The filename that the match was in */
    file: IFileObject<TNumType>
}

/**
 * Called whenever a content search finds a match.  If the callback returns
 * true, then the search will continue and try and find another match.
 */
export type FileContentMatchCallback<TNumType extends number | bigint> = (match: FileContentMatch<TNumType>) => boolean;


export type FileContentMatchPosition = {
    /** The column where the match stated */
    col: number;


    filename: string;

    /** The character offset relative to the beginning of file where the match started */
    index: number;

    /** The line where the match started */
    line: number;
}

export type FileContentSearchResult<TNumType extends number | bigint> = {
    done: boolean;
    value: FileContentMatch<TNumType> | null
}

export default class FileContentSearcher<TNumType extends number | bigint> {
    constructor(file: IFileObject<TNumType>, criteria: string | RegExp, encoding: BufferEncoding = 'utf8') {
        const flags = ['g'];
        if (typeof criteria === 'string')
            this.criteria = new RegExp(criteria, 'g');
        else
            this.criteria = new RegExp(criteria, 'g');
        this.encoding = encoding;
        this.file = file;
    }

    private encoding: BufferEncoding = 'utf8';

    private content: string = '';

    readonly criteria: RegExp;

    private file: IFileObject<TNumType>;

    private lastMatch: RegExpMatchArray | null = null;

    private position: FileContentMatchPosition = { line: 0, col: 0, index: 0, filename: '' };

    next(): Readonly<FileContentSearchResult<TNumType>> | false {
        if (!this.content) {
            this.content = this.file.readFileSync(this.encoding);
            this.position = { line: 1, col: 0, index: 0, filename: this.file.fullPath };
            this.criteria.lastIndex = -1;
            this.lastMatch = this.criteria.exec(this.content);

            if (this.lastMatch == null) {
                return false
            }
        }

        const lastMatch = this.lastMatch;
        if (lastMatch != null && typeof lastMatch !== 'undefined' && typeof lastMatch.index === 'number') {
            const newPos = { ...this.position };
            for (let i = this.position.index, max = lastMatch.index + 1; i < max; i++) {
                if (this.content.charAt(i) === '\n') {
                    newPos.line++;
                    newPos.col = 0;
                }
                else
                    newPos.col++;
            }
            this.position = newPos;
        }
        this.lastMatch = this.criteria.exec(this.content);
        const result: FileContentSearchResult<TNumType> = {
            value: {
                file: this.file,
                groups: lastMatch,
                position: this.position
            },
            done: this.lastMatch === null
        }

        return Object.freeze(result);
    }

    reset() {
        this.content = '';
        this.criteria.lastIndex = -1;
        this.position = { col: 0, line: 0, index: 0, filename: this.file.fullPath };
    }
}
