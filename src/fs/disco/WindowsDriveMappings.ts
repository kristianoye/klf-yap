/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Module that tries to discover mounted drives on Windows platforms
 */

import { XmlReader } from "../../reader/XmlReader";
import IDriveMappings, { IMapperDiscoveryOptions, IMapperResult } from "./IDriveMappings";
import { execSync } from "child_process";
import path from "node:path";
import fs from "node:fs";

export default class WindowsDriveMappings implements IDriveMappings {
    discoverDriveMappings(options: IMapperDiscoveryOptions = { bigint: true }): IMapperResult[] {
        const results: IMapperResult[] = [];

        try {
            const computerName: string = process.env.COMPUTERNAME as string;
            const xml: string = execSync('wmic logicaldisk list /format:rawxml', { encoding: 'utf8' });
            const reader: XmlReader = new XmlReader(xml);
            const xmlDoc = reader.readDocumentSync();
        }
        catch (err) {
            console.log('Failed to parse disk information', err);
        };

        //  Do it the lame way
        for (let c = 65; c < 91; c++) {
            try {
                const driveLetter = `${String.fromCharCode(c)}:${path.sep}`
                const driveCheck = fs.statfsSync(driveLetter, options);
                if (driveCheck) {
                    results.push({
                        physicalMountPoint: driveLetter,
                        virtualMountPoint: driveLetter
                    } as IMapperResult)
                }
            }
            catch { };
        }
        return results;
    }
}