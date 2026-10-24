import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiCard } from '@zouriel/ui/card';
import { UiButton } from '@zouriel/ui/button';
import { UiFormField, UiInput, UiPasswordInput } from '@zouriel/ui/form';
import { LocalSignIn } from './dev-sign-in';

/** Sign-in screen for builds that use the API's local token issuer (dev and staging). */
@Component({
  selector: 'mm-login',
  standalone: true,
  imports: [FormsModule, UiCard, UiButton, UiFormField, UiInput, UiPasswordInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="login-page">
      <ui-card class="login-card" padding="lg" animate.enter="ui-scale-enter">
        <div class="brand login-brand"><span class="brand-mark">M</span><span><b>MALÉ MOVE</b><small>Mobility intelligence</small></span></div>
        <h1>Sign in</h1>
        <p class="muted">Planning workspace for authorized staff.</p>
        <form class="login-form" (ngSubmit)="submit()">
          <ui-form-field label="Username">
            <ui-input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" [(ngModel)]="username" [invalid]="!!error()" />
          </ui-form-field>
          <ui-form-field label="Password" [error]="error() || undefined">
            <ui-password-input name="password" [(ngModel)]="password" [invalid]="!!error()" />
          </ui-form-field>
          <ui-button type="submit" [loading]="busy()" [disabled]="!username || !password">Sign in</ui-button>
        </form>
        <ui-button class="login-back" variant="ghost" size="sm" (click)="cancel.emit()">← Back to route check</ui-button>
      </ui-card>
    </main>
  `,
})
export class LoginComponent {
  private readonly signIn = inject(LocalSignIn);
  readonly cancel = output<void>();
  username = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');

  async submit(): Promise<void> {
    if (!this.username || !this.password || this.busy()) return;
    this.busy.set(true); this.error.set('');
    // Phones capitalise the first letter and pasted values often carry spaces.
    const result = await this.signIn.signIn(this.username.trim().toLowerCase(), this.password.trim());
    this.busy.set(false);
    if (result === 'invalid') this.error.set('Incorrect username or password.');
    else if (result === 'unavailable') this.error.set('Sign-in is unavailable. Try again shortly.');
    else this.password = '';
  }
}
