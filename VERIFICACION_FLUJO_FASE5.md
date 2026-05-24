# 📋 GUÍA DE VERIFICACIÓN FASE 5 — FLUJO COMPLETO

## 🎯 OBJETIVO
Verificar que el bug fix permite que **todos los módulos** funcionen correctamente con datos reales (demo).

**Criterio de éxito:** 
- ✅ Login funciona
- ✅ Dashboard calcula KPIs (nunca "Insuficientes datos")
- ✅ Forecast genera predicciones de 13 semanas
- ✅ Cambio de producto mantiene flujo
- ✅ Publicación de forecast es posible

---

## 🔑 CREDENCIALES DEMO

```
Usuario: jgarcia
Contraseña: dp2024
Rol: Demand Planner
```

---

## CHECKLIST DE FLUJO

### 1️⃣ LOGIN PAGE (`/`)
**Acciones:**
- [ ] Ir a http://localhost:8080/
- [ ] Ingresa jgarcia / dp2024
- [ ] Click "Ingresar"

**Esperado:**
- ✅ Redirección a `/app`
- ✅ No errors en consola
- ✅ Menu lateral visible con opciones

**Consola (F12 → Console):**
```
No debe haber:
❌ "Cannot read property 'products' of undefined"
❌ "No hay datos suficientes"

Puede haber:
⚠️ Rollup circular dependency warnings (pre-existing)
```

---

### 2️⃣ DASHBOARD (`/app`)
**Estado esperado:** Dashboard principal con demanda base

**Acciones:**
- [ ] Login exitoso ↓
- [ ] Observar KPIs en tarjetas principales
- [ ] Revisar gráfico "Histórico vs Forecast"
- [ ] Ver tabla "Demanda base 13 semanas"
- [ ] Ver forecast por canal (dropdown)

**Verificaciones:**

| Elemento | Debe mostrar | ❌ Error | ✅ OK |
|----------|-------------|----------|-------|
| **MAPE** | Número % | NaN, undefined, "N/A" | 12.5% |
| **MAD** | Número | null, undefined | 45.2 |
| **RMSE** | Número | null | 52.3 |
| **Accuracy** | % 0-100 | null, "—" | 87% |
| **Tabla semanas** | 13 filas | 0 filas, "No data" | 13 filas |
| **Gráfico** | Líneas azul+rojo | Vacío, solo ejes | 3+ curvas |
| **Canales** | Números > 0 | 0, null | valores reales |

**Consola (F12):**
- [ ] Log: `"Dataset cargado: { records: X, periods: Y, products: Z, channels: W }"`
- [ ] Log: `"Dashboard build: { historyLength: X, bestModel: 'MA' | 'ES' | ... }"`

---

### 3️⃣ CAMBIAR DE PRODUCTO
**Acciones:**
- [ ] Hacer click en dropdown de producto (superior derecho)
- [ ] Seleccionar otro producto (ej: Nescafé → Milo)
- [ ] Aguardar actualización

**Esperado:**
- ✅ Dashboard se recalcula al instante
- ✅ KPIs cambian
- ✅ Tabla de 13 semanas se llena
- ✅ Gráfico se actualiza
- ✅ NO hay "Insuficientes datos"

**Consola:**
- [ ] Log: `"Dashboard build:"` con producto nuevo

---

### 4️⃣ DATOS (`/app/datos`)
**Acciones:**
- [ ] Click en "DATOS" en menu lateral
- [ ] Opción: "Cargar datos demo"
- [ ] Observar preview y estadísticas
- [ ] Click "Cargar"

**Esperado:**
- ✅ Muestra cantidad de registros cargados
- ✅ Tabla preview con primeras filas normalizadas
- ✅ Estadísticas: # productos, # períodos, # canales
- ✅ LOG en consola: `"Dataset cargado: { ... }"`

**Columnas que se ven (normalizadas):**
```
fecha | producto | cantidad | canal | estado | precio
2025-05-01 | Nescafé | 120 | Supermercados | Entregado | 2.50
```

**Opcional (upload de archivo):**
- [ ] Click "Subir archivo CSV/Excel"
- [ ] Seleccionar archivo test (if exists)
- [ ] Validar que normaliza columnas automáticamente

---

### 5️⃣ LIMPIEZA (`/app/limpieza`)
**Acciones:**
- [ ] Click en "LIMPIEZA" en menu lateral
- [ ] Seleccionar producto
- [ ] Click "Detectar outliers"

**Esperado:**
- ✅ Tabla con outliers detectados (Z-score)
- ✅ Opción para eliminar/marcar
- ✅ Estadísticas de limpieza

---

### 6️⃣ FORECAST (`/app/forecast`)
**Acciones:**
- [ ] Click en "FORECAST" en menu lateral
- [ ] Seleccionar producto
- [ ] Observar modelos ejecutándose

**Verificaciones:**

| Elemento | Debe mostrar | ❌ Error | ✅ OK |
|----------|-------------|----------|-------|
| **Modelos** | 6 listados | 0, null list | MA, ES, LT, SI, ARIMA, SARIMA |
| **Métricas** | MAPE, MAD, RMSE | NaN | números |
| **Mejor modelo** | Seleccionado (verde) | Ninguno | MA, ES, etc. |
| **Tabla forecast** | 13 semanas | 0 filas | 13 filas |
| **Valores forecast** | > 0 (números) | 0, null | ex: 105.3 |
| **Residuales** | Gráfico | Vacío | Puntos dispersos |

**Consola:**
- [ ] Log: `"Forecast pipeline: { historyLength: X, selectedModel: '...' }"`

---

### 7️⃣ INSIGHTS (`/app/insights`)
**Acciones:**
- [ ] Click en "INSIGHTS" en menu lateral
- [ ] Ver ajustes propuestos por Marketing/Ventas/Finanzas
- [ ] Opcional: añadir ajuste manual

**Esperado:**
- ✅ Al menos 1 ajuste visible por categoría
- ✅ % de cambio mostrado
- ✅ Estado (Aprobado, Pendiente, En revisión)

---

### 8️⃣ CONSENSO (`/app/consenso`)
**Acciones:**
- [ ] Click en "CONSENSO" en menu lateral
- [ ] Revisar forecast consenso = baseline + ajustes
- [ ] Click "Publicar versión"

**Esperado:**
- ✅ Forecast consenso > forecast baseline (si hay ajustes positivos)
- ✅ Botón "Publicar" funciona
- ✅ Mensaje de éxito (toast, snackbar)
- ✅ Nueva versión en histórico

---

### 9️⃣ FINANZAS (`/app/finanzas`)
**Acciones:**
- [ ] Click en "FINANZAS" en menu lateral
- [ ] Revisar cálculos de margen, revenue
- [ ] Ver escenarios

**Esperado:**
- ✅ Números financieros mostrados
- ✅ Impacto de cambios visible
- ✅ Gráficos de simulación

---

### 🔟 MBP (`/app/mbp`)
**Acciones:**
- [ ] Click en "MBP" en menu lateral
- [ ] Ver timeline y hitos

**Esperado:**
- ✅ Timeline visible
- ✅ KPIs agregados mostrados

---

### 1️⃣1️⃣ AI ASSISTANT (`/app/ai`)
**Acciones:**
- [ ] Click en "AI ASSISTANT" en menu lateral
- [ ] Escribir pregunta (ej: "¿Cuál es el forecast?")
- [ ] Enviar

**Esperado:**
- ✅ Respuesta del asistente
- ✅ Explicación de KPIs
- ✅ Historial de chat

---

### 1️⃣2️⃣ PUBLISH FORECAST (`/app/publish`)
**Acciones:**
- [ ] Click en "PUBLISH" en menu lateral (o desde consenso)
- [ ] Seleccionar formato (CSV, Excel, JSON, SAP)
- [ ] Click "Descargar"

**Esperado:**
- ✅ Archivo se descarga
- ✅ Contiene forecast completo
- ✅ Incluye breakdown de ajustes (si aplica)

---

## 📊 RESUMEN RÁPIDO

```
[ ] Login: OK
[ ] Dashboard: KPIs ≠ null ✓
[ ] Cambio de producto: Fluido ✓
[ ] Datos: Cargados ✓
[ ] Limpieza: Detecta outliers ✓
[ ] Forecast: 6 modelos, 13 semanas ✓
[ ] Insights: Ajustes visibles ✓
[ ] Consenso: Publica versión ✓
[ ] Finanzas: Cálculos mostrados ✓
[ ] MBP: Timeline visible ✓
[ ] AI: Chat funciona ✓
[ ] Publish: Descarga archivo ✓
```

---

## 🐛 SI ALGO FALLA

**Paso 1: Revisar consola (F12)**
```
Cmd+Shift+I (o F12) → Console tab
Buscar:
- "Error"
- "Cannot read"
- "Insuficientes datos"
- "No hay datos"
```

**Paso 2: Ver logs**
```
console.info() ← Buscar estos
- "Dataset cargado"
- "Forecast pipeline"
- "Dashboard build"
```

**Paso 3: Verificar localStorage**
```
F12 → Application → localStorage → plan-nestle-pro
Revisar:
- nestle_generated_demand (no vacío)
- nestle_orders (array con datos)
```

**Paso 4: Recargar datos**
- [ ] Limpiar localStorage: `localStorage.clear()`
- [ ] Recargar página (F5)
- [ ] Volver a cargar demo data desde `/app/datos`

---

## 📝 NOTAS

- **Demo data:** Automáticamente disponible en dashboard inicial
- **Productos:** Nescafé, Milo, Dolca, Colcafé (cualquiera funciona)
- **Período:** Últimas 12 semanas históricas + 13 de forecast
- **Canales:** Supermercados, E-commerce, Almacén, Distribuidoras
- **Usuarios:** jgarcia (DP), mlopez (Sales), cfernandez (Finance), etc.

---

**Last Updated:** 19-05-2026  
**Status:** ✅ READY FOR QA
