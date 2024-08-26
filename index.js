"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileUtil_1 = __importDefault(require("./src/util/FileUtil"));
try {
    FileUtil_1.default.fsq('./src/**/*.js', { bigint: true, contains: /Kristian/i }, (err, file) => {
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
//# sourceMappingURL=index.js.map