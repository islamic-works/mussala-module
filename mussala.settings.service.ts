import { Injectable } from '@angular/core';
import { SettingsService } from '../services/settings.service';
import { MarkerInfo, MarkerType } from './utils/islamic-marker';
import { Marker, Position } from 'nativescript-google-maps-sdk';
import { Image } from 'tns-core-modules/ui/image/image';
import { ImageSource } from 'tns-core-modules/image-source/image-source';

import * as geoLocation from "nativescript-geolocation";

import { GPSInfo } from '../entity/gps-info';
import { Sponsor } from '../entity/sponsor';
import { TeamMember } from '../entity/team-member';

@Injectable({
    providedIn: 'root'
})
export class MussalaSettingsService {

    constructor(
        protected _settings: SettingsService
    ) { }

    /**
     * informa se a depuração está ativa para o serviço de configuração do Mussala.
     */
    get debug(): boolean {
        return this._settings.debug;
    }

    /**
     * Retorna os marcadores dos patrocinadores do projeto
     *
     * Caso o marcador não tenha a informação do gps, não irá gerar o marcador
     */
    get sponsorMarkers(): Marker[] {
        if (this._settings.debug)
            console.log("MussalaSettingsService.sponsorMarkers");

        let sponsors: Sponsor[] = this._settings.sponsors;

        return sponsors.map<Marker>((sponsor: Sponsor) => {
            if (sponsor.gps || sponsor.gps.latitude)
                return this.createMarker(sponsor);
        })
    }
    get teamMarkers(): Marker[] {
        if (this._settings.debug)
            console.log("MussalaSettingsService.teamMarkers");

        let teamMember: TeamMember[] = this._settings.team;

        return teamMember.map<Marker>((member: TeamMember) => {
            if (member.gps && member.gps.latitude)
                return this.createMarker(member);
        })
    }

    /**
     * Obtém a lista de Informações do Marcador (MakerInfo)
     *
     * Com base no arquivo "markers.json" retorna os marcadores cadastrados.
     * Futuramente será consultado também o webservices
     */
    getMarkersInfo(): MarkerInfo[] {

        let markersInfo: MarkerInfo[] = this._settings.getFile("markers.json");
        if (this.debug) {
            console.log("MussalaSettings.getMarkersInfo ", markersInfo);

        }
        /*
{
"id": 0,
"name": "",
"description": "",
"type": 0,
"iman": "",
"contact": [
{
"type": "email",
"value": "",
"person": ""
},
{
"type": "whatsapp",
"value": "",
"person": ""
}
],
"gps": {
"latitude": 0,
"longitude": 0
},
"address": {
"full": "Endereço completo, ou detalhado em campos separados"
}
},
*/

        return markersInfo.filter((item: MarkerInfo) => item.id > 0);
    }

    /**
     * Ajusta o id o Marcador com base no seu tipo.
     *
     * O id original é somado ao típo multiplicado por 1000000000.
     * {(type * 1000000000) + id}
     */
    ajustMakerId(item: MarkerInfo): number {
        let id: number;

        if (item.type) id = (item.type * 100000000) + item.id;
        else id = item.id;

        return id;
    }

    /**
     * Crea um novo Marcador com base nas informações passadas ou no objeto MarkerInfo
     * @param {number|MarkerInfo} id Com base no ID informado ou no objeto MarkerInfo retorna um Maker, os demais parametros são necessários apenas caso seja informado id do tipo numérico.
     * @param {MarkerInfo} type tipo de marcador a ser criado, deve ser informado caso id seja do tipo numérico
     * @param {string} title título do marcador a ser crido, deve ser informado caso o id seja do tipo numérico
     */
    createMarker(id: number | MarkerInfo | Sponsor | TeamMember, type?: MarkerType, title?: string, snippet?: string, address?: string, gps?: GPSInfo): Marker {

        // if (this._settings.debug) console.log("MussalaSettingsServices.createMarker()");

        let marker: Marker = new Marker();
        let icon: Image|string;
        if (typeof id == 'number') {
            //if (this._settings.debug) console.log("MussalaSettingsServices.createMarker marker use individual data", id, type, title, snippet, address, gps)
            marker.position = Position.positionFromLatLng(gps.latitude, gps.longitude);
            marker.title = title;
            marker.snippet = snippet;
            marker.userData = <MarkerInfo>{ id, title, address, gps };
            marker.infoWindowTemplate = this.getInfoTemplate(type);

            icon = this.getMarkerIcon(type);
        } else if ((<TeamMember>id).role && (<TeamMember>id).gps && (<TeamMember>id).gps.latitude) {
            id = <TeamMember>id;
            marker.position = Position.positionFromLatLng(id.gps.latitude, id.gps.longitude)
            marker.title = id.name;
            marker.snippet = id.role;
            marker.userData = id;
            marker.infoWindowTemplate = this.getInfoTemplate(MarkerType.TEAM);
            icon = this.getMarkerIcon(id.photo);
        } else if ((<Sponsor>id).name && (<Sponsor>id).gps && (<Sponsor>id).gps.latitude) {
            id = <Sponsor>id;
            marker.position = Position.positionFromLatLng(id.gps.latitude, id.gps.longitude)
            marker.title = id.name;
            marker.snippet = id.description;
            marker.userData = id;
            marker.infoWindowTemplate = this.getInfoTemplate(MarkerType.SPONSOR);
            icon = this.getMarkerIcon(id.logo);
        }
        else {
            //if (this._settings.debug) console.log("MussalaSettingsServices.createMarker marker use MarkerInfo Object", id)
            id = <MarkerInfo>id;
            marker.position = Position.positionFromLatLng(id.gps.latitude, id.gps.longitude)
            marker.title = id.title;
            marker.snippet = id.description;
            marker.userData = id;
            marker.infoWindowTemplate = this.getInfoTemplate(id.type);
            icon = this.getMarkerIcon(id.type);
        }
        console.log(icon);
        if (icon != undefined) marker.icon = icon;
        return marker;
    }

    /**
     * Com base no tipo de Marker retorna o nome do template usado para exibir detalhes do marcador selecionado
     *
     * @param {MarkerType} type
     */
    getInfoTemplate(type: MarkerType): string {
        let template: string;

        switch (type) {
            case MarkerType.KAABA:
            case MarkerType.MOSQUE:
            case MarkerType.MUSSALA:
            case MarkerType.MUSLIN:
            case MarkerType.SPONSOR:
            case MarkerType.POINTER:
            default:
                template = 'IslamicMarkerTemplate';
                break;
        }

        return template;
    }

    /**
     * Com base no tipo do Marker retorna a imagem que será usada como Icone no Mapa.
     *
     * @param {MarkerType} type
     */
    getMarkerIcon <I extends Image|String>(type: MarkerType | string): I {
        let imageFile: string;
        switch (type) {
            case MarkerType.KAABA:
            case MarkerType.MOSQUE:
            case MarkerType.MUSSALA:
                imageFile = '~/assets/images/mussala-maps/quipla.png';
                break;
            case MarkerType.MUSLIN:
            case MarkerType.SPONSOR:
            case MarkerType.POINTER:
            default:
                    if (this._settings.debug)
                    console.log("MussalaSettingsService.getMakerIcon default");
                break;
        }

        let image: Image;
        let imageSource = new ImageSource();
        if (imageFile != undefined) {
            image = new Image();
            if (imageSource.loadFromFile(imageFile)) {
                image.imageSource = imageSource;
            } else console.error("MussalaSettingsSErvicegetMarkerIcon ImageSource not loaded.", imageFile);
        } else if (typeof type === 'string') {
            if (this._settings.debug)
                console.log("MussalaSettingsService.getMakerIcon base64", type);
// image = new Image();
            // problemas com nosso formato bese 64 verificar conversor
            // team usa url ou arquivo local
            // imageSource.loadFromBase64(type);
            // image.imageSource = imageSource;
        } else if (this._settings.debug)
            console.log("MussalaSettingsService.getMakerIcon Não tem icone personalizado!");

        //    if (this._settings.debug)
        //        console.log("MussalaSettingsService.getMakerIcon ", image);
        return <I>image;
    }

    /**
     * Retorna todas as marcações cadastrada no arquivo markers.json e sponsor.json e team.json
     *
     * Observe que team pode ter islâmicos e não islâmicos que ajudaram no desenvolvimento
     * do projeto, eles serão marcados
     *
     * Para os Muslins e relacionados perto, veja o serviço CompassService que terá
     * um observer que irá lançar eventos para novos Markers correspondentes.
     */
    get allMarkers(): Marker[] {
        if (this._settings.debug)
            console.log("MussalaSettingsService.allMarkers");

        let markersInfo: MarkerInfo[];
        let markers: Marker[];
        markersInfo = this.getMarkersInfo();
        if (this._settings.debug)
            console.log("MussalaSettingsService.allMarkers ", markersInfo);

        markers = markersInfo.map((item: MarkerInfo) => {
            return this.createMarker(item);
        });
        /*


    if (this._settings.debug)
        console.log("MussalaSettingsService.allMarkers ", markers);

        if (this._settings.debug) {
        console.log("MussalaSettingsService.allMarkers length ", markers.length);
    }
    */
        const sponsorMarkers: Marker[] = this.sponsorMarkers;
        if (this._settings.debug)
            console.log("MussalaSettingsService.allMarkers sponsor ", sponsorMarkers.length);

        markers.push(...sponsorMarkers);

        const teamMarkers: Marker[] = this.teamMarkers;
        if (this._settings.debug)
            console.log("MussalaSettingsService.allMarkers teamMarkers ", teamMarkers.length);

        markers.push(...teamMarkers);

        return markers;
    }

    /**
     * Com base nas informações de GPS informadas retorna a localização da Mussala mais próxima.
     *
     * Em nosso cadastro {markers.json} são cadastrados todos os tipos de marcações no mapa,
     * a busca é feito pelos tipos MarkerType.MOSQUE e retorna o que tem a distância meno geograficamente.
     *
     * @param {GPSInfo} gps
     */
    findGPSInfoNearMussala(gps: GPSInfo): GPSInfo {
        return <GPSInfo>{ latitude: -3.7214696, longitude: -38.5430259 }
    }

    getDistance(loc1: GPSInfo, loc2: GPSInfo) {
        console.log("Distance between loc1 and loc2 is: " + geoLocation
            .distance(
                <geoLocation.Location>{ altitude: loc1.elevation, latitude: loc1.latitude, longitude: loc1.longitude },
                <geoLocation.Location>{ altitude: loc2.elevation, latitude: loc2.latitude, longitude: loc2.longitude }));
    }
}