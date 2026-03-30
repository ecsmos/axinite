# glTF-Transform: `@gltf-transform/functions` (Transforms и Functions)

Ниже разбивка экспортируемых сущностей из пакета `@gltf-transform/functions` на две группы:

- `Transforms` — типичные функции-трансформы, которые применяются в pipeline `document.transform(...)`.
- `Functions` — утилиты/вспомогательные функции и “non-transform” операции (включая helpers для трансформов).

---

## Transforms

- `center`: центрирует `Scene` (или переносит относительно origin/по высоте); трансформации от анимации/скининга/морфов не учитываются.
- `dedup`: удаляет дубликаты `Accessor`/`Mesh`/`Texture`/`Material`, связывая повторяющиеся ресурсы.
- `dequantize`: де-квантует `Primitive`, убирая `KHR_mesh_quantization`, если он присутствует (обычно увеличивает размер, но повышает совместимость).
- `draco`: сжимает геометрию через `KHR_draco_mesh_compression` (тонкая обёртка над одноимённым расширением).
- `flatten`: “сплющивает” граф сцены: оставляет `Mesh`/`Camera` и прочие вложения прямыми потомками `Scene` (структуру скелетов и их потомков не ломает).
- `instance`: создаёт GPU-instancing через `EXT_mesh_gpu_instancing` для общих ссылок на `Mesh` (уменьшает число draw calls в поддерживающих движках).
- `join`: объединяет совместимые `Primitive` и уменьшает число draw calls (часто полезно делать `dedup` и `flatten` заранее).
- `meshopt`: сжимает данные через Meshopt (в связке с нужными этапами и `EXT_meshopt_compression`).
- `metalRough`: приводит workflow PBR к `metal/rough` (в рамках glTF-расширений: убирает `KHR_materials_pbrSpecularGlossiness` и добавляет `KHR_materials_ior` + `KHR_materials_specular`).
- `normals`: генерирует плоские нормали для `mesh`-primitive; опционально можно перезаписывать.
- `palette`: создаёт палитровые текстуры (palette textures) для сцен с множеством однотонных материалов и затем объединяет материалы.
- `partition`: партиционирует бинарные данные glTF так, чтобы mesh/animation полезная нагрузка попадала в отдельные `.bin` буферы (удобно для lazy-loading).
- `prune`: удаляет неиспользуемые в `Scene` ресурсы/свойства из файла (очистка после преобразований).
- `quantize`: квантует `vertex attributes` через `KHR_mesh_quantization` (обычно уменьшает размер/footprint; добавление расширения происходит автоматически).
- `reorder`: переупорядочивает примитивы под locality of reference (оптимизация под transmission size или GPU rendering, зависит от режима).
- `resample`: lossless дедупликация keyframes в анимационных каналах, чтобы уменьшить размер файла.
- `sequence`: создаёт анимацию, последовательно отображающую заданные `Node`.
- `simplify`: упрощает геометрию (lossy) алгоритмом meshoptimizer, уменьшая число треугольников/вершин при попытке сохранить визуальное качество.
- `sparse`: анализирует `Accessor` и выбирает, выгодно ли хранить данные в sparse-формате (особенно когда много нулей).
- `tangents`: генерирует tangent’ы в MikkTSpace для mesh `Primitive` (может исправлять проблемы с некоторыми baked normal maps).
- `textureCompress`: оптимизирует текстуры (ресайз/конвертация под нужные форматы; в Node.js обычно лучше с `sharp`).
- `uninstance`: удаляет `EXT_mesh_gpu_instancing`, разворачивая instancing обратно в обычные `Node` (обычно увеличивает число draw calls).
- `unlit`: приводит материалы к `KHR_materials_unlit` (unlit workflow).
- `unpartition`: отменяет `partition`, сводя бинарные данные к максимум одному `.bin` буферу.
- `unweld`: деиндексирует `Primitive`, разрывая общие вершины (обычно увеличивает число вершин; может быть полезно для жёстких граней).
- `unwrap`: генерирует новые UV (“UV mappings”) для `Primitive` (может увеличивать число вершин из‑за UV seams).
- `vertexColorSpace`: корректирует color space vertex colors в соответствии с требованиями glTF (Linear Rec. 709 D65).
- `weld`: “weld” склеивает битово-идентичные вершины в `Primitive`, повышая эффективность шаринга данных и индексирования.

---

## Functions

- `clearNodeParent`: удаляет `parent` у `Node`, оставляя `Node` прямым потомком `Scene` (world-transform при этом сохраняется, но меняется локальная трансформация).
- `clearNodeTransform`: сбрасывает локальный transform `Node`, применяя его к дочерним объектам и мешам (чтобы world-положение сохранилось).
- `cloneDocument`: клонирует `Document`, копируя свойства и extensions (исходник не меняется).
- `compactPrimitive`: переписывает `Primitive`, удаляя неиспользуемые вершины в её атрибутах (часто при этом изолирует `Accessor`, чтобы дальше не было нежелательного шаринга).
- `compressTexture`: оптимизирует одну конкретную `Texture` (включая ресайз/конвертацию по заданным параметрам).
- `convertPrimitiveToLines`: конвертирует `Primitive` с режимом `LINE_STRIP`/`LINE_LOOP` в режим `LINES` (другие топологии — ошибка).
- `convertPrimitiveToTriangles`: конвертирует `Primitive` с режимом `TRIANGLE_STRIP`/`TRIANGLE_LOOP` в режим `TRIANGLES` (другие топологии — ошибка).
- `copyToDocument`: копирует выбранные `Property` из исходного `Document` в целевой `Document`, оставляя оригиналы в исходнике; зависимости тоже копируются.
- `createDefaultPropertyResolver`: создаёт резолвер по умолчанию для переноса/копирования свойств между `Document` (помогает переиспользовать уже перенесённые ресурсы).
- `createInstanceNodes`: для `Node` с `InstancedMesh` возвращает список `Node`, по одному на каждый инстанс (с трансформациями каждого инстанса).
- `dequantizePrimitive`: де-квантует один `Primitive`, приводя vertex attributes к `float32`.
- `getBounds`: вычисляет AABB (bounding box) в мировых координатах для `Node` или `Scene`.
- `getMeshVertexCount`: оценивает число вершин в `Mesh` по выбранному методу.
- `getNodeVertexCount`: оценивает число вершин в `Node` (в пределах subtree) по выбранному методу.
- `getPrimitiveVertexCount`: оценивает число вершин в одном `Primitive` по выбранному методу.
- `getSceneVertexCount`: оценивает число вершин в `Scene` по выбранному методу.
- `getTextureChannelMask`: возвращает bitmask каналов текстуры, которые реально используются (определение идёт по ролям/назначению текстур).
- `getTextureColorSpace`: возвращает предполагаемый `color space` текстуры, исходя из слотов `Material` (для non-color — `null`).
- `inspect`: формирует JSON-отчёт о содержимом glTF.
- `joinPrimitives`: склеивает список совместимых `Primitive` в один новый `Primitive` (совместимость требует общих material/draw mode/типов атрибутов).
- `listNodeScenes`: находит родительские `Scene`, связанные с данным `Node` (Node может относиться к нескольким сценам).
- `listTextureChannels`: возвращает список `TextureChannel`, используемых текстурой.
- `listTextureInfo`: перечисляет `TextureInfo`, связанные с конкретной `Texture`.
- `listTextureInfoByMaterial`: перечисляет `TextureInfo`, связанные с любой `Texture` на заданном `Material`.
- `listTextureSlots`: возвращает имена слотов, в которых используется заданная `Texture`.
- `mergeDocuments`: мерджит исходный `Document` в целевой, добавляя недостающие extensions (исходник не меняется).
- `moveToDocument`: перемещает свойства из исходного `Document` в целевой и удаляет их из source; зависимости копируются; возвращает `Map`.
- `sortPrimitiveWeights`: сортирует веса скиннинга по убыванию для каждого vertex `Primitive`/`PrimitiveTarget` и нормализует; опционально ограничивает число влияний.
- `transformMesh`: применяет матрицу transform ко всем `Primitive` в заданном `Mesh` (обычно сначала `compactPrimitive`, чтобы избежать нежелательного шаринга).
- `transformPrimitive`: применяет матрицу transform к одному `Primitive` (включая `PrimitiveTarget` при наличии), изменяя атрибуты на месте.
- `unwrapPrimitives`: генерирует новые UV для набора `Primitive` (на основе текущих данных и с учётом группировки atlas’ов).
- `weldPrimitive`: “weld” для одного `Primitive`: склеивает битово-идентичные вершины и делает шаринг данных эффективнее.

