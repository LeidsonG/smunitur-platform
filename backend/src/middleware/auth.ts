import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  admin?: { id: number; email: string; nivel: string };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET não configurado corretamente (mínimo 16 caracteres).');
  }
  return secret;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      id: number; email: string; nivel: string;
    };
    req.admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function requireNivel(niveis: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin || !niveis.includes(req.admin.nivel)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    return next();
  };
}

export { getJwtSecret };
