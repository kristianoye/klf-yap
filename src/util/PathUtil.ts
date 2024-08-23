/**
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * @version 1.0.0
 */
'use strict';

import * as fs from 'fs';
import * as path from 'path';

const
    projectRoot: string = require?.main?.filename ?? '';

/**
* Provides some path-related utilities
* @since 1.0.0
*/
class PathUtil {
    /**
     * Returns the various path components of a file expression
     * @param {string} pathExpr Filename to parse
     */
    static getPathParts(pathExpr: string) {
        const endOfPath = pathExpr.lastIndexOf(path.sep);
        const fileName = pathExpr.slice(endOfPath + 1);
        const extensionIndex = pathExpr.lastIndexOf('.');
        const extension = extensionIndex > -1 ? pathExpr.slice(extensionIndex) : '';
        const baseName = fileName.slice(0, -extension.length);

        return {
            /** pathExpr without parent directory or extension */
            baseName,
            /** Full path minus extension */
            basePath: pathExpr.slice(0, -extension.length),
            /** The actual extension */
            extension,
            /** The original path expression */
            fullPath: pathExpr,
            /** Does the expression have an extesion? */
            hasExtension: extensionIndex > -1,
            /** The directory part of the path */
            parentPath: pathExpr.slice(0, endOfPath),
            /** The schema used to get this resource */
            schema: 'file://',
            /** The URL to fetch this */
            urlNative: `file://${pathExpr}`,
            urlPosix: `file://${pathExpr.split(path.sep).join(path.posix.sep)}`
        };
    }

    /**
     * Attempt to find node_modules directories in our path structure
     * @param startIn The directory in which we start our search
     * @since 1.0.0
     */
    static locateNodeModulesDirectory(startIn: string = __dirname) {
        const pathParts = startIn.split(path.sep).filter(s => s.length > 0);
        const result: string[] = [];

        while (pathParts.length > 0) {
            var thisPath = pathParts.join(path.sep),
                nodeInPath = path.join(thisPath, 'node_modules');

            if (!thisPath.startsWith(projectRoot))
                break;

            if (thisPath.endsWith('node_modules'))
                result.push(thisPath);
            else {
                try {
                    fs.statfsSync(nodeInPath);
                    result.push(nodeInPath);
                }
                catch { }
            }
            pathParts.pop();
        }
        return result;
    }
}

module.exports = PathUtil;


