import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

import authRoutes from './routes/auth';
import orcamentosRoutes from './routes/orcamentos';
import produtosRoutes from './routes/produtos';
import categoriasRoutes from './routes/categorias';
import adminRoutes from './routes/admin';
import producaoRoutes from './routes/producao';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve imagens de uploads estaticamente
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/producao', producaoRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SM Unitur API running' });
});

app.listen(PORT, () => {
  console.log(`[SM Unitur API] Rodando em http://localhost:${PORT}`);
});

export default app;
