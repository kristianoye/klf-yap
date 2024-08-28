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
export interface FileContentMatch<TNumType extends number | bigint = number> {
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
export type FileContentMatchCallback = (match: FileContentMatch<number> | FileContentMatch<bigint>) => boolean;


export type FileContentMatchPosition<TNumType extends number | bigint = number> = {
    /** The column where the match stated */
    col: TNumType;

    /** The file containing the match */
    filename: string;

    /** The character offset relative to the beginning of file where the match started */
    index: TNumType;

    /** The line where the match started */
    line: TNumType;
}

export type FileContentSearchResult<TNumType extends number | bigint = number> = {
    done: boolean;
    value: FileContentMatch<TNumType> | null
}

export type FileContentSearchOptions = {
    /** Allows . to match newlines. */
    dotAll?: boolean;

    /** Buffer encoding type to use when reading the source file */
    encoding?: BufferEncoding;

    /** Ignore casing when matching */
    ignoreCase?: boolean;

    /** Rewrite search pattern to ignore whitespace between words */
    ignoreWhitespace?: boolean;

    /** Treat beginning and end assertions (^ and $) as working over multiple lines. In other words, match the beginning or end of each line (delimited by \n or \r), not only the very beginning or end of the whole input string. */
    multiline?: boolean;

    /** Treat pattern as a sequence of Unicode code points. */
    unicode?: boolean;

    /** An upgrade to the u flag that enables set notation in character classes as well as properties of strings. */
    unicodeSets?: boolean;
}

export default class FileContentSearcher<TNumType extends number | bigint = number> {
    constructor(file: IFileObject<TNumType>, criteria: string | RegExp, options: FileContentSearchOptions = { encoding: 'utf8', ignoreCase: false, ignoreWhitespace: false }) {
        const flags = ['g'];

        if (options.dotAll === true) flags.push('s');
        if (options.ignoreCase === true) flags.push('i');
        if (options.multiline === true) flags.push('m');
        if (options.unicodeSets === true) flags.push('v');
        else if (options.unicode === true) flags.push('u');

        if (typeof criteria === 'string') {
            const pattern = options.ignoreWhitespace ? criteria.replace(/\s+/, '\\s+') : criteria;
            this.criteria = new RegExp(pattern, flags.join(''));
        }
        else
            this.criteria = new RegExp(criteria, flags.join(''));

        this.encoding = options.encoding || 'utf8';
        this.file = file;
    }

    private encoding: BufferEncoding = 'utf8';

    private content: string = '';

    readonly criteria: RegExp;

    private file: IFileObject<TNumType>;

    private isFresh: boolean = true;

    private lastMatch: RegExpMatchArray | null = null;

    private position: FileContentMatchPosition = { line: 0, col: 0, index: 0, filename: '' };

    next(): Readonly<FileContentSearchResult<TNumType>> {
        if (!this.content) {
            this.content = this.file.readFileSync(this.encoding);
        }
        if (this.isFresh) {
            this.position = { line: 1, col: 0, index: 0, filename: this.file.fullPath };
            this.criteria.lastIndex = -1;
            this.lastMatch = this.criteria.exec(this.content);
            this.isFresh = false;
        }

        const lastMatch = this.lastMatch;

        if (lastMatch == null) {
            return Object.freeze({
                done: true,
                value: null
            })
        }

        if (lastMatch != null && typeof lastMatch !== 'undefined' && typeof lastMatch.index === 'number') {
            const newPos = { ...this.position };
            for (let i = this.position.index, max = lastMatch.index + 1; i < max; i++) {
                if (this.content.charAt(i) === '\n') {
                    newPos.line++;
                    newPos.col = 0;
                }
                else
                    newPos.col++;
                newPos.index++;
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
            done: lastMatch == null
        }

        return Object.freeze(result);
    }

    reset() {
        this.isFresh = true;
    }
}
