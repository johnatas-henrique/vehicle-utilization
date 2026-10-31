# vehicle-utilization-api

WebAPI para controlar a utilização dos automóveis de uma empresa. Tem cadastro de automóveis e de motoristas, registro de utilização de um automóvel por um motorista com data de início e motivo, finalização com data de término, e listagem das utilizações com os dados do motorista e do automóvel.

Um automóvel só pode ser utilizado por um motorista por vez. Um motorista que já está usando um automóvel não pode usar outro ao mesmo tempo. As duas regras são verificadas quando uma utilização é criada e quando um automóvel ou motorista é excluído.

O estado fica em memória. Reiniciar a aplicação apaga todos os registros.

## Requisitos

Node.js 20.19 ou superior (`engines` no `package.json`; o `.nvmrc` aponta para a versão 24) e npm.

## Como executar

```bash
npm ci
npm start
```

A aplicação sobe em `http://localhost:3000`. A porta vem da variável `PORT`, que assume `3000` quando não está definida. Para usar outra porta, copie o arquivo `.env.example` para `.env` e troque o valor dentro dele. O `ConfigModule` lê esse arquivo e valida as variáveis na inicialização com `zod`, então um valor inválido derruba o boot com mensagem explícita em vez de subir com valor indefinido.

`npm run start:dev` reinicia a aplicação a cada alteração de arquivo. Para gerar o artefato compilado, `npm run build` e depois `npm run start:prod`.

## API

A documentação interativa fica em `http://localhost:3000/docs`, e o documento bruto em `http://localhost:3000/openapi.json`. A especificação dos corpos vem dos mesmos schemas `zod` que o pipe de validação aplica. Os endpoints que recebem corpo abrem com exemplos preenchidos, e cada resposta de erro traz o exemplo real do envelope.

Toda resposta de erro segue o mesmo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "plate: Invalid input: expected string, received undefined",
    "details": [
      "plate: Invalid input: expected string, received undefined",
      "color: Invalid input: expected string, received undefined",
      "brand: Invalid input: expected string, received undefined"
    ]
  }
}
```

`code` é um identificador curto do tipo de erro, `message` traz a primeira mensagem e `details` só aparece quando há mais de uma. `400` é entrada inválida, `404` recurso inexistente, `409` é conflito com o estado atual e `204` é exclusão bem-sucedida.

## Testando no navegador

Com a aplicação no ar, abra `/docs` e use o botão **Try it out** em cada endpoint. Não é preciso instalar cliente HTTP nenhum.

O roteiro abaixo percorre as funcionalidades na ordem em que uma depende da outra. Os exemplos trazem identificadores de mentira, então troque os `vehicleId`, `driverId` e o `id` do path pelos que a própria API devolveu nos passos anteriores. Sem isso, os passos de utilização respondem `404`.

| # | Endpoint | O que observar |
| --- | --- | --- |
| 1 | `POST /vehicles` exemplo `lowercasePlate` | `201` com a placa em maiúsculas, `ABC1D23`. Guarde o `id` como `VID` |
| 2 | `POST /vehicles` exemplo `duplicatePlate` | `409 VEHICLE_PLATE_TAKEN` |
| 3 | `POST /vehicles` com placa `XYZ9Z99`, cor `Prata`, marca `Fiat` | `201`. Guarde o `id` como `VID2` |
| 4 | `GET /vehicles` | dois automóveis |
| 5 | `GET /vehicles?color=metalico` | apenas o `ABC1D23`, de cor `Azul Metálico` |
| 6 | `GET /vehicles?brand=fiat` | apenas o `XYZ9Z99` |
| 7 | `GET /vehicles/{VID}` | `200` com o automóvel |
| 8 | `PATCH /vehicles/{VID}` exemplo `singleField` | `200`, só a cor muda |
| 9 | `PATCH /vehicles/{VID}` exemplo `emptyBody` | `400 VALIDATION_ERROR` |
| 10 | `POST /drivers` exemplo `accentedName` | `201`. Guarde o `id` como `DID` |
| 11 | `POST /drivers` com `{"name":"Maria Souza"}` | `201`. Guarde o `id` como `DID2` |
| 12 | `GET /drivers?name=joao` | apenas o `João da Silva` |
| 13 | `GET /drivers/{DID}` | `200` com o motorista |
| 14 | `PATCH /drivers/{DID2}` exemplo `rename` | `200` com o nome novo |
| 15 | `POST /usages` exemplo `now` com `VID` e `DID` | `201` com automóvel e motorista aninhados. Guarde o `id` como `UID` |
| 16 | `POST /usages` com `VID` e `DID2` | `409 VEHICLE_IN_USE`: o automóvel já está em uso |
| 17 | `POST /usages` com `VID2` e `DID` | `409 DRIVER_IN_USE`: o motorista já está em uso |
| 18 | `POST /usages` exemplo `inTheFuture` com `VID2` e `DID2` | `400 USAGE_START_IN_FUTURE` |
| 19 | `POST /usages` exemplo `pastWithOffset` com `VID2` e `DID2` | `201`, e a data `-03:00` aparece gravada como `13:00Z` |
| 20 | `DELETE /vehicles/{VID}` | `409 VEHICLE_IN_USE` |
| 21 | `DELETE /drivers/{DID}` | `409 DRIVER_IN_USE` |
| 22 | `POST /usages/{UID}/finish` | `200` com `finishedAt` preenchido |
| 23 | `POST /usages/{UID}/finish` de novo | `409 USAGE_ALREADY_FINISHED` |
| 24 | `DELETE /vehicles/{VID}` | `204` depois do `finish`, e `404` na repetição |
| 25 | `DELETE /drivers/{DID}` | `204` |
| 26 | `GET /usages` | as duas utilizações continuam listadas com placa e nome, mesmo com o automóvel e o motorista excluídos |

## Testes automatizados

```bash
npm test           # unitários + integração
npm run test:unit  # apenas src/**/*.spec.ts
npm run test:e2e   # apenas test/**/*.e2e-spec.ts
npm run test:cov   # unitários com cobertura
```

São 69 testes unitários e 49 de integração. Os unitários exercitam serviços e adaptadores com os adaptadores reais em memória; os de integração sobem a aplicação e chamam o HTTP, cobrindo os endpoints, os códigos de erro e as duas regras de exclusividade.

Verificações de qualidade:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run format:check # Prettier
```

## Decisões e trade-offs

### Stack

O TypeScript está fixado em 6.0.3 porque o `nest build` não funciona com a versão 7, que troca o compilador atual por um nativo incompatível com a ferramenta. O `typescript-eslint` também declara peer `>=4.8.4 <6.1.0`. A fixação exata evita que um `npm install` futuro resolva uma versão fora dos ranges.

ESM com Vitest é o template padrão do `nest new` na CLI 12. Com ESM não é preciso a flag `--experimental-vm-modules` que o Jest exigiria, e o Vitest 4 emite `emitDecoratorMetadata` de forma nativa, sem `unplugin-swc`.

O lint usa ESLint 10 com typescript-eslint em vez do `oxlint` que o scaffold traz. As regras type-aware do typescript-eslint são JavaScript puro; o modo type-aware do `oxlint` depende de binário nativo por plataforma e pode quebrar `npm run lint` numa máquina sem esse binário.

### Persistência

A persistência é em memória, atrás de uma porta por recurso (`VehicleRepository`, `DriverRepository`, `UsageRepository`). Manter a porta deixa a troca por banco real restrita ao provider do módulo, e não há banco nem código de banco no projeto.

As portas são classes abstratas porque a chave de injeção do Nest precisa existir em runtime, e uma interface TypeScript não sobrevive à compilação. A classe abstrata serve de tipo e de token ao mesmo tempo, o que dispensa `@Inject`.

### Modelagem

A utilização guarda a referência ao veículo e ao motorista, e a listagem faz a junção com os cadastros. O cadastro é a fonte de verdade da descrição do veículo, e não há cópia dos dados dentro do registro de utilização.

Automóveis e motoristas têm exclusão lógica. A exclusão física deixaria registros de utilização apontando para identificadores que não existem mais e reescreveria o histórico. Um recurso excluído responde `404`, não aparece nas listagens e não conta para a unicidade de placa.

A placa é gravada em maiúsculas e única entre automóveis ativos, comparada sem diferenciar caixa nem acento. O formato não é validado, porque o padrão brasileiro tem variações e rejeitar uma placa válida seria pior que aceitar uma inválida.

Dois motoristas podem se chamar João da Silva. Nada no domínio exige nome único, e impedir o cadastro criaria uma restrição que a empresa não pediu.

As listagens não têm paginação, que não foi solicitada.

Todas as datas da API são ISO 8601 em UTC, terminadas em `Z`. Um `startedAt` enviado com fuso, como `2026-01-01T10:00:00-03:00`, é gravado como `2026-01-01T13:00:00.000Z`: o instante é preservado e a representação fica única, o que permite comparar e ordenar datas como texto sem erro. Formato sem fuso é rejeitado, porque o instante variaria conforme o fuso da máquina.

Automóvel ou motorista com utilização ativa responde `409` na exclusão, e a exclusão volta a ser permitida depois do `finish`.

O `UsageCoreModule` existe para evitar dependência circular entre os módulos. Ele fornece o repositório de utilizações e o `ActiveUsageChecker` e não importa nada, então veículos, motoristas e utilizações dependem dele sem que haja caminho de volta. Como o Nest instancia um módulo uma única vez, o repositório compartilhado é o mesmo em todos os módulos, e a checagem enxerga as utilizações reais. Veículos e motoristas consomem apenas o checker: nenhum arquivo de `src/vehicles` ou `src/drivers` importa `usage.repository`.

### API

O `DELETE` responde `204` na primeira chamada e `404` na repetição. Nada muda na segunda chamada, e o código comunica que o recurso não existe mais. Os identificadores são UUID v4, aleatórios e sem sequência, então não há como enumerar recursos.

Os filtros de `color`, `brand` e `name` casam por trecho, sem diferenciar caixa nem acentos: tanto o texto do filtro quanto o valor armazenado passam por NFD, remoção de marcas diacríticas e minúsculas antes da comparação.

O `PATCH` é parcial porque o `PUT` substituiria o recurso inteiro, e o cliente teria que enviar todos os campos para mudar um. Corpo vazio responde `400`. Campos desconhecidos no corpo são ignorados, para não punir um cliente que devolva o objeto completo numa atualização.

O header `x-powered-by` está desligado e o `GET /` não expõe versão, para não anunciar a stack.

## Limitações conhecidas

A unicidade de placa e a exclusividade de uso consultam o estado e depois gravam. Com o adaptador em memória as duas etapas acontecem na mesma volta do event loop, sem I/O no meio, então nenhuma outra requisição intercala e não há corrida. Com um banco real há I/O entre elas, e a garantia passa a depender do banco: constraint `UNIQUE` na placa e uma restrição equivalente para a utilização ativa, ou uma transação.

Não há autenticação nem autorização, e qualquer cliente acessa todos os recursos.

Não há Docker, CI ou deploy. O projeto roda com `npm ci && npm start`, sem serviços externos.

## Próximos passos

- Entidade de usuários, autenticação por JWT e autorização por escopo, o que exige decidir o escopo de visibilidade: empresa, frota ou papel de cada usuário.
- Persistência em PostgreSQL, com um adaptador novo por porta e a linha do provider, sem tocar nos serviços, e `UNIQUE` na placa e na restrição de uso ativo.
- Paginação e ordenação nas listagens.
- Docker com compose para subir a aplicação com um comando, e pipeline de CI.

## Estrutura

Cada recurso é uma fatia com as mesmas quatro camadas. `domain` tem o tipo e a porta do repositório, `application` os casos de uso, `infra` o adaptador em memória e `http` os schemas de entrada e o controller. O módulo de cada recurso é a composition root que liga porta e adaptador.

```
src/
├── common/
│   ├── errors/         envelope de erro e filtro global
│   └── text/           normalização de caixa e acento
├── config/             schema das variáveis de ambiente
├── vehicles/
│   ├── domain/
│   ├── application/
│   ├── infra/
│   ├── http/
│   └── vehicles.module.ts
├── drivers/
│   ├── domain/
│   ├── application/
│   ├── infra/
│   ├── http/
│   └── drivers.module.ts
├── usages/
│   ├── domain/
│   ├── application/    inclui o ActiveUsageChecker
│   ├── infra/
│   ├── http/
│   ├── usages.module.ts
│   └── usage-core.module.ts
├── openapi/
│   ├── openapi.document.ts
│   ├── openapi.controller.ts
│   └── openapi.module.ts
├── app.controller.ts
├── app.service.ts
├── app.module.ts
├── app.setup.ts        filtro, pipe de validação e Swagger UI
└── main.ts
test/                   testes de integração HTTP
```
