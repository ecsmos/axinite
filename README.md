# Axinite Monorepo

Monorepo на `bun` + `turborepo` с фронтендом на `vite` и форматированием/линтингом через `biome`.

## Что внутри

- `apps/demo`: демо-приложение на `three.js` с вращающимся кубом через `WebGPURenderer`.
- `packages/utils`: задел под общие пакеты (пример библиотеки).

## Требования

- `bun` версии примерно `1.1+` (в репозитории указан `packageManager: bun@1.1.0`)
- Браузер с поддержкой `WebGPU` (демо не запустится без WebGPU; для локальной разработки обычно достаточно `localhost`).
- Для WebGPU важен `secure context` (обычно `https` или `localhost`).

## Быстрый старт

1. Установить зависимости:
```bash
bun install
```

2. Запустить демо:
```bash
bun dev
```

Откройте `http://localhost:3000/`.

> Сейчас в монорепе только один app (`apps/demo`), поэтому `bun dev` фактически запускает именно его.

## Сборка

```bash
bun build
```

## Biome (линтинг и форматирование)

Команды для терминала:

```bash
bun lint
bun format
```

Если вы используете Cursor/VS Code, то для “автоформата при сохранении”:

1. Установите расширение Biome: `biomejs.biome`
2. Добавьте в `settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "biome.enabled": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  }
}
```

## Дальнейшее расширение

Ожидается добавление новых приложений в `apps/*` и пакетов в `packages/*`. Для пакетов потом можно подключать их в `turbo.json` (например, build/lint).
