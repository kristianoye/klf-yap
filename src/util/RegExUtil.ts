/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

export type RegexScoringInfo = { group: string, reclass: string, capture: string, captureDef?: Partial<RegexScoringInfo>, length: number };

/**
 * Provides some path-related utilities
 * @since 1.0.0
 */
export default class RegExUtil {
    /**
     * Convert a globular expression into a regex
     * @param input A file globular expression
     */
    static createFileRegex(input: string, flags: { exact?: boolean, endsWith?: boolean, startsWith?: boolean } = {}): RegExp {
        //  Change dots into literal dots
        let s = input.replace(/\./g, '\\.');
        s = s.replace(/\?/g, '.');
        s = s.replace(/\*/g, '.*');

        let n = s.indexOf('['),
            x = s.indexOf(']');
        if (n > -1 || x > -1) {
            while (true) {
                if (x > n) throw new Error(`Bad range expression in pattern: ${input}`);
                else if (x === -1) throw new Error(`Unclosed range expression in pattern: ${input}`);
                n = s.indexOf('[', n + 1);
                x = s.indexOf(']', x + 1);
                if (n === -1 && x === -1) break;
            }
        }
        if (flags.exact === true) s = '^' + s + '$';
        else {
            if (flags.startsWith === true) s = '^' + s;
            if (flags.endsWith === true) s = s + '$';
        }
        return new RegExp(s);
    }

    /**
     * Parse a regex ... needs work
     * @param regex The expression to parse
     */
    static parseRegex(regex: string | RegExp): RegexScoringInfo[] {
        if (typeof regex === 'object' && regex instanceof RegExp) {
            regex = regex.toString();
        }
        if (typeof regex === 'string') {
            const groupPattern = /(?<reclass>\[.*?\])|(?<capture>\(.*?\))/g;
            const matches: RegexScoringInfo[] = [];
            let match: RegExpExecArray | null;

            while ((match = groupPattern.exec(regex)) !== null) {
                if (match.groups) {
                    const { reclass, capture } = match.groups;
                    const matchData: RegexScoringInfo = {
                        group: reclass || capture,
                        reclass,
                        capture,
                        captureDef: this.parseRegex(capture.slice(1, capture.length - 1)),
                        length: ((reclass || '') + (capture + '')).length
                    };
                    matches.push(matchData);
                }
            }

            return matches;
        }
        else
            throw new Error(`Bad argument 1 to RegexHelper.parseRegex(); Expected string or RegExp, but got ${typeof regex}`);
    }

    /**
     * Assigns a weight score based on how lazy or greedy the expression is ... also needs work
     * @param regex The regex to "weigh"
     * @returns The weight score
     */
    static weighRegex(regex: string | RegExp) {
        if (typeof regex === 'object' && regex instanceof RegExp) {
            regex = regex.toString();
        }
        if (typeof regex === 'string') {
            const matches = RegExUtil.parseRegex(regex);
            let weight = -1;

            for (var data of matches) {
                const { reclass, capture } = data;
                if (reclass) {
                    // match zero or more
                    if (reclass.endsWith('*'))
                        weight -= 100;
                    // match one or more
                    else if (reclass.endsWith('+'))
                        weight -= 50;
                    // match single character
                    else if (reclass.endsWith(']'))
                        weight += 50;
                    else if (reclass.endsWith('}')) {
                        var s = reclass.lastIndexOf('{'),
                            e = reclass.lastIndexOf('}'),
                            r = reclass.slice(s + 1, e),
                            rp = r.split(',').map(s => s.trim()).filter(s => s.length > 0).unshift();
                        weight -= (rp ** rp);
                    }
                }
            }
            return weight;
        }
        else
            throw new Error(`Bad argument 1 to RegexHelper.parseRegex(); Expected string or RegExp, but got ${typeof regex}`);
    }
}

