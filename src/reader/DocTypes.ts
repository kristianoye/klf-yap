/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Very simple ("dumb") XML reader
 */
'use strict';

export interface IDocument {

}

export interface IDocumentStreamReader {

}

export interface IReaderOptions {

}

export interface IDocumentReader extends IDocumentStreamReader {
    /** Read the entire document into memory */
    readDocumentSync(options?: IReaderOptions): IDocument;
}
