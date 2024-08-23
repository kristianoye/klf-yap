import Package from "./src/Package";

Package.define(__filename, newPackage => {
    newPackage
        .addCommand('klf-cp', './bin/CopyCommand')
        .addCommand('klf-rm', './bin/RemoveCommand');
});
