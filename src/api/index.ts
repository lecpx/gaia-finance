/**
 * API Configuration
 * 
 * This file determines which API implementation to use:
 * - localStorage (default, for single-user offline mode)
 * - supabase (for multi-user shared database)
 * - jsonServer (for multi-user shared database)
 * 
 * To switch modes, uncomment the appropriate line below
 */

// ✅ Dùng Supabase (khuyến nghị cho multi-user)
export { supabaseApi as api } from './supabaseApi';

// ❌ Dùng JSON Server (cho multi-user)
// export { jsonServerApi as api } from './jsonServerClient';

// ❌ Dùng localStorage (chỉ cho offline single-user)
// export { api } from './client';
