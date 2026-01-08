# Sistema de Transacciones Anti-Fraude Yape

> Sistema de procesamiento de transacciones financieras con validación anti-fraude en tiempo real, construido con NestJS y Kafka.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.0-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.7-2D3748)](https://www.prisma.io/)
[![Kafka](https://img.shields.io/badge/Kafka-Enabled-black)](https://kafka.apache.org/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Enabled-E10098)](https://graphql.org/)

---

## Tabla de Contenidos

- [Resumen del Desafío](#resumen-del-desafío)
- [Mi Solución](#mi-solución)
- [Arquitectura de la Solución](#arquitectura-de-la-solución)
- [Características Principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Inicio Rápido](#inicio-rápido)
- [Documentación de APIs](#documentación-de-apis)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Testing](#testing)

---

## Resumen del Desafío

Construir un sistema de procesamiento de transacciones financieras con validación anti-fraude en tiempo real utilizando arquitectura orientada a eventos.

**Reglas de Negocio:**
- Todas las transacciones inician con estado `pending`
- Transacciones > $1000 son automáticamente `rejected`
- Transacciones ≤ $1000 son `approved`
- Las actualizaciones de estado ocurren de forma asíncrona vía Kafka

**Flujo del Sistema:**
```
Usuario → POST /transactions → DB (pending)
  ↓
Kafka: transaction.created
  ↓
Anti-Fraud Service → Valida
  ↓
Kafka: transaction.validated
  ↓
Transaction API → Actualiza DB (approved/rejected)
```

---

## Mi Solución

He desarrollado un sistema de grado empresarial que no solo cumple con los requisitos del desafío, sino que va más allá implementando las mejores prácticas de la industria:

### Decisiones Arquitectónicas Clave

#### 1. **Arquitectura Orientada a Eventos con Kafka**
- **Por qué**: Desacoplamiento total entre servicios, permitiendo escalabilidad independiente
- **Beneficio**: Cada servicio puede escalar según su carga sin afectar a otros
- **Implementación**:
  - Topic `transaction.created` para nuevas transacciones
  - Topic `transaction.validated` para resultados de validación
  - 3 particiones por topic para procesamiento paralelo

#### 2. **Patrón CQRS (Command Query Responsibility Segregation)**
- **Por qué**: Separar operaciones de lectura y escritura mejora el rendimiento
- **Beneficio**:
  - Escrituras optimizadas sin preocuparse por consultas complejas
  - Lecturas pueden usar réplicas de base de datos
  - Escalamiento independiente de lecturas vs escrituras
- **Implementación**:
  - Commands: `CreateTransactionCommand`
  - Queries: `GetTransactionQuery`
  - Events: `TransactionValidatedEvent`

#### 3. **Clean Architecture (Arquitectura Limpia)**
- **Por qué**: Separación clara de responsabilidades y testabilidad
- **Capas implementadas**:
  ```
  Presentation (REST/GraphQL)
    → Application (CQRS Handlers)
      → Domain (Lógica de negocio)
        → Infrastructure (DB, Kafka)
  ```
- **Beneficio**: Código mantenible, testeable y fácil de evolucionar

#### 4. **Monorepo con NestJS**
- **Por qué**: Compartir código y tipos entre servicios de forma eficiente
- **Estructura**:
  - `apps/transaction-api`: API principal de transacciones
  - `apps/anti-fraud-service`: Servicio de validación anti-fraude
  - `libs/shared-types`: Tipos e interfaces compartidas
- **Beneficio**: Type-safety end-to-end y reutilización de código

#### 5. **Dual API: REST + GraphQL**
- **Por qué**: Flexibilidad para diferentes tipos de clientes
- **REST**: Ideal para integraciones simples y herramientas estándar
- **GraphQL**: Permite a los clientes solicitar exactamente los datos que necesitan
- **Documentación automática**: Swagger para REST, Playground para GraphQL

### Características Diferenciadoras

1. **Trazabilidad Distribuida**
   - Correlation IDs en todos los eventos
   - Logging estructurado con contexto completo
   - Facilita debugging en producción

2. **Idempotencia**
   - Event IDs únicos para prevenir procesamiento duplicado
   - Crucial para sistemas financieros

3. **Validación Robusta**
   - DTOs con class-validator
   - Validación en múltiples capas
   - Mensajes de error claros y específicos

4. **Preparado para Producción**
   - Health checks configurados
   - Graceful shutdown
   - Manejo de errores comprehensivo
   - Migraciones de base de datos versionadas


---

## Arquitectura de la Solución

### Diagrama del Sistema

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Cliente   │─────▶│ Transaction API  │─────▶│   PostgreSQL    │
│ (REST/GQL)  │      │  (NestJS+CQRS)   │      │  (Prisma ORM)   │
└─────────────┘      └─────────┬────────┘      └─────────────────┘
                                │
                                │ Eventos Kafka
                                ▼
                       ┌─────────────────┐
                       │  Apache Kafka   │
                       │  Event Stream   │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Anti-Fraud     │
                       │    Service      │
                       └────────┬────────┘
                                │
                                │ Eventos Kafka
                                ▼
                       ┌─────────────────┐
                       │  Actualización  │
                       │  de Estado      │
                       └─────────────────┘
```

### Flujo Detallado de una Transacción

1. **Creación de Transacción** (Síncrono)
   ```
   Cliente → REST/GraphQL API
           → CreateTransactionHandler (CQRS Command)
           → TransactionRepository
           → PostgreSQL (estado: pending)
           ← Respuesta inmediata al cliente
   ```

2. **Publicación de Evento** (Asíncrono)
   ```
   CreateTransactionHandler → KafkaProducer
                            → Topic: transaction.created
   ```

3. **Validación Anti-Fraude** (Asíncrono)
   ```
   Kafka Consumer (Anti-Fraud Service)
     → FraudDetectionService.validateTransaction()
     → Aplica reglas de negocio (value > 1000 = rejected)
     → KafkaProducer
     → Topic: transaction.validated
   ```

4. **Actualización de Estado** (Asíncrono)
   ```
   Kafka Consumer (Transaction API)
     → TransactionValidatedHandler (CQRS Event)
     → TransactionRepository.updateStatus()
     → PostgreSQL (estado: approved/rejected)
   ```

### Decisiones de Diseño

**¿Por qué separar en dos servicios?**
- **Separación de responsabilidades**: Transaction API maneja el ciclo de vida de transacciones, Anti-Fraud se especializa en validación
- **Escalabilidad independiente**: El servicio anti-fraude puede tener más instancias si la validación es el cuello de botella
- **Evolución independiente**: Se pueden agregar reglas anti-fraude complejas sin afectar el API principal

**¿Por qué Kafka y no una cola simple?**
- **Persistencia**: Los eventos se mantienen por un periodo configurado, permitiendo replay si es necesario
- **Particionamiento**: Procesamiento paralelo con garantías de orden por partition key
- **Escalabilidad**: Diseñado para alto throughput

**¿Por qué Prisma como ORM?**
- **Type-safety**: Genera tipos TypeScript desde el schema
- **Migraciones**: Control de versiones de cambios en el schema
- **Developer Experience**: Auto-completion y validación en tiempo de compilación

---

## Características Principales

### Funcionalidad Core
- **Soporte Dual de APIs**: REST + GraphQL para máxima flexibilidad
- **Implementación CQRS**: Separación optimizada de comandos/consultas
- **Arquitectura Orientada a Eventos**: Mensajería asíncrona basada en Kafka
- **Anti-Fraude en Tiempo Real**: Procesamiento de validación subsegundo
- **Type Safety**: TypeScript completo con modo estricto
- **Validación de Entrada**: DTOs con class-validator y reglas comprehensivas

### Excelencia Técnica
- **Clean Architecture**: Diseño en capas (Presentación, Aplicación, Dominio, Infraestructura)
- **Patrón Repository**: Acceso a datos abstraído
- **Inyección de Dependencias**: Contenedor IoC de NestJS
- **Trazabilidad Distribuida**: Correlation IDs para seguimiento de requests
- **Documentación de API**: Swagger/OpenAPI auto-generado


---

## Stack Tecnológico

### Framework Backend
- **NestJS 10** - Framework progresivo de Node.js
- **TypeScript 5.1** - Desarrollo type-safe
- **@nestjs/cqrs** - Command Query Responsibility Segregation

### Base de Datos y ORM
- **PostgreSQL 14** - Base de datos relacional
- **Prisma 5.7** - ORM de nueva generación
- **Prisma Migrate** - Migraciones de base de datos

### Mensajería
- **KafkaJS**: Cliente de Kafka para Node.js
- **Apache Kafka**: Streaming de eventos distribuido (local)

### APIs
- **REST**: Express + Swagger/OpenAPI
- **GraphQL**: Apollo Server + enfoque code-first

### Infraestructura
- **Docker & Docker Compose**: Desarrollo local

---

## Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm
- Docker & Docker Compose
- Git

### Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd yape-app-nodejs-codechallenge

# 2. Ejecutar setup automatizado
chmod +x scripts/setup.sh
./scripts/setup.sh
```

El script de setup realizará:
- Instalar todas las dependencias
- Iniciar contenedores Docker (PostgreSQL, Kafka, Zookeeper)
- Generar Prisma Client
- Ejecutar migraciones de base de datos
- Sembrar datos de referencia
- Crear topics de Kafka

### Iniciar Servicios

**Opción 1: Manual (recomendado para desarrollo)**
```bash
# Terminal 1: Transaction API
npm run start:dev

# Terminal 2: Anti-Fraud Service
cd apps/anti-fraud-service
npm run start:dev
```

**Opción 2: Todo a la vez**
```bash
chmod +x scripts/start-all.sh
./scripts/start-all.sh
```

### Verificar Instalación

```bash
# Verificar Transaction API
curl http://localhost:3000

# Abrir GraphQL Playground
open http://localhost:3000/graphql

# Abrir documentación Swagger
open http://localhost:3000/api
```

---

## Documentación de APIs

### REST API

#### Crear Transacción

```bash
POST http://localhost:3000/transactions
Content-Type: application/json

{
  "accountExternalIdDebit": "550e8400-e29b-41d4-a716-446655440000",
  "accountExternalIdCredit": "550e8400-e29b-41d4-a716-446655440001",
  "tranferTypeId": 1,
  "value": 500
}

# Respuesta (201 Created)
{
  "transactionExternalId": "7c3e8e9a-1234-5678-9abc-def012345678",
  "transactionType": {
    "name": "Transfer"
  },
  "transactionStatus": {
    "name": "pending"  // Se actualizará a "approved" o "rejected"
  },
  "value": 500,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Obtener Transacción

```bash
GET http://localhost:3000/transactions/{transactionExternalId}

# Respuesta (200 OK)
{
  "transactionExternalId": "7c3e8e9a-1234-5678-9abc-def012345678",
  "transactionType": {
    "name": "Transfer"
  },
  "transactionStatus": {
    "name": "approved"
  },
  "value": 500,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### GraphQL API

Acceder al GraphQL Playground en: **http://localhost:3000/graphql**

#### Crear Transacción (Mutation)

```graphql
mutation CreateTransaction {
  createTransaction(input: {
    accountExternalIdDebit: "550e8400-e29b-41d4-a716-446655440000"
    accountExternalIdCredit: "550e8400-e29b-41d4-a716-446655440001"
    tranferTypeId: 1
    value: 750
  }) {
    transactionExternalId
    transactionType {
      name
    }
    transactionStatus {
      name
    }
    value
    createdAt
  }
}
```

#### Consultar Transacción

```graphql
query GetTransaction {
  transaction(transactionExternalId: "7c3e8e9a-1234-5678-9abc-def012345678") {
    transactionExternalId
    transactionType {
      name
    }
    transactionStatus {
      name
    }
    value
    createdAt
  }
}
```

### Probar Flujo Completo

```bash
chmod +x scripts/test-flow.sh
./scripts/test-flow.sh
```

Este script:
1. Crea una transacción aprobada (valor: 500)
2. Crea una transacción rechazada (valor: 1500)
3. Consulta ambas y muestra los resultados

---

## Estructura del Proyecto

```
yape-app-nodejs-codechallenge/
│
├── apps/
│   ├── transaction-api/              # Servicio principal de transacciones
│   │   ├── src/
│   │   │   ├── main.ts               # Punto de entrada de la aplicación
│   │   │   ├── app.module.ts
│   │   │   ├── config/               # Configuración
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/         # Servicio Prisma
│   │   │   │   └── messaging/        # Producer/Consumer Kafka
│   │   │   └── modules/
│   │   │       └── transaction/
│   │   │           ├── presentation/ # Controllers & Resolvers
│   │   │           ├── application/  # Handlers CQRS
│   │   │           ├── domain/       # Lógica de negocio
│   │   │           └── infrastructure/# Repositories
│   │   └── prisma/
│   │       ├── schema.prisma         # Schema de base de datos
│   │       └── seed.ts               # Datos de referencia
│   │
│   └── anti-fraud-service/           # Validación anti-fraude
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── modules/
│               └── fraud-detection/
│                   ├── services/     # Lógica de validación
│                   └── consumers/    # Consumers Kafka
│
├── libs/
│   └── shared-types/                 # Interfaces de eventos compartidas
│       └── src/
│           └── events/
│
├── scripts/
│   ├── setup.sh                      # Setup automatizado
│   ├── start-all.sh                  # Iniciar todos los servicios
│   └── test-flow.sh                  # Probar flujo completo
│
├── docker-compose.yml                # Infraestructura local
├── package.json                      # Workspace raíz
└── README.md                         # Este archivo
```

---

## Testing

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Reporte de cobertura
npm run test:cov
```

### Testing Manual

1. **Crear transacción aprobada** (valor ≤ 1000):
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "accountExternalIdDebit": "550e8400-e29b-41d4-a716-446655440000",
    "accountExternalIdCredit": "550e8400-e29b-41d4-a716-446655440001",
    "tranferTypeId": 1,
    "value": 500
  }'
```

2. **Crear transacción rechazada** (valor > 1000):
```bash
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "accountExternalIdDebit": "550e8400-e29b-41d4-a716-446655440002",
    "accountExternalIdCredit": "550e8400-e29b-41d4-a716-446655440003",
    "tranferTypeId": 1,
    "value": 1500
  }'
```

3. **Esperar 2-3 segundos** para procesamiento anti-fraude

4. **Consultar transacciones** para verificar actualizaciones de estado

---