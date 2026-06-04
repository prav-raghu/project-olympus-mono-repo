import { Component } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { rocket, star } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Project Olympus</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Project Olympus</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="ion-padding">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="rocket" class="ion-margin-end"></ion-icon>
              Welcome
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Ionic Angular + Capacitor mobile app.</p>
            <ion-button expand="block" class="ion-margin-top">
              <ion-icon slot="start" name="star"></ion-icon>
              Get Started
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
})
export class HomePage {
  constructor() {
    addIcons({ rocket, star });
  }
}
