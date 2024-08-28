"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileUtil_1 = __importDefault(require("./src/util/FileUtil"));
const FileSystem_1 = require("./src/fs/FileSystem");
try {
    const dfs = new FileSystem_1.DiskFileSystem({ bigint: true });
    const foo = dfs.lstatSync('src', { bigint: true, followLinks: true, recursive: true });
    FileUtil_1.default.fsq('./src/*.ts', { contains: /Kristian Oye/, minSize: '1Kb', followLinks: true, recursive: true }, (err, file) => {
        if (file)
            console.log(`File ${file.fullPath} matched`);
    });
}
catch (err) {
    console.log(err);
}
// Package.define(newPackage => {
//     newPackage
//         .addCommand('klf-cp', './bin/CopyCommand')
//         .addCommand('klf-rm', './bin/RemoveCommand');
// });
//# sourceMappingURL=index.js.map