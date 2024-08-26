import Package from "./src/Package";
import FileUtil from "./src/util/FileUtil";

try {
    FileUtil.fsq('./src/*.ts', { contains: /Kristian Oye/, ignoreCase: true, minSize: '1Kb', followLinks: true, recursive: true }, (err, file) => {
        if (err) console.log(`Error: ${err}`);
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
