/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Very simple ("dumb") XML reader
 */
'use strict';

import { IDocument, IDocumentReader, IReaderOptions } from "./DocTypes";

const nameRegex = /^([a-zA-Z_][\w\.\-]*)/;

export type XPathExpression = string;

export interface IXmlReaderOptions extends IReaderOptions {
    encoding?: BufferEncoding;
    validate?: boolean;
}

//#region Interfaces

export enum EntityType {
    Invalid = 0,
    AttributeList = 1,
    Element = 2,
    Entity = 3,
    Notation = 4
}

export enum NodeType {
    Invalid = 0,
    Attribute = 2,
    Comment = 8,
    DataSection = 4,
    Document = 9,
    DocumentFragment = 11,
    DocumentType = 10,
    Element = 1,
    Entity = 6,
    EntityReference = 5,
    Notation = 12,
    ProcessingInstruction = 7,
    Text = 3,
    CharacterData
}

export interface IXmlNode {
    attributes?: IXmlAttributeMap;
    children?: IXmlNodeList;
    depth?: number;
    firstChild?: IXmlNode | undefined;
    innerText?: string;
    lastChild?: IXmlNode | undefined;
    localName?: string;
    namespaceUri?: string;
    nextSibling?: IXmlNode | undefined;
    nodeType?: NodeType,
    name?: string;
    ownerDocument?: IXmlDocument;
    parent?: IXmlNode;
    prefix?: string;
    previousSibling?: IXmlNode;
    rawAttributes?: XmlAttributeRaw[],
    qualifiedName?: string;

    /**
     * Appends a new child node as the last child of this current node.
     * @param newChild The child being appended
     * @returns Returns a reference to the new child
     */
    appendChild(newChild: IXmlNode): IXmlNode;

    /** 
     * Get the XML representation of the node
     * @param indent Ident the children with whitespace; Defaults to false
     */
    getXml(indent: boolean): string;

    /**
     * Get the XML representation of the node
     * @param indent The number of spaces to indent the children; Defaults to 0
     */
    getXml(indent: number): string;

    /**
     * Get the XML representation of the node
     * @param indent The string to indent children with; Must be whitespace only; Defaults to ''
     */
    getXml(indent: string): string;

    /**
     * Get the XML representation of the node without any whitespace
     */
    getXml(indent: undefined): string;

    /**
     * Get the XML representation of the node without any whitespace
     */
    getXml(): string;

    /** Does this node have children? */
    hasChildren(): boolean;
}

export interface IXmlAttribute extends IXmlNode {
    value?: string;
}

export interface IXmlDocument extends IXmlNode, IDocument {
    docType?: IXmlDocumentType;

    /** The type of encoding used to represent the characters in this document */
    encoding: string;

    documentElement?: IXmlElement;

    /** The version of XML used to encode this document */
    version: string;
}

export interface IXmlDocumentType extends IXmlNode {
    entities: IXmlNamedNodeMap<IXmlEntityReference>;
}

export interface IXmlEntityReference extends IXmlNode {
}

export interface IXmlDtdNotion extends IXmlNode {
}

export interface IXmlElement extends IXmlNode {
    hasAttributes(): boolean;
}

export interface IXmlEntity extends IXmlNode {
    entityName: string;
    entityType: EntityType;
    entityValue: string;
}

export interface IXmlQName {
    prefix?: string;

    name: string;

    qualifiedName: string;

    localName: string;
}

export interface IXmlCharacterData extends IXmlNode {
    data: string;
}

export interface IXmlCDATA extends IXmlCharacterData { }

export interface IXmlTextNode extends IXmlCharacterData { }

export interface IXmlNodeList<TNodeType extends IXmlNode = IXmlNode> extends IterableIterator<TNodeType> {
    /** Clone the list */
    clone(): IXmlNodeList<TNodeType>;

    /** Get the iterator */
    first(): Iterator<TNodeType>;

    /** Get the item at the specified index */
    get(index: number): TNodeType | undefined;

    getMany(startIndex: number): TNodeType[];

    item(index: number): TNodeType | undefined;

    readonly length: number;

    resetIterator(): this;

    return(value?: any): IteratorResult<TNodeType, any>;

    throw(e?: any): IteratorResult<TNodeType, any>;
}

export interface IXmlNamedNodeMap<TNodeType extends IXmlNode = IXmlNode> extends IXmlNodeList<TNodeType> {
    get(index: number): TNodeType | undefined;
    get(name: string): TNodeType | undefined;
    item(index: number): TNodeType | undefined;
    item(name: string): TNodeType | undefined;
}

export interface IXmlAttributeMap<TAttType extends IXmlAttribute = IXmlAttribute> extends IXmlNamedNodeMap<TAttType> {
    get(index: number): TAttType | undefined;
    get(name: string, defaultValue?: string): TAttType | undefined;
    getValue(index: number, defaultValue?: string): string | undefined;
    getValue(name: string, defaultValue?: string): string | undefined;
    getXml(): string;
}

//#endregion

//#region Implementations

export class XmlNode implements IXmlNode {
    constructor(xml: Partial<XmlNode>, deep?: boolean) {
        Object.assign(this, xml);

        if (!this.nodeType)
            throw new Error('XmlNode requires node type');

        if (typeof deep === 'boolean') {
            this.children = xml.children && deep ? xml.children.clone() : undefined;
        }
        if (!this.qualifiedName) {
            this.qualifiedName = this.prefix ? `${this.prefix}:${this.localName}` : this.localName;
        }
        if (Array.isArray(xml.rawAttributes)) {
            const attributes = xml.rawAttributes.map(val => {
                return new XmlAttribute({
                    ...val as XmlAttribute,
                    parent: this,
                    ownerDocument: this instanceof XmlDocument ? this : this.parent?.ownerDocument,
                })
            });
            if (typeof this.attributes === 'object') {
                const allAttributes = [...this.attributes, ...attributes];
                this.attributes = new XmlAttributeMap(allAttributes);
            }
            else
                this.attributes = new XmlAttributeMap(attributes);
            delete this.rawAttributes;
        }
    }

    attributes?: XmlAttributeMap | undefined;
    children?: XmlNodeList<XmlNode> | undefined;
    depth?: number;

    /** Returns the node's first child or undefined if the element has no children */
    get firstChild(): IXmlNode | undefined {
        if (this.children && this.children.length)
            return this.children.get(0);
        return undefined;
    }

    innerText?: string | undefined;

    /** Return this node's last child or undefined if the element has no children */
    get lastChild(): IXmlNode | undefined {
        if (this.children && this.children.length)
            return this.children.get(this.children.length - 1);
        return undefined;
    }

    localName: string | undefined;
    namespaceUri?: string | undefined;
    nextSibling?: IXmlNode | undefined;
    nodeType?: NodeType | undefined;
    name?: string | undefined;
    ownerDocument?: IXmlDocument | undefined;
    parent?: IXmlNode | undefined;
    prefix?: string | undefined;
    previousSibling?: IXmlNode | undefined;
    rawAttributes?: XmlAttributeRaw[];
    qualifiedName?: string | undefined;

    appendChild(newChild: XmlNode): XmlNode {
        if (!this.children) {
            this.children = new XmlNodeList<XmlNode>([newChild]);
        }
        else {
            const newChildren = [...this.children, newChild];
            this.children = new XmlNodeList<XmlNode>(newChildren);
        }
        return newChild;
    }

    clone(deep: boolean = false): XmlNode {
        return new XmlNode(this, deep);
    }

    getXml(indent: boolean, depth: number): string;
    getXml(indent: number, depth: number): string;
    getXml(indent: string, depth: number): string;
    getXml(indent: undefined, depth: number): string;
    getXml(indent: undefined): string;
    getXml(): string;
    getXml(indent?: boolean | number | string | undefined, depth: number = 0): string {
        throw new Error(`Node type ${this.constructor.name} must implement getXML()`)
    }

    hasChildren(): boolean {
        return this.children ? this.children.length > 0 : false;
    }
}

export class XmlAttribute extends XmlNode implements IXmlAttribute {
    constructor(xml: Partial<XmlAttribute>) {
        super({ ...xml, nodeType: NodeType.Attribute });
        this.value = xml.value;
    }

    readonly value?: string | undefined;
}

export class XmlAttributeRaw implements Partial<IXmlAttribute> {
    value?: string | undefined;
    attributes?: IXmlAttributeMap<IXmlAttribute> | undefined;
    children?: IXmlNodeList<IXmlNode> | undefined;
    depth?: number | undefined;
    firstChild?: IXmlNode | undefined;
    innerText?: string | undefined;
    lastChild?: IXmlNode | undefined;
    localName?: string | undefined;
    namespaceUri?: string | undefined;
    nextSibling?: IXmlNode | undefined;
    nodeType?: NodeType | undefined;
    name?: string | undefined;
    ownerDocument?: IXmlDocument | undefined;
    parent?: IXmlNode | undefined;
    prefix?: string | undefined;
    previousSibling?: IXmlNode | undefined;
    rawAttributes?: XmlAttributeRaw[];
    qualifiedName?: string | undefined;
}

export class XmlNodeListIterator<TNodeType extends XmlNode> implements Iterator<TNodeType> {
    constructor(nodeList: XmlNodeList) {
        this._nodeList = nodeList;
        this._max = nodeList.length;
    }

    private _nodeList: XmlNodeList;

    private _index: number = 0;

    private _max: number;

    next(...args: [] | [undefined]): IteratorResult<TNodeType, any> {
        if (this._index < this._max) {
            return { value: this._nodeList.get(this._index++) as TNodeType, done: false };
        }
        else {
            return { value: this._nodeList.get(this._index) as TNodeType, done: true };
        }
    }

    reset() {
        this._index = 0;
    }

    return(value?: any): IteratorResult<TNodeType, any> {
        return { value, done: true };
    }

    throw(e?: any): IteratorResult<TNodeType, any> {
        return { value: undefined, done: true };
    }
}

export class XmlNodeList<TNode extends XmlNode = XmlNode> implements IXmlNodeList<TNode>, Iterator<TNode> {
    constructor(nodes: TNode[] = []) {
        this._nodes = nodes;
        this._iterator = new XmlNodeListIterator<TNode>(this);
    }

    protected _nodes: TNode[];

    protected _iterator: XmlNodeListIterator<TNode>;

    clone(): XmlNodeList<TNode> {
        const clones: TNode[] = this._nodes.map(n => n.clone() as TNode);
        return new XmlNodeList(clones);
    }

    first(): Iterator<TNode, TNode, undefined> {
        return this._iterator;
    }

    get(index: number): TNode | undefined {
        return this._nodes[index] || undefined;
    }

    getMany(startIndex: number): TNode[] {
        return this._nodes.slice(startIndex);
    }

    item(index: number): TNode | undefined {
        return this._nodes[index] as TNode || undefined;
    }

    get length(): number { return this._nodes.length }

    [Symbol.iterator](): IterableIterator<TNode> {
        return this._nodes[Symbol.iterator]();
    }

    next(...args: [] | [undefined]): IteratorResult<TNode, any> {
        return this._iterator.next(...args);
    }

    resetIterator(): this {
        this._iterator.reset();
        return this;
    }

    return(value?: any): IteratorResult<TNode, any> {
        return this._iterator.return(value);
    }

    throw(e?: any): IteratorResult<TNode, any> {
        return this._iterator.throw(e);
    }

}

export class XmlNamedNodeMap<TNode extends XmlNode> extends XmlNodeList<TNode> implements IXmlNamedNodeMap<TNode>, Iterable<TNode> {
    constructor(nodes: TNode[] = []) {
        super(nodes.filter(a => a instanceof XmlNode));

        for (const node of this._nodes) {
            if (node.name) {
                this._nodesByName.set(node.name, node);
                if (node.qualifiedName && node.qualifiedName !== node.name)
                    this._nodesByName.set(node.qualifiedName, node);
            }
        }
    }

    private _nodesByName: Map<string, XmlAttribute> = new Map<string, XmlAttribute>();

    entries() { return this._nodesByName.entries() }

    /** Overload allows lookup by name */
    get(index: number): TNode | undefined;
    get(name: string): TNode | undefined;
    get(nameOrIndex: number | string): TNode | undefined {
        if (typeof nameOrIndex === 'number')
            return super.get(nameOrIndex) as TNode;
        else if (typeof nameOrIndex === 'string')
            return this.getByName(nameOrIndex);
        else
            return undefined;
    }

    getByName(name: string): TNode | undefined {
        return this._nodesByName.get(name) as TNode || undefined;
    }

    getKeys() { return Object.keys(this._nodesByName) }

    item(index: number): TNode | undefined;
    item(name: string): TNode | undefined;
    item(nameOrIndex: number | string): TNode | undefined {
        if (typeof nameOrIndex === 'number')
            return super.get(nameOrIndex as number) as TNode;
        else
            return this.get(nameOrIndex as string);
    }
}

export class XmlAttributeMap extends XmlNamedNodeMap<XmlAttribute> implements IXmlAttributeMap<XmlAttribute> {
    constructor(attributes: XmlAttribute[] = []) {
        super(attributes.filter(a => a instanceof XmlAttribute));
    }

    getValue(index: number, defaultValue?: string): string | undefined;
    getValue(name: string, defaultValue?: string): string | undefined;
    getValue(nameOrIndex: string | number, defaultValue?: string): string | undefined {
        if (typeof nameOrIndex === 'string') {
            const att = this.getByName(nameOrIndex);
            return att ? att.value : defaultValue;
        }
        else if (typeof nameOrIndex === 'number') {
            const att = this.get(nameOrIndex);
            return att ? att.value : defaultValue;
        }
        else return undefined;
    }

    getXml(): string {
        const parts: string[] = [];
        for (const att of this._nodes) {
            if (att.value)
                parts.push(`${att.qualifiedName}="${att.value}"`)
            else if (att.qualifiedName)
                parts.push(att.qualifiedName);
        }
        return parts.join(' ');
    }

    item(index: number): XmlAttribute | undefined;
    item(name: string): XmlAttribute | undefined;
    item(nameOrIndex: number | string): XmlAttribute | undefined {
        if (typeof nameOrIndex === 'number')
            return super.get(nameOrIndex as number) as XmlAttribute;
        else
            return this.get(nameOrIndex as string);
    }
}

export class XmlCharacterData extends XmlNode implements IXmlCharacterData {
    constructor(xml: Partial<XmlCharacterData>) {
        super(xml);
        this.data = xml.data || '';
    }

    data: string;
}

export class XmlCDATA extends XmlNode implements IXmlCDATA {
    constructor(xml: Partial<XmlCDATA> = { data: '' }) {
        super(xml);
        this.data = xml.data || '';
    }

    data: string;
}

export class XmlComment extends XmlNode implements IXmlCharacterData {
    constructor(xml: Partial<XmlComment> = {}) {
        super({ ...xml, nodeType: NodeType.Comment });
        this.data = xml.data || '';
    }

    data: string;
}

export class XmlDocument extends XmlNode implements IXmlDocument {
    constructor(xml: Partial<XmlDocument> = {}, options: IXmlReaderOptions = { encoding: 'utf-8' }) {
        super({ ...xml, nodeType: NodeType.Document });
        this.docType = xml.docType
            && new XmlDocumentType({ ...xml.docType, ownerDocument: this, parent: this })
            || undefined;

        this.documentElement = xml.documentElement;
        const childNodes = xml.children ? [...xml.children] : [];
        if (xml.documentElement && childNodes.indexOf(xml.documentElement) === -1)
            childNodes.push(xml.documentElement)
        this.children = new XmlNodeList(childNodes);
        if (!this.documentElement) {
            this.documentElement = childNodes.find(n => n instanceof XmlElement);
        }
    }

    get encoding(): string {
        return this.attributes && this.attributes.getValue('encoding') || 'utf8'
    }

    readonly docType?: XmlDocumentType;

    readonly documentElement?: XmlElement = undefined;

    get version(): string {
        return this.attributes && this.attributes.getValue('version') || '1.0'
    }
}

export class XmlDocumentType extends XmlNode implements IXmlDocumentType {
    constructor(xml: Partial<XmlDocumentType> = {}) {
        super({ ...xml, nodeType: NodeType.DocumentType });
        this.entities = xml.entities || new XmlNamedNodeMap<XmlEntityReference>();
        this.rootElementName = xml.rootElementName || '';
    }

    readonly entities: XmlNamedNodeMap<XmlEntityReference>;

    readonly rootElementName: string;
}

export class XmlTextNode extends XmlNode implements IXmlTextNode {
    constructor(xml: Partial<XmlTextNode>) {
        super({ ...xml, nodeType: NodeType.Text });
        this.data = xml.data || '';
    }

    data: string;
}

export class XmlElement extends XmlNode implements IXmlElement {
    constructor(xml: Partial<XmlElement>) {
        super({ ...xml, nodeType: NodeType.Element });
        this.isClosed = xml.isClosed === true;
    }

    isClosed: boolean;
    textNodes?: (IXmlTextNode | IXmlCharacterData)[] | undefined;
    text?: string | undefined;

    getXml(indent: boolean, depth: number): string;
    getXml(indent: number, depth: number): string;
    getXml(indent: string, depth: number): string;
    getXml(indent: undefined, depth: number): string;
    getXml(indent: undefined): string;
    getXml(): string;
    getXml(indent?: boolean | number | string, depth: number = 0): string {
        const parts: string[] = [];
        const ind = indent && depth ? (
            indent === true && '  '.repeat(depth)
            || typeof indent === 'number' && ' '.repeat(depth)
            || typeof indent === 'string' && indent.repeat(depth)) : '';

        parts.push(`${ind}<${this.qualifiedName}`);
        if (this.attributes) {
            parts.push(` ${this.attributes.getXml()}`);
        }
        if (this.children) {
            parts.push(indent ? '>\n' : '>');
            for (const child of this.children) {
                if (typeof indent === 'undefined')
                    parts.push((child as XmlNode).getXml(undefined, depth + 1));
                else if (typeof indent === 'string')
                    parts.push((child as XmlNode).getXml(indent, depth + 1));
                else if (typeof indent === 'number')
                    parts.push((child as XmlNode).getXml(indent, depth + 1));
                else if (typeof indent === 'boolean')
                    parts.push((child as XmlNode).getXml(indent, depth + 1));
            }
        }
        else
            parts.join(indent ? ' />\n' : ' />');
        return parts.join('');
    }

    hasAttributes(): boolean { return typeof this.attributes === 'object' }

    hasParent(): boolean { return typeof this.parent === 'object' }

    toString() {
        const parts: string[] = ['<', this.qualifiedName || 'unknown'];
        if (this.attributes) {
            parts.push(...[...this.attributes].map(a => ` ${a.name}="${a.value}"`))
        }
        parts.push('/>');
        return parts.join('');
    }
}

export class XmlEntity extends XmlNode implements IXmlEntity {
    constructor(xml: Partial<XmlEntity> = {}) {
        super({ ...xml, nodeType: NodeType.Entity });
        if (!(this.entityName = xml.entityName || ''))
            throw new Error(`Invalid XmlEntity; Name cannot be zero length`);
        this.entityValue = xml.entityValue || '';
        if (!(this.entityType = xml.entityType || EntityType.Invalid))
            throw new Error(`Invalid XmlEntity; entityType property is required`);
    }

    readonly entityName: string;

    readonly entityType: EntityType;

    entityValue: string;
}

export class XmlEntityElement extends XmlEntity {
    constructor(xml: Partial<XmlEntityElement> = { entityType: EntityType.Element }) {
        super(xml);
        this.category = xml.category;
    }

    category?: XmlEntityElementCategory;
}

export class XmlEntityElementCategory {
    constructor(def: XmlEntityElementCategory) {
        this.elementName = def.elementName;
        this.maxOccurs = def.maxOccurs;
        this.minOccurs = def.minOccurs;
    }

    readonly elementName: string;
    readonly maxOccurs: number;
    readonly minOccurs: number;
}

export class XmlEntityElementCategoryPCDATA extends XmlEntityElementCategory {
    constructor(elementName: string) {
        super({ elementName, minOccurs: 1, maxOccurs: 1 });
    }
}

export class XmlEntityElementCompositeCategory extends XmlEntityElementCategory {
    constructor(xml: Partial<XmlEntityElementCompositeCategory> = { minOccurs: 0, maxOccurs: Number.MAX_SAFE_INTEGER, elementName: '' }) {
        super({ minOccurs: 0, maxOccurs: Number.MAX_SAFE_INTEGER, elementName: '', ...xml, });
        if (!xml.lhs) throw new Error(`Missing LHS of !ELEMENT composite category`);
        if (!xml.rhs) throw new Error(`Missing RHS of !ELEMENT composite category`);
        this.lhs = xml.lhs;
        this.rhs = xml.rhs;
    }

    readonly lhs: XmlEntityElementCategory;

    readonly rhs: XmlEntityElementCategory;
}

export class XmlEntityElementCategoryChildList extends XmlEntityElementCategory {
    constructor(elementName: string, expectedChildTypes: XmlEntityElementCategory[] = []) {
        super({ elementName, minOccurs: 0, maxOccurs: Number.MAX_SAFE_INTEGER });
        this.expectedChildTypes = expectedChildTypes;
    }

    readonly expectedChildTypes: XmlEntityElementCategory[];
}

export class XmlEntityReference extends XmlNode implements IXmlEntityReference {

}

export class XmlReader implements IDocumentReader {
    constructor(xml: string, options: Partial<IXmlReaderOptions> = {}) {
        this._xml = xml;
        this.xmlLen = xml.length;

        this._options = {
            encoding: options.encoding || 'utf-8',
            validate: typeof options.validate === 'boolean' ? options.validate : true
        };
    }

    private _document?: XmlDocument;

    private _options: IXmlReaderOptions;

    private _pos: number = 0;

    private _stack: XmlNode[] = [];

    readonly _xml: string;

    private readonly xmlLen: number;

    private char(consume = false): string | undefined {
        if (this._pos < this.xmlLen)
            return this._xml.charAt(consume ? this._pos++ : this._pos);
        return undefined;
    }

    private ifChar(c?: string | RegExp, consume: boolean = false): boolean | string {
        if (typeof c === 'undefined')
            return false;
        this.eatWhitespace();
        if (typeof c === 'object' && c instanceof RegExp) {
            const m = this.remainder.match(c);
            const result = m && m[0];
            if (!result) return false;
            else if (consume) this._pos += result.length;
            return result;
        }
        else if (this._xml.slice(this._pos, this._pos + c.length) === c) {
            if (consume) this._pos += c.length;
            return true;
        }
        return false;
    }

    private get current() { return this._stack[0]; }

    private eatWhitespace(): this {
        while (this._pos < this.xmlLen && /[\s]/.test(this._xml.charAt(this._pos))) this._pos++;
        return this;
    }

    private get remainder(): string {
        if (this._pos < this.xmlLen)
            return this._xml.slice(this._pos);
        else
            return '';
    }

    private readAttributes(): XmlAttributeRaw[] {
        const attributes: XmlAttributeRaw[] = [];

        while (true) {
            this.eatWhitespace();
            const id = this.readIdentifier();
            if (!id)
                break;
            const newAttr: XmlAttributeRaw = {
                ...id,
                qualifiedName: (id.prefix ? `${id.prefix}:${id.name}` : id.name)
            };
            this.eatWhitespace();

            if (this.ifChar('=')) {
                this._pos++;
                if (this.ifChar('"') || this.ifChar("'")) {
                    const endChar = this.char(true), s = this._pos;
                    while (!this.ifChar(endChar)) this._pos++;
                    let rawValue = this._xml.slice(s, this._pos++);
                    if (rawValue.indexOf('&')) {
                        const entities = [...rawValue.matchAll(/\&(?<name>lt|gt|amp|quot|apos|[^;]+);/g)];
                        if (entities.length > 0) {
                            for (const e of entities) {
                                switch (e.groups?.name) {
                                    case 'lt': rawValue = rawValue.replace(/\&lt;/ig, '<'); break;
                                    case 'gt': rawValue = rawValue.replace(/\&gt;/ig, '>'); break;
                                    case 'amp': rawValue = rawValue.replace(/\&amp;/ig, '&'); break;
                                    case 'quot': rawValue = rawValue.replace(/\&quot;/ig, '"'); break;
                                    case 'apos': rawValue = rawValue.replace(/\&quot;/ig, "'"); break;
                                    default: console.log(`Unexpanded entity: ${e.groups?.name}`)
                                }
                            }
                        }
                    }
                    newAttr.value = rawValue;
                }
                else {
                    const word = this.readName();
                    if (word) newAttr.value = word;
                    else newAttr.value = undefined;
                }
            }
            attributes.push(newAttr);
        }
        return attributes;
    }

    private readName(): string | undefined {
        this.eatWhitespace();
        const m = this.remainder.match(nameRegex);
        if (m) {
            this._pos += m[0].length;
            return m[0];
        }
        return undefined;
    }

    private readIdentifier(): IXmlQName | undefined {
        const idOrNamespace = this.readName();
        if (!idOrNamespace)
            return undefined;
        if (this.char() === ':') {
            const name = this.readName();
            if (!name)
                throw new Error(`Expected identifier at position ${this._pos}`);

            return { prefix: idOrNamespace, localName: name, name, qualifiedName: `${idOrNamespace}:$name}` } as IXmlQName;
        }
        return { name: idOrNamespace, localName: idOrNamespace, qualifiedName: idOrNamespace, } as IXmlQName;
    }

    private readElement(): XmlElement {
        this.eatWhitespace();
        if (!this.ifChar('<', true))
            throw new Error(`Unexpected character at ${this._pos}`);

        if (this.ifChar('/', true)) {
            const id = this.readIdentifier();
            if (!id)
                throw new Error(`Expected identifier at position ${this._pos}`);
            if (!this.ifChar('>', true))
                throw new Error(`Expected closing bracket of element ${id} at position ${this._pos}`);
            return new XmlElement({ ...id, isClosed: true } as Partial<XmlElement>);
        }
        else {
            const id = this.readIdentifier();
            if (!id)
                throw new Error(`Expected identifier at position ${this._pos}`);
            const attributes = this.readAttributes();
            this.eatWhitespace();
            const isClosed = this.ifChar('/>') ? true : false;
            const element: XmlElement = new XmlElement({
                ...id,
                depth: this._stack.length,
                isClosed,
                ownerDocument: this._document,
                parent: this.current || this._document,
                rawAttributes: attributes
            });
            if (!this.ifChar('>', true) && !this.ifChar('/>', true))
                throw new Error(`Expected end of element at position ${this._pos}`);
            return element
        }
    }

    private readDocumentNode(options: Partial<IXmlReaderOptions> = {}): XmlDocument {
        let documentNode: XmlDocument | undefined;

        if (this.ifChar('<?', true)) {
            //  Document node
            const rawAttributes = this.readAttributes();
            const docNode: Partial<IXmlDocument> = { rawAttributes };

            if (!this.ifChar('?>', true))
                throw new Error(`Could not find end of XML declaration (?>) at position ${this._pos}`);
            docNode.docType = this.readDocumentType();
            this._stack = [
                documentNode = new XmlDocument({ ...documentNode, ...docNode } as Partial<XmlDocument>, options)
            ];
        }
        else {
            this._stack = [
                documentNode = this._document = new XmlDocument({
                    rawAttributes: [
                        { name: 'encoding', value: this._options.encoding },
                        { name: 'version', value: '1.0' }
                    ],
                    documentElement: undefined,
                    docType: undefined
                })
            ];
        }

        if (!documentNode)
            throw new Error('Invalid XML document');

        let current: XmlNode | undefined = undefined;
        while ((current = this.readNode())) {
            if (current instanceof XmlElement) {
                this._stack = [
                    current,
                    documentNode = new XmlDocument({
                        ...documentNode,
                        documentElement: current
                    })
                ];
                return documentNode;
            }
        }
        if (!documentNode.documentElement)
            throw new Error('Could not find document root element');
        return documentNode
    }

    private readElementEntityCategoryElement(): XmlEntityElementCategory | undefined {
        let elementName = this.readName();
        if (elementName) {
            const suffix = this.ifChar(/^[\*\?\+]/, true) || '';
            const limit = { minOccurs: 1, maxOccurs: 1 };

            switch (suffix) {
                case '+':
                    limit.maxOccurs = Number.MAX_SAFE_INTEGER;
                    break;
                case '*':
                    limit.minOccurs = 0;
                    break;
                case '?':
                    limit.minOccurs = 0;
                    limit.maxOccurs = 1;
                    break;
            }
            return new XmlEntityElementCategory({ ...limit, elementName });
        }
        return undefined;
    }

    private readElementEntityCategory(elementName: string): XmlEntityElementCategory | undefined {
        let lhs: XmlEntityElementCategory | undefined = this.readElementEntityCategoryElement();

        if (this.ifChar('(', true)) {
            if (lhs) throw new Error(`Unexpectected character '(' at position ${(this._pos - 1)}`);
            lhs = this.readElementEntityCategory(elementName);
            if (!this.ifChar(')', true)) throw new Error(`Expected character ')' at position ${this._pos}, not ${this.char()}`);
            return lhs;
        }
        else if (this.ifChar('|', true)) {
            if (!lhs) throw new Error(`Unexpected token '|' at position ${this._pos}`);
            const rhs = this.readElementEntityCategory(elementName);
            if (!rhs) throw new Error(`Could not read RHS of union expression`);
            return new XmlEntityElementCompositeCategory({ elementName, lhs, rhs });
        }
        else if (this.ifChar(',', true)) {
            if (!lhs) throw new Error(`Unexpected token ',' at position ${this._pos}`);
            const categories: XmlEntityElementCategory[] = [lhs];
            while (this.ifChar(',', true)) {
                const category = this.readElementEntityCategory(elementName);
                if (category)
                    categories.push(category);
                else
                    throw new Error(`Unexpected character ${this.char()} at position ${this._pos}`);
            }
            return new XmlEntityElementCategoryChildList(elementName, categories);
        }
        else if (this.ifChar('#PCDATA', true)) {
            return new XmlEntityElementCategoryPCDATA(elementName);
        }
        return undefined;
    }

    private readElementEntity(): XmlEntityElement {
        //  Define an ELEMENT
        /** Element name */
        const elementName = this.readName(),
            categoryList = [];

        if (!elementName)
            throw new Error();

        /* Read the element category */
        if (this.ifChar('EMPTY', true)) {
            const limit = { minOccurs: 0, maxOccurs: 0 };
            return new XmlEntityElement({
                entityName: elementName,
                entityValue: '',
                category: new XmlEntityElementCategory({ elementName: '*', ...limit })
            });
        }
        else if (this.ifChar('ANY', true)) {
            const limit = { minOccurs: 0, maxOccurs: Number.MAX_SAFE_INTEGER };
            return new XmlEntityElement({
                entityName: elementName,
                entityValue: '',
                category: new XmlEntityElementCategory({ elementName: '*', ...limit })
            });
        }
        else if (this.ifChar('(', true)) {
            const category: XmlEntityElementCategory | undefined = this.readElementEntityCategory(elementName);
            const endPos = this.remainder.indexOf(')');
            if (endPos === -1)
                throw new Error(`Malformed !ELEMENT declaration at position ${this._pos}; Could not find end of declaration ')'`);

            if (!this.ifChar('>', true))
                throw new Error(`Malformed !ELEMENT declaration at position ${this._pos}; Could not find end of declaration '>'`);

            return new XmlEntityElement({ category, entityName: elementName, entityType: EntityType.Entity } as Partial<XmlEntityElement>);
        }
        else
            throw new Error(`Invalid !ENTITY declaration at position ${this._pos}`);
    }

    private readDocumentType(): XmlDocumentType | undefined {
        if (this.ifChar('<!DOCTYPE', true)) {
            const rootElementName = this.readName() || '';
            const entityArray: XmlEntity[] = [];

            if (this.ifChar('SYSTEM', true)) {
                const externalUri = this.readQuotedString();
                if (!externalUri)
                    throw new Error(`SYSTEM Url must not be zero length at position ${this._pos}`);

                if (externalUri) {
                    const schemaName = externalUri.match(/^([\w]+):/);
                    if (schemaName) {
                        switch (schemaName[0].toLowerCase()) {
                            case 'http':
                            case 'https':
                                break

                            case 'file':
                                break;

                            case 'ftp':
                                break;

                            default:
                                throw new Error(`The ${schemaName} schema is not supported by this library`);
                        }
                    }
                    else {
                        //  Local file
                    }
                }
                if (this.ifChar('[', true)) {
                    while (true) {
                        if (this.ifChar('<!ENTITY', true)) {
                        }
                        else if (this.ifChar('<!ELEMENT', true)) {
                            entityArray.push(this.readElementEntity());
                        }
                        else if (this.ifChar('<!ATTLIST', true)) {
                            /** element-name */
                            const nodeName = this.readName();
                            /** attribute-name */
                            const attributeName = this.readName();

                            if (this.ifChar('(', true)) {
                                //  Enumerated type
                            }
                            else if (this.ifChar('CDATA', true)) {

                            }
                            else if (this.ifChar('ID', true)) {

                            }
                            else if (this.ifChar('IDREFS', true)) {

                            }
                            else if (this.ifChar('IDREF', true)) {

                            }
                            else if (this.ifChar('NMTOKEN', true)) {

                            }
                            else if (this.ifChar('ENTITY', true)) {

                            }
                            else if (this.ifChar('ENTITIES', true)) {

                            }
                            else if (this.ifChar('NOTATION', true)) {

                            }
                            else if (this.ifChar('xml:')) {

                            }
                            else
                                throw new Error(`Unexpected character ${this.char()} at position ${this._pos} while reading !ATTLIST declaration`);
                        }
                        else if (this.ifChar('<!NOTATION', true)) {

                        }
                        else if (!this.ifChar(']', true))
                            throw new Error(`Unexpected charater ${this.char()} at position ${this._pos} while searching for end of DOCTYPE declaration list (']')`);
                        break;
                    }
                }
                if (!this.ifChar('>'))
                    throw new Error(`Unexpected charater ${this.char()} at position ${this._pos} while searching for end of DOCTYPE element ('>')`);
            }
            const entities: XmlNamedNodeMap<XmlEntityReference> = new XmlNamedNodeMap<XmlEntityReference>(entityArray);
            return new XmlDocumentType({ rootElementName, entities })
        }
        return undefined;
    }

    private readNode(): XmlNode | undefined {
        this.eatWhitespace();

        if (this._pos >= this.xmlLen)
            return undefined;
        else if (this._xml.charAt(this._pos) !== '<') {
            const textStart = this._pos;
            //  Assuming a text node
            while (this._xml.charAt(this._pos) !== '<') {
                this._pos++;
            }
            const data = this._xml.slice(textStart, this._pos);
            return new XmlTextNode({
                data,
                ownerDocument: this._document,
                parent: this.current
            });
        }
        else if (this.ifChar('<!--', true)) {
            //  Comment
            const endOfComment = this.remainder.indexOf('-->'),
                data = this.take(endOfComment);
            return new XmlComment({
                data,
                ownerDocument: this._document,
                parent: this.current
            })
        }
        else if (this.ifChar('<![CDATA[', true)) {
            if (false === this.current instanceof XmlElement)
                throw new Error(`Unexpected CDATA section ending at position ${this._pos}`);
            const endOfBlock = this.remainder.indexOf(']]>');
            if (endOfBlock === -1)
                throw new Error(`Unexpected end of CDATA starting at position ${this._pos}`);

            const data = this.remainder.slice(0, endOfBlock);

            this._pos = endOfBlock + 3;
            return new XmlCDATA({
                data,
                ownerDocument: this._document,
                parent: this.current
            });
        }
        else if (this.ifChar('<'))
            return this.readElement();
        else if (this._pos < this.xmlLen)
            throw new Error(`Unexpected character/token at position ${this._pos}: '${this.char()}'`);
        return undefined;
    }

    readDocumentSync(options: IXmlReaderOptions = {}): IXmlDocument {
        let current: XmlNode | undefined = undefined;

        this._document = this.readDocumentNode(options);

        while (current = this.readNode()) {
            const element = typeof current === 'object' && current instanceof XmlElement && current as XmlElement || undefined;
            const nonElement = typeof current === 'object' && false === current instanceof XmlElement && current instanceof XmlNode && current as XmlNode || undefined;

            if (element) {
                if (element.isClosed) {
                    if (this.current.qualifiedName === element.qualifiedName) {
                        //  This element is closed, pop it off the stack
                        this._stack.shift();
                    }
                    else {
                        //  Self-closed element
                        this.current.appendChild(element);
                    }
                }
                else
                    this._stack.unshift(this.current.appendChild(current));
            }
            else if (nonElement) {
                this.current.appendChild(nonElement);
            }
            else if (current.ownerDocument !== this._document)
                throw Error(`XmlReader: Parser created invalid XmlNode around position ${this._pos}; No document associated with node`);
        }
        return this._document as IXmlDocument;
    }

    readNext(criteria: XPathExpression): IXmlElement | undefined {
        return undefined;
    }

    private readQuotedString(): string {
        if (!this.ifChar('"'))
            throw new Error(`Expected character (") at position ${this._pos}`);
        const endPos = this.remainder.indexOf('"');
        if (endPos === -1)
            throw new Error(`Could not find end of string literal starting at position ${this._pos}`);
        const result = this.remainder.slice(0, endPos);
        return this._pos += endPos, result;
    }

    reset(): this {
        this._pos = 0;
        return this;
    }

    /**
     * Take the next n number of characters from the remainder of the document and update the position
     * @param n The number of characters to take
     */
    private take(n: number): string {
        if ((this._pos + n) > this.xmlLen)
            throw new Error(`XmlReader.take(${n}): There are only ${(this.xmlLen - this._pos)} character(s) left in the document`);
        const result = this.remainder.slice(0, n);
        this._pos += result.length;
        return result;
    }

    //#endregion
}