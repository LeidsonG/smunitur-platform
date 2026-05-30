/**
 * Rotas de autenticação (/api/auth)
 * --------------------------------------------------------------------------
 * - POST /login              → emite JWT (rate limit agressivo)
 * - GET  /me                 → perfil do usuário logado
 * - PUT  /me/foto            → atualiza foto de perfil (upload)
 * - PATCH /me/nome           → renomeia o próprio usuário
 * - PATCH /change-password   → troca a própria senha (invalida sessões anteriores)
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { env } from '../utils/env';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { upload, validarMagicBytes, processarImagens, apagarUpload } from '../middleware/upload';

const router = Router();

// Hash placeholder usado para evitar enumeração de usuários por timing.
// É um bcrypt válido — nunca corresponderá a nenhuma senha real.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Y0Y3wjLqUv0KQqGZbZQ8zVZ8VYRq';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('E-mail inválido').normalizeEmail(),
    body('senha').notEmpty().withMessage('Senha obrigatória'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, senha } = req.body;

    const admin = await prisma.usuarioAdmin.findUnique({
      where: { email },
      select: {
        id: true, nome: true, email: true, senha: true,
        nivel: true, foto: true, ativo: true, tokenVersion: true,
      },
    });

    // Roda bcrypt.compare incondicionalmente (mesmo com usuário inexistente)
    // para não vazar a existência de um e-mail pelo tempo de resposta.
    const hashAlvo = admin?.senha ?? DUMMY_HASH;
    const senhaValida = await bcrypt.compare(senha, hashAlvo);

    if (!admin || !admin.ativo || !senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, nivel: admin.nivel, tv: admin.tokenVersion },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    return res.json({
      token,
      admin: { id: admin.id, nome: admin.nome, email: admin.email, nivel: admin.nivel, foto: admin.foto ?? null },
    });
  }
);

// GET /api/auth/me — perfil do usuário logado
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const admin = await prisma.usuarioAdmin.findUnique({
    where: { id: req.admin!.id },
    select: { id: true, nome: true, email: true, nivel: true, foto: true, ativo: true, createdAt: true },
  });
  if (!admin || !admin.ativo) {
    return res.status(401).json({ error: 'Usuário inativo ou inexistente' });
  }
  return res.json({ admin });
});

// PUT /api/auth/me/foto — substitui foto de perfil e apaga a anterior
router.put(
  '/me/foto',
  authMiddleware,
  upload.single('foto'),
  validarMagicBytes,
  processarImagens,
  async (req: AuthRequest, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    const atual = await prisma.usuarioAdmin.findUnique({ where: { id: req.admin!.id }, select: { foto: true } });
    const foto = `/uploads/${req.file.filename}`;
    await prisma.usuarioAdmin.update({ where: { id: req.admin!.id }, data: { foto } });
    if (atual?.foto) await apagarUpload(atual.foto);
    return res.json({ foto });
  }
);

// PATCH /api/auth/me/nome — usuário renomeia a si próprio
router.patch(
  '/me/nome',
  authMiddleware,
  [body('nome').trim().notEmpty().withMessage('Nome obrigatório').isLength({ max: 100 })],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nome } = req.body;
    const atualizado = await prisma.usuarioAdmin.update({
      where: { id: req.admin!.id },
      data: { nome },
      select: { id: true, nome: true, email: true, nivel: true, foto: true },
    });
    return res.json({ admin: atualizado });
  }
);

// PATCH /api/auth/change-password — usuário troca a própria senha
// Incrementa `tokenVersion` para invalidar sessões abertas em outros lugares
// (o token que ele está usando agora também — front precisa relogar).
router.patch(
  '/change-password',
  authMiddleware,
  [
    body('senhaAtual').notEmpty().withMessage('Senha atual obrigatória'),
    body('novaSenha')
      .isLength({ min: 8 }).withMessage('Nova senha precisa ter ao menos 8 caracteres')
      .matches(/[A-Za-z]/).withMessage('Nova senha precisa conter letra')
      .matches(/[0-9]/).withMessage('Nova senha precisa conter número'),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { senhaAtual, novaSenha } = req.body;
    const admin = await prisma.usuarioAdmin.findUnique({ where: { id: req.admin!.id } });
    if (!admin) return res.status(404).json({ error: 'Usuário não encontrado' });

    const ok = await bcrypt.compare(senhaAtual, admin.senha);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

    if (senhaAtual === novaSenha) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da atual' });
    }

    const hash = await bcrypt.hash(novaSenha, env.BCRYPT_ROUNDS);
    await prisma.usuarioAdmin.update({
      where: { id: admin.id },
      data: { senha: hash, tokenVersion: { increment: 1 } },
    });

    return res.json({ message: 'Senha alterada com sucesso' });
  }
);

export default router;
