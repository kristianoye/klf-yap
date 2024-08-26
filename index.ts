import Package from "./src/Package";
import FileUtil, { IFileSystemQuery } from "./src/util/FileUtil";

try {
    FileUtil.fsq('./src/**/*.js', { contains: /Kristian/, minSize: 100 }, (err, file) => {
        if (err) console.log(`Error: ${err.stack}`);
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
