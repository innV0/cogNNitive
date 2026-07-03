---
type: "Topic"
colorHex: "#D97706"
fields:
  category: "technology"
  status: "published"
  year_invented: 1955
  power_output: 1.21
  power_unit: "gigawatts"
  color: "#FF6B35"
  tags: ["time-travel", "core-device", "invention"]
  rating: 5
  website: "https://bttf.fandom.com/wiki/Flux_Capacitor"
  invention_date: "1955-11-05"
  calibration_cycles: 42
markers:
  weight: 10
  priority: "!"
  certainty: 5
graph_edges:
  - target: "../DocBrown"
    label: "invented-by"
    weight: 10
  - target: "../Delorean"
    label: "installed-in"
    weight: 10
taxonomy:
  perspective: "Devices"
---

El **condensador de flujo** es el dispositivo que hace posible el viaje temporal.
Consiste en tres luces intermitentes dispuestas en una configuración de flujo
que genera un vórtice temporal cuando el vehículo alcanza **88 mph** y recibe
**1.21 gigawatts** de potencia.

> "El condensador de flujo es lo que hace posible el viaje temporal." — Dr. Emmett Brown

## Diagrama de funcionamiento

```mermaid
flowchart TD
    A[1.21 GW Input] --> B[Flux Capacitor]
    B --> C{Reach 88 mph?}
    C -->|Yes| D[Temporal Vortex]
    C -->|No| E[Standby Mode]
    D --> F[Time Displacement]
    F --> G[Arrival at Destination]
```
