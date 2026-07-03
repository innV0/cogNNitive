---
type: "Topic"
colorHex: "#059669"
fields:
  category: "technology"
  status: "published"
  year_introduced: 1981
  max_speed: 88
  fuel_type: "gasoline + mr_fusion"
  color: "#C0C0C0"
  tags: ["time-machine", "dmc-12", "gull-wing", "stainless-steel"]
  rating: 5
  website: "https://bttf.fandom.com/wiki/DeLorean_time_machine"
  build_date: "1981-01-01"
  last_mileage: 141000
markers:
  weight: 10
  priority: "!"
  certainty: 5
  completion: "done"
graph_edges:
  - target: "../DocBrown"
    label: "built-by"
    weight: 10
  - target: "../FluxCapacitor"
    label: "core-component"
    weight: 10
  - target: "../MartyMcFly"
    label: "driven-by"
    weight: 8
taxonomy:
  perspective: "Vehicles"
---

DeLorean DMC-12 con conversión para viaje temporal. Carrocería de acero inoxidable,
puertas de ala de gaviota. Modificado por el Dr. Brown para albergar el condensador
de flujo. Requiere **88 mph** para activar el viaje. Ha viajado a **1955**, **2015**, **1885**
y de vuelta.

## Especificaciones técnicas

```typescript
interface TimeMachineSpec {
  model: "DMC-12"
  year: 1981
  maxSpeed: 88 // mph
  powerRequired: 1.21 // GW
  fuelSources: ["plutonium", "lightning", "mr_fusion"]
  modifications: ["flux-capacitor", "time-circuits", "mr-fusion"]
}
```

```mermaid
graph LR
    A[Mr. Fusion] --> B[Flux Capacitor]
    B --> C[Time Circuits]
    C --> D[Destination Display]
    B --> E[Temporal Vortex]
    E --> F[88 mph threshold]
    F --> G[Time Travel!]
```
