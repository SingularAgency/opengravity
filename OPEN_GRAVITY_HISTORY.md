# Manual de Construcción de OpenGravity �️

Este manual contiene los pasos exactos y los prompts que debes proporcionar a Antigravity para replicar la creación de **OpenGravity**, un agente de IA personal, local, seguro y auto-extensible.

---

## Fase 1: Arquitectura Base e Identidad
**Objetivo**: Establecer el nombre, stack tecnológico y canal de comunicación.

**Prompt Sugerido**:
> "Quiero crear un agente de IA personal llamado **OpenGravity**. Debe ser un proyecto en **TypeScript** que corra 100% localmente. La comunicación será por **Telegram** usando la librería `grammy` en modo *long polling* (sin servidores web). Para el procesado de lenguaje, usa la API de **Groq** (modelo Llama 3.3 70B) con un sistema de fallback a **OpenRouter** por si falla la primera."

---

## Fase 2: Persistencia y Seguridad
**Objetivo**: Darle memoria al agente y restringir quién puede hablar con él.

**Prompt Sugerido**:
> "Implementa una base de datos local con `better-sqlite3` para que el agente recuerde el historial de las conversaciones. Además, añade una capa de seguridad crítica: el bot solo debe responder a mi ID de Telegram (u otros IDs que yo autorice expresamente). Crea un archivo `.env` para gestionar de forma segura el Token de Telegram, la API Key de Groq y mi ID de usuario."

---

## Fase 3: Herramientas de Sistema y Productividad
**Objetivo**: Conectar al agente con el mundo real y tus herramientas de trabajo.

**Prompt Sugerido**:
> "Añade una herramienta básica `get_current_time` para que el agente sepa siempre la hora actual. Después, implementa herramientas para interactuar con mi **Google Workspace**: necesito que el agente pueda listar mis correos de **Gmail** y ver los eventos de mi **Calendario de Google**. Guíame para configurar las credenciales de Google necesarias."

---

## Fase 4: Sistema de Habilidades Dinámicas (Skills)
**Objetivo**: Permitir que el agente evolucione y aprenda nuevas funciones por sí mismo.

**Prompt Sugerido**:
> "Quiero que OpenGravity pueda aprender nuevas 'Skills' dinámicamente. Integra la API de `prompts.chat` y crea herramientas (`search_skills`, `get_skill`, `install_skill`) para que el agente pueda buscar capacidades nuevas, leer sus instrucciones e instalarlas automáticamente en el sistema de archivos local para ejecutarlas de inmediato."

---

## Fase 5: Infraestructura Cloud (Opcional)
**Objetivo**: Preparar el entorno para almacenamiento o lógica en la nube.

**Prompt Sugerido**:
> "Configura un proyecto de **Firebase** en este directorio. Inicializa **Firestore** y define las reglas de seguridad (`firestore.rules`) para que el entorno esté listo si en el futuro decidimos migrar datos o funciones a la infraestructura de Google Cloud."

---

## Fase 6: Respuesta por Voz (Text-to-Speech)
**Objetivo**: Hacer que el agente responda con voz humana y natural, especialmente cuando recibe mensajes de voz.

**Prompt Sugerido**:
> "Quiero que OpenGravity pueda responderme con voz. Integra la API de **ElevenLabs** y configura un servicio de TTS. Cuando yo te envíe un mensaje de voz, transpórtalo a texto, procésalo y respóndeme tanto con texto como con un mensaje de voz generado. Usa un modelo multilingüe (`eleven_multilingual_v2`) y una voz que suene bien en español latino y en inglés (como 'Aria'). Añade las variables `ELEVENLABS_API_KEY` y `ELEVENLABS_VOICE_ID` al `.env`."

---

## Fase 7: Búsqueda Web en Tiempo Real
**Objetivo**: Permitir al agente consultar internet para obtener información actualizada (noticias, clima, datos técnicos).

**Prompt Sugerido**:
> "Quiero que OpenGravity pueda buscar información en la web. Integra la API de **Tavily** y crea una herramienta `search_web`. Configúrala para que el agente pueda realizar búsquedas en tiempo real y obtener resúmenes limpios de los resultados. Añade la variable `TAVILY_API_KEY` al archivo `.env`."

---

## Fase 8: Despliegue en Servidor (VPS) con Docker
**Objetivo**: Hacer que el agente funcione 24/7 de forma profesional en un servidor remoto.

**Prompt Sugerido**:
> "Quiero preparar OpenGravity para su despliegue en un VPS usando Docker. Crea un `Dockerfile` optimizado y un archivo `docker-compose.yml` que gestione el bot, las variables de entorno (`.env`) y la persistencia de la base de datos SQLite y las credenciales de Google."

---

## Cómo ejecutar el proyecto
Una vez que Antigravity haya completado los pasos, el usuario final solo debe:
1. Rellenar el archivo `.env` con sus tokens.
2. Ejecutar `npm install`.
3. Arrancar el agente con `npm run dev`.

Este flujo garantiza que el agente sea privado, rápido y totalmente controlado por el usuario desde su propia máquina.

