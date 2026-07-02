---
specification_version: "V_0-1-2"
specification_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-2_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_1-0-0"
title: "Music Collection (distributed)"
mode: "FILE"
---

> [!NOTE]
> Este modelo demuestra representación distribuida: el root contiene el índice y las
> declaraciones de elementos con pointers a archivos individuales.
> La profundidad de los archivos en el árbol es irrelevante — solo importa el _FORMAT.md.
>
> Conceptos: Problems, Value propositions.

# _F index

* _F index: Problems
* _F index: Value propositions

# _F Problems

* _F Problems: Baja adopción
  → [element file](./problems/baja-adopcion/_FORMAT.md)
  ```yaml
  severity: high
  impact: revenue
  owner: product
  ```
  Los usuarios no completan el onboarding porque es demasiado largo.
* _F Problems: Costes elevados
  → [element file](./expenses/costes-elevados._FORMAT.md)
  ```yaml
  severity: medium
  impact: margin
  owner: engineering
  ```
  La infraestructura actual cuesta más del 30% de los ingresos mensuales.
* _F Problems: Competencia agresiva
  → [element file](./expenses/deeper/competencia._FORMAT.md)
  ```yaml
  severity: high
  impact: growth
  owner: marketing
  ```
  Tres competidores directos lanzaron funciones similares en los últimos 6 meses.

# _F Value propositions

* _F Value propositions: Onboarding exprés
  → [element file](./value-props/onboarding._FORMAT.md)
  ```yaml
  effort: medium
  impact: high
  owner: design
  ```
  Reducir el onboarding de 15 minutos a 2 minutos con wizard guiado.
* _F Value propositions: Infraestructura optimizada
  → [element file](./value-props/infra/infra-optimizada._FORMAT.md)
  ```yaml
  effort: high
  impact: medium
  owner: engineering
  ```
  Migrar a serverless para reducir costes un 40%.
