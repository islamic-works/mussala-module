import { TestBed } from '@angular/core/testing';

import { MussalaSettingsService } from './mussala-settings.service';
import { CompassService } from './compass.service';

describe('CompassService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CompassService = TestBed.get(MussalaSettingsService);
    expect(service).toBeTruthy();
  });
});
