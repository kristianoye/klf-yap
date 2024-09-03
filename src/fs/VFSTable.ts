/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains information about known filesystems. 
 */
import fs from "node:fs";
import os from "os";
import WindowsDriveMappings from "./disco/WindowsDriveMappings";
import IDriveMappings from "./disco/IDriveMappings";
import EventEmitter from "events";

const fstab = {};

const buildLocalFSTable = () => {
    let mapper: IDriveMappings | undefined = undefined;

    switch (os.type()) {
        case 'Windows_NT':
            mapper = new WindowsDriveMappings();
            break;
    }
    if (mapper) {
        mapper.discoverDriveMappings({});
    }
};

class FileSystemTable extends EventEmitter {
    constructor() {
        super();
        buildLocalFSTable();
    }
}

const VFSTable: FileSystemTable = new FileSystemTable();

export default VFSTable;
