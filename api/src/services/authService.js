import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { env } from '../config/env.js';
import { usuarioRepository } from '../repositories/userRepository.js';
import { ErrorApp } from '../middlewares/errors.js';
import { sesionService } from './sessionService.js';

function firmar(usuario, productorId) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol, productorId }, env.jwtSecret, { expiresIn: env.jwtExpira });
}

/** Respuesta de login/registro/refresh: token de acceso corto + refresh token + usuario */
async function sesionPara(usuario, productorId, dispositivo) {
  const { refreshToken } = await sesionService.crear(usuario.id, dispositivo);
  return { token: firmar(usuario, productorId), refreshToken };
}

function publico(u) {
  const { passwordHash, ...resto } = u;
  return resto;
}

export const authService = {
  async registrar(datos, dispositivo) {
    if (await usuarioRepository.buscarPorEmail(datos.email)) throw new ErrorApp(409, 'Ya existe una cuenta con ese correo');
    const passwordHash = await bcrypt.hash(datos.password, 10);

    const { usuario, productor } = await db.transaction(async (tx) => {
      const usuario = await usuarioRepository.crear({
        nombre: datos.nombre, email: datos.email, telefono: datos.telefono, passwordHash, rol: datos.rol,
      }, tx);
      let productor = null;
      if (datos.rol === 'PRODUCTOR') {
        productor = await usuarioRepository.crearProductor({
          usuarioId: usuario.id, nombreFinca: datos.nombreFinca, municipioId: datos.municipioId, descripcion: datos.descripcion,
        }, tx);
      }
      return { usuario, productor };
    });

    return { ...(await sesionPara(usuario, productor?.id ?? null, dispositivo)), usuario: { ...publico(usuario), productor } };
  },

  async login({ email, password }, dispositivo) {
    const usuario = await usuarioRepository.buscarPorEmail(email);
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new ErrorApp(401, 'Correo o contraseña incorrectos');
    }
    return { ...(await sesionPara(usuario, usuario.productor?.id ?? null, dispositivo)), usuario: publico(usuario) };
  },

  /** Cambia un refresh token por uno nuevo y un token de acceso con los datos actuales del usuario */
  async refrescar(refreshToken, dispositivo) {
    const { usuarioId, refreshToken: nuevo } = await sesionService.rotar(refreshToken, dispositivo);
    const usuario = await usuarioRepository.buscarPorId(usuarioId);
    if (!usuario) throw new ErrorApp(401, 'Sesión inválida');
    return { token: firmar(usuario, usuario.productor?.id ?? null), refreshToken: nuevo, usuario };
  },

  cerrarSesion: (refreshToken) => sesionService.revocar(refreshToken),

  async yo(id) {
    const usuario = await usuarioRepository.buscarPorId(id);
    if (!usuario) throw new ErrorApp(404, 'Usuario no encontrado');
    return usuario;
  },
};
