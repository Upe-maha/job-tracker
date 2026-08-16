// src/lib/display/index.ts
//
// Presentation metadata keyed off @/lib/schemas/enums — labels, colors, icons
// and the option lists the pickers render. Isomorphic: importable from a
// 'use client' component and from a server route alike, so it must never
// import mongoose, next/server, @/lib/api/* or @/lib/dal/*.
export * from './applications'
export * from './notes'
export * from './user'
