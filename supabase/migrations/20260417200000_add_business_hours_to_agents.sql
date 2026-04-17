-- Add business hours configuration to agents table
-- Allows each agent to have configurable operating hours per day of week

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS business_hours_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS business_hours_timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS business_hours_schedule JSONB DEFAULT '[
  {"day": 0, "active": false, "start": "09:00", "end": "18:00"},
  {"day": 1, "active": true,  "start": "09:00", "end": "18:00"},
  {"day": 2, "active": true,  "start": "09:00", "end": "18:00"},
  {"day": 3, "active": true,  "start": "09:00", "end": "18:00"},
  {"day": 4, "active": true,  "start": "09:00", "end": "18:00"},
  {"day": 5, "active": true,  "start": "09:00", "end": "18:00"},
  {"day": 6, "active": false, "start": "09:00", "end": "18:00"}
]'::jsonb,
ADD COLUMN IF NOT EXISTS business_hours_off_message TEXT DEFAULT NULL;

COMMENT ON COLUMN agents.business_hours_enabled IS 'Master toggle: when true, bot only responds within configured hours';
COMMENT ON COLUMN agents.business_hours_timezone IS 'IANA timezone for schedule evaluation (e.g. America/Sao_Paulo)';
COMMENT ON COLUMN agents.business_hours_schedule IS 'JSON array of 7 day schedules: [{day:0-6, active:bool, start:"HH:MM", end:"HH:MM"}]';
COMMENT ON COLUMN agents.business_hours_off_message IS 'Message sent when contact writes outside business hours. If null, bot stays silent.';
