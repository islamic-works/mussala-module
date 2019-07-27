import { Page } from 'tns-core-modules/ui/page/page';
import { registerElement } from 'nativescript-angular/element-registry';
import { Component, OnInit, ViewChild, ElementRef, Output, AfterViewInit } from '@angular/core';
import { MapView, Marker, Position, Polygon, Polyline } from 'nativescript-google-maps-sdk';
import * as platform from 'tns-core-modules/platform'
import { CompassService } from '../compas.service';
import { MussalaSettingsService } from '../mussala.settings.service';
import { GPSConfig } from '../utils/gps-config';
import { GPSInfo } from '../utils/gps-info';
import { MakerType, IslamicMarker } from '../utils/islamic-marker';

import * as http from "http";
import * as geolocation from "nativescript-geolocation";
import { Accuracy } from "tns-core-modules/ui/enums";
import { Subscription } from 'rxjs';

// Important - must register MapView plugin in order to use in Angular templates
registerElement("MapView", () => MapView);

@Component({
    selector: 'mussala-maps',
    templateUrl: './mussala-maps.component.html',
    styleUrls: ['./mussala-maps.component.scss'],
    moduleId: module.id,
})
export class MussalaMapsComponent implements OnInit, AfterViewInit {
    isBusy: boolean = true;
    active: string;

    @ViewChild("MapView", { "static": false }) mapView: MapView & { infoWindowTemplates: string };
    _gpsInfoSubscription: Subscription;

    constructor(
        private _page: Page,
        private _settings: MussalaSettingsService,
        private _compass: CompassService) { }

    //{ "lat":   -3.924263          , "lng":     -38.453483, "elv": 16 }
    //           -3.9242016         ,            -38.4558762
    //"latitude":-3.9242100850690402,"longitude":-38.45365650951862,"zoom":18.409713745117188

    gpsInfo: GPSInfo = <GPSInfo>{ latitude: 0, longitude: 0 };
    zoom = 17;
    minZoom = 0;
    maxZoom = 22;
    bearing = 0;
    tilt = 0;
    padding = [40, 40, 40, 40];

    lastCamera: String;

    ngOnInit() {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.ngOnInit()");

        this._compass.getMyLocation({})
            .then((gpsInfo: GPSInfo) => {
                if (this._settings.debug)

                    return this.gpsInfo = gpsInfo
            });

        this.active = "mussala";
        this._page.actionBarHidden = true;


    }

    ngAfterViewInit(): void {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.ngAfterViewInit()");
    }

    private createInfoWindowTemplate() {
        const templates = '\
        <template key="IslamicMarkerTemplate">\
            <StackLayout orientation="horizontal" verticalAlignment="center" margin="0 0 0 0" width="150" height="30" >\
                <StackLayout backgroundColor="black" verticalAlignment="center" width="50" height="30">\
                    <Label text="{{userData.index}}" textAlignment="center" textWrap="true" style="color:white;font-size:12;"></Label>\
                </StackLayout>\
                <Label text="{{title}}" verticalAlignment="center" paddingLeft="10" style="color:black;font-size:15;"></Label>\
            </StackLayout>\
        </template>';
        return templates;
    }

    goToMyLocation() {

        if (this._settings.debug)
            console.log("MussalaMapsComponent.goToMyLocation");

        const cfg: GPSConfig = {};
        this._compass.getMyLocation(cfg)
            .then((gpsInfo: GPSInfo) => {
                if (this._settings.debug)
                    console.log("MussalaMapsComponent.goToMyLocation _compass.getMyLocation.then", gpsInfo);

                this.gpsInfo = gpsInfo;
                this.mapView.latitude = this.gpsInfo.latitude;
                this.mapView.longitude = this.gpsInfo.longitude;
            });

        this.subscribeGPSInfo();
    }

    findNearMussala() {
        if (this._settings.debug) console.log("MussalaMapsComponent.findNearMussala");

        this.unsubscribeGPSInfo();

        this.gpsInfo = this._compass.findNearMussala(<GPSInfo>{
            latitude: this.mapView.latitude,
            longitude: this.mapView.longitude
        })
        this.mapView.latitude = this.gpsInfo.latitude;
        this.mapView.longitude = this.gpsInfo.longitude;

    }

    changeMapType() {
        this.mapView.gMap.setMapType(2);
    }
    locationSelected(event) {
        console.log("Location Selected: ", event);
    }
    //Map events
    onMapReady(event) {
        console.log('Map Ready');

        this.mapView = event.object;

        this.mapView.settings.compassEnabled = true;
        this.mapView.settings.myLocationButtonEnabled = true;
        this.mapView.settings.zoomGesturesEnabled = true;
        this.mapView.settings.rotateGesturesEnabled = true;
        this.mapView.settings.scrollGesturesEnabled = true;
        this.mapView.settings.tiltGesturesEnabled = true;

        const template = this.createInfoWindowTemplate();
        this.mapView.infoWindowTemplates = template;

        let marker: Marker = this._compass.createIslamicMarker(
            1,
            MakerType.MUSSALA,
            "Mussala Fortaleza",
            "Fortaleza, Ce, Brasil",
            "Rua São Paulo, 1831 - Jacarecanga, Fortaleza - CE, 60310-226",
            //-3.7214696,-38.5430259
            <GPSInfo>{ latitude: -3.7214696, longitude: -38.5430259 }
        );
        this.mapView.addMarker(marker);

        marker = this._compass.createIslamicMarker(
            2,
            MakerType.SPONSOR,
            "Curso Arduino Minas",
            "Aquiraz, Ce, Brasil",
            "R. José Alves Pereira, S/N, Aquiraz, CE, Brasil",
            {
                latitude: -3.9242100850690402,
                longitude: -38.45365650951862
            }
        );

        this.mapView.addMarker(marker);

        this.goToMyLocation();
        this.subscribeGPSInfo();

        this.isBusy = false;

    }

    private subscribeGPSInfo() {
        this._gpsInfoSubscription = this._compass.gpsInfo.subscribe((gpsInfo) => {
            if (this._settings.debug)
                console.log("MussalaMapsComponent.ngAfterViewInit() _compass.gpsInfo.subscribe ", gpsInfo);
            this.gpsInfo = gpsInfo;
        }, (error) => {
            console.error("MussalaMapsComponent.ngAfterViewInit() _compass.gpsInfo.subscribe ", error);
        });
    }

    onCoordinateTapped(args) {
        console.log("Coordinate Tapped, Lat: " + args.position.latitude + ", Lon: " + args.position.longitude, args);
    }

    onMarkerEvent(args) {
        console.log("Marker Event: '" + args.eventName
            + "' triggered on: " + args.marker.title
            + ", Lat: " + args.marker.position.latitude + ", Lon: " + args.marker.position.longitude, args);
    }

    onCameraChanged(args) {
        if (this._settings.debug) console.log("Camera changed: " + JSON.stringify(args.camera), JSON.stringify(args.camera) === this.lastCamera);
        this.lastCamera = JSON.stringify(args.camera);
    }

    onCameraMove(args) {
        if (this._settings.debug)
            console.log("Camera moving: " + JSON.stringify(args.camera));
        this.unsubscribeGPSInfo();
    }



    private unsubscribeGPSInfo() {
        if (this._gpsInfoSubscription && this._gpsInfoSubscription.closed) {
            if (this._settings.debug)
                console.log("MussalaMapsComponent.unsubscribeGPSInfo() closed");
            this._gpsInfoSubscription.unsubscribe();
        }
    }
}
