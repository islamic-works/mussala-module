import { Page } from 'tns-core-modules/ui/page/page';
import { registerElement } from 'nativescript-angular/element-registry';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, AfterViewInit } from '@angular/core';
import { MapView, Marker } from 'nativescript-google-maps-sdk';
import { CompassService } from '../compass.service';
import { MussalaSettingsService } from '../mussala.settings.service';
import { GPSConfig } from '../utils/gps-config';
import { GPSInfo } from '../../entity/gps-info';

import { Subscription } from 'rxjs';
registerElement(
    'Fab',
    () => require('@nstudio/nativescript-floatingactionbutton').Fab
);


// Important - must register MapView plugin in order to use in Angular templatew
registerElement("MapView", () => MapView);

@Component({
    selector: 'mussala-maps',
    templateUrl: './mussala-maps.component.html',
    styleUrls: ['./mussala-maps.component.scss'],
    moduleId: module.id,
})
export class MussalaMapsComponent implements OnInit, OnDestroy, AfterViewInit {

    @Output()
    isBusy: boolean = true;
    @Output()
    active: string;

    //@ViewChild("mapView", { "static": false })
    mapView: MapView & { infoWindowTemplates: string };

    _gpsInfoSubscription: Subscription;

    constructor(
        private _page: Page,
        private _settings: MussalaSettingsService,
        private _compass: CompassService) { }

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

    public goToMyLocation() {

        if (this._settings.debug)
            console.log("MussalaMapsComponent.goToMyLocation");

        this.unsubscribeGPSInfo();

        const cfg: GPSConfig = {};
        this._compass.getMyLocation(cfg)
            .then((gpsInfo: GPSInfo) => {
                if (this._settings.debug)
                    console.log("MussalaMapsComponent.goToMyLocation _compass.getMyLocation.then", gpsInfo);

                this.gpsInfo = gpsInfo;
                this.mapView.latitude = this.gpsInfo.latitude;
                this.mapView.longitude = this.gpsInfo.longitude;
                this.subscribeGPSInfo();
            });
    }

    findNearMussala() {
        if (this._settings.debug) console.log("MussalaMapsComponent.findNearMussala");

        this.unsubscribeGPSInfo();

        this.gpsInfo = this._settings.findGPSInfoNearMussala(<GPSInfo>{
            latitude: this.mapView.latitude,
            longitude: this.mapView.longitude
        });

        this.mapView.latitude = this.gpsInfo.latitude;
        this.mapView.longitude = this.gpsInfo.longitude;

    }

    changeMapType() {
        this.mapView.gMap.setMapType(2);
    }

    locationSelected(event) {
        if (this._settings.debug) {
            console.log("Location Selected: ");
            console.log(event);
        }
    }

    //Map events
    onMapReady(event) {
        if (this._settings.debug)
            console.log('MussalaMapsComponent.onMapReady()');

        this.mapView = event.object;

        this.mapView.settings.compassEnabled = true;
        this.mapView.settings.myLocationButtonEnabled = true;
        this.mapView.settings.zoomGesturesEnabled = true;
        this.mapView.settings.rotateGesturesEnabled = true;
        this.mapView.settings.scrollGesturesEnabled = true;
        this.mapView.settings.tiltGesturesEnabled = true;

        const template = this.createInfoWindowTemplate();
        this.mapView.infoWindowTemplates = template;

        if (this._settings.debug) {
            console.log("MussalaMapComponent.onMapReady: ########################################");
        }
        let allMarkers: Marker[];
        allMarkers = this._settings.allMarkers;
        if (this._settings.debug) {
            console.log("MussalaMapComponent.onMapReady: ", allMarkers);
        }
        this.mapView.addMarker(...allMarkers);

        if (this._settings.debug) {
            console.log("MussalaMapComponent.onMapReady: ########################################");
        }
        this.goToMyLocation();

        this.isBusy = false;

    }

    private subscribeGPSInfo() {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.subscribeGPSinfo()");

        if (this._gpsInfoSubscription && !this._gpsInfoSubscription.closed)
            this.unsubscribeGPSInfo();

        this._gpsInfoSubscription = this._compass.gpsInfo$.subscribe((gpsInfo) => {
            if (this._settings.debug)
                //            console.log("MussalaMapsComponent.ngAfterViewInit() _compass.gpsInfo.subscribe ", gpsInfo);
                console.log("MussalaMapsComponent.ngAfterViewInit() _compass.gpsInfo.subscribe ");
            this.gpsInfo = gpsInfo;
        }, (error) => {
            console.error("MussalaMapsComponent.ngAfterViewInit() _compass.gpsInfo.subscribe ", error);
        });
    }

    onCoordinateTapped(args) {
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.onCoordinateTapped()");
            console.log("Coordinate Tapped, Lat: " + args.position.latitude + ", Lon: " + args.position.longitude);
        }
    }

    onMarkerEvent(args) {
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.onMarkerEvent()");
            console.log("Marker Event: '" + args.eventName
                + "' triggered on: " + args.marker.title
                + ", Lat: " + args.marker.position.latitude + ", Lon: " + args.marker.position.longitude);
        }
    }

    onCameraChanged(args) {
/*        if (this._settings.debug) {
            console.log("MussalaMapsComponent.onCameraChanged()");
            console.log("Camera changed: " + JSON.stringify(args.camera), JSON.stringify(args.camera) === this.lastCamera);
        }
        this.lastCamera = JSON.stringify(args.camera);
    */  }

    onCameraMove(args) {
        // o objeto args tem uma estrutura muito complexa para ser convertido em string devido a chamadas recorrentes entre objetos. cuidado.
        /*
          if (this._settings.debug) {
              console.log("MussalaMapsComponent.onCameraMove()");
              console.log("Camera moving: " + JSON.stringify(args.camera));
          }
      */
    }

    onCameraMoveStarted(args) {
        // @TODO o valor que representa o motivo do inicio da movimentação vem na propriedade Camera, ainda não entendi porque e não descobri no plugin como mudar isso. ao tentar acessar o objeto como um todo devido a sua complexidade há um erro, é preciso depura-lo de uma forma mais leve para resolver tal problema.
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.onCameraMoveStarted()");
            console.log("Camera Started move: ", args.camera);
        }
        if (args.camera == CameraMoveReason.REASON_GESTURE) this.unsubscribeGPSInfo();
    }

    ngOnDestroy() {
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.ngOnDestroy()");
        }
        this.unsubscribeGPSInfo();
    }

    private unsubscribeGPSInfo() {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.unsubscribeGPSInfo()");
        if (this._gpsInfoSubscription && !this._gpsInfoSubscription.closed) {
            this._gpsInfoSubscription.unsubscribe();
            if (this._settings.debug)
                console.log("MussalaMapsComponent.unsubscribeGPSInfo() closed");
        }
    }
}

/**
 * https://developers.google.com/maps/documentation/android-sdk/events
 */
export enum CameraMoveReason {
    REASON_GESTURE = 1, // indicates that the camera moved in response to a user's gesture on the map, such as panning, tilting, pinching to zoom, or rotating the map.
    REASON_API_ANIMATION = 2, // indicates that the API has moved the camera in response to a non-gesture user action, such as tapping the zoom button, tapping the My Location button, or clicking a marker.
    REASON_DEVELOPER_ANIMATION = 3 // indicates that your app has initiated the camera movement.
}
