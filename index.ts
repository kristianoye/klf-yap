import fs from 'fs';
import Package from "./src/Package";
import FileUtil from "./src/util/FileUtil";
import { DiskFileSystem } from './src/fs/FileSystem';

try {
    const dfs: DiskFileSystem = new DiskFileSystem({ bigint: true });
    const foo = dfs.lstatSync('src', { bigint: true, followLinks: true, recursive: true });

    FileUtil.fsq('./src/*.ts', { contains: /Kristian Oye/, minSize: '1Kb', followLinks: true, recursive: true }, (err, file) => {
        if (file) console.log(`File ${file.fullPath} matched`);
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
