/**
 * Pipeline de upload de imagens.
 * --------------------------------------------------------------------------
 * 1. `upload`              → middleware multer que grava no disco em uploads/
 * 2. `validarMagicBytes`   → confere a assinatura do arquivo (bloqueia .exe
 *                            renomeado como .jpg, etc.)
 * 3. `processarImagens`    → redimensiona com sharp para no máximo
 *                            `MAX_IMAGE_DIM` px no maior lado (mantém aspect
 *                            ratio) e respeita orientação EXIF. Reduz peso
 *                            e protege o storage do servidor.
 *
 * Ordem nas rotas:
 *   router.post('/x', upload.single('img'), validarMagicBytes,
 *               processarImagens, handler)
 *
 * Helper:
 *   `apagarUpload('/uploads/x.jpg')` — remove arquivo do disco. Use ao
 *   substituir uma imagem antiga (foto de perfil, imagem de produto, etc.)
 *   para evitar acúmulo no servidor.
 */
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Diretório físico onde tudo é gravado (espelha a montagem estática em index.ts).
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// 10 MB padrão. `.env` MAX_FILE_SIZE pode sobrescrever — a UI do front
// (FormularioOrcamento.tsx, MAX_IMG) deve refletir o mesmo limite.
const MAX_UPLOAD_BYTES = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

// Maior dimensão em pixels após o redimensionamento. 2000px cobre catálogo
// e visualização no admin sem desperdiçar banda.
const MAX_IMAGE_DIM = Number(process.env.MAX_IMAGE_DIM) || 2000;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const hash = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${hash}${ext}`);
  },
});

// Filtro raso: rejeita pelo mimetype declarado. A verificação real do
// conteúdo acontece em `validarMagicBytes`.
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WebP, GIF)'));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

/**
 * Lê os primeiros 12 bytes do arquivo e compara com as assinaturas conhecidas
 * dos formatos aceitos. Bloqueia arquivos disfarçados (ex.: .exe com
 * mimetype `image/jpeg`) que o filtro do multer não detecta.
 *
 * Assinaturas:
 *   - JPEG:  FF D8 FF
 *   - PNG:   89 50 4E 47 0D 0A 1A 0A
 *   - GIF:   "GIF87a" ou "GIF89a"
 *   - WebP:  "RIFF" .... "WEBP"
 */
function magicMatchesImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;

  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return true;

  const gifHeader = buf.slice(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return true;

  if (
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  ) return true;

  return false;
}

/** Coleta todos os arquivos que o multer anexou ao request. */
function arquivosDoRequest(req: Request): Express.Multer.File[] {
  const list: Express.Multer.File[] = [];
  if (req.file) list.push(req.file);
  if (Array.isArray(req.files)) list.push(...req.files);
  return list;
}

/** Middleware: valida magic bytes e exclui arquivos suspeitos. */
export async function validarMagicBytes(req: Request, res: Response, next: NextFunction) {
  for (const f of arquivosDoRequest(req)) {
    try {
      const handle = await fs.open(f.path, 'r');
      const buf = Buffer.alloc(12);
      await handle.read(buf, 0, 12, 0);
      await handle.close();

      if (!magicMatchesImage(buf)) {
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

/**
 * Middleware: redimensiona cada imagem para `MAX_IMAGE_DIM` no maior lado
 * (sem aumentar imagens pequenas), aplica rotação EXIF e regrava no mesmo
 * caminho. Em caso de erro num arquivo, loga e segue com o restante — o
 * arquivo original permanece intacto.
 */
export async function processarImagens(req: Request, _res: Response, next: NextFunction) {
  for (const f of arquivosDoRequest(req)) {
    try {
      const tmpPath = `${f.path}.tmp`;
      await sharp(f.path)
        .rotate() // aplica orientação EXIF antes de descartar metadata
        .resize({ width: MAX_IMAGE_DIM, height: MAX_IMAGE_DIM, fit: 'inside', withoutEnlargement: true })
        .toFile(tmpPath);
      await fs.rename(tmpPath, f.path);
    } catch (err) {
      // GIFs animados podem falhar; preferimos manter o original a quebrar o upload.
      logger.warn({ err, path: f.path }, 'falha ao redimensionar imagem — mantendo original');
    }
  }
  return next();
}

/**
 * Remove um arquivo de upload do disco. Aceita tanto a URL pública
 * (`/uploads/abc.jpg`) quanto um path absoluto. Silencioso em caso de erro
 * (não derruba a request principal — cleanup é "best effort").
 */
export async function apagarUpload(refOuPath: string | null | undefined): Promise<void> {
  if (!refOuPath) return;
  try {
    const filename = refOuPath.startsWith('/uploads/')
      ? refOuPath.slice('/uploads/'.length)
      : path.basename(refOuPath);
    // Defesa contra path traversal: só permite nome simples.
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return;
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch (err) {
    logger.debug({ err, ref: refOuPath }, 'apagarUpload: arquivo já ausente ou inacessível');
  }
}
