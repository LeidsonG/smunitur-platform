/**
 * Lista curada de ícones Lucide que podem ser atribuídos a uma Linha no
 * admin. Mantemos a lista pequena (~24 ícones) e relevante para confecção,
 * em vez de expor os 3000+ ícones do Lucide.
 *
 * Para usar o ícone:
 *
 *   import { iconePorNome } from '@/lib/linhaIcones';
 *   const Icone = iconePorNome(linha.icone);   // sempre devolve componente
 *   <Icone size={20} />
 */
import {
  Shirt,
  Briefcase,
  Wind,
  FlaskConical,
  Trophy,
  Award,
  Sparkles,
  Package,
  Layers,
  Coffee,
  Hand,
  GraduationCap,
  Heart,
  Activity,
  Star,
  Users,
  HardHat,
  Stethoscope,
  Wrench,
  Truck,
  ShieldCheck,
  Crown,
  Tag,
  Footprints,
} from 'lucide-react';

export interface LinhaIcone {
  nome: string;
  componente: React.ElementType;
  label: string;
}

export const LINHA_ICONES: LinhaIcone[] = [
  { nome: 'Shirt',         componente: Shirt,         label: 'Camiseta' },
  { nome: 'Briefcase',     componente: Briefcase,     label: 'Maleta' },
  { nome: 'Wind',          componente: Wind,          label: 'Vento (moletom)' },
  { nome: 'FlaskConical',  componente: FlaskConical,  label: 'Laboratório' },
  { nome: 'Stethoscope',   componente: Stethoscope,   label: 'Saúde' },
  { nome: 'HardHat',       componente: HardHat,       label: 'Capacete (obra)' },
  { nome: 'Wrench',        componente: Wrench,        label: 'Ferramenta' },
  { nome: 'Truck',         componente: Truck,         label: 'Caminhão' },
  { nome: 'Trophy',        componente: Trophy,        label: 'Troféu' },
  { nome: 'Activity',      componente: Activity,      label: 'Atividade' },
  { nome: 'Award',         componente: Award,         label: 'Medalha' },
  { nome: 'Crown',         componente: Crown,         label: 'Coroa' },
  { nome: 'Sparkles',      componente: Sparkles,      label: 'Brilho' },
  { nome: 'Star',          componente: Star,          label: 'Estrela' },
  { nome: 'Heart',         componente: Heart,         label: 'Coração' },
  { nome: 'Users',         componente: Users,         label: 'Grupo' },
  { nome: 'GraduationCap', componente: GraduationCap, label: 'Formatura' },
  { nome: 'ShieldCheck',   componente: ShieldCheck,   label: 'Escudo' },
  { nome: 'Coffee',        componente: Coffee,        label: 'Café' },
  { nome: 'Hand',          componente: Hand,          label: 'Mão' },
  { nome: 'Layers',        componente: Layers,        label: 'Camadas' },
  { nome: 'Tag',           componente: Tag,           label: 'Etiqueta' },
  { nome: 'Footprints',    componente: Footprints,    label: 'Pegadas' },
  { nome: 'Package',       componente: Package,       label: 'Pacote' },
];

const MAPA = new Map<string, React.ElementType>(
  LINHA_ICONES.map(i => [i.nome, i.componente])
);

/**
 * Resolve nome do ícone para componente React. Sempre devolve algo:
 * cai em `Package` se o nome for nulo, vazio ou desconhecido.
 */
export function iconePorNome(nome: string | null | undefined): React.ElementType {
  if (!nome) return Package;
  return MAPA.get(nome) ?? Package;
}

/**
 * Paleta sugerida para cor da linha. UI usa <input type="color"> livre, mas
 * exibimos esses como atalho. Cores escolhidas para contraste em texto branco.
 */
export const CORES_SUGERIDAS = [
  '#005ED5', // azul marca
  '#7C3AED', // roxo
  '#0EA5E9', // azul claro
  '#10B981', // verde
  '#FF9400', // laranja marca
  '#EF4444', // vermelho
  '#F59E0B', // âmbar
  '#EC4899', // rosa
  '#6366F1', // índigo
  '#14B8A6', // teal
  '#8B5CF6', // violeta
  '#64748B', // cinza
] as const;
