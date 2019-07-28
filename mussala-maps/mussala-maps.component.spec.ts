import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MussalaMapsComponent } from './mussala-maps.component';

describe('MussalaMapsComponent', () => {
  let component: MussalaMapsComponent;
  let fixture: ComponentFixture<MussalaMapsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MussalaMapsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MussalaMapsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
