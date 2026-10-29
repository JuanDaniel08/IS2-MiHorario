# Documentación de Arquitectura de Sistema

Este documento contiene los diagramas de arquitectura, componentes, paquetes y secuencia que definen la estructura y comportamiento del sistema.

---

## 1. Modelo de Contexto - Nivel 2

El diagrama de Nivel 2 describe la interacción entre los distintos roles (Administrador, Empleado), las aplicaciones Frontend/Backend, la base de datos y los servicios externos integrados (Autenticación, Notificaciones, Monitoreo, etc.).

![Modelo de Contexto Nivel 2](./modelo_contexto_nivel2.svg)

---

## 2. Diagrama de Secuencia

Ilustra el flujo de ejecución completo para una petición entrante desde el cliente hasta la persistencia y notificación, pasando por el controlador, casos de uso, dominio y adaptadores.

![Diagrama de Secuencia](./diagrama_secuencia.svg)

### Flujo de interacción:

 1. **Cliente → Controller:** `1. HTTP POST`
 2. **Controller → UseCase:** `2. Valida DTO`
 3. **UseCase → Domain:** `3. execute(DTO)`
 4. **Domain → PersistenceAdapter:** `4. Valida reglas`
 5. **PersistenceAdapter → Domain:** `return(OK)`
 6. **Domain → PersistenceAdapter:** `5. Consulta datos`
 7. **PersistenceAdapter → Database:** `6. Query SQL`
 8. **Database → PersistenceAdapter / Domain:** `return`
 9. **Domain → PersistenceAdapter:** `7. Guarda entidad de dominio`
10. **PersistenceAdapter → Database:** `8. Query SQL`
11. **UseCase → NotificationAdapter:** `9. Enviar Notificación (Email/Push)`
12. **UseCase → Controller:** `10. return (DTO)`
13. **Controller → Cliente:** `11. HTTP 201`

---

## 3. Diagrama de Componentes

Muestra la organización física y lógica de los componentes de software agrupados por el Backend (módulos de dominio y compartidos) y el Frontend.

![Diagrama de Componentes](./diagrama_componentes.svg)

---

## 4. Diagrama de Paquetes

Define la estructura modular y las dependencias de paquetes dentro de la arquitectura tanto para el Backend como para el Frontend.

![Diagrama de Paquetes](./diagrama_paquetes.svg)