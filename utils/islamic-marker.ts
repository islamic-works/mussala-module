import { Image } from "tns-core-modules/ui/image";
import { GPSInfo } from "../../entities/gps-info";

export interface MarkerInfo {
    description: string;
    title: string;
    id: number;
    address: string;
    type: MarkerType;
    gps: GPSInfo;
    photo: string;
}
export enum MarkerType {
    KAABA = 1,
    MOSQUE = 10,
    MUSSALA = 15,
    MUSLIN = 40,
    SPONSOR = 50,
    TEAM = 60,
    POINTER = 1000
}
