/*
 * KLF YAP
 * Written by Kristian Oye
 * Date: August 13, 2024
 * 
 * Contains information about known filesystems. 
 */

export interface IMapperDiscoveryOptions {
    /** Should discovered drives default to using bigint stats?  Defaults to false */
    bigint?: boolean;
}

/**
 * Contains the definition for a VFSTable entry
 */
export interface IMapperResult {
    options?: { [key: string]: any };

    physicalMountPoint: string;

    virtualMountPoint: string;
}

export default interface IDriveMappings {
    discoverDriveMappings(options: IMapperDiscoveryOptions): IMapperResult[];
}
