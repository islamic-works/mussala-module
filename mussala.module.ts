import { NgModule, NO_ERRORS_SCHEMA, OnInit, OnDestroy } from '@angular/core';

import { ModalDialogService } from "nativescript-angular/modal-dialog";

import { MussalaRoutingModule } from './mussala-routing.module';
import { NativeScriptCommonModule } from 'nativescript-angular/common';

import { MussalaMapsComponent } from './mussala-maps/mussala-maps.component';

import { MenuModule } from '../menu/menu.module';
import { GetPhoneNumberComponent } from '../auth/get-phone-number/get-phone-number.component';
import { NativeScriptFormsModule } from 'nativescript-angular/forms';
@NgModule({
    declarations: [MussalaMapsComponent, GetPhoneNumberComponent],
    imports: [
        NativeScriptFormsModule,
        MussalaRoutingModule,
        NativeScriptCommonModule,
        MenuModule
    ],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
        ModalDialogService,
    ],
    entryComponents: [MussalaMapsComponent]
})
export class MussalaModule  {

    constructor() {
    }


}
