import { Injectable } from '@angular/core';
import { SettingsService } from '../services/settings.service';
import { MarkerInfo, MarkerType } from './utils/islamic-marker';
import { Marker, Position } from 'nativescript-google-maps-sdk';
import { Image } from 'tns-core-modules/ui/image/image';
import { ImageSource } from 'tns-core-modules/image-source/image-source';
import { GPSInfo } from './utils/gps-info';
import { Sponsor } from '../about/sponsor';

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
        let sponsors: Sponsor[] = this._settings.sponsors;
        return sponsors.map<Marker>((sponsor: Sponsor) => {
            if (sponsor.id > 0 || sponsor.gps || sponsor.gps.latitude)
                return this.createMarker(sponsor.id, MarkerType.SPONSOR, sponsor.name, sponsor.description, sponsor.address, sponsor.gps);
        })
    }

    /**
     * Obtém a lista de Informações do Marcador (MakerInfo)
     *
     * Com base no arquivo "markers.json" retorna os marcadores cadastrados.
     * Futuramente será consultado também o webservices
     */
    getMarkersInfo(): MarkerInfo[] {

        let markersInfo = this._settings.getFile("markers.json");
        if (this.debug)
            console.log("MussalaSettings.getIslamicMarkerData ", markersInfo);
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

        return markersInfo;
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
    createMarker(id: number | MarkerInfo, type?: MarkerType, title?: string, snippet?: string, address?: string, gps?: GPSInfo): Marker {

        let marker = new Marker();
        if (typeof id == 'number') {
            marker.position = Position.positionFromLatLng(gps.latitude, gps.longitude);
            marker.title = title;
            marker.snippet = snippet;
            marker.userData = <MarkerInfo>{ id, title, address, gps };
            marker.infoWindowTemplate = this.getInfoTemplate(type);
            marker.icon = this.getMarkerIcon(type);
        } else {
            marker.position = Position.positionFromLatLng(id.gps.latitude, id.gps.longitude)
            marker.title = id.title;
            marker.snippet = id.description;
            marker.userData = id;
            marker.infoWindowTemplate = this.getInfoTemplate(id.type);
            marker.icon = this.getMarkerIcon(id.type);
        }
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
    getMarkerIcon(type: MarkerType): Image {
        let image: Image = new Image();
        switch (type) {
            case MarkerType.KAABA:
            case MarkerType.MOSQUE:
            case MarkerType.MUSSALA:
                let imageSource = new ImageSource();
                imageSource.fromFile('~/assets/images/mussala-maps/quipla.png');
                image.imageSource = imageSource;
                break;
            case MarkerType.MUSLIN:
            case MarkerType.SPONSOR:
            case MarkerType.POINTER:
            default:
                break;
        }
        return image;
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

        let markersInfo: MarkerInfo[] = this.getMarkersInfo();
        let markers: Marker[] = markersInfo.map((item: MarkerInfo) => {
            return this.createMarker(item);
        });
        markers.push(...this.sponsorMarkers);
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
}
