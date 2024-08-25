import Package from "./src/Package";
import FileUtil, { IFileSystemQuery } from "./src/util/FileUtil";

try {
    FileUtil.fsq('./src/**/*.js', <IFileSystemQuery<bigint>>{ bigint: true }, (err, file) => {
        console.log(`Found ${file} matching files`);
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
