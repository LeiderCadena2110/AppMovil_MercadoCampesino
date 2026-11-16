import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, input, output } from '@angular/core';
import * as L from 'leaflet';

export interface PuntoMapa {
  id: number | string;
  lat: number;
  lng: number;
  /** Texto corto del marcador (para lectores de pantalla y la etiqueta) */
  titulo: string;
  /** Marcador destacado (finca verificada o elegida) */
  destacado?: boolean;
}

/** Centro de Nariño (entre Pasto, Túquerres e Ipiales) */
const NARINO: L.LatLngTuple = [1.15, -77.45];

/**
 * Mapa con OpenStreetMap (Leaflet). Marcadores propios en forma de gota con la hoja de Minga,
 * sin imágenes externas. En modo oscuro los mosaicos se oscurecen con un filtro.
 * - `puntos`: marcadores; al tocar uno se emite `elegido` con su id.
 * - `marcable`: tocar el mapa emite `marcado` con la posición (para ubicar la finca).
 */
@Component({
  selector: 'app-mapa',
  template: `<div #lienzo class="lienzo" role="application" [attr.aria-label]="etiqueta()"></div>`,
  styles: `
    :host { display: block; position: relative; overflow: hidden; border-radius: inherit; }
    .lienzo { width: 100%; height: 100%; background: var(--mc-suelo); }
    :host ::ng-deep .leaflet-container { font: inherit; background: var(--mc-suelo); }
    :host ::ng-deep .mc-pin { width: 34px; height: 44px; }
    :host ::ng-deep .mc-pin svg { width: 34px; height: 44px; filter: drop-shadow(0 3px 4px rgb(0 0 0 / 0.3)); }
    :host ::ng-deep .mc-pin .gota { fill: var(--mc-accion); stroke: var(--mc-superficie); stroke-width: 2; }
    :host ::ng-deep .mc-pin.destacado .gota { fill: var(--mc-marca); }
    :host ::ng-deep .mc-pin.activo svg { transform: scale(1.25); transform-origin: 50% 100%; }
    :host ::ng-deep .mc-pin .hoja { fill: var(--mc-accion-texto); }
    :host ::ng-deep .leaflet-control-attribution { font-size: 10px; background: color-mix(in srgb, var(--mc-superficie) 88%, transparent); color: var(--mc-tinta); }
    :host ::ng-deep .leaflet-control-attribution a { color: color-mix(in srgb, var(--mc-accion) 75%, var(--mc-tinta)); }
    :host ::ng-deep .leaflet-bar a { background: var(--mc-superficie); color: var(--mc-tinta); border-color: var(--mc-borde); }
    @media (prefers-color-scheme: dark) {
      :host ::ng-deep .leaflet-tile-pane { filter: brightness(0.7) invert(1) contrast(0.9) hue-rotate(200deg) saturate(0.5) brightness(0.9); }
    }
  `,
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  puntos = input<PuntoMapa[]>([]);
  /** Punto que se resalta (y al que se centra el mapa) */
  activo = input<number | string | null>(null);
  centro = input<L.LatLngTuple | null>(null);
  zoom = input(9);
  marcable = input(false);
  /** El mapa queda quieto (para vistas pequeñas dentro de una página) */
  fijo = input(false);
  etiqueta = input('Mapa de fincas de Nariño');
  elegido = output<number | string>();
  marcado = output<{ lat: number; lng: number }>();

  @ViewChild('lienzo', { static: true }) private lienzo!: ElementRef<HTMLDivElement>;
  private mapa?: L.Map;
  private capa = L.layerGroup();
  private observador?: ResizeObserver;
  private movidoPorUsuario = false;

  constructor() {
    effect(() => this.dibujar(this.puntos(), this.activo()));
    effect(() => {
      const c = this.centro();
      if (c && this.mapa) this.mapa.setView(c, this.zoom());
    });
  }

  ngAfterViewInit() {
    const fijo = this.fijo();
    this.mapa = L.map(this.lienzo.nativeElement, {
      center: this.centro() ?? NARINO, zoom: this.zoom(), zoomControl: !fijo, attributionControl: true,
      dragging: !fijo, scrollWheelZoom: false, doubleClickZoom: !fijo, touchZoom: !fijo, boxZoom: false, keyboard: !fijo,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, minZoom: 7,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.mapa);
    this.mapa.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    this.capa.addTo(this.mapa);
    if (this.marcable()) this.mapa.on('click', (e: L.LeafletMouseEvent) => this.marcado.emit({ lat: e.latlng.lat, lng: e.latlng.lng }));
    this.dibujar(this.puntos(), this.activo());
    // El mapa se crea antes de que Ionic termine la animación de la página: se reajusta al cambiar de tamaño
    // y se vuelve a encuadrar mientras la persona no haya movido el mapa
    this.mapa.on('dragstart', () => (this.movidoPorUsuario = true));
    this.observador = new ResizeObserver(() => {
      this.mapa?.invalidateSize();
      if (!this.movidoPorUsuario) this.encuadrar(this.puntos(), this.activo());
    });
    this.observador.observe(this.lienzo.nativeElement);
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  private dibujar(puntos: PuntoMapa[], activo: number | string | null) {
    if (!this.mapa) return;
    this.capa.clearLayers();
    for (const p of puntos) {
      const clases = ['mc-pin', p.destacado ? 'destacado' : '', p.id === activo ? 'activo' : ''].join(' ');
      const icono = L.divIcon({
        className: clases, iconSize: [34, 44], iconAnchor: [17, 44],
        html: `<svg viewBox="0 0 34 44" aria-hidden="true"><path class="gota" d="M17 43C17 43 2 27 2 16.5A15 15 0 0 1 32 16.5C32 27 17 43 17 43z"/>
          <path class="hoja" d="M11 22c0-6 4-10 12-11-1 8-5 11-12 11z"/></svg>`,
      });
      const m = L.marker([p.lat, p.lng], { icon: icono, title: p.titulo, alt: p.titulo, keyboard: true, riseOnHover: true });
      m.on('click', () => this.elegido.emit(p.id));
      this.capa.addLayer(m);
    }
    this.encuadrar(puntos, activo);
  }

  /** Centra el mapa en el punto elegido, en el centro pedido o en todos los puntos */
  private encuadrar(puntos: PuntoMapa[], activo: number | string | null) {
    if (!this.mapa) return;
    const elegido = puntos.find((p) => p.id === activo);
    const c = this.centro();
    if (elegido) this.mapa.panTo([elegido.lat, elegido.lng]);
    else if (c) this.mapa.setView(c, this.zoom());
    else if (puntos.length > 1) this.mapa.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 11 });
    else if (puntos.length === 1) this.mapa.setView([puntos[0].lat, puntos[0].lng], 11);
  }
}
