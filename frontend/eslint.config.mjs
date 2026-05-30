import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Regra experimental do React Compiler — falso positivo no padrão
      // useEffect(() => { fetchData(); }, [fetchData]) que é válido e
      // amplamente usado em todo o projeto para busca de dados.
      "react-hooks/set-state-in-effect": "off",
      // Falso positivo: iconePorNome retorna referência a componente
      // existente (ex: Package), não cria novo componente.
      "react-hooks/static-components": "off",
    },
  },
]);

export default eslintConfig;
