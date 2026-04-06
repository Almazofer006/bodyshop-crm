-- ============================================================
-- CRM для кузовного центра — полная схема БД
-- Запустите этот SQL в Supabase Dashboard → SQL Editor
-- ============================================================

-- Роли пользователей
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'master', 'client');

-- Профили пользователей
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'master',
  zone TEXT, -- для мастеров: привязка к зоне
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Зоны (этапы)
CREATE TABLE stages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  order_index INT NOT NULL
);

-- Посты внутри зон
CREATE TABLE stations (
  id SERIAL PRIMARY KEY,
  stage_id INT NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL
);

-- Статус автомобиля
CREATE TYPE vehicle_status AS ENUM ('active', 'completed', 'cancelled');

-- Автомобили
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  status vehicle_status NOT NULL DEFAULT 'active',
  current_station_id INT REFERENCES stations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- История перемещений
CREATE TABLE vehicle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  station_id INT NOT NULL REFERENCES stations(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  moved_by UUID REFERENCES profiles(id),
  notes TEXT
);

-- Фотографии
CREATE TABLE vehicle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- ИНДЕКСЫ
-- ============================================================
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_station ON vehicles(current_station_id);
CREATE INDEX idx_history_vehicle ON vehicle_history(vehicle_id);
CREATE INDEX idx_photos_vehicle ON vehicle_photos(vehicle_id);

-- ============================================================
-- SEED: Зоны и посты
-- ============================================================
INSERT INTO stages (name, order_index) VALUES
  ('Парковка', 1),
  ('Жестяные работы', 2),
  ('Арматурные работы', 3),
  ('Зона подготовки', 4),
  ('Зона ПДР', 5),
  ('Зона Покраска', 6),
  ('Зона Детейлинга', 7),
  ('Зона Мойки', 8),
  ('Зона Бронепленки', 9);

-- Парковка
INSERT INTO stations (stage_id, name, order_index)
SELECT id, 'Парковка', 1 FROM stages WHERE name = 'Парковка';

-- Жестяные работы
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 стапель', 1 FROM stages WHERE name = 'Жестяные работы';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '2 стапель', 2 FROM stages WHERE name = 'Жестяные работы';

-- Арматурные работы
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост ЦЕХ', 1 FROM stages WHERE name = 'Арматурные работы';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '2 пост ЦЕХ', 2 FROM stages WHERE name = 'Арматурные работы';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост БОКС', 3 FROM stages WHERE name = 'Арматурные работы';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '2 пост БОКС', 4 FROM stages WHERE name = 'Арматурные работы';

-- Зона подготовки
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост', 1 FROM stages WHERE name = 'Зона подготовки';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '2 пост', 2 FROM stages WHERE name = 'Зона подготовки';

-- Зона ПДР
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост', 1 FROM stages WHERE name = 'Зона ПДР';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '2 пост', 2 FROM stages WHERE name = 'Зона ПДР';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '3 пост', 3 FROM stages WHERE name = 'Зона ПДР';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '4 пост', 4 FROM stages WHERE name = 'Зона ПДР';

-- Зона Покраска
INSERT INTO stations (stage_id, name, order_index)
SELECT id, 'Большая малярка', 1 FROM stages WHERE name = 'Зона Покраска';
INSERT INTO stations (stage_id, name, order_index)
SELECT id, 'Малая малярка', 2 FROM stages WHERE name = 'Зона Покраска';

-- Зона Детейлинга
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост', 1 FROM stages WHERE name = 'Зона Детейлинга';

-- Зона Мойки
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост', 1 FROM stages WHERE name = 'Зона Мойки';

-- Зона Бронепленки
INSERT INTO stations (stage_id, name, order_index)
SELECT id, '1 пост', 1 FROM stages WHERE name = 'Зона Бронепленки';

-- ============================================================
-- AUTO-CREATE profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'master')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;

-- Вспомогательная функция для получения роли
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Profiles: каждый видит себя, admin видит всех
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (get_my_role() = 'admin');

-- Stages & Stations: все авторизованные видят
CREATE POLICY "stages_select" ON stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "stations_select" ON stations FOR SELECT TO authenticated USING (true);

-- Vehicles: все авторизованные видят активные, клиент — только своё авто
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT
  USING (
    get_my_role() IN ('admin', 'manager', 'master')
    OR (get_my_role() = 'client' AND owner_phone = (SELECT email FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager'));

CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
  USING (get_my_role() IN ('admin', 'manager'));

-- History: все авторизованные видят
CREATE POLICY "history_select" ON vehicle_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "history_insert" ON vehicle_history FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager'));

-- Photos: все видят, загружают admin/manager/master
CREATE POLICY "photos_select" ON vehicle_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos_insert" ON vehicle_photos FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager', 'master'));
