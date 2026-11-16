import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

type ReconocedorWeb = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
};
type VentanaConVoz = Window & { SpeechRecognition?: new () => ReconocedorWeb; webkitSpeechRecognition?: new () => ReconocedorWeb };

export class VozError extends Error {
  constructor(public motivo: 'sin-permiso' | 'no-disponible' | 'sin-voz' | 'otro', mensaje: string) {
    super(mensaje);
  }
}

/**
 * Convierte voz en texto con el reconocedor del propio teléfono (Google en Android),
 * en español de Colombia. En el navegador usa la Web Speech API si existe.
 * El audio no pasa por Minga App: a la API solo llega el texto.
 */
@Injectable({ providedIn: 'root' })
export class VozService {
  private web = (window as VentanaConVoz).SpeechRecognition ?? (window as VentanaConVoz).webkitSpeechRecognition;

  async disponible(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return !!this.web;
    try {
      return (await SpeechRecognition.available()).available;
    } catch {
      return false;
    }
  }

  /** Escucha una frase y devuelve el texto. Lanza VozError si no se pudo. */
  async escuchar(indicacion: string): Promise<string> {
    if (!Capacitor.isNativePlatform()) return this.escucharWeb();
    let permiso = (await SpeechRecognition.checkPermissions()).speechRecognition;
    if (permiso !== 'granted') permiso = (await SpeechRecognition.requestPermissions()).speechRecognition;
    if (permiso !== 'granted') throw new VozError('sin-permiso', 'Permite el micrófono en los ajustes del teléfono para dictar.');
    try {
      // popup: usa la ventana de Google, que muestra cuándo está escuchando
      const r = await SpeechRecognition.start({ language: 'es-CO', maxResults: 1, prompt: indicacion, popup: true, partialResults: false });
      const texto = r.matches?.[0]?.trim();
      if (!texto) throw new VozError('sin-voz', 'No te escuchamos. Intenta de nuevo, más cerca del teléfono.');
      return texto;
    } catch (e) {
      if (e instanceof VozError) throw e;
      throw new VozError('sin-voz', 'No te escuchamos. Intenta de nuevo, más cerca del teléfono.');
    }
  }

  private escucharWeb(): Promise<string> {
    if (!this.web) return Promise.reject(new VozError('no-disponible', 'Este navegador no permite dictar. Escribe los datos.'));
    return new Promise((resolver, rechazar) => {
      const rec = new this.web!();
      rec.lang = 'es-CO';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      let listo = false;
      rec.onresult = (e) => { listo = true; resolver(e.results[0][0].transcript.trim()); };
      rec.onerror = (e) => {
        listo = true;
        rechazar(new VozError(e.error === 'not-allowed' ? 'sin-permiso' : 'sin-voz',
          e.error === 'not-allowed' ? 'Permite el micrófono para dictar.' : 'No te escuchamos. Intenta de nuevo.'));
      };
      rec.onend = () => { if (!listo) rechazar(new VozError('sin-voz', 'No te escuchamos. Intenta de nuevo.')); };
      rec.start();
    });
  }
}
