import Package from "./src/Package";
import FileUtil from "./src/util/FileUtil";

try {
    const startTime: number = Date.now();

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
