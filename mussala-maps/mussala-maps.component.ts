import { Page } from 'tns-core-modules/ui/page/page';
import { registerElement } from 'nativescript-angular/element-registry';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, AfterViewInit, ViewContainerRef } from '@angular/core';

import { ModalDialogOptions, ModalDialogService } from "nativescript-angular/modal-dialog";

import { MapView, Marker, Position, Bounds } from 'nativescript-google-maps-sdk';
//import * as GoogleMapsUtils from "nativescript-google-maps-utils"

import { CompassService } from '../compass.service';
import { AuthService, PhoneOptions, FacebookOptions, GoogleOptions, LoginType } from '../../auth/services';
import { IslamicUser } from '../../auth/islamic-user';
import { MussalaSettingsService } from '../mussala.settings.service';

import { GPSConfig } from '../utils/gps-config';
import { GPSInfo } from '../../entities/gps-info';

import { Subscription } from 'rxjs';
import { GetPhoneNumberComponent, Modal } from '../../auth/get-phone-number';
import { MarkerInfo, MarkerType } from '../utils/islamic-marker';
import { PersistenceService } from '~/app/persistence/persistence.service';
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

    private _gpsInfoSubscription: Subscription;
    private _onLoginEvent: boolean;
    private _myMarker: Marker;

    isBusy: boolean = true;

    /**
     * Informa qual serviço está em uso no momento e assim muda o estatus do botão para que não seja clicado mais de uma vez,
     * funciona como um debounce;
     *
     * serviços previstos:
     * > find-mussala-near
     * > login
     * > my-location
     * > find-muslin-near
     */
    active: string;
    active_sub: string;

    msg: string = "Não Logado!";

    zoom = 17;
    minZoom = 0;
    maxZoom = 22;
    bearing = 0;
    tilt = 0;
    padding = [40, 40, 40, 40];

    //@ViewChild("mapView", { "static": false })
    mapView: MapView & { infoWindowTemplates: string };

    gpsInfo: GPSInfo = <GPSInfo>{ latitude: 0, longitude: 0 };

       constructor(
        private _page: Page,
        private _modalService: ModalDialogService,
        private _vcRef: ViewContainerRef,

        private _settings: MussalaSettingsService,
        private _auth: AuthService,
        private _compass: CompassService,
        private _persistence: PersistenceService) {
    }

    ngOnInit() {
        if (this._settings.debug)


            this._compass.getMyLocation({})
                .then((gpsInfo: GPSInfo) => {
                    return this.gpsInfo = gpsInfo
                });

        this.active = "mussala";
        this.active_sub = "";

        this._page.actionBarHidden = true;
    }

    ngAfterViewInit(): void {
        if (this._settings.debug)
                console.log("MussalaMapsComponent.ngAfterViewInit");
    }

    public async doLogin(type: string) {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.doLogin",type);

        if (this._onLoginEvent) return;

        try {
            this._auth.authorize('doLogin');
        } catch (ae) {
            console.log("MussalaMapsComponent.doLogin _auth.autorize",ae);
                        return;
        }

        if (this._settings.debug)
        console.log("MussalaMapsComponent.doLogin");

        this._onLoginEvent = true;
        this.isBusy = true;

        const lastActive = this.active_sub;
        this.active_sub = 'login';

        this.msg = "Logando! ";
        switch (type) {
            case 'phone':
                this.msg += "(Phone)";
                break;
            case 'facebook':
                this.msg += "(Facebook)";
                break;
            case 'google':
                this.msg += "(Google)";
                break;
            default:
                this.msg += "(Anonymous)";
                break;
        }

        let login: Promise<IslamicUser>;
        switch (type) {
            case 'facebook':
                login = this._auth.login(<FacebookOptions>{ type: LoginType.FACEBOOK });
                break;
            case 'google':
                login = this._auth.login(<GoogleOptions>{ type: LoginType.GOOGLE });
                break;
            case 'phone':
                login = this._doLoginPhone();
                break;
            default:
                login = this._auth.login();
                break;
        }

        login.then((user: IslamicUser) => {
            if (this._settings.debug)
                console.log("MussalaMapsComponent.doLogin ...login.then");

            this.msg = "Logado: ";
            this.msg += user.displayName ? user.displayName
                : user.phoneNumber ? user.phoneNumber
                    : user.email ? user.email
                        : user.uid;
            this.createUserMarker();
        }).catch((error: Error) => {
            if (this._settings.debug)
                console.log("",error);
        }).then(() => {
                this.active_sub = lastActive;
                this._onLoginEvent = false;
                this.isBusy = false;
        });
    }

    /**
     * Marcador do usuário, onde o celular se encontra.
     */
    private createUserMarker() {
        if (!this._myMarker) {

            let currentUser: IslamicUser = this._auth.islamicUser;
            if (!currentUser) {
                throw new Error("Nâo é possível criar um marcador sem que o usuário esteja logado")
            }

            this.goToMyLocation().then((gps:GPSInfo)=>{

            let markerInfo: MarkerInfo = <MarkerInfo>{
                title: currentUser.displayName,
                description: "Usuário Cadastrado",
                address: "",
                type: MarkerType.MUSLIN,
                photo: currentUser.photoURL,
                gps
            };
            this._myMarker = this._settings.createMarker(markerInfo);
            this._persistence.updateUserPosition(this._auth.islamicUser,gps);
            this.mapView.addMarker(this._myMarker);

        });
        }
    }

    private async _doLoginPhone(): Promise<IslamicUser> {
        const options: ModalDialogOptions = {
            viewContainerRef: this._vcRef,
            context: {},
            fullscreen: true
        };

        return await this._modalService
            .showModal(GetPhoneNumberComponent, options)
            .then((result: {
                type: Modal,
                email: string,
                fullName: string,
                phoneNumber: string,
                muslimName: string,
                alias: string,
                authorize: boolean
            }) => {
                if (this._settings.debug)
                console.log("MussalaMapsComponent._doLoginPhone _modalService.showModal.then",event);

                if (result == null) throw Error("Verifique o código algo deu errado, não pode ser nulo!");

                if (result.type === Modal.CANCELED) throw new Error("canceled");

                return this._auth.login(<PhoneOptions>{
                    type: LoginType.PHONE,
                    phoneNumber: result.phoneNumber,
                    verificationPrompt: "Informe o Código de Verificação"
                });
            });
    }

    private _createInfoWindowTemplate() {
        const templates = '\
        <template key="IslamicMarkerTemplate">\
            <StackLayout orientation="horizontal" verticalAlignment="center" margin="0 0 0 0" width="150" height="30" >\
                <StackLayout backgroundColor="black" verticalAlignment="center" width="50" height="30">\
                    <Image src="{{userData.photo}}"></Image>\
                 </StackLayout>\
                <Label text="{{title}}" verticalAlignment="center" paddingLeft="10" style="color:black;font-size:12;"></Label>\
            </StackLayout>\
        </template>';
        return templates;
    }


    public goToMyLocation(): Promise<GPSInfo> {

        if (this._settings.debug)
            console.log("MussalaMapsComponent.goToMyLocation");

        try{
            this._auth.authorize('goToMyLocation');

            this.unsubscribeGPSInfo();

            const cfg: GPSConfig = {};
            return this._compass.getMyLocation(cfg)
                .then((gpsInfo: GPSInfo) => {
                    if (this._settings.debug)
                        console.log("MussalaMapsComponent.goToMyLocation this._compass.getMyLocation",gpsInfo);

                    this.gpsInfo = gpsInfo;
                    this.mapView.latitude = this.gpsInfo.latitude;
                    this.mapView.longitude = this.gpsInfo.longitude;
                    this.subscribeGPSInfo();

                    return gpsInfo;
                });
        }catch (ae){
            return Promise.reject(ae);
        }
    }

    findNearMuslin() {
        if (this._settings.debug)
        console.log("MussalaMapsComponent.findNearMuslin");
        /*
         // busca os muçulmanos e patrocinadores mais próximos, mostra no mapa, fazendo uma redução do zoom se necessário para que seja exibido pelo menos um marcador, caso haja mais de 5 marcados reduz o zoom para exibir multiplos de 5 marcados.
         */
    }

    findNearMussala() {
        if (this._settings.debug)
        console.log("MussalaMapsComponent.findNearMussala");

        this.unsubscribeGPSInfo();

        this.gpsInfo = this._compass.findGPSInfoNearMussala(<GPSInfo>{
            latitude: this.mapView.latitude,
            longitude: this.mapView.longitude
        });

        this.mapView.latitude = this.gpsInfo.latitude;
        this.mapView.longitude = this.gpsInfo.longitude;

        /*
        // @TODO DEVE? consultar o usuário se tenta construir a rota entre o ponto atual do usuário e a mussala?
        // ou deixa o usuário faze-lo próprio maps do google?
        */
    }

    changeMapType() {
        this.mapView.gMap.setMapType(2);
    }

    locationSelected(event) {
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.locationSelected",event);
        }
    }

    //Map events
    onMapReady(event) {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.onMapReady",event);

        this.mapView = event.object;

        this.mapView.settings.compassEnabled = true;
        this.mapView.settings.myLocationButtonEnabled = true;
        this.mapView.settings.zoomGesturesEnabled = true;
        this.mapView.settings.rotateGesturesEnabled = true;
        this.mapView.settings.scrollGesturesEnabled = true;
        this.mapView.settings.tiltGesturesEnabled = true;

        const template = this._createInfoWindowTemplate();
        this.mapView.infoWindowTemplates = template;

        let allMarkers: Marker[];
        allMarkers = this._settings.allMarkers;

        this.mapView.addMarker(...allMarkers);

        var positionSet: Position[] = [ /* GoogleMaps.Position... */];
        var markerSet: Marker[] = [ /* GoogleMaps.Marker... */];
        this._createCluster(positionSet, markerSet);

        this.isBusy = false;

    }

    private _createCluster(positionSet: Position[], markerSet: Marker[]) {
        /*
            GoogleMapsUtils.setupHeatmap(this.mapView, positionSet);
            GoogleMapsUtils.setupMarkerCluster(this.mapView, markerSet,{});
        */
    }

    private subscribeGPSInfo() {
        if (this._settings.debug)
            console.log("MussalaMapsComponent.subscribeGPSinfo()");

            if (this._gpsInfoSubscription && !this._gpsInfoSubscription.closed)
                this.unsubscribeGPSInfo();

        this._gpsInfoSubscription = this._compass.gpsInfo$.subscribe((gpsInfo) => {
            if (this._settings.debug){
                console.log("MussalaMapsComponent.subscribeGPSinfo() _compass.gpsInfo.subscribe ", gpsInfo);
                //console.log("MussalaMapsComponent.subscribeGPSinfo() _compass.gpsInfo.subscribe.then ");
                }

            this.gpsInfo = gpsInfo;
            this.updateUserMarker(gpsInfo);
        }, (error) => {
            if (this._settings.debug)
                console.error("MussalaMapsCompoent.subscribeGPSinfo() _compass.gpsInfo.subscribe.error", error);
        });
    }

    /**
     * Atualiza a posição do Marcador do usuário
     *
     * @param gps {GPSInfo}
     */
    public updateUserMarker(gps: GPSInfo) {
        if (this._settings.debug)
                console.error("MussalaMapsCompoent.updateUserMarker()", gps);
        if(this._myMarker){
            if (this._settings.debug)
                console.error("MussalaMapsCompoent.updateUserMarker() with myMarker");
            this._myMarker.position = Position.positionFromLatLng(gps.latitude, gps.longitude);
            this._persistence.updateUserPosition(this._auth.islamicUser,gps);
        }
    }

    onCoordinateTapped(args) {
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.onCoordinateTapped()");
            console.log("Coordinate Tapped, Lat: " + args.position.latitude + ", Lon: " + args.position.longitude);
        }
    }

    onMarkerEvent(args) {
        if (this._settings.debug) {
            console.log("MussalaMapsComponent.onMarkerEvent() '" + args.eventName
                + "' triggered on: " + args.marker.title
                + ", Lat: " + args.marker.position.latitude + ", Lon: " + args.marker.position.longitude);
        }
    }


    /* *********************************** */
    /**
     * https://github.com/dapriett/nativescript-google-maps-sdk/issues/266
     *
     * @param args
     */
    onCameraChanged(args) {
        /*
        let mapView = args.object;
        let lastCamera;

        lastCamera = JSON.stringify(args.camera);
        let bounds = mapView.projection.visibleRegion.bounds;
        console.log("Current bounds: " + JSON.stringify({
            southwest: [bounds.southwest.latitude, bounds.southwest.longitude],
            northeast: [bounds.northeast.latitude, bounds.northeast.longitude]
        }));
        let marker = new Marker();
        let center = this.getMapsCenter(bounds); // HERE it will give you lat and lng of the current center
        marker.position = Position.positionFromLatLng(center.lat, center.lng);
        marker.color = "yellow";
        mapView.addMarker(marker);
        */
    }
    private getMapsCenter(bounds: Bounds) {
        let lat1 = bounds.southwest.latitude;
        let lon1 = bounds.southwest.longitude;
        let lat2 = bounds.northeast.latitude;
        let lon2 = bounds.northeast.longitude;
        var φ1 = this.toRadians(lat1);
        var λ1 = this.toRadians(lon1);
        var φ2 = this.toRadians(lat2);
        var λ2 = this.toRadians(lon2);
        var Bx = Math.cos(φ2) * Math.cos(λ2 - λ1);
        var By = Math.cos(φ2) * Math.sin(λ2 - λ1);
        var x = Math.sqrt((Math.cos(φ1) + Bx) * (Math.cos(φ1) + Bx) + By * By);
        var y = Math.sin(φ1) + Math.sin(φ2);
        var φ3 = Math.atan2(y, x);

        var λ3 = λ1 + Math.atan2(By, Math.cos(φ1) + Bx);

        let lat = this.toDegrees(φ3);
        let lng = (this.toDegrees(λ3) + 540) % 360 - 180;



        return {
            lat: lat,
            lng: lng
        };
    }
    private toRadians(degrees: number) {
        return degrees * Math.PI / 180;
    }

    private toDegrees(radians: number) {
        return radians * 180 / Math.PI;
    }

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
