import { GPSInfo } from "./gps-info";

export interface MarkerInfo {
    description: string;
    title: string;
    id: number;
    address: string;
    type: MarkerType;
    gps: GPSInfo;

}
export enum MarkerType {
    KAABA = 1,
    MOSQUE = 10,
    MUSSALA = 15,
    MUSLIN = 40,
    SPONSOR = 50,
    POINTER = 1000
}
