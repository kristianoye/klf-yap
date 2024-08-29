"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FileSystem_1 = require("./src/fs/FileSystem");
try {
    const dfs = new FileSystem_1.DiskFileSystem({ bigint: true });
    dfs.lstat('src', { bigint: true, recursive: true, followLinks: true }, (err, file) => {
        console.log(file);
    });
    // const foo = dfs.lstatSync('src', { bigint: true, recursive: true });
    // FileUtil.fsq('./src/*.ts', { contains: /Kristian Oye/, minSize: '1Kb', followLinks: true, recursive: true }, (err, file) => {
    //     if (file) console.log(`File ${file.fullPath} matched`);
    // });
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