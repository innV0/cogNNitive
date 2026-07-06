---
spec_version: "V_0-1-3"
spec_url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.2/specs/FORMAT_V_0-1-3_FORMAT.md"
level: 3
parent:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/innV0/cogNNitive/v0.1.1/specs/business_V_0-1-1_NN.md"
model_version: "V_1-0-0"
title: "Music Collection"
asset_mode: "centralized"
---

> [!NOTE]
> Este modelo demuestra la representación FILE mode clásica: todo vive en un solo archivo.
> Conceptos: Problems, Value propositions.

# _F index

* _F index: Problems
* _F index: Value propositions

# _F Problems

* _F Problems: Baja adopción
  ```yaml
  severity: high
  impact: revenue
  owner: product
  ```
  Los usuarios no completan el onboarding porque es demasiado largo.
* _F Problems: Costes elevados
  ```yaml
  severity: medium
  impact: margin
  owner: engineering
  ```
  La infraestructura actual cuesta más del 30% de los ingresos mensuales.
* _F Problems: Competencia agresiva
  ```yaml
  severity: high
  impact: growth
  owner: marketing
  ```
  Tres competidores directos lanzaron funciones similares en los últimos 6 meses.

# _F Value propositions

* _F Value propositions: Onboarding exprés
  ```yaml
  effort: medium
  impact: high
  owner: design
  ```
  Reducir el onboarding de 15 minutos a 2 minutos con wizard guiado.
* _F Value propositions: Infraestructura optimizada
  ```yaml
  effort: high
  impact: medium
  owner: engineering
  ```
  Migrar a serverless para reducir costes un 40%.
