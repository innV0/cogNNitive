---
type: "Persona"
colorHex: "#0891B2"
fields:
  role: "time traveler"
  expertise_level: "advanced"
  birth_year: 1968
  is_active: true
  color: "#E85D3A"
  tags: ["protagonist", "time-traveler", "guitarist", "teenager"]
  rating: 4
  website: "https://bttf.fandom.com/wiki/Marty_McFly"
  birth_date: "1968-06-09"
  times_traveled: 5
  hoverboard_skill: 9
markers:
  weight: 9
  certainty: 5
  completion: "done"
graph_edges:
  - target: "../DocBrown"
    label: "student-mentor"
    weight: 10
  - target: "../Delorean"
    label: "drives"
    weight: 10
  - target: "../Hoverboard"
    label: "uses"
    weight: 7
taxonomy:
  perspective: "Protagonists"
---

Marty McFly es el protagonista de los viajes temporales. Adolescente de **Hill Valley**,
toca la guitarra, odia que lo llamen **"gallina"**, y ha salvado la línea temporal
en al menos **tres ocasiones** documentadas.

## Habilidades

| Habilidad | Nivel (1-10) | Notas |
|-----------|:---:|-------|
| Guitarra | 9 | Interpretó *Johnny B. Goode* en 1955 |
| Hoverboard | 9 | Escapó de Griff Tannen en 2015 |
| Pilotaje temporal | 8 | Viajó a 1955, 2015, 1885 |
| Supervivencia | 7 | Sobrevivió al Viejo Oeste |

## Línea de viajes temporales

```mermaid
timeline
    title Viajes de Marty McFly
    1985 : Línea original : Conoce a Doc
    1955 : Primer viaje : Baile Under the Sea
    2015 : Futuro : Hoverboard chase
    1955 : Regreso : Arregla línea temporal
    1885 : Viejo Oeste : Rescata a Doc
    1985 : Retorno : Línea restaurada
```
