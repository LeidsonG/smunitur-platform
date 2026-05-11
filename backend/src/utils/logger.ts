import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  // Em produção: JSON puro (para Datadog/Grafana/etc.)
  // Em dev: saída colorida e legível
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
  // Não logar dados sensíveis acidentalmente
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.senha',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});

export default logger;
