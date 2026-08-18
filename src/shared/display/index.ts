// src/shared/display/index.ts
//
// Presentation metadata keyed off @/shared/schemas/enums — labels, colors, icons
// and the option lists the pickers render. Isomorphic: importable from a
// 'use client' component and from a server route alike, so it must never
// import mongoose, next/server, @/server/http/* or @/server/data/*.
export * from './applications'
export * from './notes'
export * from './users'
