import Package from "./src/Package";
import FileUtil from "./src/util/FileUtil";

try {
    FileUtil.fsqCallback('./src/**/*.js', files => {
        console.log(`Found ${files.length} matching files`);
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
