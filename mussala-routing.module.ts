import { NgModule, OnInit } from '@angular/core';
import { Routes, ActivatedRoute } from '@angular/router';
import { NativeScriptRouterModule, RouterExtensions } from 'nativescript-angular/router';
import { MussalaMapsComponent } from './mussala-maps/mussala-maps.component';
import { GetPhoneNumberComponent } from '../auth/get-phone-number/get-phone-number.component';

const routes: Routes = [{
    path: "", component: MussalaMapsComponent,
    children: [
        {
            path: "get-phone-number", component: GetPhoneNumberComponent
        }
    ]
}];

@NgModule({
    imports: [NativeScriptRouterModule.forChild(routes)],
    exports: [NativeScriptRouterModule]
})
export class MussalaRoutingModule implements OnInit{
    constructor(
        private _routerExtensions: RouterExtensions,
        private _activeRoute: ActivatedRoute) {}

    ngOnInit(): void {
        this._routerExtensions.navigate(["get-pone-number"], { relativeTo: this._activeRoute });
    }
}
