import * as app from "tns-core-modules/application";
import { Injectable, OnInit, OnDestroy } from "@angular/core";
import * as geoLocation from "nativescript-geolocation";
import { GPSConfig } from "./utils/gps-config";
import { GPSInfo } from "./utils/gps-info";
import { MussalaSettingsService } from "./mussala.settings.service";
import { MakerType, IslamicMarker } from "./utils/islamic-marker";
import { Marker, Position } from "nativescript-google-maps-sdk";
import { ImageSource } from "tns-core-modules/image-source/image-source";
import { Image } from "tns-core-modules/ui/image/image";
import { BehaviorSubject, Observable } from "rxjs";

declare const android: any;
declare const CLLocationManager: any;

/**
 * for more information go to:
 * https://github.com/NativeScript/NativeScript/issues/5889#issuecomment-507413711
*/
@Injectable({
    providedIn: "root"
})
export class CompassService implements OnDestroy {
    private _gpsInfo: BehaviorSubject<GPSInfo> =  new BehaviorSubject<GPSInfo>(<GPSInfo>{});
    _gpsInfo$: Observable<GPSInfo>;

    findNearMussala(arg0: GPSInfo): GPSInfo {
        return <GPSInfo>{ latitude: -3.7214696, longitude: -38.5430259 }
    }
    createIslamicMarker(id: number, type: MakerType, title: string, snippet: string, address: string, gpsInfo: GPSInfo): Marker {

        let marker = new Marker();
        marker.position = Position.positionFromLatLng(gpsInfo.latitude, gpsInfo.longitude);
        //        marker.position = <Position>userData.gpsInfo;
        marker.title = title;
        marker.snippet = snippet;
        marker.userData = <IslamicMarker>{ id, title, address, gpsInfo };
        marker.infoWindowTemplate = 'IslamicMarkerTemplate';

        let image: Image = new Image();
        switch (type) {
            case MakerType.MUSSALA:
            case MakerType.MOSQUE:
                let imageSource = new ImageSource();
                imageSource.fromFile('~/assets/images/mussala-maps/quipla.png');
                image.imageSource = imageSource;
                marker.icon = image;
                break;
            default:
                break;
        }
        return marker;
    }


    constructor(protected _settings: MussalaSettingsService) {
        if (_settings.debug) console.log("CompassService.new");
        geoLocation.isEnabled({ updateTime: 300 })
            .then((isEnabled) => {
                if (!isEnabled) {
                    if (_settings.debug)
                        console.log("CompassService.new GeoLocation not Enabled, Requesting!");
                    geoLocation.enableLocationRequest()
                        .then(() => {
                            console.log("CompassService.new geoLocation.isEnabled geoLocation.enableLocationRequest.then")
                        }, (e) => {
                            console.error("Error: " + (e.message || e));
                        });
                }
                this.startHeadingUpdates();
            }, (e) => {
                console.error("Error: " + (e.message || e));
            }); 

    }

    public get gpsInfo(): Observable<GPSInfo> {
        if (!this._gpsInfo$)
            this._gpsInfo$ = this._gpsInfo.asObservable()
        return this._gpsInfo$;
    }

    ngOnDestroy() {
        if (this._settings.debug)
            console.log("CompassService.ngOnDestroy!");
        this.stopUpdatingHeading();
        if(!this._gpsInfo$)
            this._gpsInfo$.
    }


    getMyLocation(cfg?: GPSConfig | geoLocation.Options): Promise<GPSInfo> {
        //return {
        //  latitude: -3.9242100850690402,
        //  longitude: -38.45365650951862
        //};

        return geoLocation.getCurrentLocation(<geoLocation.Options>{ ...{ desiredAccuracy: 1 }, ...cfg })
            .then((loc: geoLocation.Location) => {
                if (this._settings.debug)
                    console.log("compassService.getMyLocation getCurrentLocation.then", loc);

                return <GPSInfo>{ latitude: loc.latitude, longitude: loc.longitude, elevation: loc.altitude, direction: loc.direction }
            })
    }

    watchId;
    startHeadingUpdates() {
        if (this._settings.debug) console.log("CompassService.startUpdatingHerading()");

        if (this.watchId) {
            if (this._settings.debug) console.log("CompassService.startUpdatingHerading()");
            return;
        }

        if (this._settings.debug) console.log("CompassService.startUpdatingHerading()Android");
        this.watchId = geoLocation.watchLocation(
            (loc) => {
                if (loc) {
                    if (this._settings.debug) console.log("CompassService.startHeadingUpdates Received location: ", loc);
                    this._gpsInfo.next(<GPSInfo>loc);
                }
            },
            (e) => {
                console.error("Error: " + e.message);
            },
            { desiredAccuracy: 3, updateDistance: 10, minimumUpdateTime: 1000 * .3 }); // Should update every 20 seconds according to Googe documentation. Not verified.
    }


    stopUpdatingHeading() {
        if (this._settings.debug) console.log("CompassService.stopUpdatingHerading()");

        if (this.watchId) {
            geoLocation.clearWatch(this.watchId);
        }
    }

    getDistance(loc1, loc2) {
        console.log("Distance between loc1 and loc2 is: " + geoLocation.distance(loc1, loc2));
    }
}
