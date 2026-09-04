# ============================================================
# 数据库结构（供第二步接入 Vercel Postgres / Neon 使用）
# 用法：在 Vercel 创建 Postgres 数据库后，把连接串填入环境变量，
#       然后在本地执行：psql "$POSTGRES_URL" -f db/init.sql
# ============================================================

CREATE TABLE IF NOT EXISTS equipment (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT '未分类',
  total       INTEGER NOT NULL DEFAULT 0,
  in_use      INTEGER NOT NULL DEFAULT 0,
  loaned      INTEGER NOT NULL DEFAULT 0,
  remark      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment (name);

CREATE TABLE IF NOT EXISTS borrows (
  id             TEXT PRIMARY KEY,
  student        TEXT NOT NULL,
  class_name     TEXT NOT NULL,
  equipment_id   TEXT NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  equipment_name TEXT NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1,
  reason         TEXT NOT NULL DEFAULT '',
  apply_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  approve_at     TIMESTAMPTZ,
  returned_at    TIMESTAMPTZ,
  reject_reason  TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','returned','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows (status);
CREATE INDEX IF NOT EXISTS idx_borrows_student ON borrows (student);

CREATE TABLE IF NOT EXISTS print_orders (
  id            TEXT PRIMARY KEY,
  student       TEXT NOT NULL,
  class_name    TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 1,
  material      TEXT NOT NULL DEFAULT 'PLA',
  note          TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','printing','done','delivered','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_at      TIMESTAMPTZ,
  finish_at     TIMESTAMPTZ,
  deliver_at    TIMESTAMPTZ,
  reject_reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_prints_status ON print_orders (status);
CREATE INDEX IF NOT EXISTS idx_prints_student ON print_orders (student);
