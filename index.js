"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileUtil_1 = __importDefault(require("./src/util/FileUtil"));
try {
    FileUtil_1.default.fsq('./src/*.ts', { contains: /Kristian Oye/, ignoreCase: true, minSize: '1Kb', followLinks: true, recursive: true }, (err, file) => {
        if (err)
            console.log(`Error: ${err}`);
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