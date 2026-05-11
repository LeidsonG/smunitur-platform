import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

// Filtro inicial: rejeita pelo mimetype declarado (defesa rasa)
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WebP, GIF)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});

/**
 * Lê os primeiros bytes do arquivo e confere a assinatura ("magic bytes")
 * contra os formatos aceitos. Bloqueia arquivos disfarçados (ex.: .exe com
 * mimetype `image/jpeg`) que o filtro do multer não pegaria.
 *
 * Assinaturas:
 *  - JPEG:  FF D8 FF
 *  - PNG:   89 50 4E 47 0D 0A 1A 0A
 *  - GIF:   "GIF87a" ou "GIF89a"
 *  - WebP:  RIFF....WEBP
 */
function magicMatchesImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;

  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  // PNG
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;

  // GIF87a / GIF89a
  const gifHeader = buf.slice(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return true;

  // WebP: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP"
  if (
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) return true;

  return false;
}

/**
 * Middleware Express que valida o(s) arquivo(s) recém-enviados via multer.
 * Se algum não passar na validação por magic bytes, deleta do disco e retorna 400.
 * Use APÓS `upload.single(...)` ou `upload.array(...)`.
 */
export async function validarMagicBytes(req: Request, res: Response, next: NextFunction) {
  const arquivos: Express.Multer.File[] = [];
  if (req.file) arquivos.push(req.file);
  if (Array.isArray(req.files)) arquivos.push(...req.files);

  for (const f of arquivos) {
    try {
      const handle = await fs.open(f.path, 'r');
      const buf = Buffer.alloc(12);
      await handle.read(buf, 0, 12, 0);
      await handle.close();

      if (!magicMatchesImage(buf)) {
        // Apaga arquivo malicioso/inválido
        await fs.unlink(f.path).catch(() => undefined);
        logger.warn({ filename: f.originalname, mimetype: f.mimetype }, 'upload rejeitado por magic bytes');
        return res.status(400).json({ error: 'O arquivo enviado não é uma imagem válida.' });
      }
    } catch (err) {
      logger.error({ err, path: f.path }, 'falha ao validar magic bytes');
      await fs.unlink(f.path).catch(() => undefined);
      return res.status(400).json({ error: 'Não foi possível validar o arquivo enviado.' });
    }
  }

  return next();
}
