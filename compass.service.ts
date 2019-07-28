import { Injectable, OnInit, OnDestroy } from "@angular/core";
import * as geoLocation from "nativescript-geolocation";
import { GPSConfig } from "./utils/gps-config";
import { GPSInfo } from "../entity/gps-info";
import { MussalaSettingsService } from "./mussala.settings.service";
import { BehaviorSubject, Observable } from "rxjs";

/**
 * for more information go to:
 * https://github.com/NativeScript/NativeScript/issues/5889#issuecomment-507413711
*/
@Injectable({
    providedIn: "root"
})
export class CompassService implements OnDestroy {
    private _gpsInfo: BehaviorSubject<GPSInfo> = new BehaviorSubject<GPSInfo>(<GPSInfo>{});
    _gpsInfo$: Observable<GPSInfo>;

    /**
     * Ao ser construído verifica se o serviço de geolocalização está ativo e liberado.
     *
     * Ao ser autorizado o serviço para a monitorar as atualizações da camera.
     *
     * @param _settings Serviço de configuração e parâmetros do módulo Mussala.
     */
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
                            this.startHeadingUpdates();
                        }, (e) => {
                            console.error("Error: " + (e.message || e));
                        });
                }
                else
                    this.startHeadingUpdates();
            }, (e) => {
                console.error("Error: " + (e.message || e));
            });

    }

    /**
     * Retorna um Observable que permite o cadastro de Observadores do GPS, assim novas coordenadas do aparelho telefônico são enviados aos Observadores.
     *
     */
    public get gpsInfo$(): Observable<GPSInfo> {
        if (!this._gpsInfo$)
            this._gpsInfo$ = this._gpsInfo.asObservable()
        return this._gpsInfo$;
    }

    /**
     * quando este serviço é destruído interrompe todo os monitoramentos do GPS.
     */
    ngOnDestroy() {
        if (this._settings.debug)
            console.log("CompassService.ngOnDestroy!");
        this._gpsInfo.complete();
        this.stopUpdatingHeading();
    }


    /**
     * com base nas configurações por GPSConfig ou ou GeoLocation.Options retorna um promise que resolve com as informações do GPS.
     *
     * Caso não seja informado nenhuma configuração usa o default <geoLocation.Options>{desiredAccuracy}
     *
     * @param {GPSConfig|geoLocation.Options} cfg
     * @return {Promise<GPSInfo>}
     */
    getMyLocation(cfg?: GPSConfig | geoLocation.Options): Promise<GPSInfo> {
        //return {
        //  latitude: -3.9242100850690402,
        //  longitude: -38.45365650951862
        //};

        return geoLocation.getCurrentLocation(<geoLocation.Options>{ ...{ desiredAccuracy: 1 }, ...cfg })
            .then((loc: geoLocation.Location) => {
              /*  if (this._settings.debug)
                    console.log("compassService.getMyLocation getCurrentLocation.then", loc);
*/
                return <GPSInfo>{ latitude: loc.latitude, longitude: loc.longitude, elevation: loc.altitude, direction: loc.direction }
            })
    }

    /**
     * Armazena o id do listener do serviço de GeoLocalização, caso não esteja cadastrado
     */
    private _watchId: number;

    /**
     * Inicia o serviço de GeoLocalização.
     *
     * Caso {this._watchId} já esteja definido, retorna sem executar nada.
     */
    startHeadingUpdates() {
        if (this._settings.debug) console.log("CompassService.startUpdatingHerading()");

        if (this._watchId) {
            if (this._settings.debug) console.log("CompassService.startUpdatingHerading() serviço já iniciado");
            return;
        }

        this._watchId = geoLocation.watchLocation(
            (loc) => {
                if (loc) {
                    // if (this._settings.debug) console.log("CompassService.startHeadingUpdates Received location: ", loc);
                    this._gpsInfo.next(<GPSInfo>loc);
                }
            },
            (e) => {
                console.error("Error: " + e.message);
            },
            { desiredAccuracy: 3, updateDistance: 10, minimumUpdateTime: 1000 * .3 });
            // Should update every 20 seconds according to Googe documentation. Not verified.
    }


    stopUpdatingHeading() {
        if (this._settings.debug) console.log("CompassService.stopUpdatingHerading()");

        if (this._watchId) {
            geoLocation.clearWatch(this._watchId);
        }
    }


}
