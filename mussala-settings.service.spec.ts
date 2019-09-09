import { TestBed } from '@angular/core/testing';

import { MussalaSettingsService } from './mussala-settings.service';

describe('SettingsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MussalaSettingsService = TestBed.get(MussalaSettingsService);
    expect(service).toBeTruthy();
  });
});
