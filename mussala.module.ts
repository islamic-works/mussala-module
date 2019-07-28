import { NgModule, NO_ERRORS_SCHEMA, OnInit, OnDestroy } from '@angular/core';

import { MussalaRoutingModule } from './mussala-routing.module';
import { NativeScriptCommonModule } from 'nativescript-angular/common';
import { CompassService } from './compass.service';
import { MussalaMapsComponent } from './mussala-maps/mussala-maps.component';
import { MussalaSettingsService } from './mussala.settings.service';
import { MenuModule } from '../menu/menu.module';
@NgModule({
    declarations: [MussalaMapsComponent],
    imports: [
        MussalaRoutingModule,
        NativeScriptCommonModule,
        MenuModule
    ],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [],
    entryComponents: [MussalaMapsComponent]
})
export class MussalaModule  {

    constructor(
        private _settings: MussalaSettingsService,
        private _compass: CompassService
    ) {
    }


}
