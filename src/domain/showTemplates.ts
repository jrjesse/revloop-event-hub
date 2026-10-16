import type { EventTemplate } from '../types/index.ts';

const policies = [
  { category: 'aprovacoes_gerais' as const, title: 'Aceite do produtor responsável', description: 'O responsável libera casa, lote e ordem do show.', required: true },
  { category: 'acessibilidade' as const, title: 'Acessibilidade da casa', description: 'Acesso, sanitário e lugar marcado para o público.', required: true },
  { category: 'avaliacao_fornecedores' as const, title: 'Rider e fornecedores de palco', description: 'Som, luz e estrutura com documentação em dia.', required: true },
  { category: 'privacidade_lgpd' as const, title: 'CRM e lista de portaria', description: 'Contatos e presença têm base legal.', required: true },
  { category: 'comunicacoes' as const, title: 'Peças e transmissão', description: 'Divulgação e destinos de mídia no tom da casa.', required: true },
  { category: 'swag_brindes' as const, title: 'Cortesias e convidados', description: 'Reservas de ingresso fora do lote pago.', required: false },
];

export const SHOW_TEMPLATES: EventTemplate[] = [
  {
    id: 'tpl-show-casa',
    name: 'Show em casa',
    type: 'show',
    description: 'Noite com atração, lote de ingressos, mapa de palco, público da casa e ordem do show.',
    targetAudience: 'Público da casa',
    recommendedAttendees: '800',
    estimatedBudgetRange: 'R$ 80.000 a R$ 180.000',
    leadTimeDays: 45,
    defaultFormat: 'presencial',
    tags: ['ingresso', 'palco', 'portaria'],
    defaultMilestones: [
      { title: 'Contrato da atração e rider', dueDate: '+10 dias', ownerName: 'Produção', phase: 'planejamento' },
      { title: 'Abertura dos lotes', dueDate: '+18 dias', ownerName: 'Bilheteria', phase: 'divulgacao' },
      { title: 'Mapa de palco fechado', dueDate: '+30 dias', ownerName: 'Técnica', phase: 'operacao' },
      { title: 'Portões e show', dueDate: '+45 dias', ownerName: 'Produtor responsável', phase: 'operacao' },
    ],
    defaultTasks: [
      { title: 'Conferir capacidade e setores da casa', category: 'logistica', assignedTo: 'Portaria', assignedEmail: '', dueDate: '+12 dias', priority: 'alta' },
      { title: 'Fechar plot de som e luz', category: 'fornecedores', assignedTo: 'Técnica', assignedEmail: '', dueDate: '+25 dias', priority: 'alta' },
      { title: 'Separar cortesias do lote', category: 'financeiro', assignedTo: 'Bilheteria', assignedEmail: '', dueDate: '+20 dias', priority: 'media' },
    ],
    defaultPolicyItems: policies,
    defaultResourceTemplates: [
      { type: 'external', title: 'Mapa de palco', url: 'https://drive.google.com/corp/revloop/mapa-de-palco', description: 'Planta da casa' },
    ],
  },
  {
    id: 'tpl-show-ao-vivo',
    name: 'Show com transmissão',
    type: 'show',
    description: 'Show híbrido com bilheteria, pagamento, CRM do público e mesa de transmissão ao vivo.',
    targetAudience: 'Público da casa e audiência online',
    recommendedAttendees: '1200',
    estimatedBudgetRange: 'R$ 120.000 a R$ 260.000',
    leadTimeDays: 60,
    defaultFormat: 'hibrido',
    tags: ['transmissão', 'pagamento', 'crm'],
    defaultMilestones: [
      { title: 'Destinos de mídia e encoder', dueDate: '+14 dias', ownerName: 'Transmissão', phase: 'planejamento' },
      { title: 'Lotes online e bilheteria', dueDate: '+21 dias', ownerName: 'Bilheteria', phase: 'divulgacao' },
      { title: 'Ensaio do sinal', dueDate: '+40 dias', ownerName: 'Transmissão', phase: 'operacao' },
      { title: 'Show e gravação', dueDate: '+60 dias', ownerName: 'Produtor responsável', phase: 'operacao' },
    ],
    defaultTasks: [
      { title: 'Testar encoder e retorno da direção', category: 'conteudo', assignedTo: 'Transmissão', assignedEmail: '', dueDate: '+30 dias', priority: 'alta' },
      { title: 'Conferir liquidação do lote online', category: 'financeiro', assignedTo: 'Financeiro', assignedEmail: '', dueDate: '+35 dias', priority: 'alta' },
      { title: 'Segmentar a base com consentimento', category: 'marketing', assignedTo: 'CRM', assignedEmail: '', dueDate: '+16 dias', priority: 'media' },
    ],
    defaultPolicyItems: policies,
    defaultResourceTemplates: [
      { type: 'external', title: 'Roteiro de transmissão', url: 'https://drive.google.com/corp/revloop/transmissao', description: 'Mesa e destinos' },
    ],
  },
  {
    id: 'tpl-festival',
    name: 'Festival de um dia',
    type: 'festival',
    description: 'Grade de palco, vários lotes, mapa de setores e controle da jornada do público.',
    targetAudience: 'Público do festival',
    recommendedAttendees: '5000',
    estimatedBudgetRange: 'R$ 400.000 a R$ 900.000',
    leadTimeDays: 90,
    defaultFormat: 'presencial',
    tags: ['festival', 'setores', 'grade'],
    defaultMilestones: [
      { title: 'Grade e mapas de setor', dueDate: '+20 dias', ownerName: 'Produção', phase: 'planejamento' },
      { title: 'Lotes e pagamentos', dueDate: '+30 dias', ownerName: 'Bilheteria', phase: 'divulgacao' },
      { title: 'Montagem dos palcos', dueDate: '+80 dias', ownerName: 'Técnica', phase: 'operacao' },
      { title: 'Abertura dos portões', dueDate: '+90 dias', ownerName: 'Produtor responsável', phase: 'operacao' },
    ],
    defaultTasks: [
      { title: 'Fechar capacidade por setor', category: 'logistica', assignedTo: 'Portaria', assignedEmail: '', dueDate: '+25 dias', priority: 'alta' },
      { title: 'Publicar a grade no CRM', category: 'marketing', assignedTo: 'CRM', assignedEmail: '', dueDate: '+40 dias', priority: 'media' },
    ],
    defaultPolicyItems: policies,
    defaultResourceTemplates: [
      { type: 'external', title: 'Mapa de setores', url: 'https://drive.google.com/corp/revloop/setores', description: 'Planta do festival' },
    ],
  },
];
