/**
 * Dados globais do site: nome, URL, logo, menus.
 * Para mudar o menu do topo ou do rodapé, edite as listas abaixo.
 */

export interface NavItem {
  href: string;
  label: string;
}

export const SITE = {
  name: 'Curso de Ar Condicionado',
  /** Domínio canônico (https, sem www, sem barra final). */
  url: 'https://cursodearcondicionado.com.br',
  logo: '/images/cursodear/logo.png',
} as const;

/** Menu do topo. Home, /automotivo/ e /area-do-aluno/ escondem o menu (prop hideNav). */
export const NAV: NavItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Nossos Cursos', href: '/cursos' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contato', href: '/contato' },
  { label: 'Área do Aluno', href: '/area-do-aluno' },
];

/** Links de navegação do rodapé. */
export const FOOTER_NAV: NavItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Nossos Cursos', href: '/cursos' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contato', href: '/contato' },
];

