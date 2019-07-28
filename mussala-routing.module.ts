import { NgModule } from '@angular/core';
import { Routes } from '@angular/router';
import { NativeScriptRouterModule } from 'nativescript-angular/router';
import { MussalaMapsComponent } from './mussala-maps/mussala-maps.component';

const routes: Routes = [{ path: "", component: MussalaMapsComponent }];

@NgModule({
    imports: [NativeScriptRouterModule.forChild(routes)],
    exports: [NativeScriptRouterModule]
})
export class MussalaRoutingModule { }
