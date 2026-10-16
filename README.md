# Revloop — Central de planejamento de eventos

O produtor pede o evento, vê o conflito de data e só o responsável designado consegue aceitar. A montagem do palco fica no mesmo registro.

## O problema

A data vive numa planilha, o “pode confirmar” vive numa mensagem e o mapa do palco vive na cabeça de quem chegou primeiro. A Revloop junta pedido, conflito, decisão e montagem num hub.

## Como funciona

1. Qualquer membro do workspace registra a solicitação.
2. O hub mostra se a data esbarra num compromisso de exemplo.
3. Só o e-mail do responsável designado aceita ou recusa. Outro membro recebe 403, e a tentativa fica na trilha.
4. No evento, a planta da casa muda de estado — pendente, em montagem, pronto, bloqueado — e continua lá depois de reabrir.

A ficha de um evento abre em `/eventos/:id`. Exemplo, com o hub no ar: [http://127.0.0.1:3000/eventos/evt-2026-002](http://127.0.0.1:3000/eventos/evt-2026-002).

## O que roda de verdade

- Sessão emitida pelo servidor, em cookie assinado (`revloop_session`). Não há entrada automática.
- Registro encadeado por SHA-256, gravado em `data/hub-ledger.json` com escrita atômica.
- Aceite, recusa, tarefas, comentários e cada área da planta passam por um único `dispatch`.
- Cinco testes do núcleo cobrem não-dono, aceite, aceite repetido, transição inválida e hash quebrado.

## O que é exemplo

A sessão desta demonstração é local: a pessoa escolhe um membro do workspace e o servidor emite o cookie. Agenda, Slack, Drive e Notion são blocos semeados, marcados na interface. Ingresso, pagamento, público e transmissão são o quadro composto do evento, não uma bilheteria, um gateway ou um encoder.

## Como rodar

Requer Node.js 22.

```bash
npm install --legacy-peer-deps
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000), escolha um membro e percorra o fluxo. Os testes:

```bash
npm test
```

O workflow em `.github/workflows/hub.yml` executa esses testes em cada push.

## Variáveis

Veja `.env.example`. Em produção o modo de sessão local só sobe com `HUB_ALLOW_LOCAL_DEV=true`. O segredo do cookie fica em `data/hub-session.key` e não entra no repositório. O ledger de demonstração entra.

A apresentação do case está em `docs/apresentacao.html`.
