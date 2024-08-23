/*
 * KLF Require Core
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains enumerated types used by KLF modules.
 */
'use strict';



export const DetailLevelString = ['', '   NONE', '  ERROR', 'WARNING', '  DEBUG', 'VERBOSE'];

export enum LoaderPipelineAction {
    Abort,
    Complete,
    Continue
}

export enum LogDetailLevel {
    /** Inane detail */
    Verbose,

    /** Information helpful to configuring the importer */
    Debug,

    /** Some expected behavior did not execute as expected */
    Warning,

    /** An error occurred and the current module could not be handled */
    Error,

    /** No Detail provided */
    None
}

export enum ReservedWord {
    Await = 'await',
    Break = 'break',
    Case = 'case',
    Catch = 'catch',
    Class = 'class',
    Const = 'const',
    Continue = 'continue',
    Debugger = 'debugger',
    Default = 'default',
    Delete = 'delete',
    Do = 'do',
    Else = 'else',
    Export = 'export',
    Extends = 'extends',
    Finally = 'finally',
    For = 'for',
    Function = 'function',
    If = 'if',
    Implements = 'implements',
    In = 'in',
    Interface = 'interface',
    InstanceOf = 'instanceof',
    Let = 'let',
    New = 'new',
    Package = 'package',
    Private = 'private',
    Protected = 'protected',
    Public = 'public',
    Return = 'return',
    Static = 'static',
    Super = 'super',
    Switch = 'switch',
    This = 'this',
    Throw = 'throw',
    Try = 'try',
    TypeOf = 'typeof',
    Var = 'var',
    Void = 'void',
    While = 'while',
    With = 'with',
    Yield = 'yield'
}

export enum TokenizerScope {
    /** We are parsing an arrow function */
    ArrowFunction,

    /** We are currently parsing a class definition */
    Class,

    /** We are parsing a class constructor */
    Constructor,

    DoWhileLoop,

    ForLoop,

    ForOfLoop,

    /** We are parsing a function declaration */
    Function,

    /** We are working in the global scope outside of all block constructs */
    Global,

    /** We are parsing a member (property, method, etc) */
    Member,

    WhileLoop
}

export enum TokenType {
    /** Parser could not determine token type */
    Unknown,
    /**  */
    ArrowFunction,
    /**  */
    Assignment,
    /**  */
    BlockStatement,
    /**  */
    BlockStatementEnd,
    /**  */
    BlockStatementStart,
    /**  */
    CurlyBrace,
    /**  */
    Class,
    /**  */
    ClassBody,
    /**  */
    CommentBlock,
    /**  */
    CommentInline,
    /**  */
    Equality,
    /**  */
    Function,
    /** The global namespace */
    Global,
    /**  */
    Identifier,
    /**  */
    Member,
    /** A numeric literal */
    Number,
    /**  */
    Parameter,
    /**  */
    ParameterList,
    /**  */
    ParameterListEnd,
    /**  */
    Paranthesis,
    /**  */
    RawText,
    /**  */
    ReservedWord,
    /**  */
    Semicolon,
    /** One or more whitespace characters */
    Whitespace,
}
