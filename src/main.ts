import { bootstrapApplication } from '@angular/platform-browser';
import { provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/core/auth.interceptor';
import { developmentSignIn } from './app/core/dev-sign-in';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideAppInitializer(developmentSignIn)],
}).catch((error: unknown) => console.error('Application bootstrap failed', error));
