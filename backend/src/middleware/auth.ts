/**
 * Middleware de autenticação JWT + helper de RBAC.
 *
 * Token vem no header `Authorization: Bearer <jwt>` (gerado em /api/auth/login).
 *
 * Campos no payload do token:
 *   - id     : id do UsuarioAdmin
 *   - email  : email (cópia conveniente)
 *   - nivel  : 'super_admin' | 'admin' | 'operador'
 *   - tv     : tokenVersion — usado para invalidar tokens em massa quando
 *              um admin é desativado ou tem a senha alterada (ver
 *              `routes/admin.ts` e `routes/auth.ts`).
 *
 * `requireNivel(['super_admin'])` é o helper de autorização: retorna 403
 * se o nível do token não estiver na lista.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../utils/env';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
  admin?: { id: number; email: string; nivel: string; tv: number };
}

interface JwtPayload {
  id: number;
  email: string;
  nivel: string;
  tv?: number;
}

export function getJwtSecret(): string {
  return env.JWT_SECRET;
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // Confere se o token continua válido: o admin ainda existe, está ativo,
  // e a tokenVersion bate com a do banco (alteração de senha ou
  // desativação incrementam essa versão, invalidando tokens antigos).
  const admin = await prisma.usuarioAdmin.findUnique({
    where: { id: payload.id },
    select: { id: true, ativo: true, tokenVersion: true },
  });
  if (!admin || !admin.ativo) {
    return res.status(401).json({ error: 'Usuário inativo ou inexistente' });
  }
  if ((payload.tv ?? 0) !== admin.tokenVersion) {
    return res.status(401).json({ error: 'Sessão revogada — faça login novamente' });
  }

  req.admin = {
    id: payload.id,
    email: payload.email,
    nivel: payload.nivel,
    tv: payload.tv ?? 0,
  };
  return next();
}

export function requireNivel(niveis: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin || !niveis.includes(req.admin.nivel)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    return next();
  };
}
