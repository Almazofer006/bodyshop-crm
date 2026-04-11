-- ============================================================
-- Исправление RLS-политик
-- Запустите в Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES: все авторизованные видят всех
-- (нужно чтобы менеджеры/мастера видели сотрудников)
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 2. IDLE_SESSIONS: таблица простоев
-- ============================================================
-- Включаем RLS если ещё не включена
ALTER TABLE idle_sessions ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "idle_select" ON idle_sessions;
DROP POLICY IF EXISTS "idle_insert" ON idle_sessions;
DROP POLICY IF EXISTS "idle_update" ON idle_sessions;
DROP POLICY IF EXISTS "idle_delete" ON idle_sessions;

-- Все авторизованные видят все простои (фильтрация через приложение)
CREATE POLICY "idle_select" ON idle_sessions FOR SELECT TO authenticated USING (true);
-- Вставлять может только свои
CREATE POLICY "idle_insert" ON idle_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Обновлять может только свои (закрытие простоя)
CREATE POLICY "idle_update" ON idle_sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 3. ROLE_PERMISSIONS: настройки прав
-- ============================================================
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_perms_select" ON role_permissions;
DROP POLICY IF EXISTS "role_perms_update" ON role_permissions;
DROP POLICY IF EXISTS "role_perms_insert" ON role_permissions;

-- Все авторизованные видят права (чтобы определить свои разрешения)
CREATE POLICY "role_perms_select" ON role_permissions FOR SELECT TO authenticated USING (true);
-- Обновлять может только admin
CREATE POLICY "role_perms_update" ON role_permissions FOR UPDATE
  USING (get_my_role() = 'admin');
-- Вставлять может только admin
CREATE POLICY "role_perms_insert" ON role_permissions FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

-- ============================================================
-- 4. VEHICLE_SERVICES: работы по автомобилю
-- ============================================================
ALTER TABLE vehicle_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_services_select" ON vehicle_services;
DROP POLICY IF EXISTS "vehicle_services_insert" ON vehicle_services;
DROP POLICY IF EXISTS "vehicle_services_update" ON vehicle_services;
DROP POLICY IF EXISTS "vehicle_services_delete" ON vehicle_services;

-- Все авторизованные видят
CREATE POLICY "vehicle_services_select" ON vehicle_services FOR SELECT TO authenticated USING (true);
-- Вставлять — admin/manager/master
CREATE POLICY "vehicle_services_insert" ON vehicle_services FOR INSERT TO authenticated WITH CHECK (true);
-- Обновлять (отмечать выполненным)
CREATE POLICY "vehicle_services_update" ON vehicle_services FOR UPDATE TO authenticated USING (true);
-- Удалять
CREATE POLICY "vehicle_services_delete" ON vehicle_services FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin', 'manager'));

-- ============================================================
-- 5. SERVICES: справочник работ
-- ============================================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select" ON services;
DROP POLICY IF EXISTS "services_insert" ON services;
DROP POLICY IF EXISTS "services_update" ON services;
DROP POLICY IF EXISTS "services_delete" ON services;

-- Все авторизованные видят справочник
CREATE POLICY "services_select" ON services FOR SELECT TO authenticated USING (true);
-- Управлять справочником — admin/manager
CREATE POLICY "services_insert" ON services FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager'));
CREATE POLICY "services_update" ON services FOR UPDATE
  USING (get_my_role() IN ('admin', 'manager'));
CREATE POLICY "services_delete" ON services FOR DELETE
  USING (get_my_role() IN ('admin', 'manager'));

-- ============================================================
-- 6. VEHICLES: расширяем insert/update для мастеров
-- (контроль через приложение и систему прав)
-- ============================================================
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
-- Вставлять — admin/manager/master (контроль через can_add_vehicles)
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager', 'master'));
-- Обновлять — admin/manager/master (контроль через can_move_vehicles)
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  USING (get_my_role() IN ('admin', 'manager', 'master'));

-- ============================================================
-- 7. HISTORY: расширяем insert для мастеров
-- ============================================================
DROP POLICY IF EXISTS "history_insert" ON vehicle_history;
CREATE POLICY "history_insert" ON vehicle_history FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager', 'master'));

-- ============================================================
-- 8. PROFILES: разрешаем admin обновлять профили
-- ============================================================
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (get_my_role() = 'admin');
