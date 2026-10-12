import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { env } from '../config/env.js';
import { usuarioRepository } from '../repositories/usuarioRepository.js';
import { ErrorApp } from '../middlewares/errores.js';

function firmar(usuario, productorId) {
  return jwt.sign({ sub: usuario.id, rol: usuario.rol, productorId }, env.jwtSecret, { expiresIn: env.jwtExpira });
}

function publico(u) {
  const { passwordHash, ...resto } = u;
  return resto;
}

export const authService = {
  async registrar(datos) {
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

    return { token: firmar(usuario, productor?.id ?? null), usuario: { ...publico(usuario), productor } };
  },

  async login({ email, password }) {
    const usuario = await usuarioRepository.buscarPorEmail(email);
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new ErrorApp(401, 'Correo o contraseña incorrectos');
    }
    return { token: firmar(usuario, usuario.productor?.id ?? null), usuario: publico(usuario) };
  },

  async yo(id) {
    const usuario = await usuarioRepository.buscarPorId(id);
    if (!usuario) throw new ErrorApp(404, 'Usuario no encontrado');
    return usuario;
  },
};
